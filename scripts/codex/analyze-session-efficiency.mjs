#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const defaultCodexHome =
  process.env.CODEX_HOME || path.join(process.env.HOME || '', '.codex');
const defaultSessionsRoot = path.join(defaultCodexHome, 'sessions');

function printHelp() {
  console.log(`Usage: node scripts/codex/analyze-session-efficiency.mjs [options]

Scans local Codex session JSONL files and reports likely agent inefficiency
patterns after a cutoff date.

Options:
  --since <YYYY-MM-DD>     Include sessions on or after this UTC date.
  --cwd <path>             Only include sessions whose cwd matches this prefix.
  --sessions-root <path>   Override the Codex sessions root. Defaults to ~/.codex/sessions.
  --limit <n>              Max sessions to include in the report. Defaults to 20.
  --min-score <n>          Only include sessions with score >= n. Defaults to 1.
  --write <path>           Write the Markdown report to a file instead of stdout.
  --help, -h               Show this help text.
`);
}

function parseArgs(argv) {
  const options = {
    cwdPrefix: null,
    limit: 20,
    minScore: 1,
    sessionsRoot: defaultSessionsRoot,
    since: null,
    writePath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--since') {
      options.since = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === '--cwd') {
      options.cwdPrefix = normalizePath(requireValue(argv, index, arg));
      index += 1;
    } else if (arg === '--sessions-root') {
      options.sessionsRoot = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === '--limit') {
      options.limit = parsePositiveInt(requireValue(argv, index, arg), arg);
      index += 1;
    } else if (arg === '--min-score') {
      options.minScore = parsePositiveInt(requireValue(argv, index, arg), arg);
      index += 1;
    } else if (arg === '--write') {
      options.writePath = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.since) {
    throw new Error(
      '--since is required so the report stays focused on the new agent environment.'
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.since)) {
    throw new Error('--since must use YYYY-MM-DD format.');
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

function parsePositiveInt(value, flag) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
}

function normalizePath(value) {
  return value.replace(/\\/g, '/').replace(/\/+$/, '');
}

function listJsonlFiles(rootDir) {
  const files = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(nextPath);
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        files.push(nextPath);
      }
    }
  }

  walk(rootDir);
  return files.sort();
}

function readJsonl(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/\u0000/g, '');
  const lines = raw.split('\n').filter(Boolean);
  const records = [];
  let skippedLines = 0;
  for (const line of lines) {
    try {
      records.push(JSON.parse(line));
    } catch {
      skippedLines += 1;
    }
  }
  return { records, skippedLines };
}

function safeParseCommand(callRecord) {
  if (!callRecord || callRecord.type !== 'response_item') {
    return null;
  }
  const payload = callRecord.payload;
  if (!payload || payload.type !== 'function_call') {
    return null;
  }

  let args = null;
  try {
    args = JSON.parse(payload.arguments);
  } catch {
    args = null;
  }

  return {
    callId: payload.call_id,
    name: payload.name,
    args,
  };
}

function commandCategory(command) {
  if (!command) {
    return 'unknown';
  }
  if (command.includes('eweser-runtime-orientation.sh')) {
    return 'runtime-orientation';
  }
  if (
    command.includes('npm test') ||
    command.includes('vitest') ||
    command.includes('cypress') ||
    command.includes('npm run type-check') ||
    command.includes('npm run check') ||
    command.includes('npm run build')
  ) {
    return 'verification';
  }
  if (command.includes('git status')) {
    return 'git-status';
  }
  if (command.includes('sed -n') && command.includes('INDEX.md')) {
    return 'index-read';
  }
  if (command.includes('sed -n') && command.includes('LOCAL_DEVELOPMENT.md')) {
    return 'local-dev-read';
  }
  if (command.includes('rg ') || command.includes('rg --files')) {
    return 'search';
  }
  if (command.includes('find ')) {
    return 'find';
  }
  return 'other';
}

function extractSession(records, filePath) {
  const meta =
    records.find((record) => record.type === 'session_meta')?.payload ?? {};
  const taskComplete = [...records]
    .reverse()
    .find(
      (record) =>
        record.type === 'event_msg' && record.payload?.type === 'task_complete'
    )?.payload;
  const threadName = [...records]
    .reverse()
    .find(
      (record) =>
        record.type === 'event_msg' &&
        record.payload?.type === 'thread_name_updated'
    )?.payload?.thread_name;
  const firstUserMessage = records.find(
    (record) =>
      record.type === 'event_msg' && record.payload?.type === 'user_message'
  )?.payload?.message;

  const callMap = new Map();
  const commands = [];
  const tokenSnapshots = [];

  for (const record of records) {
    const parsedCall = safeParseCommand(record);
    if (parsedCall) {
      callMap.set(parsedCall.callId, parsedCall);
      continue;
    }

    if (
      record.type === 'event_msg' &&
      record.payload?.type === 'exec_command_end'
    ) {
      const call = callMap.get(record.payload.call_id);
      const commandText =
        call?.args?.cmd || record.payload.command?.join(' ') || '';
      commands.push({
        category: commandCategory(commandText),
        command: commandText,
        exitCode: record.payload.exit_code,
        status: record.payload.status,
        timestamp: record.timestamp,
      });
    }

    if (
      record.type === 'event_msg' &&
      record.payload?.type === 'token_count' &&
      record.payload.info?.last_token_usage
    ) {
      tokenSnapshots.push(record.payload.info.last_token_usage);
    }
  }

  return {
    commands,
    cwd: normalizePath(meta.cwd || ''),
    durationMs: taskComplete?.duration_ms ?? null,
    filePath,
    firstUserMessage: firstUserMessage?.trim() ?? '',
    id: meta.id || path.basename(filePath, '.jsonl'),
    threadName: threadName || null,
    timestamp: meta.timestamp || records[0]?.timestamp || null,
    tokenSnapshots,
  };
}

