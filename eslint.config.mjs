import tseslint from 'typescript-eslint';

/**
 * Locked-invariant enforcement lives here, not in a code review checklist.
 *
 * The kernel block below is the machine-readable form of README's determinism
 * guarantees. Do not relax it; if a kernel module needs randomness it draws from
 * the kernel's own seeded stream, and if it needs ordering it declares the order
 * explicitly.
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/*.config.mjs',
      '**/*.config.ts',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['packages/kernel/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            'Locked invariant #2: randomness comes only from the kernel seeded stream.',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'No wall-clock in the kernel — it breaks replay determinism.',
        },
        {
          object: 'Object',
          property: 'keys',
          message:
            'Locked invariant #7: execution and iteration order must be declared explicitly, never derived from key iteration over state.',
        },
        {
          object: 'Object',
          property: 'entries',
          message: 'Locked invariant #7: iterate a declared order, not object keys.',
        },
        {
          object: 'Object',
          property: 'values',
          message: 'Locked invariant #7: iterate a declared order, not object keys.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'No wall-clock in the kernel — it breaks replay determinism.',
        },
        {
          selector: "MemberExpression[object.name='Intl']",
          message: 'No locale-dependent behaviour in the kernel.',
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
