import { Bill, SafeToSpend, AccountsSummary, HabitProfile, ForecastBands } from "@/types/api";

// 1. Safe To Spend (aggregate across spending accounts — matches mockSummary.aggregateSafeToSpend)
export const mockSafeToSpend: SafeToSpend = {
  accountId: null,
  safeToSpendCent: 51500,      // $515.00
  balanceCent: 115000,         // $1,150.00 (both chequings)
  incomeCent: 0,
  upcomingBillsCent: 18500,    // $185.00
  goalAllocationsCent: 25000,  // $250.00
  thresholdCent: 20000         // $200.00
};

// 2. Bills (student-sized, matches upcomingBillsCent above)
export const mockBills: Bill[] = [
  { id: "bill-1", name: "Phone", amountToCent: 5500, dueDay: 20, isAuto: false, active: true },
  { id: "bill-2", name: "Spotify", amountToCent: 1099, dueDay: 15, isAuto: true, active: true },
  { id: "bill-3", name: "Gym", amountToCent: 2900, dueDay: 5, isAuto: true, active: true },
  { id: "bill-4", name: "Rent (share)", amountToCent: 9000, dueDay: 1, isAuto: false, active: true }
];

// 3. Savings Buckets (student goals, matches goalAllocationsCent)
export const mockBuckets = [
  { id: "b1", name: "Textbooks", targetToCent: 40000, currentToCent: 15000 },   // 37%
  { id: "b2", name: "Spring Trip", targetToCent: 80000, currentToCent: 8000 },  // 10%
  { id: "b3", name: "Emergency", targetToCent: 100000, currentToCent: 2000 }    // 2%
];

// 4. Transactions (student merchants, ~12 weeks, category + isAnomaly + accountId)
type MockTx = {
  id: string;
  accountId: string;
  merchantName: string;
  category: string;
  amountToCent: number;
  dateOf: string;
  isAnomaly: boolean;
};

const DAY_MS = 86400000;
const isoDaysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();

// only these three accounts carry spend; acc-cash / acc-tfsa / acc-loan stay empty
// so toggling to them demonstrates the tile's "no spending data" empty-state
const SPEND_ACCOUNTS = ["acc-chequing", "acc-everyday", "acc-visa"];

const CATALOG: Array<[string, string, number]> = [
  ["Uber Eats", "Food & Drink", 2412],
  ["Tim Hortons", "Food & Drink", 415],
  ["Starbucks", "Food & Drink", 689],
  ["McDonald's", "Food & Drink", 1245],
  ["Presto", "Transport", 1000],
  ["Uber", "Transport", 1830],
  ["No Frills", "Groceries", 4735],
  ["Metro", "Groceries", 3260],
  ["Amazon", "Shopping", 3299],
  ["Uniqlo", "Shopping", 5999],
  ["Cineplex", "Entertainment", 1650],
  ["Steam", "Entertainment", 2999],
];

function buildMockTransactions(): MockTx[] {
  const out: MockTx[] = [];
  let seq = 1;
  for (let week = 0; week < 12; week++) {
    const base = week * 7;
    [0, 4, 6, 8, 2, 10].forEach((pi, i) => {
      const [m, c, cents] = CATALOG[(pi + week) % CATALOG.length];
      out.push({
        id: `tx-${seq++}`,
        accountId: SPEND_ACCOUNTS[(week + i) % SPEND_ACCOUNTS.length],
        merchantName: m,
        category: c,
        amountToCent: -cents,
        dateOf: isoDaysAgo(base + (i % 6)),
        isAnomaly: false,
      });
    });
  }
  [2, 32, 62].forEach((d) =>
    out.push({ id: `tx-${seq++}`, accountId: "acc-chequing", merchantName: "Spotify", category: "Subscriptions", amountToCent: -1099, dateOf: isoDaysAgo(d), isAnomaly: false })
  );
  out.push({ id: `tx-${seq++}`, accountId: "acc-visa", merchantName: "Best Buy", category: "Shopping", amountToCent: -28999, dateOf: isoDaysAgo(5), isAnomaly: true });
  out.push({ id: `tx-${seq++}`, accountId: "acc-visa", merchantName: "Air Canada", category: "Travel", amountToCent: -41200, dateOf: isoDaysAgo(24), isAnomaly: true });
  out.push({ id: `tx-${seq++}`, accountId: "acc-chequing", merchantName: "Apple", category: "Shopping", amountToCent: -15900, dateOf: isoDaysAgo(48), isAnomaly: true });
  out.push({ id: `tx-${seq++}`, accountId: "acc-chequing", merchantName: "Payroll", category: "Income", amountToCent: 120000, dateOf: isoDaysAgo(14), isAnomaly: false });

  return out.sort((a, b) => (a.dateOf < b.dateOf ? 1 : -1));
}

