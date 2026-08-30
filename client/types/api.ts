// enums
export type IncomeFrequency = "weekly" | "biweekly" | "monthly";
export type AccountType = "spending" | "credit" | "savings" | "investment" | "loan";
export type Status = "active" | "login_required" | "error" ;

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
  incomeCent: number;
  upcomingBillsCent: number;
  goalAllocationsCent: number;
  thresholdCent: number;
}

// one connected account under an institution
export interface Account {
  id: string;
  institutionName: string | null;
  name: string;
  accountType: AccountType;
  currentBalanceToCent: number;
  availableBalanceToCent: number | null;
  limitToCent: number | null;
  status: Status;
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

// a recurring income source
export interface IncomeSource {
  id: string;
  accountId: string | null;
  sourceAccountId: string | null;
  isInternalTransfer: boolean;
  name: string;
  amountToCent: number;
  frequency: IncomeFrequency;
  anchorDate: string; // ISO date
  active: boolean;
}

export interface IncomeCreate {
  name: string;
  amountToCent: number;
  frequency: IncomeFrequency;
  anchorDate: string;
  accountId?: string | null;
  sourceAccountId?: string | null;
  isInternalTransfer?: boolean;
}

export interface HabitCluster {
  cluster: number;
  label: string;
  weekCount: number;
  avgProfile: Record<string, number>;
}

export interface HabitProfile {
  insufficientData: boolean;
  k?: number;
  categories?: string[];
  clusters?: HabitCluster[];
  currentClusterLabel?: string | null;
  categoryMeans?: Record<string, number>;
}

// for monte carlo visualization
export interface ForecastBand {
  week: number;
  p10Cent: number;
  p25Cent: number;
  p50Cent: number;
  p75Cent: number;
  p90Cent: number;
}

export interface ForecastBands {
  bucketId: string;
  bucketName: string;
  targetCent: number;
  currentCent: number;
  horizonWeeks: number;
  medianWeeks: number | null;
  p90Weeks: number | null;
  probabilityWithinHorizon: number;
  bands: ForecastBand[];
  samplePaths?: number[][];
}


export interface CompletionBin { week: number; count: number; }
export interface GoalDistribution {
  alreadyReached: boolean;
  insufficientHistory: boolean;
  p10Weeks: number | null;
  medianWeeks: number | null;
  p90Weeks: number | null;
  probabilityWithinHorizon: number | null;
  horizonWeeks: number;
  simulations: number;
  savingsDeltaCent: number;
  histogram: CompletionBin[];
  historySample: number[];
}

export interface SpendWeekly { weekStart: string; spentCents: number; }
export interface SpendMonthly { month: string; spentCents: number; }
export interface SpendMerchant { name: string; spentCents: number; }
export interface SpendCategory { category: string; spentCents: number; merchants: SpendMerchant[]; }
export interface SpendPoint { dateOf: string; amountToCent: number; merchantName: string | null; isAnomaly: boolean; }

export interface SpendSummary {
  weekly: SpendWeekly[]; monthly: SpendMonthly[];
  categories: SpendCategory[]; recentPoints: SpendPoint[]; hasSpend: boolean;
}


export interface AssistantResponse {
  answer: string;
  intent: string | null;
  confidence: number;
  suggestions: string[] | null;
}

export interface AssistantSuggestions {
  suggestions: string[];
}

export type AssistantResult =
  | { ok: true; data: AssistantResponse }
  | {
      ok: false;
      kind: "auth" | "rate_limit" | "validation" | "network";
      message: string;
      retryAfter?: number;
    };

export interface PlaidItemData {
  id: string;
  institutionName: string;
  status: "active" | "login_required" | "error";
  lastSyncedAt?: string;
  accountsCount?: number;
}