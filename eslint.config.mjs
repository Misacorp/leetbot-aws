import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import pluginJest from "eslint-plugin-jest";
import eslintCdkPlugin from "eslint-cdk-plugin";
import tsEslintParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import { defineConfig } from "eslint/config";

export default defineConfig([
  pluginJs.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  eslintCdkPlugin.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    ignores: [
      "node_modules/",
      "cdk.out/",
      "eslint.config.mjs",
      "coverage/",
      "src/layers/**/node_modules/",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      globals: globals.browser,
      parser: tsEslintParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "sort-imports": [
        "error",
        {
          ignoreCase: false,
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
          memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
          allowSeparatedGroups: true,
        },
      ],
      "import/extensions": [
        "error",
        "ignorePackages",
        {
          ts: "never",
          tsx: "never",
        },
      ],
      "import/prefer-default-export": "off",
      "import/no-extraneous-dependencies": [
        "warn",
        {
          devDependencies: false,
          optionalDependencies: false,
          peerDependencies: false,
        },
      ],
      "no-shadow": "off",
      "@typescript-eslint/no-shadow": ["error"],
      "no-await-in-loop": ["warn"],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        1,
        {
          prefer: "type-imports",
          disallowTypeAnnotations: false,
          fixStyle: "inline-type-imports",
        },
      ],
    },
    settings: {
      "import/parsers": {
        "@typescript-eslint/parser": [".ts"],
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          node: {
            extensions: [".js", ".mjs", ".cjs", ".ts"],
          },
        },
      },
    },
  },
  {
    files: ["**/*.test.ts"],
    ...pluginJest.configs["flat/recommended"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/unbound-method": "off",
      "jest/unbound-method": "error",
    },
  },
  {
    files: ["**/env.ts"],
    rules: {
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["src/leetbot/**/*.ts"],
    rules: {
      "import/no-absolute-path": "off", // Lambda layer imports in AWs environment
      "no-console": "off",
    },
  },
]);
