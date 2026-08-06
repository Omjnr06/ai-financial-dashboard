import { Bill, SafeToSpend, AccountsSummary } from "@/types/api";

// 1. Safe To Spend (aggregate across spending accounts — matches mockSummary.aggregateSafeToSpend)
export const mockSafeToSpend: SafeToSpend = {
  accountId: null,
  safeToSpendCent: 51500,      // $515.00
  balanceCent: 115000,         // $1,150.00 (both chequings)
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

// 4. Transactions (student merchants, dynamic dates)
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

export const mockTransactions = [
  {
    id: "tx-1",
    merchantName: "Uber Eats",
    amountToCent: -2412,
    dateOf: today.toISOString()
  },
  {
    id: "tx-2",
    merchantName: "Presto",
    amountToCent: -1000,
    dateOf: yesterday.toISOString()
  },
  {
    id: "tx-3",
    merchantName: "No Frills",
    amountToCent: -4735,
    dateOf: twoDaysAgo.toISOString()
  }
];

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
  upcomingBillsCent: 9000,     // $90.00
  goalAllocationsCent: 15000,  // $150.00
  thresholdCent: 15000,        // $150.00
};