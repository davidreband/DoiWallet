// Reports how each translation in loc/ stands against loc/en.json: strings it is missing, strings
// it carries that English no longer has, and strings whose placeholders no longer match. The last
// of these is the one that reaches users as visible breakage - a translator who renders {number}
// as {nombre} leaves the braces on screen, because the substitution has nothing to match.
//
// Reports by default and exits 0, so it can sit in CI without blocking a branch over a translation
// that has not caught up yet. Pass --strict to exit 1 on any finding.

const fs = require('fs');
const path = require('path');

const LOC_DIR = path.join(__dirname, '..', 'loc');
const BASE = 'en.json';
const PLACEHOLDER = /\{[a-zA-Z_][a-zA-Z0-9_]*\}/g;

const flatten = (obj, prefix = '') =>
  Object.entries(obj).reduce((acc, [key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) Object.assign(acc, flatten(value, full));
    else acc[full] = value;
    return acc;
  }, {});

const placeholdersOf = str => (typeof str === 'string' ? [...new Set(str.match(PLACEHOLDER) || [])].sort() : []);

const read = file => {
  try {
    return flatten(JSON.parse(fs.readFileSync(path.join(LOC_DIR, file), 'utf8')));
  } catch (error) {
    return { __error: error.message };
  }
};

const strict = process.argv.includes('--strict');
const base = read(BASE);
if (base.__error) {
  console.error(`${BASE} does not parse: ${base.__error}`);
  process.exit(1);
}
const baseKeys = Object.keys(base);

const files = fs
  .readdirSync(LOC_DIR)
  .filter(f => f.endsWith('.json') && f !== BASE)
  .sort();

const rows = [];
const brokenPlaceholders = [];
const unparseable = [];

for (const file of files) {
  const locale = read(file);
  if (locale.__error) {
    unparseable.push([file, locale.__error]);
    continue;
  }
  const keys = Object.keys(locale);
  const missing = baseKeys.filter(k => !(k in locale));
  const obsolete = keys.filter(k => !(k in base));

  for (const key of keys) {
    if (!(key in base)) continue;
    const want = placeholdersOf(base[key]);
    const got = placeholdersOf(locale[key]);
    if (want.join() !== got.join()) brokenPlaceholders.push([file, key, want, got]);
  }

  rows.push({ file, missing: missing.length, obsolete: obsolete.length });
}

const coverage = r => ((100 * (baseKeys.length - r.missing)) / baseKeys.length).toFixed(0);

console.log(`${files.length} translations against ${BASE} (${baseKeys.length} strings)\n`);
console.log(`${'file'.padEnd(18)}${'missing'.padStart(9)}${'obsolete'.padStart(10)}${'coverage'.padStart(10)}`);
for (const r of [...rows].sort((a, b) => a.missing - b.missing || a.file.localeCompare(b.file))) {
  console.log(`${r.file.padEnd(18)}${String(r.missing).padStart(9)}${String(r.obsolete).padStart(10)}${`${coverage(r)}%`.padStart(10)}`);
}

const complete = rows.filter(r => r.missing === 0 && r.obsolete === 0).length;
console.log(`\n${complete} of ${rows.length} translations are complete.`);

if (unparseable.length) {
  console.log('\nFiles that do not parse:');
  for (const [file, message] of unparseable) console.log(`  ${file}: ${message}`);
}

if (brokenPlaceholders.length) {
  console.log('\nPlaceholders that do not match English - these reach users as literal braces:');
  for (const [file, key, want, got] of brokenPlaceholders) {
    console.log(`  ${file} ${key}: expected ${want.join(' ') || '(none)'}, found ${got.join(' ') || '(none)'}`);
  }
} else {
  console.log('\nEvery placeholder matches English.');
}

const findings = unparseable.length + brokenPlaceholders.length;
if (strict && (findings || complete < rows.length)) process.exit(1);
