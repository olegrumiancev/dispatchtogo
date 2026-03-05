import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client"],
  env: {
    // Expose AI_TRIAGE_MAX_RETRIES to both server and client bundles at build time.
    // Override in .env.local (or the environment) to change the default of 3.
    AI_TRIAGE_MAX_RETRIES: process.env.AI_TRIAGE_MAX_RETRIES ?? "3",
  },
  async redirects() {
    return [
      {
        source: "/login",
        destination: "https://app.dispatchtogo.com/app/login",
        permanent: false,
      },
      {
        source: "/dashboard",
        destination: "https://app.dispatchtogo.com/app/login",
        permanent: false,
      },
      {
        source: "/register",
        destination: "https://app.dispatchtogo.com/app/register",
        permanent: false,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  // Disable source map upload until Sentry project is configured
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
