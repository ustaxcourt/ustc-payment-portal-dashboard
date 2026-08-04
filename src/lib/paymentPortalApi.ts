import { Sha256 } from "@aws-crypto/sha256-js";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { HttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";

const REGION = process.env.AWS_REGION ?? "us-east-1";

// Memoises and refreshes on expiry; reading the env vars once would pin stale keys.
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

/** GETs a payment-portal endpoint signed as the Amplify compute role.
 *  Guard the route before calling: anything reaching here is already trusted. */
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
