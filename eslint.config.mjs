export default [
  {
    ignores: ["drawio-dev/**", "graphify-out/**", "dist/**", "build/**"],
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        require: "readonly",
        module: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
    },
  },
];
