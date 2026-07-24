#!/usr/bin/env node
/**
 * Purpose: Prove byte-identical Markdown transport through an Eweser notes room.
 * Exports: runOpenWikiTransportDogfood and its structured result.
 * Touches: Public OpenWiki fixture Markdown and two isolated temporary vaults.
 * Read before editing: packages/ewe-note/src/cli/INDEX.md.
 */
/* eslint-disable no-console -- CLI proof reports structured evidence */

import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getDocuments, type Note } from '@eweser/shared';
import * as Y from 'yjs';
import { EweserRoomVaultSyncEngine } from './vault-sync';

const FIXTURE_RELATIVE_PATH = 'openwiki/index.md';
const FIXTURE_PATH = fileURLToPath(
  new URL(
    '../../test-fixtures/openwiki-generated/openwiki/index.md',
    import.meta.url
  )
);

export interface OpenWikiTransportDogfoodResult {
  sourceRoot: string;
  destinationRoot: string;
  sourceRelativePath: string;
  destinationRelativePath: string;
  sourceSha256: string;
  destinationSha256: string;
  sourceFrontmatterSha256: string;
  destinationFrontmatterSha256: string;
  byteIdentical: boolean;
  frontmatterByteIdentical: boolean;
}

function sha256(bytes: string | Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function frontmatterBytes(markdown: string): string {
  return markdown.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/u)?.[0] ?? '';
}

export async function runOpenWikiTransportDogfood(): Promise<OpenWikiTransportDogfoodResult> {
  const proofRoot = await mkdtemp(join(tmpdir(), 'eweser-openwiki-transport-'));
  const sourceRoot = join(proofRoot, 'source');
  const destinationRoot = join(proofRoot, 'destination');
  const sourcePath = join(sourceRoot, FIXTURE_RELATIVE_PATH);
  const destinationPath = join(destinationRoot, FIXTURE_RELATIVE_PATH);
  await Promise.all([
    mkdir(dirname(sourcePath), { recursive: true }),
    mkdir(destinationRoot, { recursive: true }),
  ]);

  const fixture = await readFile(FIXTURE_PATH, 'utf8');
  await writeFile(sourcePath, fixture, 'utf8');

  const changedMarkdown = fixture.replace(
    '# Files\n',
    '# Files\n\nTransport proof update: exact Markdown bytes matter.\n'
  );
  if (changedMarkdown === fixture) {
    throw new Error('OpenWiki fixture update marker could not be applied.');
  }
  await writeFile(sourcePath, changedMarkdown, 'utf8');

  const roomId = 'openwiki-markdown-transport-proof';
  const sourceYDoc = new Y.Doc();
  const destinationYDoc = new Y.Doc();
  const sourceNotes = getDocuments(
    'http://local.invalid',
    'notes',
    roomId
  )<Note>(sourceYDoc);
  const destinationNotes = getDocuments(
    'http://local.invalid',
    'notes',
    roomId
  )<Note>(destinationYDoc);
  const sourceEngine = new EweserRoomVaultSyncEngine({
    vaultPath: sourceRoot,
    vaultName: 'OpenWiki fixture',
    roomId,
    remoteSync: false,
  });
  const destinationEngine = new EweserRoomVaultSyncEngine({
    vaultPath: destinationRoot,
    vaultName: 'OpenWiki fixture',
    roomId,
    remoteSync: false,
  });
  sourceEngine.attachDocumentsForInMemoryHarness({ notes: sourceNotes });
  destinationEngine.attachDocumentsForInMemoryHarness({
    notes: destinationNotes,
  });

  await sourceEngine.onFileChange(FIXTURE_RELATIVE_PATH);
  Y.applyUpdate(destinationYDoc, Y.encodeStateAsUpdate(sourceYDoc));

  const [transportedNote] = destinationNotes.getUndeletedToArray();
  if (!transportedNote) {
    throw new Error('No Markdown note arrived in the destination room.');
  }
  if (transportedNote.sourcePath !== FIXTURE_RELATIVE_PATH) {
    throw new Error(
      `Destination room path changed to "${transportedNote.sourcePath ?? ''}".`
    );
  }
  await destinationEngine.materializeNote(transportedNote);

  const [sourceBytes, destinationBytes] = await Promise.all([
    readFile(sourcePath),
    readFile(destinationPath),
  ]);
  const sourceMarkdown = sourceBytes.toString('utf8');
  const destinationMarkdown = destinationBytes.toString('utf8');

  return {
    sourceRoot,
    destinationRoot,
    sourceRelativePath: relative(sourceRoot, sourcePath).replace(/\\/gu, '/'),
    destinationRelativePath: relative(destinationRoot, destinationPath).replace(
      /\\/gu,
      '/'
    ),
    sourceSha256: sha256(sourceBytes),
    destinationSha256: sha256(destinationBytes),
    sourceFrontmatterSha256: sha256(frontmatterBytes(sourceMarkdown)),
    destinationFrontmatterSha256: sha256(frontmatterBytes(destinationMarkdown)),
    byteIdentical: sourceBytes.equals(destinationBytes),
    frontmatterByteIdentical:
      frontmatterBytes(sourceMarkdown) ===
      frontmatterBytes(destinationMarkdown),
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runOpenWikiTransportDogfood()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (
        !result.byteIdentical ||
        !result.frontmatterByteIdentical ||
        result.sourceRelativePath !== result.destinationRelativePath
      ) {
        process.exitCode = 1;
      }
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
