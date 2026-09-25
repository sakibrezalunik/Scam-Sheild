import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Allow underscore-prefixed params in stub/no-op functions
  {
    files: ["shaders/**/*.ts", "shaders/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Exclude build artifacts and sub-projects
    "desktop/dist/**",
    "desktop/src-tauri/target/**",
    "extension/dist/**",
    "extension/src/**",
    "extension/scripts/**",
    "scripts/**",
  ]),
]);

export default eslintConfig;
