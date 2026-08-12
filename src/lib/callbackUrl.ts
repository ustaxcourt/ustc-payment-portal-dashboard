/** Where to send a signed-in user when no callback was supplied. */
const HOME = "/";

/** Newlines and tabs can split a URL or smuggle a header downstream. */
const hasControlCharacter = (value: string): boolean =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 0x20 || code === 0x7f;
  });

/**
 * Narrows a caller-supplied `callbackUrl` to a path inside this app.
 *
 * Anything else falls back to the dashboard root. Without this, a link like
 * `/login?callbackUrl=https://evil.example` would turn the Court's sign-in page
 * into an open redirect: the visitor authenticates against a genuine Tax Court
 * domain and is then handed to an attacker.
 *
 * Rejected: absolute URLs, protocol-relative `//host`, the `/\` variant some
 * browsers normalise to `//`, and control characters.
 */
export const safeCallbackUrl = (
  value: string | string[] | null | undefined,
): string => {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (typeof candidate !== "string" || candidate === "") {
    return HOME;
  }

  if (hasControlCharacter(candidate)) {
    return HOME;
  }

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.startsWith("/\\")
  ) {
    return HOME;
  }

  return candidate;
};

/** The `/login` URL that returns to `current` once the user signs in. */
export const loginUrlReturningTo = (current: string): string => {
  const target = safeCallbackUrl(current);

  return target === HOME
    ? "/login"
    : `/login?callbackUrl=${encodeURIComponent(target)}`;
};
