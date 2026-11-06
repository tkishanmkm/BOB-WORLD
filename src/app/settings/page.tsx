
"use client";

import Link from 'next/link';
import { useState, useEffect, type FormEvent, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import type { AccountDetailsType, TransactionType, PayeeType, LiveAgentMessageType } from '@/lib/types';
import {
  INITIAL_ACCOUNT_DETAILS,
  INITIAL_BALANCE,
  INITIAL_TRANSACTIONS,
  ACCOUNT_DETAILS_STORAGE_KEY,
  BALANCE_STORAGE_KEY,
  TRANSACTIONS_STORAGE_KEY,
  PASSBOOK_TOTAL_IN_KEY,
  PASSBOOK_TOTAL_OUT_KEY,
  PASSBOOK_CLOSING_BALANCE_KEY,
  LOGIN_BANNER_KEY_1,
  LOGIN_BANNER_KEY_2,
  LOGIN_BANNER_KEY_3,
  LOGIN_BANNER_KEY_4,
  LOGIN_BANNER_KEY_5,
  FD_BANNER_KEY,
  RD_BANNER_KEY,
  DEBIT_CARD_ILLUSTRATION_KEY,
  LINK_BANK_ILLUSTRATION_KEY,
  PROMO_WOMAN_PAYMENT_KEY,
  INITIAL_PAYEES,
  PAYEES_STORAGE_KEY,
  INITIAL_LIVE_AGENT_MESSAGES,
  LIVE_AGENT_MESSAGES_STORAGE_KEY,
  STATEMENT_LOGO_KEY,
  STATEMENT_BANK_LOGO_KEY,
  OTP_NOTIFICATION_AVATAR_KEY,
  TPIN_HASH_STORAGE_KEY,
} from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Save, UserCircle2, IndianRupee, ListPlus, Trash2, PlusCircle, Edit3, BookOpen, Image as ImageIconLucide, CalendarClock, Briefcase, Building, Mail, Phone, CalendarDays, CreditCardIcon, UploadCloud, XCircle, FileUp, Loader2, Users, UserPlus, MessageSquare, FileText, ShieldCheck } from 'lucide-react';
import { AddTransactionDialog } from "@/components/passbook/add-transaction-dialog";
import { AddPayeeDialog } from "@/components/fund-transfer/add-payee-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { parseBobStatementPdf, extractStatementBrandAssets, type StatementBrandAssets } from '@/lib/bob-statement-parser';
import { ensureStatementBrandAssets } from '@/lib/statement-download';
import { createTpinVerifier } from '@/lib/tpin-security';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle as FormDialogTitle, // Renamed to avoid conflict
  DialogDescription as FormDialogDescription, // Renamed
  DialogFooter as FormDialogFooter, // Renamed
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO } from 'date-fns';
import { BOB_WORLD_STATE_KEYS, migrateLegacyStorage, persistStorageKeys, readAllAppState } from '@/lib/indexed-db';


interface ImageUploaderState {
  dataUri: string | null;
  preview: string;
  defaultHint: string;
}

type ImageKeys = 
  | 'profile' 
  | 'loginBanner1' 
  | 'loginBanner2'
  | 'loginBanner3'
  | 'loginBanner4'
  | 'loginBanner5'
  | 'fdBanner' 
  | 'rdBanner' 
  | 'debitCardIllustration' 
  | 'linkBankIllustration' 
  | 'promoWomanPayment'
  | 'statementLogo'
  | 'statementBankLogo'
  | 'otpNotificationAvatar';


