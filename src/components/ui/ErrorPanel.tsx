"use client";

/** Shared by the dashboard's data panels so a failure reads the same anywhere. */
export default function ErrorPanel({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-md border border-destructive/50 p-6 text-sm">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md border px-3 py-1.5 hover:bg-muted"
      >
        Try again
      </button>
    </div>
  );
}
