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

