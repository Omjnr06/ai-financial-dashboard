import type { Tx, Bucket, CatGroup } from "./types";

export const isSpend = (t: { amountToCent: number }) => t.amountToCent > 0;
export const spendDollars = (t: { amountToCent: number }) =>
  Math.abs(t.amountToCent) / 100;

export function startOfWeekMon(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

export function aggregateByWeek(tx: Tx[], weeks = 8): Bucket[] {
  const curStart = startOfWeekMon(new Date());
  const buckets: Bucket[] = [];
  const index = new Map<string, number>();
  for (let i = weeks - 1; i >= 0; i--) {
    const s = new Date(curStart);
    s.setDate(s.getDate() - i * 7);
    const key = s.toISOString().slice(0, 10);
    index.set(key, buckets.length);
    buckets.push({
      key,
      label: s.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      total: 0,
    });
  }
  for (const t of tx) {
    const key = startOfWeekMon(new Date(t.dateOf)).toISOString().slice(0, 10);
    const bi = index.get(key);
    if (bi !== undefined) buckets[bi].total += spendDollars(t);
  }
  return buckets;
}

export function aggregateByMonth(tx: Tx[], months = 6): Bucket[] {
  const now = new Date();
  const buckets: Bucket[] = [];
  const index = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    index.set(key, buckets.length);
    buckets.push({
      key,
      label: d.toLocaleDateString(undefined, { month: "short" }),
      total: 0,
    });
  }
  for (const t of tx) {
    const d = new Date(t.dateOf);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bi = index.get(key);
    if (bi !== undefined) buckets[bi].total += spendDollars(t);
  }
  return buckets;
}

export function groupByCategory(tx: Tx[]): CatGroup[] {
  const map = new Map<string, Map<string, number>>();
  for (const t of tx) {
    const cat = t.category ?? "Other";
    const merch = t.merchantName ?? "Unknown";
    if (!map.has(cat)) map.set(cat, new Map());
    const mm = map.get(cat)!;
    mm.set(merch, (mm.get(merch) ?? 0) + spendDollars(t));
  }
  const groups: CatGroup[] = [];
  for (const [category, mm] of map) {
    const merchants = [...mm.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
    groups.push({
      category,
      total: merchants.reduce((s, m) => s + m.total, 0),
      merchants,
    });
  }
  return groups.sort((a, b) => b.total - a.total);
}