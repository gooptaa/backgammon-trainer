import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/.vite/**",
      "**/playwright-report/**",
      "**/test-results/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
          allowBoolean: true
        }
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }]
    }
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/tests/**/*.ts", "**/tests/**/*.tsx"],
    languageOptions: {
      globals: {
        ...globals.vitest
      }
    }
  },
  {
    files: ["packages/backgammon-engine/src/**/*.ts", "packages/backgammon-engine/test/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@backgammon-trainer/backgammon-analysis-session",
              message:
                "Engine must remain independent from analysis-session orchestration concerns."
            },
            {
              name: "@backgammon-trainer/web",
              message: "Engine must not depend on web application code."
            }
          ]
        }
      ]
    }
  },
  {
    files: [
      "packages/backgammon-analysis/src/**/*.ts",
      "packages/backgammon-analysis/test/**/*.ts"
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@backgammon-trainer/backgammon-analysis-session",
              message:
                "Analysis must remain independent from analysis-session persistence orchestration."
            },
            {
              name: "@backgammon-trainer/web",
              message: "Analysis must not depend on web application code."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@backgammon-trainer/backgammon-evaluator-gnubg",
              message: "Browser bundles must not import the Node-only GNU adapter package."
            },
            {
              name: "@backgammon-trainer/backgammon-evaluator-gnubg/node",
              message: "Browser bundles must not import Node-only GNU adapter process runners."
            },
            {
              name: "@backgammon-trainer/backgammon-evaluator-gnubg/testing",
              message: "Browser bundles must not import GNU adapter testing helpers."
            }
          ],
          patterns: [
            {
              group: ["node:*"],
              message: "Browser source must not import Node built-in modules."
            }
          ]
        }
      ]
    }
  }
);
