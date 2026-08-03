import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import LogoutButton from "./components/LogoutButton";

export default async function Home() {
  const session = await getServerSession(getAuthOptions());

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-xl text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Case Services & Finance Dashboard
        </h1>
        <p className="mt-4 text-sm text-muted-foreground sm:text-base">
          United States Tax Court &mdash; payment portal transaction activity.
        </p>
        <div className="mt-8 space-y-2 text-sm text-muted-foreground">
          <p>{session.user?.name}</p>
          <p>{session.user?.email}</p>
          <p>This dashboard is not yet available.</p>
          <div className="pt-4">
            <LogoutButton />
          </div>
        </div>
      </div>
    </main>
  );
}
