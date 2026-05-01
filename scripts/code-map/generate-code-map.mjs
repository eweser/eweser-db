#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const repoRoot = process.cwd();
const defaultRoots = ['packages', 'examples'];
const skippedDirectories = new Set([
  '.git',
  '.next',
  '.turbo',
  '.cache',
  '.codex',
  '.agents',
  '.astro',
  '.expo',
  'node_modules',
  'dist',
  'dist-ssr',
  'types',
  'coverage',
  'downloads',
  'build',
  'out',
]);

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function relativePath(absPath) {
  return toPosix(path.relative(repoRoot, absPath));
}

function parseArgs(argv) {
  const options = {
    out: null,
    pretty: false,
    roots: defaultRoots,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') {
      const out = argv[i + 1];
      if (!out) {
        throw new Error('--out requires a path');
      }
      options.out = out;
      i += 1;
    } else if (arg === '--pretty') {
      options.pretty = true;
    } else if (arg === '--roots') {
      const roots = argv[i + 1];
      if (!roots) {
        throw new Error('--roots requires a comma-separated list');
      }
      options.roots = roots
        .split(',')
        .map((root) => root.trim())
        .filter(Boolean);
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/code-map/generate-code-map.mjs [options]

Options:
  --out <path>       Write JSON to a file instead of stdout.
  --pretty          Pretty-print JSON.
  --roots <list>    Comma-separated scan roots. Defaults to packages,examples.
  --help, -h        Show this help text.
`);
}

function shouldSkipDirectory(absPath) {
  return skippedDirectories.has(path.basename(absPath));
}

function walk(absDir, visitor) {
  if (!fs.existsSync(absDir)) {
    return;
  }

  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const absPath = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      if (!shouldSkipDirectory(absPath)) {
        walk(absPath, visitor);
      }
      continue;
    }

    if (
      entry.isFile() &&
      /\.(ts|tsx|mts|cts)$/.test(entry.name) &&
      !entry.name.endsWith('.d.ts')
    ) {
      visitor(absPath);
    }
  }
}

function getSourceFiles(roots) {
  const files = [];
  for (const root of roots) {
    walk(path.join(repoRoot, root), (absPath) => files.push(absPath));
  }
  return files.sort((a, b) => relativePath(a).localeCompare(relativePath(b)));
}

function getPackageName(relPath) {
  const parts = relPath.split('/');
  if (parts[0] === 'packages' || parts[0] === 'examples') {
    return parts.slice(0, 2).join('/');
  }
  return parts[0] ?? '.';
}

function getNodeName(node) {
  return ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)
    ? node.name.text
    : null;
}

function hasExportModifier(node) {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : [];
  return (
    modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
    ) ?? false
  );
}

function hasDefaultModifier(node) {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : [];
  return (
    modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword
    ) ?? false
  );
}

function pushNamedImport(imports, importClause) {
  if (!importClause) {
    return;
  }

  if (importClause.name) {
    imports.push({
      imported: 'default',
      local: importClause.name.text,
    });
  }

  const bindings = importClause.namedBindings;
  if (!bindings) {
    return;
  }

  if (ts.isNamespaceImport(bindings)) {
    imports.push({
      imported: '*',
      local: bindings.name.text,
    });
    return;
  }

  for (const element of bindings.elements) {
    imports.push({
      imported: element.propertyName?.text ?? element.name.text,
      local: element.name.text,
    });
  }
}

function getExportedDeclarationName(node) {
  const name = getNodeName(node);
  if (name) {
    return name;
  }
  return hasDefaultModifier(node) ? 'default' : null;
}

function collectVariableExports(statement) {
  const exports = [];
  if (!hasExportModifier(statement)) {
    return exports;
  }

  for (const declaration of statement.declarationList.declarations) {
    if (ts.isIdentifier(declaration.name)) {
      exports.push({
        name: declaration.name.text,
        kind: 'variable',
      });
    }
  }
  return exports;
}

function collectSourceFile(absPath) {
  const text = fs.readFileSync(absPath, 'utf8');
  const relPath = relativePath(absPath);
  const sourceFile = ts.createSourceFile(
    absPath,
    text,
    ts.ScriptTarget.Latest,
    false,
    absPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const imports = [];
  const exports = [];
  const reExports = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const named = [];
      pushNamedImport(named, statement.importClause);
      imports.push({
        specifier: statement.moduleSpecifier.text,
        named,
        isTypeOnly: statement.importClause?.isTypeOnly ?? false,
      });
      continue;
    }

    if (ts.isExportDeclaration(statement)) {
      const exported = [];
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          const name = element.name.text;
          exported.push({
            name,
            sourceName: element.propertyName?.text ?? name,
          });
          exports.push({
            name,
            kind: 're-export',
          });
        }
      } else {
        exported.push({
          name: '*',
          sourceName: '*',
        });
      }

      if (
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        reExports.push({
          specifier: statement.moduleSpecifier.text,
          exported,
          isTypeOnly: statement.isTypeOnly,
        });
      }
      continue;
    }

    if (ts.isExportAssignment(statement)) {
      exports.push({
        name: 'default',
        kind: 'assignment',
      });
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      exports.push(...collectVariableExports(statement));
      continue;
    }

    if (
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement)
    ) {
      if (!hasExportModifier(statement)) {
        continue;
      }
      const name = getExportedDeclarationName(statement);
      if (name) {
        exports.push({
          name,
          kind: ts.SyntaxKind[statement.kind],
        });
      }
    }
  }

  return {
    path: relPath,
    package: getPackageName(relPath),
    imports,
    exports,
    reExports,
  };
}

function buildPackageDependencyCounts(files) {
  const counts = new Map();
  for (const file of files) {
    for (const entry of [...file.imports, ...file.reExports]) {
      const key = `${file.package}\u0000${entry.specifier}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([key, count]) => {
      const [fromPackage, specifier] = key.split('\u0000');
      return { fromPackage, specifier, count };
    })
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.fromPackage.localeCompare(b.fromPackage) ||
        a.specifier.localeCompare(b.specifier)
    );
}

