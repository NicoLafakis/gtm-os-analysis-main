import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Custom rules for single-file architecture
  {
    rules: {
      // Allow inline styles (required for single-file architecture per AGENT.md)
      "react/forbid-component-props": "off",
      "react/forbid-dom-props": "off",
      // Allow button without explicit type in JSX
      "react/button-has-type": "off",
    },
  },
]);

export default eslintConfig;
