import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";

async function route(request: Request, context: unknown) {
  const handler = NextAuth(await getAuthOptions());
  return handler(request, context as never);
}

export { route as GET, route as POST };
