import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";


let handler: ReturnType<typeof NextAuth> | undefined;

function route(request: Request, context: unknown) {
  handler ??= NextAuth(getAuthOptions());
  return handler(request, context as never);
}

export { route as GET, route as POST };
