#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';

const CONSERVATIVE_SCOPE_PREFIXES = [
  'packages/shared/',
  'database/migrations/',
  'migrations/',
  'drizzle/',
  'docs/ai/plans/README.md',
];

const CONSERVATIVE_SCOPE_FILES = new Set([
  'package.json',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'tsconfig.json',
  'eslint.config.js',
  'vite.config.ts',
]);

const MODEL_MAP = {
  coding: 'gpt-5.4',
  strong: 'gpt-5.4',
  simple: 'gpt-5.4-mini',
  fast: 'gpt-5.4-mini',
  mini: 'gpt-5.4-mini',
};

const FINAL_STAGE_MODEL = 'gpt-5.4';

async function main() {
  const [command, ...args] = process.argv.slice(2);
  try {
    if (command === 'orchestrator') {
      await runOrchestrator(args);
    } else if (command === 'monitor') {
      runMonitor(args);
    } else {
      usage();
      process.exitCode = 2;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

function usage() {
  console.error(`Usage:
  scripts/codex/eweser-plan-orchestrator.sh <plan.md> [--dry-run] [--resume] [--run <id>] [--max-parallel <n>] [--sequential] [--allow-dirty] [--commit]
  scripts/codex/eweser-plan-orchestrator.sh <plan.md> --stop
  scripts/codex/eweser-plan-monitor.sh <plan.md> [--watch] [--interval <seconds>]`);
}

function parseArgs(args, mode) {
  const options = {
    allowDirty: false,
    commit: false,
    dryRun: false,
    interval: 60,
    maxParallel: undefined,
    resume: false,
    runId: undefined,
    sequential: false,
    stop: false,
    watch: false,
  };
  let planPath;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--allow-dirty') options.allowDirty = true;
    else if (arg === '--commit') options.commit = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--resume') options.resume = true;
    else if (arg === '--sequential') options.sequential = true;
    else if (arg === '--stop') options.stop = true;
    else if (arg === '--watch') options.watch = true;
    else if (arg === '--run')
      options.runId = requireValue(args, ++index, '--run');
    else if (arg === '--max-parallel')
      options.maxParallel = parsePositiveInt(
        requireValue(args, ++index, '--max-parallel'),
        '--max-parallel'
      );
    else if (arg === '--interval')
      options.interval = parsePositiveInt(
        requireValue(args, ++index, '--interval'),
        '--interval'
      );
    else if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`);
    else if (!planPath) planPath = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  if (!planPath) {
    usage();
    throw new Error(`${mode} requires a plan path`);
  }
  return { options, planPath };
}

function requireValue(args, index, option) {
  if (!args[index]) throw new Error(`${option} requires a value`);
  return args[index];
}

function parsePositiveInt(value, option) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0)
    throw new Error(`${option} must be a positive integer`);
  return parsed;
}

async function runOrchestrator(args) {
  const { options, planPath } = parseArgs(args, 'orchestrator');
  const repoRoot = gitOutput(['rev-parse', '--show-toplevel'], process.cwd());
  process.chdir(repoRoot);
  const plan = loadPlan(planPath, repoRoot);
  const layout = stateLayout(repoRoot, plan.slug);

  if (options.stop) {
    stopPlan(layout);
    return;
  }

  preflight(plan, options);
  const selectedPlan = selectRuns(plan, options.runId);
  validatePlan(selectedPlan);

  if (options.dryRun) {
    printDryRun(selectedPlan, options, layout);
    return;
  }

  if (!options.allowDirty && gitStatus(repoRoot).trim() !== '') {
    throw new Error(
      'Refusing to start a mutating orchestrator run on a dirty working tree. Re-run with --allow-dirty only if those changes are intentional and integration risk is acceptable.'
    );
  }

  mkdirSync(layout.stateDir, { recursive: true });
  mkdirSync(layout.logsDir, { recursive: true });
  mkdirSync(layout.reportsDir, { recursive: true });
  mkdirSync(layout.worktreesDir, { recursive: true });
  assertNoActiveRun(layout, options.resume);
  writeJson(layout.activeFile, {
    pid: process.pid,
    planPath: plan.relativePath,
    startedAt: new Date().toISOString(),
    status: 'running',
  });

  process.on('exit', () => {
    if (existsSync(layout.activeFile))
      rmSync(layout.activeFile, { force: true });
  });

  const result = await runCodingStages(selectedPlan, options, layout, repoRoot);
  if (!result.ok) {
    writeSummary(selectedPlan, layout);
    throw new Error(`Coding stages did not complete: ${result.reason}`);
  }

  integrateRuns(selectedPlan, options, layout, repoRoot);
  runFinalStages(selectedPlan, layout, repoRoot);
  writeSummary(selectedPlan, layout);
  console.log(
    `Orchestrator complete. Summary: ${relative(repoRoot, layout.summaryFile)}`
  );
}

function runMonitor(args) {
  const { options, planPath } = parseArgs(args, 'monitor');
  const repoRoot = gitOutput(['rev-parse', '--show-toplevel'], process.cwd());
  const plan = loadPlan(planPath, repoRoot);
  const layout = stateLayout(repoRoot, plan.slug);
  const render = () => {
    console.clear();
    printMonitor(plan, layout);
  };
  if (!options.watch) {
    printMonitor(plan, layout);
    return;
  }
  render();
  setInterval(render, options.interval * 1000);
}

function preflight(plan, options) {
  for (const tool of ['git', 'node', 'codex']) {
    const result = spawnSync(tool, ['--version'], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`Missing required tool: ${tool}`);
  }
  const jq = spawnSync('jq', ['--version'], { encoding: 'utf8' });
  if (jq.status !== 0) throw new Error('Missing required tool: jq');
  if (!plan.metadata.orchestration?.enabled)
    throw new Error('Plan orchestration.enabled must be true');
  if (options.maxParallel !== undefined && options.sequential)
    throw new Error('Use either --max-parallel or --sequential, not both');
}

function loadPlan(planPath, repoRoot) {
  const absolutePath = resolve(repoRoot, planPath);
  if (!existsSync(absolutePath))
    throw new Error(`Plan does not exist: ${planPath}`);
  const text = readFileSync(absolutePath, 'utf8');
  const metadata = parseMetadataBlock(text);
  const relativePath = relative(repoRoot, absolutePath);
  return {
    absolutePath,
    metadata,
    relativePath,
    slug: slugify(relativePath.replace(/\.md$/i, '')),
    text,
  };
}

function parseMetadataBlock(markdown) {
  const blocks = [
    ...markdown.matchAll(
      /<!--\s*eweser-orchestration\s*-->\s*\n```ya?ml\s*\n([\s\S]*?)```/gi
    ),
  ];
  const candidates = blocks
    .map((match) => parseSimpleYaml(match[1]))
    .filter((value) => value.orchestration || value.runs);
  if (candidates.length !== 1) {
    throw new Error(
      `Expected exactly one marked orchestration metadata block with orchestration and runs keys; found ${candidates.length}. Add <!-- eweser-orchestration --> immediately before the yaml fence.`
    );
  }
  return candidates[0];
}

function parseSimpleYaml(source) {
  const lines = source
    .split(/\r?\n/)
    .map((raw) => ({
      indent: raw.match(/^ */)?.[0].length ?? 0,
      text: raw.trim(),
    }))
    .filter((line) => line.text && !line.text.startsWith('#'));
  const root = {};
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.indent !== 0 || !line.text.endsWith(':'))
      throw new Error(`Unsupported YAML near: ${line.text}`);
    const key = line.text.slice(0, -1);
    const parsed = parseYamlValue(lines, index + 1, line.indent);
    root[key] = parsed.value;
    index = parsed.next;
  }
  return root;
}

function parseYamlValue(lines, start, parentIndent) {
  if (start >= lines.length || lines[start].indent <= parentIndent)
    return { value: {}, next: start };
  if (lines[start].text.startsWith('- '))
    return parseYamlList(lines, start, lines[start].indent);
  return parseYamlMap(lines, start, lines[start].indent);
}

function parseYamlMap(lines, start, indent) {
  const map = {};
  let index = start;
  while (
    index < lines.length &&
    lines[index].indent === indent &&
    !lines[index].text.startsWith('- ')
  ) {
    const separator = lines[index].text.indexOf(':');
    if (separator === -1)
      throw new Error(`Unsupported YAML map line: ${lines[index].text}`);
    const key = lines[index].text.slice(0, separator).trim();
    const rest = lines[index].text.slice(separator + 1).trim();
    if (rest) {
      map[key] = parseScalar(rest);
      index += 1;
    } else {
      const parsed = parseYamlValue(lines, index + 1, indent);
      map[key] = parsed.value;
      index = parsed.next;
    }
  }
  return { value: map, next: index };
}

function parseYamlList(lines, start, indent) {
  const list = [];
  let index = start;
  while (
    index < lines.length &&
    lines[index].indent === indent &&
    lines[index].text.startsWith('- ')
  ) {
    const item = lines[index].text.slice(2).trim();
    if (/^[A-Za-z0-9_-]+:\s*/.test(item)) {
      const map = {};
      const separator = item.indexOf(':');
      map[item.slice(0, separator).trim()] = parseScalar(
        item.slice(separator + 1).trim()
      );
      index += 1;
      while (index < lines.length && lines[index].indent > indent) {
        const childIndent = lines[index].indent;
        if (lines[index].text.startsWith('- ')) break;
        const keySeparator = lines[index].text.indexOf(':');
        if (keySeparator === -1)
          throw new Error(`Unsupported YAML list child: ${lines[index].text}`);
        const key = lines[index].text.slice(0, keySeparator).trim();
        const rest = lines[index].text.slice(keySeparator + 1).trim();
        if (rest) {
          map[key] = parseScalar(rest);
          index += 1;
        } else {
          const parsed = parseYamlValue(lines, index + 1, childIndent);
          map[key] = parsed.value;
          index = parsed.next;
        }
      }
      list.push(map);
    } else {
      list.push(parseScalar(item));
      index += 1;
    }
  }
  return { value: list, next: index };
}

function parseScalar(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === '[]') return [];
  if (/^\d+$/.test(value)) return Number.parseInt(value, 10);
  return value.replace(/^["']|["']$/g, '');
}

function selectRuns(plan, runId) {
  const runs = normalizeRuns(plan.metadata.runs ?? []);
  const selectedRuns = runId
    ? runs
        .filter((run) => run.id === runId)
        .map((run) => ({ ...run, dependsOn: [] }))
    : runs;
  if (runId && selectedRuns.length === 0)
    throw new Error(`Unknown run: ${runId}`);
  return {
    ...plan,
    orchestration: normalizeOrchestration(plan.metadata.orchestration ?? {}),
    runs: selectedRuns,
    allRuns: runs,
  };
}

function normalizeOrchestration(orchestration) {
  return {
    baseBranch: orchestration.baseBranch,
    enabled: orchestration.enabled === true,
    finalStages: Array.isArray(orchestration.finalStages)
      ? orchestration.finalStages
      : [],
    maxParallel: Number.isInteger(orchestration.maxParallel)
      ? orchestration.maxParallel
      : 1,
  };
}

function normalizeRuns(runs) {
  if (!Array.isArray(runs)) throw new Error('runs must be a YAML list');
  return runs.map((run) => ({
    agent: run.agent,
    allowSharedScope: run.allowSharedScope === true,
    changeset: run.changeset ?? 'maybe',
    dependsOn: Array.isArray(run.dependsOn) ? run.dependsOn : [],
    id: run.id,
    model: run.model ?? 'coding',
    parallel: run.parallel === true,
    tests: Array.isArray(run.tests) ? run.tests : [],
    title: run.title,
    writeScope: Array.isArray(run.writeScope) ? run.writeScope : [],
  }));
}

function validatePlan(plan) {
  const ids = new Set();
  for (const run of plan.allRuns) {
    if (!run.id || !/^[A-Za-z0-9._-]+$/.test(run.id))
      throw new Error(`Invalid run id: ${run.id}`);
    if (ids.has(run.id)) throw new Error(`Duplicate run id: ${run.id}`);
    ids.add(run.id);
    if (!run.title) throw new Error(`Run ${run.id} is missing title`);
    if (run.agent !== 'eweser-code')
      throw new Error(`Run ${run.id} uses unsupported agent: ${run.agent}`);
    if (!['coding', 'strong', 'simple', 'fast', 'mini'].includes(run.model))
      throw new Error(`Run ${run.id} uses unsupported model: ${run.model}`);
    if (run.writeScope.length === 0)
      throw new Error(`Run ${run.id} must declare writeScope`);
    for (const dep of run.dependsOn) {
      if (
        !ids.has(dep) &&
        !plan.allRuns.some((candidate) => candidate.id === dep)
      )
        throw new Error(`Run ${run.id} depends on unknown run: ${dep}`);
    }
  }
  detectDependencyCycles(plan.allRuns);
  for (const run of plan.allRuns) {
    if (
      run.parallel &&
      !run.allowSharedScope &&
      hasConservativeScope(run.writeScope)
    ) {
      throw new Error(
        `Run ${run.id} is parallel but touches conservative scope. Set parallel: false or document allowSharedScope: true.`
      );
    }
  }
  const parallelRuns = plan.allRuns.filter((run) => run.parallel);
  for (let outer = 0; outer < parallelRuns.length; outer += 1) {
    for (let inner = outer + 1; inner < parallelRuns.length; inner += 1) {
      if (
        scopesOverlap(
          parallelRuns[outer].writeScope,
          parallelRuns[inner].writeScope
        )
      ) {
        throw new Error(
          `Parallel runs ${parallelRuns[outer].id} and ${parallelRuns[inner].id} have overlapping write scopes`
        );
      }
    }
  }
  for (const stage of plan.orchestration.finalStages) {
    if (!['qa', 'review'].includes(stage))
      throw new Error(`Unsupported final stage: ${stage}`);
  }
}

function detectDependencyCycles(runs) {
  const byId = new Map(runs.map((run) => [run.id, run]));
  const visiting = new Set();
  const visited = new Set();
  const visit = (run) => {
    if (visited.has(run.id)) return;
    if (visiting.has(run.id))
      throw new Error(`Dependency cycle includes ${run.id}`);
    visiting.add(run.id);
    for (const dep of run.dependsOn) visit(byId.get(dep));
    visiting.delete(run.id);
    visited.add(run.id);
  };
  for (const run of runs) visit(run);
}

function hasConservativeScope(scopes) {
  return scopes.some((scope) => {
    const normalized = normalizeScope(scope);
    return (
      CONSERVATIVE_SCOPE_FILES.has(normalized) ||
      CONSERVATIVE_SCOPE_PREFIXES.some((prefix) =>
        normalized.startsWith(prefix)
      )
    );
  });
}

function scopesOverlap(left, right) {
  return left.some((leftScope) =>
    right.some(
      (rightScope) =>
        scopePrefix(leftScope).startsWith(scopePrefix(rightScope)) ||
        scopePrefix(rightScope).startsWith(scopePrefix(leftScope))
    )
  );
}

function normalizeScope(scope) {
  return scope.replace(/^\.\//, '').replace(/\/+$/, '');
}

function scopePrefix(scope) {
  const normalized = normalizeScope(scope);
  const star = normalized.indexOf('*');
  if (star === -1) {
    return normalized;
  }
  const prefix = normalized.slice(0, star).replace(/\/+$/, '');
  return prefix === '' ? '' : `${prefix}/`;
}

function printDryRun(plan, options, layout) {
  console.log(`Plan: ${plan.relativePath}`);
  console.log(`State: ${relative(process.cwd(), layout.root)}`);
  console.log(
    `Base branch: ${plan.orchestration.baseBranch || currentBranch()}`
  );
  console.log(
    `Max parallel: ${options.sequential ? 1 : (options.maxParallel ?? plan.orchestration.maxParallel)}`
  );
  console.log('');
  for (const run of topologicalRuns(plan.runs)) {
    console.log(`- ${run.id}: ${run.title}`);
    console.log(`  dependsOn: ${run.dependsOn.join(', ') || '(none)'}`);
    console.log(`  parallel: ${run.parallel}`);
    console.log(`  writeScope: ${run.writeScope.join(', ')}`);
    console.log(`  tests: ${run.tests.join(' && ') || '(none)'}`);
  }
  console.log('');
  console.log(
    'Dry run only. No state, worktrees, workers, merges, QA, or review were started.'
  );
}

function runCodingStages(plan, options, layout, repoRoot) {
  const maxParallel = options.sequential
    ? 1
    : (options.maxParallel ?? plan.orchestration.maxParallel);
  const queue = topologicalRuns(plan.runs);
  const completed = new Set(readCompletedRunIds(layout));
  const running = new Map();
  const failed = [];

  return runScheduler({
    completed,
    failed,
    layout,
    maxParallel,
    options,
    plan,
    queue,
    repoRoot,
    running,
  });
}

function runScheduler(context) {
  return new Promise((resolvePromise) => {
    const tick = () => {
      if (context.failed.length > 0) {
        resolvePromise({ ok: false, reason: context.failed.join(', ') });
        return;
      }
      if (context.completed.size === context.queue.length) {
        resolvePromise({ ok: true });
        return;
      }
      let started = false;
      for (const run of context.queue) {
        if (context.completed.has(run.id) || context.running.has(run.id))
          continue;
        if (context.running.size >= context.maxParallel) break;
        if (!run.dependsOn.every((dep) => context.completed.has(dep))) continue;
        startWorker(run, context).then((result) => {
          context.running.delete(run.id);
          if (result.ok) context.completed.add(run.id);
          else context.failed.push(`${run.id}: ${result.reason}`);
          tick();
        });
        context.running.set(run.id, true);
        started = true;
      }
      if (!started && context.running.size === 0) {
        resolvePromise({
          ok: false,
          reason: 'no runnable jobs; check dependencies and resume state',
        });
      }
    };
    tick();
  });
}

async function startWorker(run, context) {
  const startedAt = new Date().toISOString();
  const runStateFile = join(context.layout.stateDir, `${run.id}.state`);
  const logFile = join(context.layout.logsDir, `${run.id}.log`);
  const outputFile = join(
    context.layout.reportsDir,
    `${run.id}-last-message.md`
  );
  const branch = workerBranch(context.plan.slug, run.id);
  const worktree = join(context.layout.worktreesDir, run.id);
  writeJson(runStateFile, {
    branch,
    logFile,
    outputFile,
    pid: null,
    runId: run.id,
    startedAt,
    status: 'starting',
    worktree,
  });
  try {
    ensureWorktree(
      context.repoRoot,
      worktree,
      branch,
      workerBaseBranch(context.plan, run)
    );
    materializePlanForWorker(context.plan, run, worktree);
    const prompt = workerPrompt(context.plan, run);
    const args = [
      'exec',
      '--cd',
      worktree,
      '--sandbox',
      'workspace-write',
      '--output-last-message',
      outputFile,
    ];
    const model = MODEL_MAP[run.model];
    if (model) args.push('--model', model);
    args.push(prompt);
    const result = await spawnLogged('codex', args, logFile, {
      cwd: context.repoRoot,
      onSpawn: (child) => {
        writeJson(runStateFile, {
          branch,
          logFile,
          outputFile,
          pid: child.pid,
          runId: run.id,
          startedAt,
          status: 'in_progress',
          worktree,
        });
      },
    });
    if (result.code !== 0) {
      writeJson(runStateFile, {
        branch,
        code: result.code,
        finishedAt: new Date().toISOString(),
        logFile,
        outputFile,
        runId: run.id,
        status: 'blocked',
        worktree,
      });
      return { ok: false, reason: `worker exited ${result.code}` };
    }
    const dirtyFiles = dirtyFilesForWorktree(worktree);
    const dirtyViolations = dirtyFiles.filter(
      (file) => !isWithinScopes(file, run.writeScope)
    );
    if (dirtyViolations.length > 0) {
      writeJson(runStateFile, {
        branch,
        dirtyFiles,
        finishedAt: new Date().toISOString(),
        logFile,
        outputFile,
        runId: run.id,
        scopeViolations: dirtyViolations,
        status: 'blocked',
        worktree,
      });
      return {
        ok: false,
        reason: `scope violations: ${dirtyViolations.join(', ')}`,
      };
    }
    if (dirtyFiles.length > 0) {
      commitWorkerChanges(run, worktree, logFile, dirtyFiles);
    }
    const changedFiles = changedFilesForBranch(
      context.repoRoot,
      branch,
      context.plan.orchestration.baseBranch || currentBranch()
    );
    const violations = changedFiles.filter(
      (file) => !isWithinScopes(file, run.writeScope)
    );
    if (violations.length > 0) {
      writeJson(runStateFile, {
        branch,
        changedFiles,
        finishedAt: new Date().toISOString(),
        logFile,
        outputFile,
        runId: run.id,
        scopeViolations: violations,
        status: 'blocked',
        worktree,
      });
      return {
        ok: false,
        reason: `scope violations: ${violations.join(', ')}`,
      };
    }
    writeJson(runStateFile, {
      branch,
      changedFiles,
      finishedAt: new Date().toISOString(),
      logFile,
      outputFile,
      runId: run.id,
      status: 'completed',
      worktree,
    });
    return { ok: true };
  } catch (error) {
    writeJson(runStateFile, {
      branch,
      error: String(error instanceof Error ? error.message : error),
      finishedAt: new Date().toISOString(),
      logFile,
      outputFile,
      runId: run.id,
      status: 'blocked',
      worktree,
    });
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

function ensureWorktree(repoRoot, worktree, branch, baseBranch) {
  if (existsSync(worktree)) return;
  mkdirSync(dirname(worktree), { recursive: true });
  runGit(
    ['worktree', 'add', '-B', branch, worktree, baseBranch],
    repoRoot,
    join(repoRoot, '.codex', 'orchestrator-worktree-add.log')
  );
}

function workerBaseBranch(plan, run) {
  if (run.dependsOn.length === 1)
    return workerBranch(plan.slug, run.dependsOn[0]);
  return plan.orchestration.baseBranch || currentBranch();
}

function materializePlanForWorker(plan, run, worktree) {
  if (!isWithinScopes(plan.relativePath, run.writeScope)) return;
  const target = join(worktree, plan.relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, plan.text);
}

function workerPrompt(plan, run) {
  return `Implement run ${run.id} from ${plan.relativePath} using $eweser-code.

You are not alone in the codebase. Do not revert or overwrite unrelated user changes. Keep edits inside this run's declared write scope unless the plan is wrong and you explain the blocker.
The orchestrator has materialized the current plan text at ${plan.relativePath} for context. Do not include that file in your commit unless it is inside this run's declared write scope and you intentionally changed it.

Run title: ${run.title}
Write scope:
${run.writeScope.map((scope) => `- ${scope}`).join('\n')}

Required verification commands:
${run.tests.length > 0 ? run.tests.map((test) => `- ${test}`).join('\n') : '- No run-specific tests listed; run the narrowest relevant check you can justify.'}

Plan path: ${plan.relativePath}

The current full plan content is included below for context:

\`\`\`markdown
${plan.text}
\`\`\`

Do not commit changes yourself. The orchestrator parent process will stage and commit scoped worker changes after your process exits.

Finish with: files changed, verification commands and outcomes, blockers, and residual risks.`;
}

function integrateRuns(plan, options, layout, repoRoot) {
  for (const run of topologicalRuns(plan.runs)) {
    const state = readJson(join(layout.stateDir, `${run.id}.state`));
    if (state.status !== 'completed')
      throw new Error(`Cannot integrate ${run.id}; state is ${state.status}`);
    const logFile = join(layout.logsDir, `${run.id}-integration.log`);
    writeJson(join(layout.stateDir, `${run.id}.integration.state`), {
      branch: state.branch,
      runId: run.id,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    });
    try {
      runGit(['merge', '--squash', state.branch], repoRoot, logFile);
      for (const command of run.tests) runShell(command, repoRoot, logFile);
      if (options.commit)
        runGit(
          ['commit', '-m', `Integrate orchestrator run ${run.id}`],
          repoRoot,
          logFile
        );
      writeJson(join(layout.stateDir, `${run.id}.integration.state`), {
        branch: state.branch,
        runId: run.id,
        status: 'completed',
        finishedAt: new Date().toISOString(),
      });
    } catch (error) {
      const conflicts = gitOutput(
        ['diff', '--name-only', '--diff-filter=U'],
        repoRoot,
        false
      ).trim();
      writeJson(join(layout.stateDir, `${run.id}.integration.state`), {
        branch: state.branch,
        conflicts: conflicts ? conflicts.split(/\r?\n/) : [],
        error: error instanceof Error ? error.message : String(error),
        finishedAt: new Date().toISOString(),
        runId: run.id,
        status: 'blocked',
      });
      throw new Error(
        `Integration blocked for ${run.id}. Conflicts: ${conflicts || '(none reported)'}`
      );
    }
  }
}

function runFinalStages(plan, layout, repoRoot) {
  for (const stage of plan.orchestration.finalStages) {
    const prompt = finalStagePrompt(stage, plan);
    const logFile = join(layout.logsDir, `${stage}.log`);
    const outputFile = join(layout.reportsDir, `${stage}.md`);
    const stateFile = join(layout.stateDir, `${stage}.state`);
    writeJson(stateFile, {
      outputFile,
      stage,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    });
    const result = spawnSync(
      'codex',
      [
        'exec',
        '--cd',
        repoRoot,
        '--sandbox',
        'workspace-write',
        '--model',
        FINAL_STAGE_MODEL,
        '--output-last-message',
        outputFile,
        prompt,
      ],
      {
        cwd: repoRoot,
        encoding: 'utf8',
      }
    );
    appendLog(logFile, result.stdout ?? '');
    appendLog(logFile, result.stderr ?? '');
    if (result.status !== 0) {
      writeJson(stateFile, {
        code: result.status,
        outputFile,
        stage,
        status: 'blocked',
        finishedAt: new Date().toISOString(),
      });
      throw new Error(`${stage} stage exited ${result.status}`);
    }
    const report = existsSync(outputFile)
      ? readFileSync(outputFile, 'utf8')
      : '';
    if (stage === 'qa' && /\bFAIL\b/i.test(report)) {
      writeJson(stateFile, {
        outputFile,
        stage,
        status: 'blocked',
        finishedAt: new Date().toISOString(),
      });
      throw new Error('QA reported FAIL');
    }
    if (stage === 'review' && /\bP[12]\b/.test(report)) {
      writeJson(stateFile, {
        outputFile,
        stage,
        status: 'blocked',
        finishedAt: new Date().toISOString(),
      });
      throw new Error('Review reported P1/P2 findings');
    }
    writeJson(stateFile, {
      outputFile,
      stage,
      status: 'completed',
      finishedAt: new Date().toISOString(),
    });
  }
}

function finalStagePrompt(stage, plan) {
  if (stage === 'qa') {
    return `Run Eweser QA with $eweser-qa for completed orchestrated plan ${plan.relativePath}. Verify the integrated branch, run appropriate checks, and report PASS or FAIL with exact commands, changed files, blockers, and residual risk.`;
  }
  return `Run Eweser Review with $eweser-review for completed orchestrated plan ${plan.relativePath}. Use a code-review stance. Lead with P1/P2/P3 findings using file and line references, then summarize verification gaps and residual risk.`;
}

function topologicalRuns(runs) {
  const byId = new Map(runs.map((run) => [run.id, run]));
  const sorted = [];
  const visited = new Set();
  const visit = (run) => {
    if (visited.has(run.id)) return;
    for (const dep of run.dependsOn) {
      if (byId.has(dep)) visit(byId.get(dep));
    }
    visited.add(run.id);
    sorted.push(run);
  };
  for (const run of runs) visit(run);
  return sorted;
}

function stateLayout(repoRoot, slug) {
  const root = join(repoRoot, '.codex', 'orchestrator', slug);
  return {
    activeFile: join(root, 'active.json'),
    logsDir: join(root, 'logs'),
    reportsDir: join(root, 'reports'),
    root,
    stateDir: join(root, 'state'),
    summaryFile: join(root, 'summary.md'),
    worktreesDir: join(root, 'worktrees'),
  };
}

function assertNoActiveRun(layout, resume) {
  if (!existsSync(layout.activeFile)) return;
  const active = readJson(layout.activeFile);
  if (isPidAlive(active.pid))
    throw new Error(
      `Another orchestrator is active for this plan: pid ${active.pid}`
    );
  if (!resume)
    throw new Error(
      'Stale active marker exists. Use --resume after checking monitor output, or --stop to mark interrupted.'
    );
}

function stopPlan(layout) {
  if (!existsSync(layout.activeFile)) {
    console.log('No active orchestrator marker found.');
    markInterrupted(layout);
    return;
  }
  const active = readJson(layout.activeFile);
  const pids = processTree(active.pid);
  for (const pid of pids.reverse()) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // Already gone.
    }
  }
  rmSync(layout.activeFile, { force: true });
  markInterrupted(layout);
  console.log(
    `Stopped orchestrator process tree: ${pids.join(', ') || active.pid}`
  );
}

function markInterrupted(layout) {
  if (!existsSync(layout.stateDir)) return;
  const entries = spawnSync(
    'find',
    [layout.stateDir, '-maxdepth', '1', '-name', '*.state'],
    { encoding: 'utf8' }
  ).stdout.trim();
  if (!entries) return;
  for (const file of entries.split(/\r?\n/)) {
    const state = readJson(file);
    if (state.status === 'in_progress' || state.status === 'starting') {
      writeJson(file, {
        ...state,
        status: 'interrupted',
        interruptedAt: new Date().toISOString(),
      });
    }
  }
}

function printMonitor(plan, layout) {
  console.log(`# Orchestrator Monitor`);
  console.log(`Plan: ${plan.relativePath}`);
  console.log(`State: ${layout.root}`);
  if (existsSync(layout.activeFile)) {
    const active = readJson(layout.activeFile);
    console.log(
      `Active: pid ${active.pid} (${isPidAlive(active.pid) ? 'running' : 'stale'})`
    );
  } else {
    console.log('Active: no');
  }
  console.log('');
  if (!existsSync(layout.stateDir)) {
    console.log('No state directory yet.');
    return;
  }
  const files = spawnSync(
    'find',
    [layout.stateDir, '-maxdepth', '1', '-name', '*.state'],
    { encoding: 'utf8' }
  )
    .stdout.trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
  if (files.length === 0) {
    console.log('No state files yet.');
    return;
  }
  for (const file of files) {
    const state = readJson(file);
    const label = state.runId || state.stage || file;
    const stale =
      state.pid && state.status === 'in_progress' && !isPidAlive(state.pid)
        ? ' stale'
        : '';
    console.log(`- ${label}: ${state.status}${stale}`);
    if (state.branch) console.log(`  branch: ${state.branch}`);
    if (state.worktree) console.log(`  worktree: ${state.worktree}`);
    if (state.logFile) console.log(`  log: ${state.logFile}`);
    if (state.conflicts?.length)
      console.log(`  conflicts: ${state.conflicts.join(', ')}`);
    if (state.scopeViolations?.length)
      console.log(`  scope violations: ${state.scopeViolations.join(', ')}`);
  }
}

function writeSummary(plan, layout) {
  mkdirSync(dirname(layout.summaryFile), { recursive: true });
  const lines = [
    `# Orchestrator Summary`,
    '',
    `Plan: ${plan.relativePath}`,
    '',
    '## Runs',
    '',
  ];
  if (existsSync(layout.stateDir)) {
    const files = spawnSync(
      'find',
      [layout.stateDir, '-maxdepth', '1', '-name', '*.state'],
      { encoding: 'utf8' }
    )
      .stdout.trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .sort();
    for (const file of files) {
      const state = readJson(file);
      lines.push(`- ${state.runId || state.stage || file}: ${state.status}`);
      if (state.changedFiles?.length)
        lines.push(`  - changed files: ${state.changedFiles.join(', ')}`);
      if (state.conflicts?.length)
        lines.push(`  - conflicts: ${state.conflicts.join(', ')}`);
      if (state.scopeViolations?.length)
        lines.push(`  - scope violations: ${state.scopeViolations.join(', ')}`);
    }
  }
  writeFileSync(layout.summaryFile, `${lines.join('\n')}\n`);
}

function changedFilesForBranch(repoRoot, branch, baseBranch) {
  const output = gitOutput(
    ['diff', '--name-only', `${baseBranch}...${branch}`],
    repoRoot,
    false
  ).trim();
  return output ? output.split(/\r?\n/) : [];
}

function dirtyFilesForWorktree(worktree) {
  const output = gitOutput(['status', '--porcelain'], worktree, false).trim();
  if (!output) return [];
  return output
    .split(/\r?\n/)
    .map((line) => {
      const path = line.slice(3);
      const renameSeparator = ' -> ';
      return path.includes(renameSeparator)
        ? path.slice(path.indexOf(renameSeparator) + renameSeparator.length)
        : path;
    })
    .filter(Boolean);
}

function commitWorkerChanges(run, worktree, logFile, files) {
  runGit(['add', '--', ...files], worktree, logFile);
  runGit(
    ['commit', '-m', `Orchestrator ${run.id}: ${run.title}`],
    worktree,
    logFile
  );
}

function isWithinScopes(file, scopes) {
  const normalized = normalizeScope(file);
  return scopes.some((scope) => {
    const prefix = scopePrefix(scope);
    return (
      normalized === normalizeScope(scope) || normalized.startsWith(prefix)
    );
  });
}

function readCompletedRunIds(layout) {
  if (!existsSync(layout.stateDir)) return [];
  const entries = spawnSync(
    'find',
    [layout.stateDir, '-maxdepth', '1', '-name', '*.state'],
    { encoding: 'utf8' }
  ).stdout.trim();
  if (!entries) return [];
  return entries
    .split(/\r?\n/)
    .map((file) => readJson(file))
    .filter((state) => state.runId && state.status === 'completed')
    .map((state) => state.runId);
}

function workerBranch(slug, runId) {
  return `codex/orchestrator/${slug}/${runId}`.replaceAll(
    /[^A-Za-z0-9/_-]/g,
    '-'
  );
}

function slugify(value) {
  return value.replaceAll(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

function currentBranch() {
  return gitOutput(['rev-parse', '--abbrev-ref', 'HEAD'], process.cwd());
}

function gitStatus(cwd) {
  return gitOutput(['status', '--short'], cwd, false);
}

function runGit(args, cwd, logFile) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  appendLog(
    logFile,
    `$ git ${args.join(' ')}\n${result.stdout ?? ''}${result.stderr ?? ''}`
  );
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed`);
  return result.stdout;
}

function gitOutput(args, cwd, required = true) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (required && result.status !== 0)
    throw new Error(
      (result.stderr || result.stdout || `git ${args.join(' ')} failed`).trim()
    );
  return (result.stdout ?? '').trim();
}

function runShell(command, cwd, logFile) {
  const result = spawnSync(command, [], { cwd, encoding: 'utf8', shell: true });
  appendLog(
    logFile,
    `$ ${command}\n${result.stdout ?? ''}${result.stderr ?? ''}`
  );
  if (result.status !== 0) throw new Error(`Command failed: ${command}`);
}

function spawnLogged(command, args, logFile, options = {}) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    options.onSpawn?.(child);
    child.stdout.on('data', (chunk) => appendLog(logFile, chunk.toString()));
    child.stderr.on('data', (chunk) => appendLog(logFile, chunk.toString()));
    child.on('close', (code) => resolvePromise({ code }));
  });
}

function appendLog(file, text) {
  if (!file || !text) return;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text, { flag: 'a' });
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

function processTree(rootPid) {
  if (!rootPid) return [];
  const result = spawnSync('ps', ['-Ao', 'pid=,ppid=,command='], {
    encoding: 'utf8',
  });
  const children = new Map();
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);
    if (!match) continue;
    const pid = Number(match[1]);
    const ppid = Number(match[2]);
    if (!children.has(ppid)) children.set(ppid, []);
    children.get(ppid).push(pid);
  }
  const collected = [];
  const visit = (pid) => {
    collected.push(pid);
    for (const child of children.get(pid) ?? []) visit(child);
  };
  visit(Number(rootPid));
  return collected;
}

main();
