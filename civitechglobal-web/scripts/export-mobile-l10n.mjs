#!/usr/bin/env node
/**
 * Exports the interface dictionaries and the help guides to the mobile app.
 *
 * The web's TypeScript dictionaries are the one source of truth for every
 * string the platform shows. The app cannot import TypeScript, so this script
 * writes what it needs:
 *
 * - civitechglobal-mobile/assets/l10n/<locale>.json: each language as the web
 *   sees it at runtime, i.e. partial languages already filled out from English
 *   (src/i18n/merge.ts does the same in the browser).
 * - civitechglobal-mobile/lib/l10n/generated/strings.g.dart: typed accessors
 *   over that JSON, generated from the Persian dictionary, which is the type
 *   every other language is checked against (`typeof fa`). The app reads
 *   `s.common.save` the way the web reads `t.common.save`, and a renamed key
 *   fails to compile instead of rendering nothing.
 * - civitechglobal-mobile/assets/help/manifest.json and <locale>.json: the
 *   public and member guides. Staff guides stay on the web, as the app has no
 *   staff screens.
 * - civitechglobal-mobile/assets/blog/index.json and one file per article:
 *   the blog, parsed into the same blocks the web renders.
 *
 * Usage:
 *   node scripts/export-mobile-l10n.mjs           write the files
 *   node scripts/export-mobile-l10n.mjs --check   exit 1 if they are stale (CI)
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = resolve(HERE, '..');
const MOBILE = resolve(WEB, '..', 'civitechglobal-mobile');
const LOCALES = ['fa', 'en', 'tr', 'de', 'fr', 'es'];
const COMPLETE = new Set(['fa', 'en']);
const check = process.argv.includes('--check');

const jiti = createJiti(join(WEB, 'package.json'), { alias: { '@': join(WEB, 'src') } });
const load = (path) => jiti(join(WEB, path)).default;
const jitiJsx = createJiti(join(WEB, 'package.json'), { jsx: true, alias: { '@': join(WEB, 'src') } });

/** Missing keys filled from `base`, at any depth. Arrays are values, not merged. */
function fill(partial, base) {
  if (!isObject(partial) || !isObject(base)) return partial ?? base;
  const out = {};
  for (const key of Object.keys(base)) out[key] = key in partial ? fill(partial[key], base[key]) : base[key];
  for (const key of Object.keys(partial)) if (!(key in out)) out[key] = partial[key];
  return out;
}
function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const outputs = new Map();
const json = (value) => JSON.stringify(value, null, 1) + '\n';

// ---- Interface dictionaries ------------------------------------------------
const dictionaries = Object.fromEntries(LOCALES.map((l) => [l, load(`src/i18n/${l}.ts`)]));
for (const locale of LOCALES) {
  const merged = COMPLETE.has(locale) ? dictionaries[locale] : fill(dictionaries[locale], dictionaries.en);
  outputs.set(join(MOBILE, 'assets', 'l10n', `${locale}.json`), json(merged));
}

// ---- Typed Dart accessors ---------------------------------------------------
// Dart's reserved words (built-in identifiers such as `required` or `get` are
// legal member names and stay as they are), plus the members every generated
// class inherits from L10nNode and Object.
const RESERVED = new Set(
  ('assert break case catch class const continue default do else enum extends false final finally for if in ' +
    'is new null rethrow return super switch this throw true try var void while with ' +
    'hashCode runtimeType toString noSuchMethod raw string strings pairs node')
    .split(' ')
);
const IDENTIFIER = /^[a-z][A-Za-z0-9]*$/;
const pascal = (key) => key.charAt(0).toUpperCase() + key.slice(1);
const field = (key) => (RESERVED.has(key) ? `${key}_` : key);

/** An object whose keys are all camelCase becomes a class; anything else a lookup map. */
function isStruct(value) {
  return isObject(value) && Object.keys(value).every((key) => IDENTIFIER.test(key));
}

const classes = [];
function emitClass(name, value) {
  const members = [];
  for (const [key, child] of Object.entries(value)) {
    const id = field(key);
    const k = JSON.stringify(key);
    if (typeof child === 'string') {
      members.push(`  String get ${id} => string(${k});`);
    } else if (Array.isArray(child)) {
      if (child.every((item) => typeof item === 'string')) {
        members.push(`  List<String> get ${id} => strings(${k});`);
      } else {
        members.push(`  List<List<String>> get ${id} => pairs(${k});`);
      }
    } else if (isStruct(child)) {
      const childName = `${name}${pascal(key)}`;
      emitClass(childName, child);
      members.push(`  ${childName} get ${id} => ${childName}(node(${k}));`);
    } else {
      // Keys that are server enum values (NEW_BUILD, marketplace-ops): looked
      // up at runtime, as the web does with t.section[value].
      members.push(`  L10nMap get ${id} => L10nMap(node(${k}));`);
    }
  }
  classes.push(
    `class ${name} extends L10nNode {\n  const ${name}(super.raw);\n\n${members.join('\n')}\n}\n`
  );
}
emitClass('Strings', dictionaries.fa);

