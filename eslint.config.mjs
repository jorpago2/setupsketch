import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default defineConfig([
  { ignores: [".next", "dist", "node_modules", "*.d.ts"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { window: "readonly", document: "readonly", navigator: "readonly", localStorage: "readonly", URL: "readonly", Blob: "readonly", Image: "readonly", XMLSerializer: "readonly", HTMLInputElement: "readonly", HTMLTextAreaElement: "readonly", KeyboardEvent: "readonly" },
    },
  },
]);