function analyzeSession(session) {
  const exactCounts = new Map();
  const verificationAttempts = new Map();
  const findings = [];
  let score = 0;

  let firstIndexReadAt = -1;
  let firstBroadSearchAt = -1;
  let firstRuntimeOrientationAt = -1;
  let firstVerificationAt = -1;

  for (const [index, command] of session.commands.entries()) {
    exactCounts.set(
      command.command,
      (exactCounts.get(command.command) ?? 0) + 1
    );

    if (command.category === 'index-read' && firstIndexReadAt === -1) {
      firstIndexReadAt = index;
    }
    if (
      (command.category === 'search' || command.category === 'find') &&
      firstBroadSearchAt === -1
    ) {
      firstBroadSearchAt = index;
    }
    if (
      command.category === 'runtime-orientation' &&
      firstRuntimeOrientationAt === -1
    ) {
      firstRuntimeOrientationAt = index;
    }
    if (command.category === 'verification' && firstVerificationAt === -1) {
      firstVerificationAt = index;
    }

    if (command.category === 'verification') {
      const stats = verificationAttempts.get(command.command) ?? {
        attempts: 0,
        failures: 0,
      };
      stats.attempts += 1;
      if (command.exitCode !== 0) {
        stats.failures += 1;
      }
      verificationAttempts.set(command.command, stats);
    }
  }

  const gitStatusCount = countCategory(session.commands, 'git-status');
  if (gitStatusCount >= 3) {
    score += 1;
    findings.push({
      category: 'command churn',
      detail: `Repeated \`git status --short\` ${gitStatusCount} times.`,
      recommendation:
        'Avoid habitual status polling unless the worktree may have changed externally.',
    });
  }

  const broadSearchCount =
    countCategory(session.commands, 'search') +
    countCategory(session.commands, 'find');
  if (broadSearchCount >= 4) {
    score += 1;
    findings.push({
      category: 'broad search churn',
      detail: `Ran ${broadSearchCount} broad search commands.`,
      recommendation:
        'Prefer the nearest `INDEX.md` and targeted `code-map` queries before wider `rg`/`find` passes.',
    });
  }

  if (
    firstBroadSearchAt !== -1 &&
    (firstIndexReadAt === -1 || firstBroadSearchAt < firstIndexReadAt)
  ) {
    score += 2;
    findings.push({
      category: 'missed index-first navigation',
      detail: 'Started broad search before opening an `INDEX.md`.',
      recommendation:
        'Strengthen instructions to read the nearest index before any repo-wide search for navigation tasks.',
    });
  }

  if (firstVerificationAt !== -1 && firstRuntimeOrientationAt === -1) {
    score += 2;
    findings.push({
      category: 'runtime orientation miss',
      detail:
        'Ran verification or local-environment commands without a runtime-orientation step.',
      recommendation:
        'Keep the runtime-orientation step near test instructions and add a shorter “before local tests” reminder in the most-used workflow docs.',
    });
  } else if (
    firstVerificationAt !== -1 &&
    firstRuntimeOrientationAt !== -1 &&
    firstVerificationAt < firstRuntimeOrientationAt
  ) {
    score += 2;
    findings.push({
      category: 'late runtime orientation',
      detail:
        'Started verification before runtime orientation, then corrected later.',
      recommendation:
        'Tighten the workflow so runtime orientation happens before any local test or server discovery commands.',
    });
  }

  for (const [command, stats] of verificationAttempts.entries()) {
    if (stats.failures >= 1 && stats.attempts >= 2) {
      score += 1;
      findings.push({
        category: 'verification retry',
        detail: `Retried \`${command}\` after ${stats.failures} failed attempt(s).`,
        recommendation:
          'Capture the failure mode in docs or add a helper script if this command fails for the same reason across sessions.',
      });
    }
  }

  for (const [command, count] of exactCounts.entries()) {
    if (count >= 3 && !command.includes('git status')) {
      score += 1;
      findings.push({
        category: 'exact command repetition',
        detail: `Repeated the same command ${count} times: \`${command}\`.`,
        recommendation:
          'Check whether a narrower helper command or a local script can replace repeated manual probing.',
      });
      break;
    }
  }

  if (
    (session.durationMs ?? 0) >= 10 * 60 * 1000 &&
    session.commands.length >= 25 &&
    score === 0
  ) {
    score += 1;
    findings.push({
      category: 'long exploratory session',
      detail: `Session ran for ${formatDuration(session.durationMs)} with ${session.commands.length} recorded commands but no strong specific pattern.`,
      recommendation:
        'Review whether the task needs a workflow note, a local helper script, or a source header in a confusing boundary file.',
    });
  }

  return {
    ...session,
    findings,
    score,
  };
}

