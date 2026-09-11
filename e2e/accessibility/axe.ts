import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import type { AxeResults, Result } from "axe-core";

const WCAG_21_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

type AccessibilityScanOptions = {
  page: Page;
  pageName: string;
  route: string;
  ready: () => Promise<void>;
};

const summarizeNode = (node: Result["nodes"][number]): string => {
  const target = node.target.join(" ");
  const failureSummary = node.failureSummary?.replaceAll("\n", " ").trim();

  if (target && failureSummary) {
    return `${target} (${failureSummary})`;
  }

  return target || failureSummary || "No target information reported.";
};

const formatViolations = (
  pageName: string,
  route: string,
  violations: AxeResults["violations"],
): string =>
  [
    `Accessibility violations detected on ${pageName} (${route}):`,
    ...violations.map((violation) => {
      const nodes = violation.nodes.slice(0, 3).map(summarizeNode).join("; ");

      return [
        `- ${violation.id} [${violation.impact ?? "unknown"}]`,
        violation.description,
        nodes ? `Targets: ${nodes}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
    }),
  ].join("\n");

const attachmentName = (pageName: string): string =>
  `${pageName.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-axe-results.json`;

export async function expectAccessiblePage({
  page,
  pageName,
  route,
  ready,
}: AccessibilityScanOptions): Promise<void> {
  await ready();

  const results = await new AxeBuilder({ page })
    .withTags(WCAG_21_AA_TAGS)
    .analyze();

  if (results.violations.length > 0) {
    await test.info().attach(attachmentName(pageName), {
      body: Buffer.from(JSON.stringify(results, null, 2)),
      contentType: "application/json",
    });
  }

  expect(
    results.violations,
    formatViolations(pageName, route, results.violations),
  ).toHaveLength(0);
}