// `dart format off`: written by Node, which has no Dart formatter, so the
// file is left out of `dart format --set-exit-if-changed` rather than failing
// it on every export.
const dart = `// GENERATED by civitechglobal-web/scripts/export-mobile-l10n.mjs from the web's
// dictionaries (src/i18n). Do not edit; run the script instead.
// ignore_for_file: type=lint
// dart format off

import '../l10n_node.dart';

${classes.reverse().join('\n')}`;
outputs.set(join(MOBILE, 'lib', 'l10n', 'generated', 'strings.g.dart'), dart);

// ---- Help guides ------------------------------------------------------------
const manifest = JSON.parse(readFileSync(join(WEB, 'src', 'content', 'help', 'manifest.json'), 'utf8'));
const entries = (Array.isArray(manifest) ? manifest : manifest.guides).filter((entry) => entry.audience !== 'staff');
const ids = new Set(entries.map((entry) => entry.id));
outputs.set(join(MOBILE, 'assets', 'help', 'manifest.json'), json(entries));
for (const locale of LOCALES) {
  const library = load(`src/content/help/text/${locale}/index.ts`);
  const articles = Object.fromEntries(Object.entries(library.articles).filter(([id]) => ids.has(id)));
  const collections = Object.fromEntries(Object.entries(library.collections).filter(([id]) => id !== 'staff'));
  outputs.set(join(MOBILE, 'assets', 'help', `${locale}.json`), json({ collections, articles }));
}

// ---- Blog articles ------------------------------------------------------------
// Parsed by the web's own Markdown parser (src/lib/markdown.tsx), so the app
// renders exactly the blocks the site renders: headings, paragraphs, lists,
// tables and quotes, with **bold** and [links](...) inline. The frontmatter
// rules mirror parseFrontmatter in src/content/blog.ts, which cannot be
// imported here: it loads its files through a Vite-only glob.
const markdown = jitiJsx(join(WEB, 'src', 'lib', 'markdown.tsx'));
const blogDir = join(WEB, 'src', 'content', 'blog');
const posts = [];
for (const name of readdirSync(blogDir).filter((file) => file.endsWith('.md')).sort()) {
  const raw = readFileSync(join(blogDir, name), 'utf8').replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`${name}: missing its frontmatter block`);
  const fields = {};
  for (const line of match[1].split('\n')) {
    const field = /^([A-Za-z]+):\s*(.*)$/.exec(line);
    if (field) fields[field[1]] = field[2].trim();
  }
  const locale = /\.([a-z]{2})\.md$/.exec(name)?.[1] ?? 'fa';
  const blocks = markdown.parseMarkdown(match[2].trim());
  posts.push({
    slug: fields.slug,
    locale,
    title: fields.title,
    description: fields.description,
    date: fields.date,
    dateLabel: fields.dateLabel,
    faqHeading: fields.faqHeading,
    readingMinutes: Math.max(1, Math.ceil(markdown.countWords(blocks) / 180)),
    blocks,
    faqs: markdown.extractFaqs(blocks, fields.faqHeading),
  });
}
posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
// One index for the list (no bodies), one file per article, loaded on open.
outputs.set(
  join(MOBILE, 'assets', 'blog', 'index.json'),
  json(posts.map(({ blocks: _blocks, faqs: _faqs, ...meta }) => meta))
);
for (const post of posts) {
  outputs.set(join(MOBILE, 'assets', 'blog', `${post.slug}.${post.locale}.json`), json(post));
}

// ---- Write or check -----------------------------------------------------------
const stale = [];
for (const [file, content] of outputs) {
  const current = existsSync(file) ? readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : null;
  if (current === content) continue;
  if (check) {
    stale.push(relative(resolve(WEB, '..'), file));
    continue;
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  console.log('wrote', relative(resolve(WEB, '..'), file));
}
if (check && stale.length) {
  console.error(`Mobile translations are out of date. Run: node civitechglobal-web/scripts/export-mobile-l10n.mjs\n  ${stale.join('\n  ')}`);
  process.exit(1);
}
console.log(check ? 'Mobile translations are up to date.' : `Exported ${outputs.size} files.`);
