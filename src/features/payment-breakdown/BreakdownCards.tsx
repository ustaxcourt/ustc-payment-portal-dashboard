export type BreakdownCardData = {
  id: string;
  label: string;
  /** Already formatted for display. */
  amount: string;
  caption: string;
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
    <ul aria-label={ariaLabel} className="flex flex-wrap gap-3">
      {cards.map((card) => (
        <li
          key={card.id}
          data-testid={`payment-breakdown-card-${card.id}`}
          className="flex flex-col gap-1 rounded-lg border bg-slate-100 px-5 py-3 text-card-foreground"
        >
          <span className="text-xs font-semibold tracking-wider uppercase">
            {card.label}
          </span>
          <span className="flex items-baseline gap-3">
            <span className="font-mono text-2xl font-semibold tabular-nums text-status-success-foreground">
              {card.amount}
            </span>
            <span className="text-xs text-muted-foreground">
              {card.caption}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
