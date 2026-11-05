
import { format } from 'date-fns';
import type { AccountDetailsType, TransactionType, PayeeType, LiveAgentMessageType } from '@/lib/types';

// Helper function to create an ISO date string with a random time for a given base date string
const createISODateWithRandomTime = (baseDateString: string): string => {
  const date = new Date(baseDateString); // e.g., "2025-05-15"
  // Check if the base date string itself is valid to avoid cascading errors
  if (isNaN(date.getTime())) {
    // Fallback to current date if baseDateString is invalid
    console.error(`Invalid baseDateString for createISODateWithRandomTime: '${baseDateString}'. Falling back to current date with random UTC time.`);
    const fallbackDate = new Date(); // Current date and time
    fallbackDate.setUTCHours(
      Math.floor(Math.random() * 24),    // 0-23
      Math.floor(Math.random() * 60),   // 0-59
      Math.floor(Math.random() * 60),   // 0-59
      0                                 // milliseconds to 0
    );
    return fallbackDate.toISOString();
  }

  // Main logic: set random UTC time components on the parsed baseDate
  date.setUTCHours(
    Math.floor(Math.random() * 24),    // 0-23
    Math.floor(Math.random() * 60),   // 0-59
    Math.floor(Math.random() * 60),   // 0-59
    0                                 // milliseconds to 0 for consistency
  );
  return date.toISOString();
};


export const INITIAL_ACCOUNT_DETAILS: AccountDetailsType = {
  name: 'Shubham Kumar',
  accountNumber: '987654321123',
  ifscCode: 'FINO0009001',
  customerId: '274839201',
  profileImageUrl: undefined,
  lastLogin: format(new Date(), 'MMM dd, yyyy hh:mm a'),
  dob: '15/07/1995',
  panNumber: 'FGHIJ5678K',
  branchName: 'Mindspace Juinagar Plot No Gen 2/1/F',
  email: 'shubham.k@example.com',
  phoneNumber: '+919876543210',
  accountType: 'Saving',
  accountTypeName: 'bob Advantage Saving Account',
};

export const INITIAL_BALANCE: number = 450000.00;

