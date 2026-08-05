import { getServerSession } from "next-auth/next";
import { getSessionAuthOptions } from "@/lib/auth";

export const hasDashboardSession = async (): Promise<boolean> =>
  (await getServerSession(getSessionAuthOptions())) !== null;
