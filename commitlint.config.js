// Config canônica de commitlint da Barte (Conventional Commits).
// Repos sem config própria herdam esta via o reusable workflow conventional-pr.
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // tipos permitidos (alinhados ao PR-title check e ao versionamento)
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    // assunto: sem ponto final, não vazio
    'subject-full-stop': [2, 'never', '.'],
    'subject-empty': [2, 'never'],
    'type-empty': [2, 'never'],
    // header até 100 chars (um pouco mais folgado que o default 72)
    'header-max-length': [2, 'always', 100],
  },
};
