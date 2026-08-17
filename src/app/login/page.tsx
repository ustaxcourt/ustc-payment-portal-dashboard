import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import LoginButton from "@/components/ui/LoginButton";
import { getSessionAuthOptions } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/callbackUrl";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;
  const destination = safeCallbackUrl(callbackUrl);
  const session = await getServerSession(getSessionAuthOptions());

  if (session) {
    redirect(destination);
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Sign in to the dashboard
        </h1>
        <p className="mt-4 text-sm text-muted-foreground sm:text-base">
          Use your United States Tax Court Microsoft account to access the Case
          Services &amp; Finance Dashboard.
        </p>
        <div className="mt-8">
          <LoginButton callbackUrl={destination} />
        </div>
      </div>
    </main>
  );
}
