import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";

const handler = async (request: Request, context: unknown) =>
	NextAuth(getAuthOptions())(request, context);

export { handler as GET, handler as POST };
