import type { ViewId } from "./types";

export const VIEW_META: Record<ViewId, { label: string; desc: string }> = {
  spending: {
    label: "Spending over time",
    desc: "Total money out per week or month across the selected account.",
  },
  category: {
    label: "Category breakdown",
    desc: "Where your money goes — inner ring is categories, outer ring is merchants.",
  },
  anomaly: {
    label: "Unusual spend",
    desc: "Transactions plotted over time, with flagged outliers highlighted.",
  },
  habits: {
    label: "Spending habits",
    desc: "Recurring weekly spending shapes clustered into habit profiles.",
  },
  forecast: {
    label: "Savings forecast",
    desc: "Projected path to your goal with probability bands.",
  },
};

// flip a view on by adding its id here once its component exists
export const IMPLEMENTED: ViewId[] = ["spending", "category", "anomaly", "habits", "forecast"];

export function getAvailableViews(
  hasSpend: boolean,
  isAll: boolean,
  hasHabits: boolean,
  hasForecast: boolean
): ViewId[] {
  const all: ViewId[] = [];
  if (hasSpend) {
    all.push("spending");
    all.push("category");
    all.push("anomaly");
  }
  if (isAll && hasHabits) {
    all.push("habits");
  }
  if (isAll && hasForecast) {
    all.push("forecast");
  }
  return all.filter((v) => IMPLEMENTED.includes(v));
}