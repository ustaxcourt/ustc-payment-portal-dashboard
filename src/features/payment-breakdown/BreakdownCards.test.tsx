import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BreakdownCards from "./BreakdownCards";

describe("BreakdownCards", () => {
  it("renders each card's label, amount and caption in the order given", () => {
    render(
      <BreakdownCards
        ariaLabel="Payments by fee"
        cards={[
          { id: "b", label: "Second", amount: "$2.00", caption: "2 things" },
          { id: "a", label: "First", amount: "$1.00", caption: "1 thing" },
        ]}
      />,
    );

    const items = within(
      screen.getByRole("list", { name: "Payments by fee" }),
    ).getAllByRole("listitem");

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Second");
    expect(items[0]).toHaveTextContent("$2.00");
    expect(items[0]).toHaveTextContent("2 things");
    expect(items[1]).toHaveTextContent("First");
  });
});
