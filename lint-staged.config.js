// lint-staged config for the CiviTech Global monorepo.
//
// Each subproject has its own ESLint install and flat config that must be run
// with cwd set to that subproject; scripts/eslint-subproject.mjs handles that
// (and the path rewriting it requires). lint-staged appends the matched,
// staged file paths to each command, which the script consumes as its file
// arguments.
module.exports = {
  'civitechglobal-server/**/*.{ts,tsx}': 'node scripts/eslint-subproject.mjs civitechglobal-server',
  'civitechglobal-web/**/*.{ts,tsx}': 'node scripts/eslint-subproject.mjs civitechglobal-web',
  // Dart: the formatter decides layout, so a commit is refused rather than
  // reformatted behind the author's back; the analyzer applies
  // civitechglobal-mobile/analysis_options.yaml to the staged files.
  'civitechglobal-mobile/**/*.dart': [
    'dart format --output=none --set-exit-if-changed',
    'dart analyze --fatal-infos',
  ],
};
