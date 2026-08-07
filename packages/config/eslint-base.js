// @ts-check
import tseslint from "typescript-eslint";

/** Shared base for non-Next.js packages in the monorepo (Next apps use eslint-config-next instead). */
export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  ...tseslint.configs.recommended,
);
