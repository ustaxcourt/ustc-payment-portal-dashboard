import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";

function route(request: Request, context: unknown) {
  const handler = NextAuth(getAuthOptions());
  return handler(request, context as never);
}

export { route as GET, route as POST };
