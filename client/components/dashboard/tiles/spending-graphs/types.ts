export type ViewId = "spending" | "category" | "anomaly" | "habits" | "forecast";
export type Mode = "week" | "month";

export interface Tx {
  accountId?: string;
  amountToCent: number;
  dateOf: string;
  category?: string | null;
  merchantName?: string | null;
  isAnomaly?: boolean;
}

export type Bucket = { key: string; label: string; total: number };

export type CatGroup = {
  category: string;
  total: number;
  merchants: { name: string; total: number }[];
};