function buildSymbolIndex(files) {
  const exports = new Map();
  const namedImports = new Map();

  for (const file of files) {
    for (const item of file.exports) {
      const list = exports.get(item.name) ?? [];
      list.push({
        file: file.path,
        kind: item.kind,
      });
      exports.set(item.name, list);
    }

    for (const item of file.imports) {
      for (const named of item.named) {
        const list = namedImports.get(named.imported) ?? [];
        list.push({
          file: file.path,
          specifier: item.specifier,
          local: named.local,
        });
        namedImports.set(named.imported, list);
      }
    }
  }

  const sortedExports = Object.fromEntries(
    [...exports.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, entries]) => [
        name,
        entries.sort((a, b) => a.file.localeCompare(b.file)),
      ])
  );
  const sortedNamedImports = Object.fromEntries(
    [...namedImports.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, entries]) => [
        name,
        entries.sort((a, b) => a.file.localeCompare(b.file)),
      ])
  );

  return {
    exports: sortedExports,
    namedImports: sortedNamedImports,
  };
}

function buildCodeMap(options) {
  const files = getSourceFiles(options.roots).map(collectSourceFile);
  const filesWithExports = files.filter(
    (file) => file.exports.length > 0
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    generator: 'scripts/code-map/generate-code-map.mjs',
    roots: options.roots,
    summary: {
      filesParsed: files.length,
      filesWithExports,
      packages: [...new Set(files.map((file) => file.package))].sort(),
    },
    files,
    packageDependencyCounts: buildPackageDependencyCounts(files),
    symbolIndex: buildSymbolIndex(files),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const codeMap = buildCodeMap(options);
  const json = JSON.stringify(codeMap, null, options.pretty ? 2 : 0);

  if (options.out) {
    const absOut = path.resolve(repoRoot, options.out);
    fs.mkdirSync(path.dirname(absOut), { recursive: true });
    fs.writeFileSync(absOut, `${json}\n`);
    console.error(`Wrote ${relativePath(absOut)}`);
    return;
  }

  console.log(json);
}

main();
