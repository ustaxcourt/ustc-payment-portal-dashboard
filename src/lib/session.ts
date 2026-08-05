/**
 * Denies everything until PAY-331 lands next-auth, so guarded routes 401.
 * Then becomes: (await getServerSession(getSessionAuthOptions())) !== null
 *
 * The dev escape hatch cannot be enabled in a deployed environment: `next build`
 * forces NODE_ENV=production and Amplify serves a built app.
 */
export const hasDashboardSession = async (): Promise<boolean> =>
  process.env.NODE_ENV === "development" &&
  process.env.DASHBOARD_DEV_NO_AUTH === "1";
