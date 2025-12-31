export default {
  'pre-commit': 'pnpm lint-staged && pnpm test',
  'commit-msg': 'pnpm commitlint --edit "$1"',
};
