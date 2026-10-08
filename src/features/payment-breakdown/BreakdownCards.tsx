export type BreakdownCardData = {
  id: string;
  label: string;
  /** Already formatted for display. */
  amount: string;
  caption: string;
  /** Bolds the label. */
  emphasized?: boolean;
};

/** Display-only: renders the cards it is given, in order. */
export default function BreakdownCards({
  cards,
  ariaLabel,
}: {
  cards: BreakdownCardData[];
  ariaLabel: string;
}) {
  return (
    <ul aria-label={ariaLabel} className="grid grid-cols-4 gap-3">
      {cards.map((card) => (
        <li
          key={card.id}
          data-testid={`payment-breakdown-card-${card.id}`}
          className="flex min-w-0 flex-col gap-1 rounded-lg border bg-slate-100 px-5 py-3 text-card-foreground"
        >
          <span
            title={card.label}
            className={`truncate text-xs tracking-widest text-slate-900 uppercase${card.emphasized ? "font-bold" : "font-semibold"}`}
          >
            {card.label}
          </span>
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-2xl font-semibold tabular-nums text-status-success-foreground">
              {card.amount}
            </span>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {card.caption}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
