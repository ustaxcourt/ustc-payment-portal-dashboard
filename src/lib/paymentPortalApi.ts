import { Sha256 } from "@aws-crypto/sha256-js";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { HttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";

const REGION = process.env.AWS_REGION ?? "us-east-1";

// Memoised and refreshed on expiry; reading the env vars once would pin stale keys.
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

// SigV4's own URI-encode (see the spec's `UriEncode`): stricter than
// encodeURIComponent about !'()*, and — unlike URLSearchParams#toString(),
// which encodes a space as `+` — always uses %20. The signer canonicalizes
// the query with this same rule, so the request line has to match it too,
// or the backend's signature check 403s on any value containing a space.
const sigV4UriEncode = (value: string): string =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );

const encodeQuery = (search: URLSearchParams): string =>
  Array.from(search.entries())
    .map(([key, value]) => `${sigV4UriEncode(key)}=${sigV4UriEncode(value)}`)
    .join("&");

/** Signed as the compute role, so guard the route before calling. */
export const getSigned = async (
  path: string,
  search: URLSearchParams,
): Promise<Response> => {
  const query = encodeQuery(search);
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
