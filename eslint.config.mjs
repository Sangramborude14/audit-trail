import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'frontend/.next/**',
    'out/**',
    'build/**',
    'dist/**',
    'node_modules/**',
    'frontend/node_modules/**',
    'backend/**',
    'next-env.d.ts',
    'frontend/next-env.d.ts',
    '.sst/**',
  ]),
  {
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/purity': 'off',
    },
  },
]);

export default eslintConfig;
