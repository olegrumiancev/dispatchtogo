import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Base URL for the app subdomain. In production this is https://app.dispatchtogo.com.
// Override in .env.local for local dev, e.g. http://app.dispatchtogo.com:3000
const APP_BASE_URL =
  process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com";

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
        destination: `${APP_BASE_URL}/app/login`,
        permanent: false,
      },
      {
        source: "/dashboard",
        destination: `${APP_BASE_URL}/app/login`,
        permanent: false,
      },
      {
        source: "/register",
        destination: `${APP_BASE_URL}/app/register`,
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
