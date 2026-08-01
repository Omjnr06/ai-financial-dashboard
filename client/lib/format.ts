// for formatting money
export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || isNaN(cents)) {
    return "$0.00";
  }

  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}