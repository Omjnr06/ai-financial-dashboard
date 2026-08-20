import { Bill, SafeToSpend, AccountsSummary, HabitProfile, GoalDistribution, SpendSummary,AssistantResponse } from "@/types/api";

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

// 4. Transactions (Plaid convention: spending POSITIVE, income NEGATIVE)
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
        amountToCent: cents,
        dateOf: isoDaysAgo(base + (i % 6)),
        isAnomaly: false,
      });
    });
  }
  [2, 32, 62].forEach((d) =>
    out.push({ id: `tx-${seq++}`, accountId: "acc-chequing", merchantName: "Spotify", category: "Subscriptions", amountToCent: 1099, dateOf: isoDaysAgo(d), isAnomaly: false })
  );
  out.push({ id: `tx-${seq++}`, accountId: "acc-visa", merchantName: "Best Buy", category: "Shopping", amountToCent: 28999, dateOf: isoDaysAgo(5), isAnomaly: true });
  out.push({ id: `tx-${seq++}`, accountId: "acc-visa", merchantName: "Air Canada", category: "Travel", amountToCent: 41200, dateOf: isoDaysAgo(24), isAnomaly: true });
  out.push({ id: `tx-${seq++}`, accountId: "acc-chequing", merchantName: "Apple", category: "Shopping", amountToCent: 15900, dateOf: isoDaysAgo(48), isAnomaly: true });
  out.push({ id: `tx-${seq++}`, accountId: "acc-chequing", merchantName: "Payroll", category: "Income", amountToCent: -120000, dateOf: isoDaysAgo(14), isAnomaly: false });

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
  categoryMeans: { "Food & Drink": 0.255, Groceries: 0.245, Transport: 0.16, Shopping: 0.215, Entertainment: 0.125 },
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

