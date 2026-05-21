import tseslint from "typescript-eslint";

export default tseslint.config({
  files: ["**/*.ts"],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/consistent-type-imports": "error",
  },
});
