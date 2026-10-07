import { getServerSession } from "next-auth/next";
import { getSessionAuthOptions, hasValidDashboardSession } from "@/lib/auth";

export const hasDashboardSession = async (): Promise<boolean> =>
  hasValidDashboardSession(await getServerSession(getSessionAuthOptions()));
