// API returns camelCase; backend uses Pydantic alias_generator to convert
export interface LinkTokenResponse {
    linkToken: string;
    expiration: string; // timestamp
}

export interface ExchangeRequest {
    publicToken: string;
}

export interface ExchangeResponse {
    success: boolean;
    institutionName: string;
}

export interface PlaidStatus {
    status: "syncing" | "ready" | "error";
    numberOfAccounts: number; // the amount of accounts synced

}

// Bill API shape
export interface Bill {
  id: string;
  name: string;
  amountToCent: number;
  dueDay: number;
  isAuto: boolean;
  active: boolean;
}

// Bill Req Api Shape
export interface BillCreate {
  name: string;
  amountToCent: number;
  dueDay: number;
}

// safe to spend response shape
export interface SafeToSpend {
  accountId: string | null;
  safeToSpendCent: number;
  balanceCent: number;
  upcomingBillsCent: number;
  goalAllocationsCent: number;
  thresholdCent: number;
}

export type AccountType = "spending" | "credit" | "savings" | "investment" | "loan";

// one connected account under an institution
export interface Account {
  id: string;
  institutionName: string | null;
  name: string;
  accountType: AccountType;
  currentBalanceToCent: number;
  availableBalanceToCent: number | null;
  limitToCent: number | null;
}


// assets - debts across every account
export interface NetWorth {
  netWorthCent: number;
  assetsCent: number;
  debtsCent: number;
}

// dashboard summary across all accounts
export interface AccountsSummary {
  netWorth: NetWorth;
  aggregateSafeToSpend: SafeToSpend;
  accounts: Account[];
}

