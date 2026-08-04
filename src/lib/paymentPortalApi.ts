import { Sha256 } from "@aws-crypto/sha256-js";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { HttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";

const REGION = process.env.AWS_REGION ?? "us-east-1";

// Resolved per signing call. The chain memoises and refreshes on expiry, which
// a long-running SSR container needs — reading the credential env vars once at
// module scope would pin stale keys.
const credentials = fromNodeProviderChain();

const signer = new SignatureV4({
  credentials,
  region: REGION,
  service: "execute-api",
  sha256: Sha256,
});

const baseUrl = (): string => {
  const url = process.env.PAYMENT_PORTAL_API_URL;
  if (!url) {
    throw new Error("PAYMENT_PORTAL_API_URL is not set");
  }
  return url.replace(/\/$/, "");
};

/**
 * GETs a payment-portal endpoint with a SigV4 signature.
 *
 * The API authorises on IAM, so the caller is the Amplify compute role rather
 * than the signed-in user. Guard the route before calling this: anything that
 * reaches here is already trusted.
 */
export const getSigned = async (
  path: string,
  search: URLSearchParams,
): Promise<Response> => {
  const query = search.toString();
  const url = new URL(`${baseUrl()}${path}${query ? `?${query}` : ""}`);

  const signed = await signer.sign(
    new HttpRequest({
      method: "GET",
      protocol: url.protocol,
      hostname: url.hostname,
      path: url.pathname,
      query: Object.fromEntries(search),
      headers: { host: url.hostname },
    }),
  );

  return fetch(url, {
    method: "GET",
    headers: signed.headers,
    cache: "no-store",
  });
};
