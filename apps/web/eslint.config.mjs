import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([{
    extends: [...nextCoreWebVitals],

    rules: {
        "react/no-unescaped-entities": "off",
        "react-hooks/exhaustive-deps": "warn",
        "@next/next/no-img-element": "warn",
        "jsx-a11y/alt-text": "warn",
        // Regras novas do eslint-config-next 16 (React Compiler): viram aviso para nao exigir refatoracao de codigo existente.
        "react-hooks/set-state-in-effect": "warn",
        "react-hooks/immutability": "warn",
        "react-hooks/refs": "warn",
        "react-hooks/purity": "warn",
        "react-hooks/use-memo": "warn",
        "react-hooks/static-components": "warn",
        "@next/next/no-html-link-for-pages": "warn",
    },
}]);