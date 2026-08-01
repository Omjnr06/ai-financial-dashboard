import { Bill, SafeToSpend } from "@/types/api";

// 1. Safe To Spend (Matches your wireframe exactly)
export const mockSafeToSpend: SafeToSpend = {
  safeToSpendCent: 80000,      // $800.00
  balanceCent: 570000,         // $5,700.00
  upcomingBillsCent: 140000,
  goalAllocationsCent: 310000,
  thresholdCent: 400000        // $4,000.00
};

// 2. Bills (Typed as Bill[])
export const mockBills: Bill[] = [
  { id: "bill-1", name: "Rent", amountToCent: 140000, dueDay: 1, isAuto: false, active: true },
  { id: "bill-2", name: "Spotify", amountToCent: 1099, dueDay: 15, isAuto: false, active: true },
  { id: "bill-3", name: "Phone", amountToCent: 6500, dueDay: 20, isAuto: false, active: true }
];

// 3. Savings Buckets (Matches wireframe percentages)
export const mockBuckets = [
  { id: "b1", name: "Macbook Pro", targetToCent: 200000, currentToCent: 160000 }, // 80%
  { id: "b2", name: "Acura TLX", targetToCent: 500000, currentToCent: 25000 },    // 5%
  { id: "b3", name: "Aritzia Set", targetToCent: 15000, currentToCent: 1500 }     // 10%
];

// 4. Transactions (Using dynamic dates so they always look recent)
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

export const mockTransactions = [
  { 
    id: "tx-1", 
    merchantName: "Uber Eats", 
    amountToCent: -2412, // $24.12
    dateOf: today.toISOString() 
  },
  { 
    id: "tx-2", 
    merchantName: "Loblaws", 
    amountToCent: -6450, 
    dateOf: yesterday.toISOString() 
  }
];

// 5. Plaid Authentication Mocks
export const mockPlaidStatus = {
  status: "ready",
  numberOfAccounts: 2
};

export const mockLinkToken = {
  linkToken: "link-sandbox-mock-abc123",
  // Sets expiration to exactly 24 hours from whenever the app runs
  expiration: new Date(Date.now() + 86400000).toISOString() 
};

export const mockExchangeToken = {
  success: true,
  institutionName: "Scotiabank"
};