import { includeIgnoreFile } from "@eslint/compat";
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";
import unusedImports from "eslint-plugin-unused-imports";
import { fileURLToPath } from "url";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export default [
	includeIgnoreFile(fileURLToPath(new URL(".gitignore", import.meta.url))),
	js.configs.recommended,
	eslintConfigPrettier,
	...tseslint.configs.recommended,
	{
		plugins: {
			"unused-imports": unusedImports,
		},
		rules: {
			"unused-imports/no-unused-imports": "error",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					args: "all",
					argsIgnorePattern: "^_",
					caughtErrors: "all",
					caughtErrorsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					ignoreRestSiblings: true,
				},
			],
			"no-restricted-imports": [
				"error",
				{
					patterns: ["**/dist/**"],
				},
			],
		},
	},
	{
		plugins: {
			onlyWarn,
		},
	},
	{
		ignores: ["generated/**"],
	},
];

