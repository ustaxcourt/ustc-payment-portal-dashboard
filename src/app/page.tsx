import { Suspense } from "react";
import TransactionLog from "@/features/transaction-log/TransactionLog";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col p-6 sm:p-8">
      {/* nuqs reads search params, so the log renders inside a boundary. */}
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">
            Loading transaction log…
          </p>
        }
      >
        <TransactionLog />
      </Suspense>
    </main>
  );
}
