import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

// The matcher defines the public routes. Any route that does not match one of
// these exclusions is treated as private and requires an authenticated session.
export const config = {
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};
