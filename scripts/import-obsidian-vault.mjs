#!/usr/bin/env node
/**
 * Import an Obsidian vault into EweserDB.
 *
 * Usage:
 *   node scripts/import-obsidian-vault.mjs <vault-path> <room-id> [vault-name]
 *
 * Env:
 *   DATABASE_URL (default: postgresql://eweser:changeme@localhost:5499/eweser)
 *
 * Example:
 *   DATABASE_URL="postgresql://eweser:changeme@localhost:5499/eweser" \
 *   node scripts/import-obsidian-vault.mjs \
 *     /mnt/d/Notes/obsidian/work-os 0dc4ed8a-36c8-4b9c-81f5-dfd4e1212833 "work-os"
 */

import { readdir, readFile } from 'fs/promises';
import { join, relative, extname, basename } from 'path';
import { randomUUID } from 'crypto';
import postgres from '/home/jacob/eweser-db/node_modules/postgres/src/index.js';

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://eweser:changeme@localhost:5499/eweser';
const [vaultPath, roomId, vaultNameArg] = process.argv.slice(2);

if (!vaultPath || !roomId) {
  console.error(
    'Usage: node import-obsidian-vault.mjs <vault-path> <room-id> [vault-name]'
  );
  process.exit(1);
}

const vaultName = vaultNameArg ?? basename(vaultPath);

function parseFrontmatter(content) {
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
    return { frontmatter: {}, body: content };
  }
  const end = content.indexOf('\n---', 4);
  if (end === -1) return { frontmatter: {}, body: content };
  const yamlStr = content.slice(4, end);
  const body = content.slice(end + 4).replace(/^\r?\n/, '');
  const frontmatter = {};
  for (const line of yamlStr.split('\n')) {
    const m = line.match(/^([\w-]+):\s*(.*)$/);
    if (m) {
      const val = m[2].trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        frontmatter[m[1]] = val
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''));
      } else if (val) {
        frontmatter[m[1]] = val.replace(/^["']|["']$/g, '');
      }
    }
  }
  return { frontmatter, body };
}

function extractTags(body, frontmatter) {
  const tags = new Set();
  if (frontmatter.tags) {
    const fm = Array.isArray(frontmatter.tags)
      ? frontmatter.tags
      : [frontmatter.tags];
    fm.forEach((t) => tags.add(String(t)));
  }
  const inlineTags = body.match(/(?<![`\w])#([\w/-]+)/g) || [];
  inlineTags.forEach((t) => tags.add(t.slice(1)));
  return [...tags];
}

async function collectMarkdownFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectMarkdownFiles(fullPath)));
    } else if (entry.isFile() && extname(entry.name) === '.md') {
      results.push(fullPath);
    }
  }
  return results;
}

async function main() {
  console.log(`\n📂 EweserDB Obsidian Vault Importer`);
  console.log(`   Vault: ${vaultPath}  (${vaultName})`);
  console.log(`   Room:  ${roomId}\n`);

  console.log('📝 Scanning vault...');
  const files = await collectMarkdownFiles(vaultPath);
  console.log(`   Found ${files.length} markdown files`);
  if (files.length === 0) process.exit(0);

  // Parse all documents into a collection blob
  const documents = {};
  let i = 0;
  for (const filePath of files) {
    const relPath = relative(vaultPath, filePath);
    const content = await readFile(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);
    const tags = extractTags(body, frontmatter);
    const title = frontmatter.title ?? basename(filePath, '.md');
    const aliases = frontmatter.aliases
      ? (Array.isArray(frontmatter.aliases)
          ? frontmatter.aliases
          : [frontmatter.aliases]
        ).map(String)
      : [];
    const docId = randomUUID();
    documents[docId] = {
      _id: docId,
      _ref: `notes.${roomId}.${docId}`,
      _created: Date.now(),
      _updated: Date.now(),
      _deleted: false,
      text: content,
      sourcePath: relPath,
      sourceVault: vaultName,
      frontmatter,
      aliases,
      tags,
      title,
    };
    i++;
    if (i % 100 === 0) process.stdout.write(`   Parsed ${i}/${files.length}\r`);
  }
  console.log(`   Parsed ${files.length}/${files.length} notes      `);

  console.log('\n📤 Inserting into indexed_documents...');
  const sql = postgres(DATABASE_URL);
  try {
    await sql`
      INSERT INTO indexed_documents (id, room_id, collection_key, user_id, document_data, updated_at)
      VALUES (
        ${randomUUID()}::uuid, ${roomId}::uuid, ${'notes'}, ${null},
        ${sql.json(documents)}, NOW()
      )
      ON CONFLICT (room_id, collection_key) DO UPDATE SET
        document_data = EXCLUDED.document_data,
        updated_at = NOW()
    `;
    console.log(`   ✅ Indexed ${files.length} notes`);
  } finally {
    await sql.end();
  }

  console.log(
    `\n✅ Done! ${files.length} notes from "${vaultName}" are now searchable`
  );
  console.log(`   Use eweser_search({ query: "..." }) to find them\n`);
}

main().catch((e) => {
  console.error('\n❌', e.message);
  process.exit(1);
});
