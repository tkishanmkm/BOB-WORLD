
export interface AccountDetailsType {
  name: string;
  accountNumber: string;
  ifscCode: string;
  customerId?: string;
  profileImageUrl?: string;
  lastLogin?: string;
  dob?: string; // Date of Birth
  panNumber?: string;
  branchName?: string;
  email?: string;
  phoneNumber?: string;
  accountType?: string;
  accountTypeName?: string;
}

export interface TransactionType {
  id: string;
  date: string; // ISO string format
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  instrumentNumber?: string;
  transactionMainType?: string;
  transactionSubType?: string;
  comments?: string;
  payeeId?: string; // Link to PayeeType.id
  referenceNumber?: string;
}

export interface PayeeType {
  id: string;
  name: string;
  accountNumber: string;
  ifscCode: string;
  nickname?: string;
}

export interface LiveAgentMessageType {
  id: string;
  sender: "user" | "agent" | "system"; // Added "system"
  content: string;
  timestamp: string; // ISO string format
}