// 7. Goal-completion distribution (mock) — mirrors /api/forecast/goal/{id}/distribution
// bootstrap-resamples a synthetic weekly-savings history, shifts each draw by the
// what-if delta, and returns the completion-week distribution + the history sample.
function fdHash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function fdRng(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function fdPct(sorted: number[], q: number) {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

export function mockGoalDistribution(
  bucket: { id: string; name: string; targetToCent: number; currentToCent: number },
  savingsDeltaCent = 0
): GoalDistribution {
  const horizon = 52;
  const block = 8;
  const remaining = Math.max(bucket.targetToCent - bucket.currentToCent, 1);
  const rng = fdRng(fdHash(bucket.id));
  const gauss = () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  // LUMPY synthetic history that mimics real biweekly income: most weeks are
  // net-negative (spending), with a paycheck landing every ~2 weeks. Mean is
  // tuned to make the goal reachable. This reproduces the real-data regime so
  // block bootstrap is exercised in mock mode too.
  const targetWeeks = 26;
  const meanNet = Math.max(300, remaining / targetWeeks); // desired avg weekly net
  const leanSpend = 32000; // ~$320 net-negative on a non-paycheck week
  const historySample: number[] = [];
  for (let w = 0; w < 26; w++) {
    if (w % 2 === 0) {
      // paycheck week: covers the two-week cycle plus the desired surplus
      historySample.push(Math.round(2 * meanNet + leanSpend + gauss() * 8000));
    } else {
      historySample.push(Math.round(-leanSpend + gauss() * 8000));
    }
  }

  if (bucket.targetToCent <= bucket.currentToCent) {
    return {
      alreadyReached: true,
      insufficientHistory: false,
      p10Weeks: 0,
      medianWeeks: 0,
      p90Weeks: 0,
      probabilityWithinHorizon: 1,
      horizonWeeks: horizon,
      simulations: 0,
      savingsDeltaCent,
      histogram: [],
      historySample,
    };
  }

  const n = historySample.length;
  const bl = Math.max(1, Math.min(block, n));
  const paths = 4000;
  const finishes: number[] = [];
  let within = 0;
  for (let p = 0; p < paths; p++) {
    let bal = bucket.currentToCent;
    let done = -1;
    let w = 0;
    while (w < horizon && done < 0) {
      const start = Math.floor(rng() * n);
      for (let k = 0; k < bl && w < horizon; k++) {
        bal += historySample[(start + k) % n] + savingsDeltaCent;
        w++;
        if (bal >= bucket.targetToCent) {
          done = w;
          break;
        }
      }
    }
    if (done > 0) {
      finishes.push(done);
      within++;
    }
  }
  finishes.sort((a, b) => a - b);

  const counts: Record<number, number> = {};
  finishes.forEach((w) => (counts[w] = (counts[w] || 0) + 1));
  const histogram = Object.entries(counts)
    .map(([w, c]) => ({ week: Number(w), count: c }))
    .sort((a, b) => a.week - b.week);

  return {
    alreadyReached: false,
    insufficientHistory: false,
    p10Weeks: finishes.length ? Math.round(fdPct(finishes, 0.1)!) : null,
    medianWeeks: finishes.length ? Math.round(fdPct(finishes, 0.5)!) : null,
    p90Weeks: finishes.length ? Math.round(fdPct(finishes, 0.9)!) : null,
    probabilityWithinHorizon: paths ? within / paths : 0,
    horizonWeeks: horizon,
    simulations: paths,
    savingsDeltaCent,
    histogram,
    historySample,
  };
}


// 8. Spend summary (mock) — mirrors /api/transactions/summary. Aggregates the
// mock transactions (Plaid convention: spend positive) the same way the backend
// GROUP BY does, optionally scoped to an account.
function startOfWeekMonISO(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

export function mockSpendSummary(accountId?: string | null): SpendSummary {
  const spend = mockTransactions.filter(
    (t) => t.amountToCent > 0 && (!accountId || t.accountId === accountId)
  );

  // weekly
  const wk: Record<string, number> = {};
  spend.forEach((t) => {
    const k = startOfWeekMonISO(new Date(t.dateOf));
    wk[k] = (wk[k] || 0) + t.amountToCent;
  });
  const weekly = Object.entries(wk)
    .map(([weekStart, spentCents]) => ({ weekStart, spentCents }))
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));

  // monthly
  const mo: Record<string, number> = {};
  spend.forEach((t) => {
    const d = new Date(t.dateOf);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    mo[k] = (mo[k] || 0) + t.amountToCent;
  });
  const monthly = Object.entries(mo)
    .map(([month, spentCents]) => ({ month, spentCents }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));

  // categories + merchants
  const catMap: Record<string, { spentCents: number; m: Record<string, number> }> = {};
  spend.forEach((t) => {
    const c = t.category || "Other";
    const m = t.merchantName || "Unknown";
    const entry = (catMap[c] = catMap[c] || { spentCents: 0, m: {} });
    entry.spentCents += t.amountToCent;
    entry.m[m] = (entry.m[m] || 0) + t.amountToCent;
  });
  const categories = Object.entries(catMap)
    .map(([category, e]) => ({
      category,
      spentCents: e.spentCents,
      merchants: Object.entries(e.m)
        .map(([name, spentCents]) => ({ name, spentCents }))
        .sort((a, b) => b.spentCents - a.spentCents),
    }))
    .sort((a, b) => b.spentCents - a.spentCents);

  // recent points for the scatter (already spend-only)
  const recentPoints = spend
    .slice()
    .sort((a, b) => (a.dateOf < b.dateOf ? 1 : -1))
    .slice(0, 400)
    .map((t) => ({
      dateOf: t.dateOf,
      amountToCent: t.amountToCent,
      merchantName: t.merchantName,
      isAnomaly: t.isAnomaly,
    }));

  return {
    weekly,
    monthly,
    categories,
    recentPoints,
    hasSpend: weekly.length > 0 || categories.length > 0,
  };
}

// paginated transactions envelope (mock) — mirrors /api/transactions
export function mockTransactionsPage(limit = 50, offset = 0, accountId?: string | null) {
  const all = mockTransactions.filter((t) => !accountId || t.accountId === accountId);
  const items = all.slice(offset, offset + limit);
  return {
    items,
    total: all.length,
    limit,
    offset,
    hasMore: offset + items.length < all.length,
  };
}

export const mockAssistantSuggestions: string[] = [
  "how much did I spend on dining",
  "what was my biggest purchase this month",
  "what's safe to spend this week",
  "what's my net worth",
  "when will I afford my new laptop",
  "what are my spending habits",
];

export function mockAssistantAnswer(question: string): AssistantResponse {
  const q = question.toLowerCase();

  const onTopic = [
    "spend", "spent", "dining", "food", "grocer", "transport", "shopping",
    "entertainment", "bill", "worth", "safe", "afford", "goal", "laptop",
    "habit", "purchase", "transaction", "budget", "money",
  ];
  if (!onTopic.some((k) => q.includes(k))) {
    return {
      answer: "That's outside what I can help with right now.",
      intent: null,
      confidence: 0.31,
      suggestions: mockAssistantSuggestions,
    };
  }

  if (q.includes("worth")) {
    return {
      answer: "Your net worth is $1,100.00 — $17,300.00 in assets minus $16,200.00 in debts.",
      intent: "net_worth",
      confidence: 0.97,
      suggestions: null,
    };
  }

  if (q.includes("safe")) {
    return {
      answer: "You've got $3,139.01 safe to spend this week.",
      intent: "safe_to_spend",
      confidence: 0.98,
      suggestions: null,
    };
  }

  if (q.includes("habit")) {
    return {
      answer:
        "Your weeks sort into a few patterns: Bills-heavy weeks, Transport-heavy weeks, Shopping-heavy weeks, Entertainment-heavy weeks. Lately you're in entertainment-heavy weeks.",
      intent: "habits",
      confidence: 0.99,
      suggestions: null,
    };
  }

  if (q.includes("afford") || q.includes("goal") || q.includes("laptop")) {
    if (q.includes("jet") || q.includes("yacht")) {
      return {
        answer:
          'I couldn\'t find a goal called "private jet". Your goals are: Textbooks, New Laptop, Spring Trip, Car Down Payment.',
        intent: "goal_forecast",
        confidence: 0.58,
        suggestions: null,
      };
    }
    return {
      answer:
        "For New Laptop, you're on track — about 4 weeks at the median, with a 93% chance within a year.",
      intent: "goal_forecast",
      confidence: 0.99,
      suggestions: null,
    };
  }

  if (q.includes("biggest") || q.includes("largest") || q.includes("purchase")) {
    return {
      answer: "Your biggest purchase was $84.79 at Tim Hortons (Dining) on Aug 2.",
      intent: "largest_transaction",
      confidence: 0.98,
      suggestions: null,
    };
  }

  const cats: Array<[string, string]> = [
    ["dining", "Dining"], ["food", "Dining"], ["grocer", "Groceries"],
    ["transport", "Transport"], ["shopping", "Shopping"], ["entertainment", "Entertainment"],
  ];
  for (const [kw, label] of cats) {
    if (q.includes(kw)) {
      return {
        answer: `${label} came to $140.18 in August 2026.`,
        intent: "spending_by_category",
        confidence: 0.97,
        suggestions: null,
      };
    }
  }

  return {
    answer: "You've spent $528.67 in August 2026 — mostly Transport ($190.82), Dining ($140.18).",
    intent: "get_total_spending",
    confidence: 0.95,
    suggestions: null,
  };
}