const transactionsFromImageUpload: TransactionType[] = [
    // Serial No 79 to 100 from image
    { id: 'imgTx79', date: createISODateWithRandomTime('2025-05-15'), description: 'UPI/501595408289/18:32:12/UPI/jithinjayarajjithin', amount: 10000.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
    { id: 'imgTx80', date: createISODateWithRandomTime('2025-05-15'), description: 'UPI/501539639749/19:29:00/UPI/9982586831@ptsbi/Se', amount: 66030.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
    { id: 'imgTx81', date: createISODateWithRandomTime('2025-05-15'), description: 'IMPS/P2A/501519321509/XXXXXXXXXX8375/IT', amount: 75979.07, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "IMPS"},
    { id: 'imgTx82', date: createISODateWithRandomTime('2025-05-15'), description: 'CHARGES FOR :IMPS/P2A/501519321509/XXXXXXXX', amount: 8.85, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "IMPS"},
    { id: 'imgTx83', date: createISODateWithRandomTime('2025-05-15'), description: 'UPI/501571632492/20:00:58/UPI/saberasks@okaxis/UP', amount: 10000.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
    { id: 'imgTx84', date: createISODateWithRandomTime('2025-05-15'), description: 'UPI/501518923974/20:28:52/UPI/ganeshmarag55-2@oks', amount: 10000.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
    { id: 'imgTx85', date: createISODateWithRandomTime('2025-05-15'), description: 'UPI/604662103516/21:36:47/UPI/upiswiggy@icici/Pay', amount: 137.00, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
    { id: 'imgTx86', date: createISODateWithRandomTime('2025-05-15'), description: 'UPI/007237356592/22:54:15/UPI/8149795621@icici/Pa', amount: 5000.00, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
    { id: 'imgTx87', date: createISODateWithRandomTime('2025-05-15'), description: 'UPI/501538943904/23:11:19/UPI/CBDC/501538943904', amount: 2000.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
    { id: 'imgTx88', date: createISODateWithRandomTime('2025-05-15'), description: 'UPI/501538943716/23:11:55/UPI/CBDC/501538943716', amount: 10000.00, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
    { id: 'imgTx89', date: createISODateWithRandomTime('2025-05-15'), description: 'UPI/946612660252/23:13:06/UPI/paytm-51955531@ptys', amount: 181.65, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
    { id: 'imgTx90', date: createISODateWithRandomTime('2025-05-16'), description: 'IMPS/P2A/501606856107/XXXXXXXXXX6187/t', amount: 6999.00, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "IMPS"},
    { id: 'imgTx91', date: createISODateWithRandomTime('2025-05-16'), description: 'CHARGES FOR :IMPS/P2A/501606856107/XXXXXXXX', amount: 5.90, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "IMPS"},
    { id: 'imgTx92', date: createISODateWithRandomTime('2025-05-16'), description: 'UPI/084575859188/10:22:53/UPI/thekishanm@axl/Paym', amount: 1.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
    { id: 'imgTx93', date: createISODateWithRandomTime('2025-05-16'), description: 'UPI/501683023806/12:43:13/UPI/sachintrad@fam/UPI', amount: 1.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
    { id: 'imgTx94', date: createISODateWithRandomTime('2025-05-16'), description: 'UPI/668844940437/16:18:12/UPI/8895599762@ibl/Paym', amount: 35888.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
    { id: 'imgTx95', date: createISODateWithRandomTime('2025-05-16'), description: 'UPI/612121243288/16:31:07/UPI/atri14@ybl/Payment', amount: 50000.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
    { id: 'imgTx96', date: createISODateWithRandomTime('2025-05-16'), description: 'UPI/376259725000/16:31:52/UPI/8126721643@ybl/Paym', amount: 12465.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
    { id: 'newTxUpload07', date: createISODateWithRandomTime('2025-05-16'), description: 'UPI/501668037113/20:35:15/UPI/geetarani5643-4@oks', amount: 30000.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
    { id: 'newTxUpload08', date: createISODateWithRandomTime('2025-05-16'), description: 'UPI/099334468000/20:36:52/UPI/8521580122@axl/Paym', amount: 50000.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
    { id: 'newTxUpload11', date: createISODateWithRandomTime('2025-05-16'), description: 'UPI/501668448039/20:40:46/UPI/joyals2003@oksbi/UP', amount: 10000.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
    { id: 'newTxUpload12', date: createISODateWithRandomTime('2025-05-16'), description: 'IMPS/P2A/501620126703/JAHANGIRAHMEDSO/Deposit Tra', amount: 8000.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "IMPS"},
];


const newTransactionsFromCurrentImage: TransactionType[] = [
  { id: 'newTxUpload01', date: createISODateWithRandomTime('2025-05-16'), description: 'UPI/501616781077/18:50:02/UPI/8509060635@ptaxis/U', amount: 22800.00, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI" },
  { id: 'newTxUpload02', date: createISODateWithRandomTime('2025-05-16'), description: 'UPI/666100718317/19:06:50/UPI/paytmqr5cdp40@ptys/', amount: 60.00, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI" },
  { id: 'newTxUpload03', date: createISODateWithRandomTime('2025-05-16'), description: 'UPI/879105556487/19:26:33/UPI/JIOINAPPDIRECT@axl/', amount: 19.00, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI" },
  { id: 'newTxUpload04', date: createISODateWithRandomTime('2025-05-16'), description: 'IMPS/P2A/501619398998/HINTALAPATIVID/PaymentRE19', amount: 44628.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "IMPS" },
  { id: 'newTxUpload05', date: createISODateWithRandomTime('2025-05-16'), description: 'IMPS/P2A/501619094622/XXXXXXXXXX8375/IT', amount: 44600.00, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "IMPS" },
  { id: 'newTxUpload06', date: createISODateWithRandomTime('2025-05-16'), description: 'CHARGES FOR:IMPS/P2A/501619094622/XXXXXXXX', amount: 8.85, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "IMPS" },
  { id: 'newTxUpload09', date: createISODateWithRandomTime('2025-05-16'), description: 'IMPS/P2A/501620619578/XXXXXXXXXX8375/IT', amount: 80000.00, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "IMPS" },
  { id: 'newTxUpload10', date: createISODateWithRandomTime('2025-05-16'), description: 'CHARGES FOR:IMPS/P2A/501620619578/XXXXXXXX', amount: 8.85, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "IMPS" },
];

const newTransactionsFromImage: TransactionType[] = [
  { id: 'newTxImg00', date: createISODateWithRandomTime('2025-05-16'), description: 'IMPS/P2A/501606856107/XXXXXXXXXX6187/Payment toKishan', amount: 100.00, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "IMPS"},
  { id: 'newTxImg01', date: createISODateWithRandomTime('2025-05-16'), description: 'IMPS/P2A/501606856107/XXXXXXXXXX6187/Payment toRavi', amount: 100.00, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "IMPS"},
  { id: 'newTxImg02', date: createISODateWithRandomTime('2025-05-16'), description: 'UPI/501683023806/UPI/sachintrad@fam/UPI Payment', amount: 200.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
  { id: 'newTxImg03', date: createISODateWithRandomTime('2025-05-16'), description: 'IMPS/P2A/501606856107/XXXXXXXXXX6187/Payment toRajesh', amount: 100.00, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "IMPS"},
  { id: 'newTxImg04', date: createISODateWithRandomTime('2025-05-16'), description: 'UPI/668844940437/UPI/8895599762@ibl/UPI Payment', amount: 15000.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
  { id: 'newTxImg05', date: createISODateWithRandomTime('2025-05-16'), description: 'BY CASH Sachin Trad', amount: 10000.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "Others"},
  { id: 'newTxImg06', date: createISODateWithRandomTime('2025-05-16'), description: 'IMPS/P2A/501606856107/XXXXXXXXXX6187/Payment toArun', amount: 100.00, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "IMPS"},
  { id: 'newTxImg07', date: createISODateWithRandomTime('2025-05-16'), description: 'UPI/612121243288/UPI/atri14@ybl/Payment fromAtri', amount: 1000.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
  { id: 'newTxImg08', date: createISODateWithRandomTime('2025-05-16'), description: 'BY CASH Collection', amount: 5000.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "Others"},
  { id: 'newTxImg09', date: createISODateWithRandomTime('2025-05-16'), description: 'IMPS/P2A/501606856107/XXXXXXXXXX6187/Payment toSuresh', amount: 100.00, type: 'debit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "IMPS"},
  { id: 'newTxImg10', date: createISODateWithRandomTime('2025-05-16'), description: 'UPI/376259725000/UPI/8126721643@ybl/UPI Payment', amount: 1000.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "UPI"},
  { id: 'newTxImg11', date: createISODateWithRandomTime('2025-05-16'), description: 'BY CASH Collection', amount: 5000.00, type: 'credit', instrumentNumber: "NA", transactionMainType: "T-Transfer", transactionSubType: "Others"},
];

const transactionsBase: TransactionType[] = [
  { id: 'tx001', date: createISODateWithRandomTime('2025-05-01'), description: 'Groceries at Spencer', amount: 8000, type: 'debit', instrumentNumber: "NA", transactionMainType: "Card Payment", transactionSubType: "Purchase" },
  { id: 'tx002', date: createISODateWithRandomTime('2025-05-01'), description: 'Online Streaming Subscription Renewal', amount: 2138, type: 'debit', instrumentNumber: "NA", transactionMainType: "Card Payment", transactionSubType: "Subscription" },
  { id: 'tx003', date: createISODateWithRandomTime('2025-05-01'), description: 'Salary Credit - May 2025', amount: 150000, type: 'credit', instrumentNumber: "NA", transactionMainType: "Direct Credit", transactionSubType: "Salary"},
  { id: 'tx004', date: createISODateWithRandomTime('2025-05-02'), description: 'Electricity Bill Payment', amount: 6020, type: 'debit', instrumentNumber: "NA", transactionMainType: "Bill Payment", transactionSubType: "Utility" },
  { id: 'tx005', date: createISODateWithRandomTime('2025-05-02'), description: 'Mobile Recharge - Airtel', amount: 719, type: 'debit', instrumentNumber: "NA", transactionMainType: "Recharge", transactionSubType: "Mobile" },
  { id: 'tx006', date: createISODateWithRandomTime('2025-05-03'), description: 'Coffee at CCD', amount: 300, type: 'debit', instrumentNumber: "NA", transactionMainType: "Card Payment", transactionSubType: "Food" },
  { id: 'tx007', date: createISODateWithRandomTime('2025-05-04'), description: 'Book Purchase - "Atomic Habits"', amount: 1589, type: 'debit', instrumentNumber: "NA", transactionMainType: "Online Purchase", transactionSubType: "Books" },
  { id: 'tx008', date: createISODateWithRandomTime('2025-05-05'), description: 'Dinner at Mainland China', amount: 8164, type: 'debit', instrumentNumber: "NA", transactionMainType: "Card Payment", transactionSubType: "Restaurant" },
  { id: 'tx009', date: createISODateWithRandomTime('2025-05-05'), description: 'Client Payment Received - Project Alpha', amount: 50000, type: 'credit', instrumentNumber: "NA", transactionMainType: "NEFT", transactionSubType: "Receipt" },
  { id: 'tx010', date: createISODateWithRandomTime('2025-05-06'), description: 'Electronics Purchase - Headphones', amount: 14350, type: 'debit', instrumentNumber: "NA", transactionMainType: "Online Purchase", transactionSubType: "Electronics" },
  { id: 'tx011', date: createISODateWithRandomTime('2025-05-07'), description: 'Movie Tickets - PVR Cinemas', amount: 832, type: 'debit', instrumentNumber: "NA", transactionMainType: "Card Payment", transactionSubType: "Entertainment" },
  { id: 'tx012', date: createISODateWithRandomTime('2025-05-08'), description: 'Flight Tickets - Indigo to Delhi', amount: 27390, type: 'debit', instrumentNumber: "NA", transactionMainType: "Online Purchase", transactionSubType: "Travel" },
  { id: 'tx013', date: createISODateWithRandomTime('2025-05-08'), description: 'Mutual Fund Investment - SIP', amount: 10000, type: 'debit', instrumentNumber: "NA", transactionMainType: "Investment", transactionSubType: "SIP" },
  { id: 'tx014', date: createISODateWithRandomTime('2025-05-09'), description: 'Weekend Shopping Spree - Myntra', amount: 26281, type: 'debit', comments: 'This is a final spending for demo', instrumentNumber: "NA", transactionMainType: "Online Purchase", transactionSubType: "Shopping" },
  { id: 'tx015', date: createISODateWithRandomTime('2025-05-09'), description: 'Interest Credit', amount: 550, type: 'credit', comments: 'Quarterly interest', instrumentNumber: "NA", transactionMainType: "Interest", transactionSubType: "Bank Credit" },
];


export const INITIAL_TRANSACTIONS: TransactionType[] = [
    ...transactionsFromImageUpload,
    ...newTransactionsFromCurrentImage,
    ...newTransactionsFromImage,
    ...transactionsBase
].map(tx => ({
    ...tx,
    id: tx.id || crypto.randomUUID(),
    date: tx.date,
    payeeId: tx.payeeId,
    referenceNumber: tx.referenceNumber,
}));

export const INITIAL_PAYEES: PayeeType[] = [
  { id: 'payee_anjali', name: 'Anjali Sharma', accountNumber: 'XXXXXX1234', ifscCode: 'FINO0001101', nickname: 'Friend' },
  { id: 'payee_rohan', name: 'Rohan Verma', accountNumber: 'XXXXXX5678', ifscCode: 'FINO0001102', nickname: 'Landlord' },
  { id: 'payee_priya', name: 'Priya Singh', accountNumber: 'XXXXXX9012', ifscCode: 'FINO0001103' },
  { id: 'payee_global', name: 'Global Traders', accountNumber: 'XXXXXX7234', ifscCode: 'FINO0007707', nickname: 'Business' },
  { id: 'payee_rahi', name: 'Rahi Enterprises', accountNumber: 'XXXXXX8914', ifscCode: 'IBKL0000123', nickname: 'Supplier' },
];

export const INITIAL_LIVE_AGENT_MESSAGES: LiveAgentMessageType[] = [
  { id: crypto.randomUUID(), sender: 'agent', content: 'Hi there! Welcome to BOB World support. How can I assist you?', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: crypto.randomUUID(), sender: 'user', content: 'I\'m having trouble downloading my account statement.', timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString() },
  { id: crypto.randomUUID(), sender: 'agent', content: 'I can certainly help with that. Could you please tell me which device and browser you are using?', timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString() },
];


// LocalStorage Keys
export const ACCOUNT_DETAILS_STORAGE_KEY = 'bobworld_account_details';
export const BALANCE_STORAGE_KEY = 'bobworld_balance';
export const TRANSACTIONS_STORAGE_KEY = 'bobworld_transactions';
export const PAYEES_STORAGE_KEY = 'bobworld_payees';
export const LIVE_AGENT_MESSAGES_STORAGE_KEY = 'bobworld_live_agent_messages';
export const PASSBOOK_TOTAL_IN_KEY = 'bobworld_passbook_total_in';
export const PASSBOOK_TOTAL_OUT_KEY = 'bobworld_passbook_total_out';
export const PASSBOOK_CLOSING_BALANCE_KEY = 'bobworld_passbook_closing_balance';
export const STATEMENT_PDF_KEY = 'bobworld_statement_pdf';
export const STATEMENT_LOGO_KEY = 'bobworld_statement_logo';
export const STATEMENT_BANK_LOGO_KEY = 'bobworld_statement_bank_logo';

// Image related keys
export const LOGIN_BANNER_KEY = 'bobworld_image_loginBannerDataUri';
export const LOGIN_BANNER_KEY_1 = 'bobworld_image_loginBannerDataUri_1';
export const LOGIN_BANNER_KEY_2 = 'bobworld_image_loginBannerDataUri_2';
export const LOGIN_BANNER_KEY_3 = 'bobworld_image_loginBannerDataUri_3';
export const LOGIN_BANNER_KEY_4 = 'bobworld_image_loginBannerDataUri_4';
export const LOGIN_BANNER_KEY_5 = 'bobworld_image_loginBannerDataUri_5';
export const FD_BANNER_KEY = 'bobworld_image_fdBannerDataUri';
export const RD_BANNER_KEY = 'bobworld_image_rdBannerDataUri';
export const DEBIT_CARD_ILLUSTRATION_KEY = 'bobworld_image_debitCardIllustrationDataUri';
export const LINK_BANK_ILLUSTRATION_KEY = 'bobworld_image_linkBankIllustrationDataUri';
export const PROMO_WOMAN_PAYMENT_KEY = 'bobworld_image_promoWomanPaymentDataUri';

    