function countCategory(commands, category) {
  return commands.filter((command) => command.category === category).length;
}

function formatDuration(durationMs) {
  if (!durationMs) {
    return 'unknown';
  }
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

function formatDate(isoString) {
  if (!isoString) {
    return 'unknown';
  }
  return isoString.slice(0, 10);
}

function summarizeThemes(sessions) {
  const counts = new Map();
  for (const session of sessions) {
    for (const finding of session.findings) {
      counts.set(finding.category, (counts.get(finding.category) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );
}

function buildMarkdownReport(options, sessions) {
  const lines = [];
  lines.push('# Codex Session Efficiency Retrospective');
  lines.push('');
  lines.push(`- Since: \`${options.since}\``);
  lines.push(`- Sessions root: \`${normalizePath(options.sessionsRoot)}\``);
  if (options.cwdPrefix) {
    lines.push(`- CWD filter: \`${options.cwdPrefix}\``);
  }
  lines.push(`- Included sessions: \`${sessions.length}\``);
  lines.push('');

  if (sessions.length === 0) {
    lines.push('No matching sessions cleared the score threshold.');
    return lines.join('\n');
  }

  lines.push('## Repeated Themes');
  lines.push('');
  for (const [category, count] of summarizeThemes(sessions)) {
    lines.push(`- ${category}: ${count}`);
  }
  lines.push('');
  lines.push('## Sessions');
  lines.push('');

  for (const session of sessions) {
    lines.push(`### ${session.threadName || session.id}`);
    lines.push('');
    lines.push(`- Date: \`${formatDate(session.timestamp)}\``);
    lines.push(`- Session id: \`${session.id}\``);
    lines.push(`- Score: \`${session.score}\``);
    lines.push(`- Duration: \`${formatDuration(session.durationMs)}\``);
    lines.push(`- Commands: \`${session.commands.length}\``);
    if (session.firstUserMessage) {
      lines.push(`- Prompt: ${truncateInline(session.firstUserMessage, 140)}`);
    }
    if (session.skippedLines > 0) {
      lines.push(`- Skipped malformed lines: \`${session.skippedLines}\``);
    }
    for (const finding of session.findings) {
      lines.push(`- ${finding.category}: ${finding.detail}`);
      lines.push(`  Recommendation: ${finding.recommendation}`);
    }
    lines.push('');
  }

  lines.push('## Next Instruction Deltas');
  lines.push('');
  lines.push(
    '- Promote only repeated patterns into durable instructions. One-offs should stay as notes or helper scripts.'
  );
  lines.push(
    '- Prefer fixes in `INDEX.md`, runtime/setup docs, or tiny helper scripts before adding more root-level instruction prose.'
  );
  lines.push(
    '- Re-run this report after each instruction or workflow change to confirm the same category declines.'
  );

  return lines.join('\n');
}

function truncateInline(text, limit) {
  const singleLine = text.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= limit) {
    return singleLine;
  }
  return `${singleLine.slice(0, limit - 3)}...`;
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (!fs.existsSync(options.sessionsRoot)) {
      throw new Error(`Sessions root does not exist: ${options.sessionsRoot}`);
    }

    const sinceStart = `${options.since}T00:00:00.000Z`;
    const files = listJsonlFiles(options.sessionsRoot);
    const analyzed = [];

    for (const filePath of files) {
      const { records, skippedLines } = readJsonl(filePath);
      if (records.length === 0) {
        continue;
      }
      const session = extractSession(records, filePath);
      session.skippedLines = skippedLines;
      if (!session.timestamp || session.timestamp < sinceStart) {
        continue;
      }
      if (options.cwdPrefix && !session.cwd.startsWith(options.cwdPrefix)) {
        continue;
      }
      const result = analyzeSession(session);
      if (result.score >= options.minScore) {
        analyzed.push(result);
      }
    }

    analyzed.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (b.durationMs ?? 0) - (a.durationMs ?? 0);
    });

    const selected = analyzed.slice(0, options.limit);
    const report = buildMarkdownReport(options, selected);

    if (options.writePath) {
      const absWritePath = path.resolve(process.cwd(), options.writePath);
      fs.mkdirSync(path.dirname(absWritePath), { recursive: true });
      fs.writeFileSync(absWritePath, `${report}\n`);
      console.log(`Wrote ${absWritePath}`);
      return;
    }

    console.log(report);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error('Run with --help for usage.');
    process.exit(1);
  }
}

main();
