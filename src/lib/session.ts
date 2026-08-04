/** Denies everything until PAY-331 lands next-auth, so guarded routes 401.
 *  Then becomes: (await getServerSession(getAuthOptions())) !== null */
export const hasDashboardSession = async (): Promise<boolean> => false;
