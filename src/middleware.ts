import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

// The matcher defines the private routes. Leave the landing page public so it
// can perform a plain server redirect to /login without NextAuth appending a
// callbackUrl query parameter. API routes are excluded so they can answer with
// a JSON 401 — a redirect would hand fetch clients an HTML login page.
export const config = {
  matcher: ["/((?!$|api/|login(?:/|$)|_next/static|_next/image|favicon[.]ico$).*)"],
};
