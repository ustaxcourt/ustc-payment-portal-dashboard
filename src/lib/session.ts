/**
 * Whether the caller is a signed-in Court user.
 *
 * Authentication lands with PAY-331, which is not on main yet, so this denies
 * everything and the routes it guards return 401. That is deliberate: the data
 * behind them is live financial activity, and a permissive stub would expose it.
 *
 * When PAY-331 merges, this becomes:
 *
 *   import { getServerSession } from "next-auth";
 *   import { getAuthOptions } from "@/lib/auth";
 *   export const hasDashboardSession = async () =>
 *     (await getServerSession(getAuthOptions())) !== null;
 */
export const hasDashboardSession = async (): Promise<boolean> => false;