export default function SettingsPage() {
  const [accountDetails, setAccountDetails] = useState<AccountDetailsType>(INITIAL_ACCOUNT_DETAILS);
  const [balance, setBalance] = useState<number>(INITIAL_BALANCE);
  const [transactions, setTransactions] = useState<TransactionType[]>(INITIAL_TRANSACTIONS);
  const [payees, setPayees] = useState<PayeeType[]>(INITIAL_PAYEES);
  const [liveAgentMessages, setLiveAgentMessages] = useState<LiveAgentMessageType[]>(INITIAL_LIVE_AGENT_MESSAGES);
  
  const [statementPdfName, setStatementPdfName] = useState<string | null>(null);
  const [transferTpin, setTransferTpin] = useState('');
  const [confirmTransferTpin, setConfirmTransferTpin] = useState('');
  const [isTransferTpinConfigured, setIsTransferTpinConfigured] = useState(false);
  const [isSavingTransferTpin, setIsSavingTransferTpin] = useState(false);

  const [isPayeeDialogOpen, setIsPayeeDialogOpen] = useState(false);
  const [editingPayee, setEditingPayee] = useState<PayeeType | null>(null);
  const [payeeToDelete, setPayeeToDelete] = useState<PayeeType | null>(null);

  const [passbookTotalIn, setPassbookTotalIn] = useState<string>('');
  const [passbookTotalOut, setPassbookTotalOut] = useState<string>('');
  const [passbookClosingBalance, setPassbookClosingBalance] = useState<string>('');

  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionType | null>(null);
  const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  const [isLiveAgentMessageDialogOpen, setIsLiveAgentMessageDialogOpen] = useState(false);
  const [editingLiveAgentMessage, setEditingLiveAgentMessage] = useState<LiveAgentMessageType | null>(null);
  const [liveAgentMessageToDelete, setLiveAgentMessageToDelete] = useState<LiveAgentMessageType | null>(null);
  
  const [currentMessageContent, setCurrentMessageContent] = useState('');
  const [currentMessageSender, setCurrentMessageSender] = useState<'user' | 'agent' | 'system'>('user');
  const [currentMessageTimestamp, setCurrentMessageTimestamp] = useState(new Date().toISOString().split('T')[0]);
  const [currentMessageTime, setCurrentMessageTime] = useState(new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }));


  const { toast } = useToast();
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const statementPdfInputRef = useRef<HTMLInputElement>(null);

  const [imageStates, setImageStates] = useState<Record<ImageKeys, ImageUploaderState>>({
    profile: { dataUri: null, preview: INITIAL_ACCOUNT_DETAILS.profileImageUrl || 'https://placehold.co/100x100.png', defaultHint: 'profile avatar' },
    loginBanner1: { dataUri: null, preview: 'https://placehold.co/600x200.png', defaultHint: 'government cybercrime awareness' },
    loginBanner2: { dataUri: null, preview: 'https://placehold.co/600x200.png', defaultHint: 'online shopping sale' },
    loginBanner3: { dataUri: null, preview: 'https://placehold.co/600x200.png', defaultHint: 'travel vacation offer' },
    loginBanner4: { dataUri: null, preview: 'https://placehold.co/600x200.png', defaultHint: 'car loan advertisement' },
    loginBanner5: { dataUri: null, preview: 'https://placehold.co/600x200.png', defaultHint: 'investment planning' },
    fdBanner: { dataUri: null, preview: 'https://placehold.co/600x250.png', defaultHint: 'family saving' },
    rdBanner: { dataUri: null, preview: 'https://placehold.co/600x250.png', defaultHint: 'coins jar' },
    debitCardIllustration: { dataUri: null, preview: 'https://placehold.co/200x120.png', defaultHint: 'debit card illustration' },
    linkBankIllustration: { dataUri: null, preview: 'https://placehold.co/120x100.png', defaultHint: 'mobile banking app' },
    promoWomanPayment: { dataUri: null, preview: 'https://placehold.co/150x100.png', defaultHint: 'woman phone payment' },
    statementLogo: { dataUri: null, preview: 'https://placehold.co/220x90.png?text=BOB+World+Logo', defaultHint: 'BOB World logo' },
    statementBankLogo: { dataUri: null, preview: 'https://placehold.co/220x90.png?text=Bank+Logo', defaultHint: 'Bank of Baroda wordmark' },
    otpNotificationAvatar: { dataUri: null, preview: 'https://placehold.co/96x96.png?text=JK', defaultHint: 'OTP notification avatar' },
  });

  const [clientRenderedTransactions, setClientRenderedTransactions] = useState<Array<TransactionType & { formattedDate: string }>>([]);
  const [clientRenderedLiveMessages, setClientRenderedLiveMessages] = useState<Array<LiveAgentMessageType & { formattedTimestamp: string }>>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void migrateLegacyStorage(BOB_WORLD_STATE_KEYS).then(() => {
      if (cancelled) return;
      setIsClient(true);
      setIsTransferTpinConfigured(Boolean(localStorage.getItem(TPIN_HASH_STORAGE_KEY)));
    }).catch(error => console.error('Could not restore Settings state from IndexedDB:', error));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void migrateLegacyStorage(BOB_WORLD_STATE_KEYS).then(() => ensureStatementBrandAssets()).then(assets => {
      if (cancelled) return;
      setImageStates(previous => ({
        ...previous,
        statementLogo: {
          ...previous.statementLogo,
          dataUri: assets.bobWorldLogo || previous.statementLogo.dataUri,
          preview: assets.bobWorldLogo || previous.statementLogo.preview,
        },
        statementBankLogo: {
          ...previous.statementBankLogo,
          dataUri: assets.bankLogo || previous.statementBankLogo.dataUri,
          preview: assets.bankLogo || previous.statementBankLogo.preview,
        },
      }));
    }).catch(error => console.warn('Default statement branding could not be loaded:', error));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void migrateLegacyStorage(BOB_WORLD_STATE_KEYS).then(() => {
    if (cancelled) return;
    let activeAccountDetails: AccountDetailsType = { ...INITIAL_ACCOUNT_DETAILS };
    const storedDetailsString = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
    if (storedDetailsString) {
      try {
        const parsedDetails = JSON.parse(storedDetailsString) as Partial<AccountDetailsType>;
        activeAccountDetails = { ...INITIAL_ACCOUNT_DETAILS, ...parsedDetails };
      } catch (e) {
        console.error("Failed to parse account details from localStorage, using initial:", e);
      }
    }
    setAccountDetails(activeAccountDetails);

    const profileImgDataUriFromDetails = activeAccountDetails.profileImageUrl;
    const isValidDataUriForProfile = profileImgDataUriFromDetails && (profileImgDataUriFromDetails.startsWith('data:image') || profileImgDataUriFromDetails.startsWith('http'));
    
    setImageStates(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        dataUri: isValidDataUriForProfile && profileImgDataUriFromDetails.startsWith('data:image') ? profileImgDataUriFromDetails : null,
        preview: isValidDataUriForProfile ? profileImgDataUriFromDetails : (INITIAL_ACCOUNT_DETAILS.profileImageUrl || 'https://placehold.co/100x100.png'),
      }
    }));

    const storedBalance = localStorage.getItem(BALANCE_STORAGE_KEY);
    if (storedBalance) {
      const numBalance = parseFloat(storedBalance);
      if (!isNaN(numBalance)) setBalance(numBalance);
    }

    const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (storedTransactions) {
      try {
        const loadedTransactions = JSON.parse(storedTransactions).map((tx: any) => ({
          ...tx,
          id: tx.id || crypto.randomUUID(), 
          date: tx.date 
        }));
        setTransactions(loadedTransactions);
      } catch (e) { console.error("Failed to parse stored transactions:", e); }
    } else {
       setTransactions(INITIAL_TRANSACTIONS.map(tx => ({
            ...tx,
            id: tx.id || crypto.randomUUID(),
            date: new Date(tx.date).toISOString() 
        })) as TransactionType[]);
    }

    const storedPayeesString = localStorage.getItem(PAYEES_STORAGE_KEY);
    if (storedPayeesString) {
        try {
            setPayees(JSON.parse(storedPayeesString));
        } catch (e) {
            console.error("Failed to parse payees from localStorage", e);
            setPayees(INITIAL_PAYEES); 
        }
    } else {
        setPayees(INITIAL_PAYEES);
    }

    const storedLiveAgentMessagesString = localStorage.getItem(LIVE_AGENT_MESSAGES_STORAGE_KEY);
    if (storedLiveAgentMessagesString) {
        try {
            setLiveAgentMessages(JSON.parse(storedLiveAgentMessagesString).map((msg: any) => ({...msg, id: msg.id || crypto.randomUUID() })));
        } catch (e) {
            console.error("Failed to parse live agent messages from localStorage", e);
            setLiveAgentMessages(INITIAL_LIVE_AGENT_MESSAGES.map(msg => ({...msg, id: msg.id || crypto.randomUUID() })));
        }
    } else {
        setLiveAgentMessages(INITIAL_LIVE_AGENT_MESSAGES.map(msg => ({...msg, id: msg.id || crypto.randomUUID() })));
    }

    const storedPassbookTotalIn = localStorage.getItem(PASSBOOK_TOTAL_IN_KEY);
    if (storedPassbookTotalIn) setPassbookTotalIn(storedPassbookTotalIn);
    
    const storedPassbookTotalOut = localStorage.getItem(PASSBOOK_TOTAL_OUT_KEY);
    if (storedPassbookTotalOut) setPassbookTotalOut(storedPassbookTotalOut);

    const storedPassbookClosingBalance = localStorage.getItem(PASSBOOK_CLOSING_BALANCE_KEY);
    if (storedPassbookClosingBalance) setPassbookClosingBalance(storedPassbookClosingBalance);

    const imagesToLoadConfig: Array<{key: ImageKeys, storageKey: string, defaultPreview?: string}> = [
        { key: 'loginBanner1', storageKey: LOGIN_BANNER_KEY_1, defaultPreview: 'https://placehold.co/600x200.png' },
        { key: 'loginBanner2', storageKey: LOGIN_BANNER_KEY_2, defaultPreview: 'https://placehold.co/600x200.png' },
        { key: 'loginBanner3', storageKey: LOGIN_BANNER_KEY_3, defaultPreview: 'https://placehold.co/600x200.png' },
        { key: 'loginBanner4', storageKey: LOGIN_BANNER_KEY_4, defaultPreview: 'https://placehold.co/600x200.png' },
        { key: 'loginBanner5', storageKey: LOGIN_BANNER_KEY_5, defaultPreview: 'https://placehold.co/600x200.png' },
        { key: 'fdBanner', storageKey: FD_BANNER_KEY, defaultPreview: 'https://placehold.co/600x250.png' },
        { key: 'rdBanner', storageKey: RD_BANNER_KEY, defaultPreview: 'https://placehold.co/600x250.png' },
        { key: 'debitCardIllustration', storageKey: DEBIT_CARD_ILLUSTRATION_KEY, defaultPreview: 'https://placehold.co/200x120.png' },
        { key: 'linkBankIllustration', storageKey: LINK_BANK_ILLUSTRATION_KEY, defaultPreview: 'https://placehold.co/120x100.png' },
        { key: 'promoWomanPayment', storageKey: PROMO_WOMAN_PAYMENT_KEY, defaultPreview: 'https://placehold.co/150x100.png' },
        { key: 'statementLogo', storageKey: STATEMENT_LOGO_KEY, defaultPreview: 'https://placehold.co/220x90.png?text=BOB+World+Logo' },
        { key: 'statementBankLogo', storageKey: STATEMENT_BANK_LOGO_KEY, defaultPreview: 'https://placehold.co/220x90.png?text=Bank+Logo' },
        { key: 'otpNotificationAvatar', storageKey: OTP_NOTIFICATION_AVATAR_KEY, defaultPreview: 'https://placehold.co/96x96.png?text=JK' },
    ];

    setImageStates(prevImages => {
        const newImageStates = { ...prevImages };
        imagesToLoadConfig.forEach(imgConfig => {
            const storedDataUri = localStorage.getItem(imgConfig.storageKey);
            const isValidDataUri = storedDataUri && storedDataUri.startsWith('data:image');
            newImageStates[imgConfig.key] = {
                ...newImageStates[imgConfig.key], 
                dataUri: isValidDataUri ? storedDataUri : null,
                preview: isValidDataUri ? storedDataUri : (imgConfig.defaultPreview || ''),
            };
             if (storedDataUri && !isValidDataUri) { 
                localStorage.removeItem(imgConfig.storageKey); 
            }
        });
        return newImageStates;
    });
    }).catch(error => console.error('Could not load Settings state:', error));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isClient) {
      const processed = transactions.map(t => ({
        ...t,
        formattedDate: new Date(t.date).toLocaleString('en-CA', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).replace(',', ''), 
      })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setClientRenderedTransactions(processed);

      const processedLiveMessages = liveAgentMessages.map(msg => ({
        ...msg,
        formattedTimestamp: new Date(msg.timestamp).toLocaleString('en-US', { 
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
        })
      })).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setClientRenderedLiveMessages(processedLiveMessages);
    }
  }, [transactions, liveAgentMessages, isClient]);


  const handleDetailsChange = (field: keyof AccountDetailsType, value: string) => {
    setAccountDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveTransferTpin = async () => {
    if (!/^\d{4}$/.test(transferTpin)) {
      toast({ title: 'Invalid TPIN', description: 'Enter exactly four digits.', variant: 'destructive' });
      return;
    }
    if (transferTpin !== confirmTransferTpin) {
      toast({ title: 'TPIN mismatch', description: 'The two TPIN entries do not match.', variant: 'destructive' });
      return;
    }
    setIsSavingTransferTpin(true);
    try {
      const verifier = await createTpinVerifier(transferTpin);
      localStorage.setItem(TPIN_HASH_STORAGE_KEY, JSON.stringify(verifier));
      await persistStorageKeys(BOB_WORLD_STATE_KEYS);
      setIsTransferTpinConfigured(true);
      setTransferTpin('');
      setConfirmTransferTpin('');
      toast({ title: 'Transfer TPIN saved', description: 'Your TPIN verifier is stored locally. The four-digit TPIN itself is not stored.' });
    } catch (error) {
      console.error('Could not save transfer TPIN:', error);
      toast({ title: 'TPIN could not be saved', description: 'Secure local cryptography is unavailable on this device.', variant: 'destructive' });
    } finally {
      setIsSavingTransferTpin(false);
    }
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
     if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setBalance(value === "" ? 0 : parseFloat(value));
    }
  };

  const handlePassbookNumericChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  const handleImageUpload = (key: ImageKeys) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setImageStates(prev => ({
          ...prev,
          [key]: { ...prev[key], dataUri: dataUri, preview: dataUri }
        }));
      };
      reader.readAsDataURL(file);
    }
    event.target.value = ''; 
  };
  
  const handleStatementPdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" || file.size > 20 * 1024 * 1024) {
      toast({ title: "Invalid Statement PDF", description: "Select a PDF file smaller than 20 MB.", variant: "destructive" });
      event.target.value = '';
      return;
    }
    try {
      const pdfBytes = new Uint8Array(await file.arrayBuffer());
      const assets = await extractStatementBrandAssets(pdfBytes);
      let extracted = 0;
      if (assets.bobWorldLogo) {
        localStorage.setItem(STATEMENT_LOGO_KEY, assets.bobWorldLogo);
        setImageStates(prev => ({ ...prev, statementLogo: { ...prev.statementLogo, dataUri: assets.bobWorldLogo!, preview: assets.bobWorldLogo! } }));
        extracted += 1;
      }
      if (assets.bankLogo) {
        localStorage.setItem(STATEMENT_BANK_LOGO_KEY, assets.bankLogo);
        setImageStates(prev => ({ ...prev, statementBankLogo: { ...prev.statementBankLogo, dataUri: assets.bankLogo!, preview: assets.bankLogo! } }));
        extracted += 1;
      }
      if (extracted) await persistStorageKeys(BOB_WORLD_STATE_KEYS);
      setStatementPdfName(file.name);
      toast({
        title: extracted ? "Statement artwork extracted" : "No statement logos detected",
        description: extracted
          ? file.name + " was inspected locally and " + extracted + " logo asset(s) were saved to Settings."
          : "Upload the BOB World logo manually in Manage Application Images.",
        variant: extracted ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Statement asset extraction failed",
        description: error instanceof Error ? error.message : "The PDF images could not be extracted.",
        variant: "destructive",
      });
    } finally {
      event.target.value = '';
    }
  };

  const imageUploadConfig: Array<{ label: string, key: ImageKeys, defaultHint: string, storageKey: string }> = [
    { label: "Profile Avatar", key: 'profile', defaultHint: imageStates.profile.defaultHint, storageKey: ACCOUNT_DETAILS_STORAGE_KEY },
    { label: "Login Banner 1", key: 'loginBanner1', defaultHint: imageStates.loginBanner1.defaultHint, storageKey: LOGIN_BANNER_KEY_1 },
    { label: "Login Banner 2", key: 'loginBanner2', defaultHint: imageStates.loginBanner2.defaultHint, storageKey: LOGIN_BANNER_KEY_2 },
    { label: "Login Banner 3", key: 'loginBanner3', defaultHint: imageStates.loginBanner3.defaultHint, storageKey: LOGIN_BANNER_KEY_3 },
    { label: "Login Banner 4", key: 'loginBanner4', defaultHint: imageStates.loginBanner4.defaultHint, storageKey: LOGIN_BANNER_KEY_4 },
    { label: "Login Banner 5", key: 'loginBanner5', defaultHint: imageStates.loginBanner5.defaultHint, storageKey: LOGIN_BANNER_KEY_5 },
    { label: "Fixed Deposit Banner (All Accounts)", key: 'fdBanner', defaultHint: imageStates.fdBanner.defaultHint, storageKey: FD_BANNER_KEY },
    { label: "Recurring Deposit Banner (All Accounts)", key: 'rdBanner', defaultHint: imageStates.rdBanner.defaultHint, storageKey: RD_BANNER_KEY },
    { label: "Debit Card Illustration (Account Actions)", key: 'debitCardIllustration', defaultHint: imageStates.debitCardIllustration.defaultHint, storageKey: DEBIT_CARD_ILLUSTRATION_KEY },
    { label: "Link Bank Illustration (Current Account Details)", key: 'linkBankIllustration', defaultHint: imageStates.linkBankIllustration.defaultHint, storageKey: LINK_BANK_ILLUSTRATION_KEY },
    { label: "Promo Banner Image (Current Account Details)", key: 'promoWomanPayment', defaultHint: imageStates.promoWomanPayment.defaultHint, storageKey: PROMO_WOMAN_PAYMENT_KEY },
    { label: "BOB World Logo (Statement and Receipt PDFs)", key: 'statementLogo', defaultHint: imageStates.statementLogo.defaultHint, storageKey: STATEMENT_LOGO_KEY },
    { label: "Bank Logo (Statement PDF)", key: 'statementBankLogo', defaultHint: imageStates.statementBankLogo.defaultHint, storageKey: STATEMENT_BANK_LOGO_KEY },
    { label: "Transfer OTP Notification Avatar", key: 'otpNotificationAvatar', defaultHint: imageStates.otpNotificationAvatar.defaultHint, storageKey: OTP_NOTIFICATION_AVATAR_KEY },
  ];

  const clearImage = (key: ImageKeys) => {
    const config = imageUploadConfig.find(c => c.key === key);
    const defaultPreview = key === 'profile' 
      ? (INITIAL_ACCOUNT_DETAILS.profileImageUrl || 'https://placehold.co/100x100.png') 
      : (config?.defaultHint ? `https://placehold.co/100x100.png?text=${config.defaultHint.replace(' ', '+')}` : 'https://placehold.co/100x100.png');

    setImageStates(prev => ({
      ...prev,
      [key]: { ...prev[key], dataUri: null, preview: defaultPreview } 
    }));
  };


  const handleSaveChanges = async (e: FormEvent) => {
    e.preventDefault();
    
    const accountDetailsToSave: AccountDetailsType = { ...INITIAL_ACCOUNT_DETAILS, ...accountDetails };

    if (imageStates.profile.dataUri && imageStates.profile.dataUri.startsWith('data:image')) {
      accountDetailsToSave.profileImageUrl = imageStates.profile.dataUri;
    } else if (imageStates.profile.dataUri === null) { 
      accountDetailsToSave.profileImageUrl = undefined; 
    } else {
    }
        
    localStorage.setItem(ACCOUNT_DETAILS_STORAGE_KEY, JSON.stringify(accountDetailsToSave));
    
    localStorage.setItem(BALANCE_STORAGE_KEY, balance.toString());
    
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions.map(tx => ({
        ...tx,
        date: new Date(tx.date).toISOString(), 
        instrumentNumber: tx.instrumentNumber || undefined,
        transactionMainType: tx.transactionMainType || undefined,
        transactionSubType: tx.transactionSubType || undefined,
        comments: tx.comments || undefined,
        payeeId: tx.payeeId || undefined,
        referenceNumber: tx.referenceNumber || undefined,
    }))));
    
    localStorage.setItem(PAYEES_STORAGE_KEY, JSON.stringify(payees));
    localStorage.setItem(LIVE_AGENT_MESSAGES_STORAGE_KEY, JSON.stringify(liveAgentMessages));


    if (passbookTotalIn.trim() === '') localStorage.removeItem(PASSBOOK_TOTAL_IN_KEY);
    else localStorage.setItem(PASSBOOK_TOTAL_IN_KEY, passbookTotalIn);

    if (passbookTotalOut.trim() === '') localStorage.removeItem(PASSBOOK_TOTAL_OUT_KEY);
    else localStorage.setItem(PASSBOOK_TOTAL_OUT_KEY, passbookTotalOut);

    if (passbookClosingBalance.trim() === '') localStorage.removeItem(PASSBOOK_CLOSING_BALANCE_KEY);
    else localStorage.setItem(PASSBOOK_CLOSING_BALANCE_KEY, passbookClosingBalance);

    imageUploadConfig.forEach(imgConfig => {
        if (imgConfig.key === 'profile') return; 

        const dataUri = imageStates[imgConfig.key].dataUri;
        if (dataUri && dataUri.startsWith('data:image')) {
            localStorage.setItem(imgConfig.storageKey, dataUri);
        } else { 
            localStorage.removeItem(imgConfig.storageKey);
        }
    });

    try {
      await persistStorageKeys(BOB_WORLD_STATE_KEYS);
    } catch (error) {
      console.error('IndexedDB snapshot save failed:', error);
      toast({ title: 'Settings saved with local fallback', description: 'IndexedDB could not be updated. Keep a JSON export before clearing browser data.', variant: 'destructive' });
      return;
    }

    toast({
      title: "Settings Saved!",
      description: "Your configurations have been updated.",
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonString = e.target?.result as string;
        const importedData = JSON.parse(jsonString);

        const importedAppState = importedData.appState && typeof importedData.appState === 'object' && !Array.isArray(importedData.appState)
          ? importedData.appState as Record<string, unknown>
          : {};
        for (const [key, value] of Object.entries(importedAppState)) {
          if (!key.startsWith('bobworld_')) continue;
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        }

        if (importedData.accountDetails) localStorage.setItem(ACCOUNT_DETAILS_STORAGE_KEY, JSON.stringify(importedData.accountDetails));
        if (importedData.balance !== null && importedData.balance !== undefined) localStorage.setItem(BALANCE_STORAGE_KEY, importedData.balance.toString());
        if (importedData.transactions) localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(importedData.transactions));
        if (importedData.payees) localStorage.setItem(PAYEES_STORAGE_KEY, JSON.stringify(importedData.payees));
        if (importedData.liveAgentMessages) localStorage.setItem(LIVE_AGENT_MESSAGES_STORAGE_KEY, JSON.stringify(importedData.liveAgentMessages));
        
        if (importedData.passbookTotalIn !== undefined && importedData.passbookTotalIn !== null) localStorage.setItem(PASSBOOK_TOTAL_IN_KEY, String(importedData.passbookTotalIn));
        else if (!Object.prototype.hasOwnProperty.call(importedAppState, PASSBOOK_TOTAL_IN_KEY)) localStorage.removeItem(PASSBOOK_TOTAL_IN_KEY);

        if (importedData.passbookTotalOut !== undefined && importedData.passbookTotalOut !== null) localStorage.setItem(PASSBOOK_TOTAL_OUT_KEY, String(importedData.passbookTotalOut));
        else if (!Object.prototype.hasOwnProperty.call(importedAppState, PASSBOOK_TOTAL_OUT_KEY)) localStorage.removeItem(PASSBOOK_TOTAL_OUT_KEY);

        if (importedData.passbookClosingBalance !== undefined && importedData.passbookClosingBalance !== null) localStorage.setItem(PASSBOOK_CLOSING_BALANCE_KEY, String(importedData.passbookClosingBalance));
        else if (!Object.prototype.hasOwnProperty.call(importedAppState, PASSBOOK_CLOSING_BALANCE_KEY)) localStorage.removeItem(PASSBOOK_CLOSING_BALANCE_KEY);

        const imageKeysMap: Record<string, string> = { 
            loginBanner1: LOGIN_BANNER_KEY_1,
            loginBanner2: LOGIN_BANNER_KEY_2,
            loginBanner3: LOGIN_BANNER_KEY_3,
            loginBanner4: LOGIN_BANNER_KEY_4,
            loginBanner5: LOGIN_BANNER_KEY_5,
            fdBanner: FD_BANNER_KEY,
            rdBanner: RD_BANNER_KEY,
            debitCardIllustration: DEBIT_CARD_ILLUSTRATION_KEY,
            linkBankIllustration: LINK_BANK_ILLUSTRATION_KEY,
            promoWomanPayment: PROMO_WOMAN_PAYMENT_KEY,
             statementLogo: STATEMENT_LOGO_KEY,
             statementBankLogo: STATEMENT_BANK_LOGO_KEY,
             otpNotificationAvatar: OTP_NOTIFICATION_AVATAR_KEY,
        };

        if (importedData.images) {
            for (const key in imageKeysMap) {
                if (importedData.images[key as ImageKeys]) {
                    localStorage.setItem(imageKeysMap[key], importedData.images[key as ImageKeys]);
                } else {
                    localStorage.removeItem(imageKeysMap[key]);
                }
            }
        }
        await persistStorageKeys(Array.from(new Set([...BOB_WORLD_STATE_KEYS, ...Object.keys(importedAppState).filter(key => key.startsWith('bobworld_'))])));
        window.location.reload();
      } catch (error) {
        console.error("Error importing application data:", error);
        toast({ title: "Import Failed", description: "Could not apply the file. Ensure it is valid JSON and that device storage is available.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = ''; 
  };

  const handleExportData = async () => {
    try {
      const accountDetailsData = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
      const balanceData = localStorage.getItem(BALANCE_STORAGE_KEY);
      const transactionsData = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      const payeesData = localStorage.getItem(PAYEES_STORAGE_KEY);
      const liveAgentMessagesData = localStorage.getItem(LIVE_AGENT_MESSAGES_STORAGE_KEY);
      const passbookTotalInData = localStorage.getItem(PASSBOOK_TOTAL_IN_KEY);
      const passbookTotalOutData = localStorage.getItem(PASSBOOK_TOTAL_OUT_KEY);
      const passbookClosingBalanceData = localStorage.getItem(PASSBOOK_CLOSING_BALANCE_KEY);
      const indexedAppState = await readAllAppState();
      const localAppState = Object.fromEntries(
        Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
          .filter((key): key is string => Boolean(key && key.startsWith('bobworld_')))
          .map(key => [key, localStorage.getItem(key)]),
      );
      const appState = { ...indexedAppState, ...localAppState };
      const imagesToExport: Partial<Record<ImageKeys, string | null>> = {};
      imageUploadConfig.forEach(imgConf => {
          if (imgConf.key === 'profile') {
              const ad = accountDetailsData ? JSON.parse(accountDetailsData) : {};
              imagesToExport.profile = ad.profileImageUrl || imageStates.profile.dataUri; 
          } else {
            imagesToExport[imgConf.key] = localStorage.getItem(imgConf.storageKey);
          }
      });

      const exportData = {
        exportVersion: 2,
        exportedAt: new Date().toISOString(),
        appState,
        accountDetails: accountDetailsData ? JSON.parse(accountDetailsData) : null,
        balance: balanceData ? parseFloat(balanceData) : null,
        transactions: transactionsData ? JSON.parse(transactionsData) : [],
        payees: payeesData ? JSON.parse(payeesData) : [],
        liveAgentMessages: liveAgentMessagesData ? JSON.parse(liveAgentMessagesData) : [],
        passbookTotalIn: passbookTotalInData,
        passbookTotalOut: passbookTotalOutData,
        passbookClosingBalance: passbookClosingBalanceData,
        images: imagesToExport, 
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bob_world_data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Data Exported!", description: "Your application data has been downloaded." });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast({ title: "Export Failed", description: "Error exporting data. See console.", variant: "destructive" });
    }
  };

  const handleAddOrEditTransaction = (transactionData: TransactionType, existingId?: string) => {
    let newBalance = balance;
    const newTransactions = [...transactions];

    const amount = typeof transactionData.amount === 'number' ? parseFloat(String(transactionData.amount)) : parseFloat(String(transactionData.amount));
    if (isNaN(amount)) {
      toast({ title: "Error", description: "Invalid transaction amount.", variant: "destructive" });
      return;
    }
    
    const fullTransactionData: TransactionType = {
        ...transactionData,
        id: transactionData.id.trim() || crypto.randomUUID(), 
        amount: amount
    };


    if (existingId) {
      const oldTransactionIndex = newTransactions.findIndex(t => t.id === existingId);
      if (oldTransactionIndex === -1) {
         console.error("Could not find transaction to edit with id:", existingId);
         toast({ title: "Error", description: "Could not find transaction to edit.", variant: "destructive"});
         return;
      }

      const oldTransaction = newTransactions[oldTransactionIndex];
      if (oldTransaction.type === 'credit') newBalance -= oldTransaction.amount;
      else newBalance += oldTransaction.amount;

      if (fullTransactionData.type === 'credit') newBalance += fullTransactionData.amount;
      else newBalance -= fullTransactionData.amount;

      newTransactions[oldTransactionIndex] = fullTransactionData;
      setEditingTransaction(null); 
      setIsEditTransactionOpen(false); 
    } else { 
      if (fullTransactionData.type === 'credit') newBalance += fullTransactionData.amount;
      else newBalance -= fullTransactionData.amount;

      newTransactions.unshift(fullTransactionData); 
      setIsAddTransactionOpen(false); 
    }
    setBalance(newBalance); 
    setTransactions(newTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())); 
  };

  const handleDeleteTransaction = (id: string) => {
    const transactionToDelete = transactions.find(t => t.id === id);
    if (transactionToDelete) {
        if (transactionToDelete.type === 'credit') {
            setBalance(prev => prev - transactionToDelete.amount);
        } else {
            setBalance(prev => prev + transactionToDelete.amount);
        }
    }
    setTransactions(prev => prev.filter(t => t.id !== id));
    toast({ title: "Transaction Deleted", description: "The transaction has been removed." });
  };

  const openEditTransactionDialog = (transaction: TransactionType) => {
    setEditingTransaction(transaction);
    setIsEditTransactionOpen(true);
  };

  const handleSavePayee = (payeeData: Omit<PayeeType, 'id'>, id?: string) => {
    let updatedPayees;
    if (id) { 
      updatedPayees = payees.map(p => p.id === id ? { ...p, ...payeeData, id } : p);
    } else { 
      const newPayee = { ...payeeData, id: crypto.randomUUID() };
      updatedPayees = [newPayee, ...payees];
    }
    setPayees(updatedPayees.sort((a, b) => a.name.localeCompare(b.name)));
    setIsPayeeDialogOpen(false);
    setEditingPayee(null); 
  };

  const openEditPayeeDialog = (payee: PayeeType) => {
    setEditingPayee(payee);
    setIsPayeeDialogOpen(true);
  };

  const confirmDeletePayee = (payee: PayeeType) => {
    setPayeeToDelete(payee); 
  };

  const handleDeletePayee = () => {
    if (!payeeToDelete) return;
    const updatedPayees = payees.filter(p => p.id !== payeeToDelete.id);
    setPayees(updatedPayees);
    toast({ title: "Payee Deleted", description: `${payeeToDelete.name} has been removed.` });
    setPayeeToDelete(null); 
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" || file.size > 20 * 1024 * 1024) {
      toast({ title: "Invalid Statement PDF", description: "Select a PDF file smaller than 20 MB.", variant: "destructive" });
      event.target.value = '';
      return;
    }

    setIsProcessingPdf(true);
    try {
      // Keep the document in memory only. Do not put a multi-megabyte PDF in
      // localStorage; persist only the validated transaction/account fields.
      const pdfBytes = new Uint8Array(await file.arrayBuffer());
      const parsed = await parseBobStatementPdf(pdfBytes);
      const parsedDetails = Object.fromEntries(
        Object.entries(parsed.accountDetails).filter(([, value]) => value !== undefined && value !== null && value !== ''),
      ) as Partial<AccountDetailsType>;
      const nextAccountDetails: AccountDetailsType = {
        ...INITIAL_ACCOUNT_DETAILS,
        ...accountDetails,
        ...parsedDetails,
        accountNumber: parsed.accountNumber,
      };
      const netMovement = parsed.transactions.reduce(
        (total, tx) => total + (tx.type === 'credit' ? Math.abs(tx.amount) : -Math.abs(tx.amount)),
        0,
      );
      const nextBalance = parsed.closingBalance ?? ((parsed.openingBalance ?? balance) + netMovement);
      const newestFirst = [...parsed.transactions].sort(
        (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
      );

      // Extracted brand art is optional for transaction import. Only update the
      // image keys when this PDF contains a usable logo crop.
      let assets: StatementBrandAssets = {};
      try {
        assets = await extractStatementBrandAssets(pdfBytes);
      } catch (assetError) {
        console.warn('Statement logo extraction failed; saved logos will be retained:', assetError);
      }

      const previousValues = {
        account: localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY),
        balance: localStorage.getItem(BALANCE_STORAGE_KEY),
        transactions: localStorage.getItem(TRANSACTIONS_STORAGE_KEY),
        bobLogo: localStorage.getItem(STATEMENT_LOGO_KEY),
        bankLogo: localStorage.getItem(STATEMENT_BANK_LOGO_KEY),
      };
      try {
        localStorage.setItem(ACCOUNT_DETAILS_STORAGE_KEY, JSON.stringify(nextAccountDetails));
        localStorage.setItem(BALANCE_STORAGE_KEY, String(nextBalance));
        localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(newestFirst));
        if (assets.bobWorldLogo) localStorage.setItem(STATEMENT_LOGO_KEY, assets.bobWorldLogo);
        if (assets.bankLogo) localStorage.setItem(STATEMENT_BANK_LOGO_KEY, assets.bankLogo);
        await persistStorageKeys(BOB_WORLD_STATE_KEYS);
      } catch (storageError) {
        const restore = (key: string, value: string | null) => {
          if (value === null) localStorage.removeItem(key);
          else localStorage.setItem(key, value);
        };
        try {
          restore(ACCOUNT_DETAILS_STORAGE_KEY, previousValues.account);
          restore(BALANCE_STORAGE_KEY, previousValues.balance);
          restore(TRANSACTIONS_STORAGE_KEY, previousValues.transactions);
          restore(STATEMENT_LOGO_KEY, previousValues.bobLogo);
          restore(STATEMENT_BANK_LOGO_KEY, previousValues.bankLogo);
        } catch (restoreError) {
          console.error('Could not restore a previous local statement snapshot:', restoreError);
        }
        throw new Error('The imported statement could not be saved locally. Previous data was restored where possible. Check available browser storage.');
      }

      setAccountDetails(nextAccountDetails);
      setBalance(nextBalance);
      setTransactions(newestFirst);
      setStatementPdfName(file.name);
      setImageStates(previous => ({
        ...previous,
        statementLogo: assets.bobWorldLogo
          ? { ...previous.statementLogo, dataUri: assets.bobWorldLogo, preview: assets.bobWorldLogo }
          : previous.statementLogo,
        statementBankLogo: assets.bankLogo
          ? { ...previous.statementBankLogo, dataUri: assets.bankLogo, preview: assets.bankLogo }
          : previous.statementBankLogo,
      }));

      toast({
        title: "Statement imported",
        description: newestFirst.length + " transactions replaced the previous list. Opening and closing balances were reconciled; payees and other app settings were preserved.",
      });
    } catch (error) {
      console.error("Local statement extraction failed:", error);
      toast({
        title: "Statement extraction failed",
        description: error instanceof Error ? error.message : "Could not parse the statement. Existing account and transaction data were not changed.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPdf(false);
      event.target.value = '';
    }
  };
  const openAddLiveAgentMessageDialog = () => {
    setEditingLiveAgentMessage(null);
    setCurrentMessageContent('');
    setCurrentMessageSender('user');
    const now = new Date();
    setCurrentMessageTimestamp(now.toISOString().split('T')[0]);
    setCurrentMessageTime(now.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }));
    setIsLiveAgentMessageDialogOpen(true);
  };

  const openEditLiveAgentMessageDialog = (message: LiveAgentMessageType) => {
    setEditingLiveAgentMessage(message);
    setCurrentMessageContent(message.content);
    setCurrentMessageSender(message.sender);
    const msgDate = new Date(message.timestamp);
    setCurrentMessageTimestamp(msgDate.toISOString().split('T')[0]);
    setCurrentMessageTime(msgDate.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }));
    setIsLiveAgentMessageDialogOpen(true);
  };

  const handleSaveLiveAgentMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!currentMessageContent.trim()) {
      toast({ title: "Error", description: "Message content cannot be empty.", variant: "destructive" });
      return;
    }
    const combinedDateTime = new Date(`${currentMessageTimestamp}T${currentMessageTime}`);
    if (isNaN(combinedDateTime.getTime())) {
      toast({ title: "Error", description: "Invalid date or time for message.", variant: "destructive" });
      return;
    }

    const newMessageData = {
      sender: currentMessageSender,
      content: currentMessageContent.trim(),
      timestamp: combinedDateTime.toISOString(),
    };

    if (editingLiveAgentMessage) {
      setLiveAgentMessages(prev => prev.map(msg => msg.id === editingLiveAgentMessage.id ? { ...editingLiveAgentMessage, ...newMessageData } : msg).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
      toast({ title: "Message Updated", description: "Live agent message has been updated." });
    } else {
      setLiveAgentMessages(prev => [...prev, { id: crypto.randomUUID(), ...newMessageData }].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
      toast({ title: "Message Added", description: "New live agent message added." });
    }
    setIsLiveAgentMessageDialogOpen(false);
    setEditingLiveAgentMessage(null);
  };

  const confirmDeleteLiveAgentMessage = (message: LiveAgentMessageType) => {
    setLiveAgentMessageToDelete(message);
  };

  const handleDeleteLiveAgentMessage = () => {
    if (!liveAgentMessageToDelete) return;
    setLiveAgentMessages(prev => prev.filter(msg => msg.id !== liveAgentMessageToDelete.id));
    toast({ title: "Message Deleted", description: "Live agent message has been removed." });
    setLiveAgentMessageToDelete(null);
  };


  return (
    <div className="space-y-6 pb-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <form onSubmit={handleSaveChanges}>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Account Configuration</CardTitle>
            <CardDescription>Manage your account details, balance, transactions, payees, overrides and application images.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-4">
              <h3 className="text-lg font-medium flex items-center"><UserCircle2 className="mr-2 h-5 w-5 text-primary" />Account Holder Details</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={accountDetails.name} onChange={(e) => handleDetailsChange('name', e.target.value)} className="mt-1" placeholder="e.g., Alex Johnson" />
                </div>
                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input id="accountNumber" value={accountDetails.accountNumber} onChange={(e) => handleDetailsChange('accountNumber', e.target.value)} className="mt-1" placeholder="e.g., 987654321098" />
                </div>
                 <div>
                  <Label htmlFor="accountType">Account Type (e.g., Current, Saving)</Label>
                  <Input id="accountType" value={accountDetails.accountType || ''} onChange={(e) => handleDetailsChange('accountType', e.target.value)} className="mt-1" placeholder="e.g., Current" />
                </div>
                <div>
                  <Label htmlFor="accountTypeName">Account Type Name (Full)</Label>
                  <Input id="accountTypeName" value={accountDetails.accountTypeName || ''} onChange={(e) => handleDetailsChange('accountTypeName', e.target.value)} className="mt-1" placeholder="e.g., bob LITE CURRENT ACCOUNT" />
                </div>
                 <div>
                  <Label htmlFor="customerId">Customer ID</Label>
                  <Input id="customerId" value={accountDetails.customerId || ''} onChange={(e) => handleDetailsChange('customerId', e.target.value)} className="mt-1" placeholder="e.g., CUST12345" />
                </div>
                <div>
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input id="ifscCode" value={accountDetails.ifscCode} onChange={(e) => handleDetailsChange('ifscCode', e.target.value)} className="mt-1" placeholder="e.g., BUDDY000001" />
                </div>
                <div>
                  <Label htmlFor="lastLogin" className="flex items-center"><CalendarClock className="mr-2 h-4 w-4 text-muted-foreground" />Last Login Text (Profile Display)</Label>
                  <Input id="lastLogin" value={accountDetails.lastLogin || ''} onChange={(e) => handleDetailsChange('lastLogin', e.target.value)} className="mt-1" placeholder="e.g., May 10, 2025 10:30 AM" />
                </div>
                <div>
                  <Label htmlFor="dob" className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />Date of Birth</Label>
                  <Input id="dob" type="text" value={accountDetails.dob || ''} onChange={(e) => handleDetailsChange('dob', e.target.value)} className="mt-1" placeholder="e.g., DD/MM/YYYY" />
                </div>
                <div>
                  <Label htmlFor="panNumber" className="flex items-center"><CreditCardIcon className="mr-2 h-4 w-4 text-muted-foreground" />PAN Number</Label>
                  <Input id="panNumber" value={accountDetails.panNumber || ''} onChange={(e) => handleDetailsChange('panNumber', e.target.value)} className="mt-1" placeholder="e.g., ABCDE1234P" />
                </div>
                <div>
                  <Label htmlFor="branchName" className="flex items-center"><Building className="mr-2 h-4 w-4 text-muted-foreground" />Branch Name</Label>
                  <Input id="branchName" value={accountDetails.branchName || ''} onChange={(e) => handleDetailsChange('branchName', e.target.value)} className="mt-1" placeholder="e.g., Main Street Branch" />
                </div>
                <div>
                  <Label htmlFor="email" className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" />Email ID</Label>
                  <Input id="email" type="email" value={accountDetails.email || ''} onChange={(e) => handleDetailsChange('email', e.target.value)} className="mt-1" placeholder="e.g., user@example.com" />
                </div>
                <div>
                  <Label htmlFor="phoneNumber" className="flex items-center"><Phone className="mr-2 h-4 w-4 text-muted-foreground" />Phone Number</Label>
                  <Input id="phoneNumber" type="tel" value={accountDetails.phoneNumber || ''} onChange={(e) => handleDetailsChange('phoneNumber', e.target.value)} className="mt-1" placeholder="e.g., +919876543210" />
                </div>
              </div>
            </section>

             <section className="space-y-4">
               <h3 className="text-lg font-medium flex items-center"><ShieldCheck className="mr-2 h-5 w-5 text-primary" />Fund Transfer Security</h3>
               <CardDescription>Set a separate four-digit TPIN for the local IMPS transfer flow. The app stores a salted PBKDF2 verifier, not the TPIN in plain text.</CardDescription>
               <div className="rounded-xl border p-4 space-y-3">
                 <p className="text-sm font-medium">{isTransferTpinConfigured ? 'Transfer TPIN is configured on this device.' : 'No transfer TPIN is configured yet.'}</p>
                 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                   <div><Label htmlFor="transferTpin">New 4-digit TPIN</Label><Input id="transferTpin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={transferTpin} onChange={event => setTransferTpin(event.target.value.replace(/\D/g, '').slice(0, 4))} className="mt-1 tracking-[0.4em]" placeholder="••••" /></div>
                   <div><Label htmlFor="confirmTransferTpin">Confirm TPIN</Label><Input id="confirmTransferTpin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={confirmTransferTpin} onChange={event => setConfirmTransferTpin(event.target.value.replace(/\D/g, '').slice(0, 4))} className="mt-1 tracking-[0.4em]" placeholder="••••" /></div>
                 </div>
                 <div className="flex flex-wrap items-center gap-2">