
export enum MarketDataType {
  /**
   * Not specified, should not be used.
   */
  TYPE_UNSPECIFIED = 'TYPE_UNSPECIFIED',
  /**
   * OpenAPI string type
   */
  STRING = 'STRING',
  /**
   * OpenAPI number type
   */
  NUMBER = 'NUMBER',
  /**
   * OpenAPI integer type
   */
  INTEGER = 'INTEGER',
  /**
   * OpenAPI boolean type
   */
  BOOLEAN = 'BOOLEAN',
  /**
   * OpenAPI array type
   */
  ARRAY = 'ARRAY',
  /**
   * OpenAPI object type
   */
  OBJECT = 'OBJECT',
  /**
   * Null type
   */
  NULL = 'NULL',
}

export enum MarketCategory {
  POLITICS = 'Politics',
  ECONOMICS = 'Economics',
  CRYPTO = 'Crypto',
  SCIENCE = 'Science',
  CULTURE = 'Culture',
  SPORTS = 'Sports'
}

export enum Platform {
  POLYMARKET = 'Polymarket',
  KALSHI = 'Kalshi',
  PREDICTIT = 'PredictIt',
  DRAFTKINGS = 'DraftKings',
  FANDUEL = 'FanDuel',
  BETMGM = 'BetMGM',
  BOVADA = 'Bovada',
  BETRIVERS = 'BetRivers'
}

export interface Odd {
  price: number; 
  timestamp: number;
}

export interface MarketLine {
  platform: Platform;
  yesPrice: Odd;
  noPrice: Odd;
  url: string;
  liquidity?: number;
  outcomeType?: OutcomeType;
  isImpliedNo?: boolean;
}

export interface MarketEvent {
  id: string;
  category: MarketCategory;
  title: string;
  outcome: string; 
  description: string;
  expiry: Date;
  lines: MarketLine[];
  bestYes: { price: number; platform: Platform };
  bestNo: { price: number; platform: Platform };
  arbPercent?: number;
  apy?: number;
  daysToExpiry?: number;
  lastScraped?: number;
  relevanceScore?: number; 
}

export interface AnalysisResult {
  analysis: string;
  recommendation: 'STRONG BUY' | 'BUY' | 'HOLD' | 'AVOID';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  sources?: { title: string; uri: string }[];
}

export type UserTier = 'free' | 'explorer' | 'pro';

export type OutcomeType = 'binary' | 'moneyline' | 'implied';

export interface User {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  zip?: string;
  phone?: string;
  countryCode?: string;
  ipAddress?: string;
  isPaid: boolean;
  tier: UserTier;
  subscriptionStatus?: string;
  registrationStep: 'lead' | 'verifying' | 'complete';
  createdAt: number;
  hideOnboardingTip?: boolean;
  market_alerts?: boolean;
  live_data_stream?: boolean;
}
