import nextConfig from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextConfig,
  {
    settings: { next: { rootDir: process.cwd() } },
  },
];

export default eslintConfig;
