export interface User {
  id: string;
  login: string;
}

export interface Property {
  id: string;
  userId: string;
  number: string;
  address: string;
}

export type BillType = 'water' | 'electric' | 'internet' | 'other';
export type LedgerType =
  // income
  | 'income:rent'
  | 'income:deposit'
  | 'income:other'
  // expenses
  | `expense:bill:${BillType}`
  | `expense:mortgage`
  | 'expense:deposit'
  | 'expense:repair'
  | 'expense:other';
export interface Ledger {
  id: string;
  propertyId: string;
  userId: string;
  date: string; // ISO yyyy-mm-dd
  description: string | null;
  type: LedgerType;
  amount: number;
}
