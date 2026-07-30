import type { NextConfig } from "next";

// Amplify exposes environment variables to the build but not to the SSR runtime,
// so anything the server needs is inlined here. Only the Parameter Store path —
// the secret values are read from SSM at runtime via the Amplify service role.
// Keys are omitted when empty: an inlined "" breaks callers that expect undefined.
const ssmSecretPrefix =
  process.env.SSM_SECRET_PREFIX ??
  (process.env.AWS_APP_ID
    ? `/amplify/shared/${process.env.AWS_APP_ID}/`
    : undefined);

const nextConfig: NextConfig = {
  env: {
    ...(ssmSecretPrefix ? { SSM_SECRET_PREFIX: ssmSecretPrefix } : {}),
  },
};

export default nextConfig;
