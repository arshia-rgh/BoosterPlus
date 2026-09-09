import tseslint from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
import a11y from "eslint-plugin-jsx-a11y";
import security from "eslint-plugin-security";

export default tseslint.config(
  {
    ignores: [
      "build/**",
      ".react-router/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...tseslint.configs.strictTypeChecked,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  { files: ["**/*.js"], extends: [tseslint.configs.disableTypeChecked] },
  {
    files: ["app/**/*.{ts,tsx}"],
    plugins: { "react-hooks": hooks, "jsx-a11y": a11y, security },
    rules: {
      ...hooks.configs.recommended.rules,
      ...a11y.flatConfigs.recommended.rules,
      ...security.configs.recommended.rules,
    },
  },
);