export const mockTransactions = buildMockTransactions();

// 5. Plaid Authentication Mocks
export const mockPlaidStatus = {
  status: "ready",
  numberOfAccounts: 6
};

export const mockLinkToken = {
  linkToken: "link-sandbox-mock-abc123",
  expiration: new Date(Date.now() + 86400000).toISOString()
};

export const mockExchangeToken = {
  success: true,
  institutionName: "CIBC"
};

// 6. Cross-account summary (matches /api/dashboard/summary)
export const mockSummary: AccountsSummary = {
  netWorth: {
    netWorthCent: -477000,   // −$4,770.00 (assets 515000 − debts 992000)
    assetsCent: 515000,      // $5,150.00
    debtsCent: 992000,       // $9,920.00
  },
  aggregateSafeToSpend: {
    accountId: null,
    safeToSpendCent: 51500,      // $515.00
    balanceCent: 115000,         // $1,150.00
    incomeCent: 0,
    upcomingBillsCent: 18500,    // $185.00
    goalAllocationsCent: 25000,  // $250.00
    thresholdCent: 20000,        // $200.00
  },
  accounts: [
    { id: "acc-chequing", institutionName: "CIBC", name: "Chequing", accountType: "spending", currentBalanceToCent: 85000, availableBalanceToCent: 85000, limitToCent: null },
    { id: "acc-everyday", institutionName: "CIBC", name: "Everyday Chequing", accountType: "spending", currentBalanceToCent: 30000, availableBalanceToCent: 30000, limitToCent: null },
    { id: "acc-visa", institutionName: "CIBC", name: "Dividend Visa", accountType: "credit", currentBalanceToCent: 42000, availableBalanceToCent: 58000, limitToCent: 100000 },
    { id: "acc-cash", institutionName: "Wealthsimple", name: "Cash", accountType: "savings", currentBalanceToCent: 120000, availableBalanceToCent: 120000, limitToCent: null },
    { id: "acc-tfsa", institutionName: "Wealthsimple", name: "TFSA", accountType: "investment", currentBalanceToCent: 280000, availableBalanceToCent: null, limitToCent: null },
    { id: "acc-loan", institutionName: "NSLSC", name: "Student Loan", accountType: "loan", currentBalanceToCent: 950000, availableBalanceToCent: null, limitToCent: null },
  ],
};

// per-account STS for a selected spending account (matches /api/dashboard/safe-to-spend?accountId=)
// note: this single mock is returned for ANY selected spending account in mock mode,
// so both chequings show the same number until real mode computes per-account
export const mockAccountSafeToSpend: SafeToSpend = {
  accountId: "acc-chequing",
  safeToSpendCent: 55000,      // $550.00
  balanceCent: 85000,          // $850.00
  incomeCent: 0,
  upcomingBillsCent: 9000,     // $90.00
  goalAllocationsCent: 15000,  // $150.00
  thresholdCent: 15000,        // $150.00
};

