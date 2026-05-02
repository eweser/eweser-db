#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const defaultMapPath = '.ai/code-map.json';

function printHelp() {
  console.log(`Usage: node scripts/code-map/query-code-map.mjs [options]

Options:
  --symbol <name>    Show export and named-import locations for a symbol.
  --package <name>   Show dependency specifier counts for a package.
  --file <path>      Show imports, exports, and re-exports for a file.
  --top-exports      Show files with the most exported symbols.
  --limit <n>        Limit printed rows. Defaults to 20.
  --map <path>       Read a specific code-map JSON file. Defaults to .ai/code-map.json.
  --refresh          Regenerate the code map before querying.
  --help, -h         Show this help text.
`);
}

function parseArgs(argv) {
  const options = {
    file: null,
    limit: 20,
    mapPath: defaultMapPath,
    packageName: null,
    refresh: false,
    symbol: null,
    topExports: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--symbol') {
      options.symbol = requireValue(argv, i, arg);
      i += 1;
    } else if (arg === '--package') {
      options.packageName = requireValue(argv, i, arg);
      i += 1;
    } else if (arg === '--file') {
      options.file = normalizePath(requireValue(argv, i, arg));
      i += 1;
    } else if (arg === '--top-exports') {
      options.topExports = true;
    } else if (arg === '--limit') {
      options.limit = parseLimit(requireValue(argv, i, arg));
      i += 1;
    } else if (arg === '--map') {
      options.mapPath = requireValue(argv, i, arg);
      i += 1;
    } else if (arg === '--refresh') {
      options.refresh = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  const queryCount = [
    options.symbol,
    options.packageName,
    options.file,
    options.topExports,
  ].filter(Boolean).length;

  if (queryCount !== 1) {
    throw new Error(
      'Choose exactly one query: --symbol, --package, --file, or --top-exports.'
    );
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

function parseLimit(value) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('--limit must be a positive integer');
  }
  return limit;
}

function normalizePath(value) {
  return value.replace(/\\/g, '/').replace(/^\.\//, '');
}

function ensureCodeMap(mapPath, refresh) {
  const absMapPath = path.resolve(repoRoot, mapPath);
  if (!refresh && fs.existsSync(absMapPath)) {
    return absMapPath;
  }

  execFileSync(
    process.execPath,
    ['scripts/code-map/generate-code-map.mjs', '--out', mapPath, '--pretty'],
    {
      cwd: repoRoot,
      stdio: ['ignore', 'ignore', 'inherit'],
    }
  );
  return absMapPath;
}

function readCodeMap(mapPath) {
  return JSON.parse(fs.readFileSync(mapPath, 'utf8'));
}

function formatHeader(codeMap) {
  const summary = codeMap.summary ?? {};
  console.log(
    `Code map: ${summary.filesParsed ?? 0} files, ${summary.filesWithExports ?? 0} with exports`
  );
}

function printLimited(title, rows, limit, formatter) {
  console.log(`\n${title} (${rows.length})`);
  if (rows.length === 0) {
    console.log('- none');
    return;
  }

  for (const row of rows.slice(0, limit)) {
    console.log(formatter(row));
  }
  if (rows.length > limit) {
    console.log(`- ... ${rows.length - limit} more`);
  }
}

function querySymbol(codeMap, symbol, limit) {
  formatHeader(codeMap);
  console.log(`Query: symbol ${symbol}`);

  const exports = codeMap.symbolIndex?.exports?.[symbol] ?? [];
  const imports = codeMap.symbolIndex?.namedImports?.[symbol] ?? [];

  printLimited('Exports and re-exports', exports, limit, (entry) => {
    return `- ${entry.file} (${entry.kind})`;
  });
  printLimited('Named imports', imports, limit, (entry) => {
    const local =
      entry.local && entry.local !== symbol ? ` as ${entry.local}` : '';
    return `- ${entry.file} from ${entry.specifier}${local}`;
  });
}

function queryPackage(codeMap, packageName, limit) {
  formatHeader(codeMap);
  console.log(`Query: package ${packageName}`);

  const rows = (codeMap.packageDependencyCounts ?? []).filter(
    (entry) => entry.fromPackage === packageName
  );

  printLimited('Dependency specifiers', rows, limit, (entry) => {
    return `- ${entry.specifier}: ${entry.count}`;
  });
}

function queryFile(codeMap, filePath, limit) {
  formatHeader(codeMap);
  console.log(`Query: file ${filePath}`);

  const exact = codeMap.files.find((file) => file.path === filePath);
  const file =
    exact ??
    codeMap.files.find((entry) => entry.path.endsWith(filePath)) ??
    null;

  if (!file) {
    const matches = codeMap.files
      .filter((entry) => entry.path.includes(filePath))
      .slice(0, limit);
    console.log('\nNo exact or suffix match.');
    printLimited('Partial matches', matches, limit, (entry) => {
      return `- ${entry.path}`;
    });
    process.exitCode = 1;
    return;
  }

  if (file.path !== filePath) {
    console.log(`Resolved: ${file.path}`);
  }

  printLimited('Imports', file.imports, limit, (entry) => {
    const names =
      entry.named.map((item) => item.local).join(', ') || 'side effect';
    const typeOnly = entry.isTypeOnly ? ' type-only' : '';
    return `- ${entry.specifier}: ${names}${typeOnly}`;
  });

  printLimited('Exports', file.exports, limit, (entry) => {
    return `- ${entry.name} (${entry.kind})`;
  });

  printLimited('Re-exports', file.reExports, limit, (entry) => {
    const names = entry.exported
      .map((item) =>
        item.name === item.sourceName
          ? item.name
          : `${item.sourceName} as ${item.name}`
      )
      .join(', ');
    return `- ${entry.specifier}: ${names || '*'}`;
  });
}

function queryTopExports(codeMap, limit) {
  formatHeader(codeMap);
  console.log('Query: top exported files');

  const rows = [...codeMap.files]
    .map((file) => ({
      path: file.path,
      count: file.exports.length,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.path.localeCompare(b.path));

  printLimited('Files with most exports', rows, limit, (entry) => {
    return `- ${entry.path}: ${entry.count}`;
  });
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const mapPath = ensureCodeMap(options.mapPath, options.refresh);
    const codeMap = readCodeMap(mapPath);

    if (options.symbol) {
      querySymbol(codeMap, options.symbol, options.limit);
    } else if (options.packageName) {
      queryPackage(codeMap, options.packageName, options.limit);
    } else if (options.file) {
      queryFile(codeMap, options.file, options.limit);
    } else if (options.topExports) {
      queryTopExports(codeMap, options.limit);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    console.error('Run with --help for usage.');
    process.exit(1);
  }
}

main();
