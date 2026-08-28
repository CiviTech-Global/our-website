#!/usr/bin/env node
// Runs a subproject's own ESLint over the files lint-staged hands us.
//
// Each subproject (civitechglobal-server, civitechglobal-web) has its own
// eslint.config.js and its own node_modules, and ESLint's flat config resolves
// relative "files" patterns (e.g. "src/**/*.ts") against the process's current
// working directory - not the config file's directory. So eslint has to run
// with cwd set to the subproject, and the paths lint-staged appends have to be
// rewritten relative to that subproject first.
//
// This lives in a script rather than a `cd <dir> && npx eslint` string in
// lint-staged.config.js because lint-staged runs commands *without* a shell:
// such a string is spawned as the program `cd` with `&&` as a literal
// argument, which fails outright on Windows.
//
// Usage: node scripts/eslint-subproject.mjs <subproject-dir> [files...]

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const [prefix, ...files] = process.argv.slice(2);

if (!prefix) {
  console.error('usage: eslint-subproject.mjs <subproject-dir> [files...]');
  process.exit(2);
}

// lint-staged skips a command entirely when no files match, but stay safe:
// eslint with no file arguments would lint the whole subproject.
if (files.length === 0) {
  process.exit(0);
}

const projectDir = path.resolve(prefix);
const relativeFiles = files.map((file) => path.relative(projectDir, path.resolve(file)));
const eslintBin = path.join(projectDir, 'node_modules', 'eslint', 'bin', 'eslint.js');

const result = spawnSync(process.execPath, [eslintBin, '--fix', ...relativeFiles], {
  cwd: projectDir,
  stdio: 'inherit',
});

if (result.error) {
  console.error(`eslint-subproject: failed to run eslint in ${prefix}:`, result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
