const HOME = "/";

const hasControlCharacter = (value: string): boolean =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 0x20 || code === 0x7f;
  });

/** Guards against `?callbackUrl=https://evil.example` turning the Court's
 *  sign-in page into an open redirect. */
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

export const loginUrlReturningTo = (current: string): string => {
  const target = safeCallbackUrl(current);

  return target === HOME
    ? "/login"
    : `/login?callbackUrl=${encodeURIComponent(target)}`;
};
