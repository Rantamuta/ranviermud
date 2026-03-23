#!/usr/bin/env node
'use strict';

/**
 * Conversation Mermaid watcher.
 *
 * Purpose:
 * - Regenerate derived Mermaid Markdown previews whenever authored
 *   `*.conversation.yml` files change.
 * - Provide an authoring-time convenience layer without duplicating any of the
 *   actual conversation-to-diagram lowering logic.
 *
 * What this script does:
 * - accepts either a single conversation file or a directory root
 * - scans recursively for `*.conversation.yml` files
 * - polls for added, changed, or removed conversation files
 * - delegates all generation work to
 *   `generateConversationMermaid(...)` from
 *   `scripts/generate-conversation-mermaid.js`
 * - removes the sibling derived `.diagram.md` file when a watched source file
 *   disappears
 *
 * What this script does not do:
 * - it does not parse or lower conversations itself
 * - it does not define a second diagram-generation code path
 * - it does not attempt fancy file-system watching dependencies or layout logic
 *
 * CLI:
 *   node scripts/watch-conversation-mermaid.js <input-path> [interval-ms]
 *
 * Examples:
 *   node scripts/watch-conversation-mermaid.js docs/lore
 *   node scripts/watch-conversation-mermaid.js docs/lore/kingDead.conversation.yml 250
 *
 * Behavior:
 * - `<input-path>` may be a single `*.conversation.yml` file or a directory
 * - polling defaults to 1000ms when `interval-ms` is omitted
 * - the script logs generated and removed output paths as changes are detected
 * - the process runs until interrupted
 *
 * Drift-prevention note:
 * - this script is intentionally only a watcher/orchestration layer
 * - the generator module remains the sole authority for parsing, validation,
 *   Mermaid lowering, output naming, and Markdown formatting
 */

const fs = require('fs');
const path = require('path');
const {
  deriveOutputPath,
  generateConversationMermaid,
} = require('./generate-conversation-mermaid');

const DEFAULT_INTERVAL_MS = 1000;
const CONVERSATION_SUFFIX = '.conversation.yml';

function usage() {
  return 'Usage: node scripts/watch-conversation-mermaid.js <input-path> [interval-ms]';
}

function isConversationFilePath(filePath) {
  return String(filePath || '').endsWith(CONVERSATION_SUFFIX);
}

function collectConversationFiles(targetPath) {
  const resolvedTarget = path.resolve(targetPath);

  if (!fs.existsSync(resolvedTarget)) {
    throw new Error(`Watch target does not exist: ${targetPath}`);
  }

  const stat = fs.statSync(resolvedTarget);
  if (stat.isFile()) {
    if (!isConversationFilePath(resolvedTarget)) {
      throw new Error(`Watch target must be a *.conversation.yml file or a directory: ${targetPath}`);
    }

    return [resolvedTarget];
  }

  const files = [];

  function walk(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && isConversationFilePath(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  walk(resolvedTarget);
  files.sort();
  return files;
}

function buildSnapshot(targetPath) {
  const snapshot = new Map();

  for (const filePath of collectConversationFiles(targetPath)) {
    snapshot.set(filePath, fs.statSync(filePath).mtimeMs);
  }

  return snapshot;
}

function removeDerivedDiagram(inputFile) {
  const outputFile = path.resolve(deriveOutputPath(inputFile));
  if (fs.existsSync(outputFile)) {
    fs.unlinkSync(outputFile);
    console.log(`Removed ${outputFile}`);
  }
}

function syncSnapshots(previous, next) {
  for (const [filePath] of previous.entries()) {
    if (!next.has(filePath)) {
      removeDerivedDiagram(filePath);
    }
  }

  for (const [filePath, mtimeMs] of next.entries()) {
    if (previous.get(filePath) === mtimeMs) {
      continue;
    }

    const result = generateConversationMermaid(filePath);
    console.log(`Updated ${result.outputFile}`);
  }
}

function watchConversationMermaid(targetPath, intervalMs = DEFAULT_INTERVAL_MS) {
  const resolvedTarget = path.resolve(targetPath);
  let snapshot = new Map();

  function tick() {
    try {
      const next = buildSnapshot(resolvedTarget);
      syncSnapshots(snapshot, next);
      snapshot = next;
    } catch (error) {
      console.error(`Conversation watcher error: ${error.message}`);
    }
  }

  console.log(`Watching ${resolvedTarget} every ${intervalMs}ms for *.conversation.yml changes...`);
  tick();
  return setInterval(tick, intervalMs);
}

function main(argv) {
  const [, , targetPath, intervalArg] = argv;

  if (!targetPath) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const intervalMs = intervalArg ? Number(intervalArg) : DEFAULT_INTERVAL_MS;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    console.error(`Invalid interval: ${intervalArg}`);
    process.exitCode = 1;
    return;
  }

  try {
    const timer = watchConversationMermaid(targetPath, intervalMs);

    const shutdown = () => {
      clearInterval(timer);
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error(`Failed to start conversation watcher: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main(process.argv);
}

module.exports = {
  buildSnapshot,
  collectConversationFiles,
  isConversationFilePath,
  watchConversationMermaid,
};