export const mockHabits: HabitProfile = {
  insufficientData: false,
  k: 4,
  categories: ["Food & Drink", "Groceries", "Transport", "Shopping", "Entertainment"],
  currentClusterLabel: "Dining-heavy weeks",
  clusters: [
    {
      cluster: 0,
      label: "Dining-heavy weeks",
      weekCount: 9,
      avgProfile: { "Food & Drink": 0.46, Groceries: 0.16, Transport: 0.12, Shopping: 0.14, Entertainment: 0.12 },
    },
    {
      cluster: 1,
      label: "Grocery runs",
      weekCount: 7,
      avgProfile: { "Food & Drink": 0.18, Groceries: 0.44, Transport: 0.14, Shopping: 0.12, Entertainment: 0.12 },
    },
    {
      cluster: 2,
      label: "Shopping sprees",
      weekCount: 5,
      avgProfile: { "Food & Drink": 0.16, Groceries: 0.14, Transport: 0.10, Shopping: 0.48, Entertainment: 0.12 },
    },
    {
      cluster: 3,
      label: "Quiet weeks",
      weekCount: 3,
      avgProfile: { "Food & Drink": 0.22, Groceries: 0.24, Transport: 0.28, Shopping: 0.12, Entertainment: 0.14 },
    },
  ],
};


// 7. Monte Carlo savings forecast — per-week percentile bands (mock)
// Gaussian cone: p50 drifts up by weeklyMean, spread grows with sqrt(week).
// Matches the /api/forecast/goal/{id}/bands contract.
const Z = { p10: -1.2816, p25: -0.6745, p75: 0.6745, p90: 1.2816 };

function normCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

function hashStr(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mockForecastBands(bucket: {
  id: string;
  name: string;
  targetToCent: number;
  currentToCent: number;
}): ForecastBands {
  const target = bucket.targetToCent;
  const current = bucket.currentToCent;
  const remaining = Math.max(target - current, 1);
  const weeklyMean = Math.max(300, remaining / 32);
  const weeklySd = weeklyMean * 0.85;

  const crossWeek = (z: number) => {
    for (let w = 1; w <= 200; w++) {
      const p50 = current + weeklyMean * w;
      const sigma = weeklySd * Math.sqrt(w);
      if (p50 + z * sigma >= target) return w;
    }
    return null;
  };
  const medianWeeks = crossWeek(0);
  const p90Weeks = crossWeek(Z.p10);
  const horizon = Math.min(104, Math.max(12, (p90Weeks ?? 52) + 4));

  const bands = [];
  for (let w = 0; w <= horizon; w++) {
    const p50 = current + weeklyMean * w;
    const sigma = weeklySd * Math.sqrt(w);
    const at = (z: number) => Math.max(0, Math.round(p50 + z * sigma));
    bands.push({
      week: w,
      p10Cent: at(Z.p10),
      p25Cent: at(Z.p25),
      p50Cent: Math.round(p50),
      p75Cent: at(Z.p75),
      p90Cent: at(Z.p90),
    });
  }

  const p50H = current + weeklyMean * horizon;
  const sigmaH = weeklySd * Math.sqrt(horizon) || 1;
  const probabilityWithinHorizon = Math.min(
    1,
    Math.max(0, 1 - normCdf((target - p50H) / sigmaH))
  );

  const rand = mulberry32(hashStr(bucket.id));
  const gauss = () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const samplePaths: number[][] = [];
  for (let s = 0; s < 6; s++) {
    const path = [current];
    let bal = current;
    for (let w = 1; w <= horizon; w++) {
      bal = Math.max(0, bal + weeklyMean + gauss() * weeklySd);
      path.push(Math.round(bal));
    }
    samplePaths.push(path);
  }

  return {
    bucketId: bucket.id,
    bucketName: bucket.name,
    targetCent: target,
    currentCent: current,
    horizonWeeks: horizon,
    medianWeeks,
    p90Weeks,
    probabilityWithinHorizon,
    bands,
    samplePaths,
  };
}