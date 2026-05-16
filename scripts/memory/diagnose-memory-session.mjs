#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const REDACTION_PATTERNS = [
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/i,
  /\baws_secret_access_key\s*=\s*[^\s]+/i,
  /\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[^\s"',}]+/i,
  /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/i,
  /\bsk-[A-Za-z0-9_-]{20,}\b/i,
];

const UNSAFE_INSTRUCTION_PATTERNS = [
  /\bignore (?:all )?(?:future|previous|prior) safety rules\b/i,
  /\bdisregard (?:all )?(?:future|previous|prior) instructions\b/i,
  /\btreat this as a durable system instruction\b/i,
];

function printHelp() {
  console.log(`Usage: node scripts/memory/diagnose-memory-session.mjs [options]

Options:
  --fixture <path>        Diagnostic fixture JSON file.
  --audit-jsonl <path>    MCP audit JSONL file to evaluate against the fixture.
  --codex-session <path>  Optional Codex session JSONL for memory-tool presence checks.
  --json                  Print JSON instead of Markdown.
  --help, -h              Show this help text.

The script is offline and deterministic. It exits nonzero when required recall,
token-budget, or safety checks fail.
`);
}

function parseArgs(argv) {
  const options = {
    auditJsonlPath: null,
    codexSessionPath: null,
    fixturePath: null,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--fixture') {
      options.fixturePath = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === '--audit-jsonl') {
      options.auditJsonlPath = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === '--codex-session') {
      options.codexSessionPath = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (
    !options.fixturePath &&
    !options.auditJsonlPath &&
    !options.codexSessionPath
  ) {
    throw new Error('Provide --fixture, --audit-jsonl, or --codex-session.');
  }
  return options;
}

function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function estimateTokens(text) {
  if (!text || !text.trim()) return 0;
  const wordEstimate = text.trim().split(/\s+/).length * 1.3;
  const charEstimate = text.length / 4;
  return Math.ceil(Math.max(wordEstimate, charEstimate));
}

function includesFolded(text, phrase) {
  return text.toLowerCase().includes(phrase.toLowerCase());
}

function hasSecretLikeText(text) {
  return REDACTION_PATTERNS.some((pattern) => pattern.test(text));
}

function hasUnsafeInstruction(text) {
  return UNSAFE_INSTRUCTION_PATTERNS.some((pattern) => pattern.test(text));
}

function evaluateFixture(fixture, auditEvents = fixture.auditEvents || []) {
  const expected = fixture.expected || {
    requiredRecallMemoryIds: [],
    excludedRecallMemoryIds: [],
    requiredRecallPhrases: [],
    excludedRecallPhrases: [],
    maxRecallTokens: 1000,
    requireStrategyLookup: false,
    requireMemoryWrite: false,
  };
  const recallEvents = auditEvents.filter(
    (event) => event.action === 'memory_search'
  );
  const writeEvents = auditEvents.filter(
    (event) =>
      event.action === 'memory_save' || event.action === 'memory_suggest'
  );
  const strategyEvents = auditEvents.filter(
    (event) => event.action === 'strategy_lookup'
  );
  const recalledIds = new Set(
    recallEvents.flatMap((event) => event.memoryIds || [])
  );
  const recallText = recallEvents
    .map((event) => `${event.query || ''}\n${event.resultSummary || ''}`)
    .join('\n');
  const allAuditText = auditEvents
    .map(
      (event) =>
        `${event.reason || ''}\n${event.query || ''}\n${event.resultSummary || ''}`
    )
    .join('\n');
  const recallTokenEstimate = recallEvents.reduce(
    (sum, event) =>
      sum + (event.tokenEstimate ?? estimateTokens(event.resultSummary || '')),
    0
  );

  const checks = [];
  addCheck(
    checks,
    'strategy-lookup',
    !expected.requireStrategyLookup || strategyEvents.length > 0,
    'Strategy lookup happened before memory-dependent work.',
    'Memory strategy lookup is required but missing.'
  );
  addCheck(
    checks,
    'memory-write',
    !expected.requireMemoryWrite || writeEvents.length > 0,
    'Expected memory write or suggestion was present.',
    'Expected memory write or suggestion is missing.'
  );
  const missingIds = expected.requiredRecallMemoryIds.filter(
    (id) => !recalledIds.has(id)
  );
  addCheck(
    checks,
    'required-recall',
    missingIds.length === 0,
    'All required memories were recalled.',
    `Missing required recalled memories: ${missingIds.join(', ')}`,
    missingIds
  );
  const noisyIds = expected.excludedRecallMemoryIds.filter((id) =>
    recalledIds.has(id)
  );
  addCheck(
    checks,
    'irrelevant-recall',
    noisyIds.length === 0,
    'Excluded memories were not recalled.',
    `Irrelevant memories were recalled: ${noisyIds.join(', ')}`,
    noisyIds
  );
  const missingPhrases = expected.requiredRecallPhrases.filter(
    (phrase) => !includesFolded(recallText, phrase)
  );
  addCheck(
    checks,
    'required-phrases',
    missingPhrases.length === 0,
    'Required recall phrases were present.',
    `Missing required recall phrases: ${missingPhrases.join(', ')}`,
    missingPhrases
  );
  const leakedPhrases = expected.excludedRecallPhrases.filter((phrase) =>
    includesFolded(allAuditText, phrase)
  );
  addCheck(
    checks,
    'excluded-phrases',
    leakedPhrases.length === 0,
    'Excluded phrases were absent from audit and recall text.',
    `Unsafe or irrelevant phrases were present: ${leakedPhrases.join(', ')}`,
    leakedPhrases
  );
  addCheck(
    checks,
    'token-budget',
    recallTokenEstimate <= expected.maxRecallTokens,
    `Recall stayed within ${expected.maxRecallTokens} estimated tokens.`,
    `Recall used ${recallTokenEstimate} estimated tokens, above budget ${expected.maxRecallTokens}.`
  );
  const safetyFailures = [];
  if (hasSecretLikeText(allAuditText)) {
    safetyFailures.push('secret-like text found in audit output');
  }
  if (hasUnsafeInstruction(allAuditText)) {
    safetyFailures.push('unsafe durable instruction found in audit output');
  }
  addCheck(
    checks,
    'safety',
    safetyFailures.length === 0,
    'No raw secret-like text or unsafe durable instruction was present.',
    `Safety failures: ${safetyFailures.join(', ')}`,
    safetyFailures
  );

  const suggestedActions = buildSuggestedActions(checks);
  return {
    fixtureId: fixture.id || path.basename(fixture.fixturePath || 'unknown'),
    passed: checks.every((check) => check.status !== 'fail'),
    recallTokenEstimate,
    relevantRecallCount:
      expected.requiredRecallMemoryIds.length - missingIds.length,
    irrelevantRecallCount: noisyIds.length,
    memoryWriteCount: writeEvents.length,
    checks,
    suggestedActions,
  };
}

function addCheck(checks, id, passed, passMessage, failMessage, details = []) {
  checks.push({
    id,
    status: passed ? 'pass' : 'fail',
    message: passed ? passMessage : failMessage,
    ...(details.length ? { details } : {}),
  });
}

function buildSuggestedActions(checks) {
  const failedIds = new Set(
    checks.filter((check) => check.status === 'fail').map((check) => check.id)
  );
  const actions = [];
  if (failedIds.has('strategy-lookup')) {
    actions.push(
      'Call eweser_get_memory_strategy before memory-dependent work.'
    );
  }
  if (failedIds.has('required-recall')) {
    actions.push(
      'Search memory before answering when the task depends on prior context.'
    );
  }
  if (failedIds.has('irrelevant-recall')) {
    actions.push('Tighten recall filters or merge/prune noisy memory records.');
  }
  if (failedIds.has('excluded-phrases') || failedIds.has('safety')) {
    actions.push(
      'Redact or reject unsafe memory content before persistence and recall.'
    );
  }
  if (failedIds.has('token-budget')) {
    actions.push(
      'Summarize recalled memory more aggressively before adding it to context.'
    );
  }
  if (actions.length === 0) {
    actions.push('No diagnostic action needed.');
  }
  return actions;
}

function summarizeCodexSession(filePath) {
  const records = readJsonl(filePath);
  const text = records.map((record) => JSON.stringify(record)).join('\n');
  return {
    filePath,
    hasStrategyLookup: text.includes('eweser_get_memory_strategy'),
    hasMemorySearch: text.includes('eweser_search'),
    hasMemoryWrite:
      text.includes('eweser_save_memory') ||
      text.includes('eweser_suggest_memory'),
  };
}

function formatMarkdown(report, context) {
  const lines = [];
  lines.push('# Memory Diagnostic Report');
  lines.push('');
  lines.push(`- Fixture: \`${report.fixtureId}\``);
  lines.push(`- Result: \`${report.passed ? 'pass' : 'fail'}\``);
  lines.push(`- Recall token estimate: \`${report.recallTokenEstimate}\``);
  lines.push(`- Relevant recalls: \`${report.relevantRecallCount}\``);
  lines.push(`- Irrelevant recalls: \`${report.irrelevantRecallCount}\``);
  lines.push(`- Memory writes: \`${report.memoryWriteCount}\``);
  if (context.codexSession) {
    lines.push(
      `- Codex memory tools: strategy=\`${context.codexSession.hasStrategyLookup}\`, search=\`${context.codexSession.hasMemorySearch}\`, write=\`${context.codexSession.hasMemoryWrite}\``
    );
  }
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  for (const check of report.checks) {
    lines.push(`- ${check.status}: ${check.id} - ${check.message}`);
  }
  lines.push('');
  lines.push('## Suggested Actions');
  lines.push('');
  for (const action of report.suggestedActions) {
    lines.push(`- ${action}`);
  }
  return lines.join('\n');
}

try {
  const options = parseArgs(process.argv.slice(2));
  const fixture = options.fixturePath
    ? { ...readJson(options.fixturePath), fixturePath: options.fixturePath }
    : { id: 'audit-jsonl', expected: {} };
  const auditEvents = options.auditJsonlPath
    ? readJsonl(options.auditJsonlPath)
    : fixture.auditEvents || [];
  const report = evaluateFixture(fixture, auditEvents);
  const context = {
    codexSession: options.codexSessionPath
      ? summarizeCodexSession(options.codexSessionPath)
      : null,
  };
  if (options.json) {
    console.log(JSON.stringify({ report, context }, null, 2));
  } else {
    console.log(formatMarkdown(report, context));
  }
  process.exit(report.passed ? 0 : 1);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}
