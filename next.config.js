/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "",
  },
  typescript: {
    // The `typescript` package resolves to the @typescript/typescript6 compat
    // API (see package.json) so Next's own build-time type-check still works.
    // CI already runs `npm run tsc` (real, native TS7 tsc --noEmit) before
    // `npm run build`, so skipping Next's redundant internal check here just
    // avoids double-checking, not a coverage gap.
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
