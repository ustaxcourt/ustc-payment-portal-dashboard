export { default } from "next-auth/middleware";

// The matcher defines the private routes. Leave the landing page public so it
// can perform a plain server redirect to /login without NextAuth appending a
// callbackUrl query parameter.
export const config = {
  matcher: ["/((?!$|login(?:/|$)|_next/static|_next/image|favicon[.]ico$).*)"],
};
