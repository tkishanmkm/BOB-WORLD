
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
  STATEMENT_PDF_KEY,
  STATEMENT_LOGO_KEY,
  STATEMENT_BANK_LOGO_KEY,
} from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Save, UserCircle2, IndianRupee, ListPlus, Trash2, PlusCircle, Edit3, BookOpen, Image as ImageIconLucide, CalendarClock, Briefcase, Building, Mail, Phone, CalendarDays, CreditCardIcon, UploadCloud, XCircle, FileUp, Loader2, Users, UserPlus, MessageSquare, FileText } from 'lucide-react';
import { AddTransactionDialog } from "@/components/passbook/add-transaction-dialog";
import { AddPayeeDialog } from "@/components/fund-transfer/add-payee-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { parseBobStatementPdf, extractStatementBrandAssets } from '@/lib/bob-statement-parser';
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
  | 'statementBankLogo';


export default function SettingsPage() {
  const [accountDetails, setAccountDetails] = useState<AccountDetailsType>(INITIAL_ACCOUNT_DETAILS);
  const [balance, setBalance] = useState<number>(INITIAL_BALANCE);
  const [transactions, setTransactions] = useState<TransactionType[]>(INITIAL_TRANSACTIONS);
  const [payees, setPayees] = useState<PayeeType[]>(INITIAL_PAYEES);
  const [liveAgentMessages, setLiveAgentMessages] = useState<LiveAgentMessageType[]>(INITIAL_LIVE_AGENT_MESSAGES);
  
  const [statementPdfName, setStatementPdfName] = useState<string | null>(null);

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
  });

  const [clientRenderedTransactions, setClientRenderedTransactions] = useState<Array<TransactionType & { formattedDate: string }>>([]);
  const [clientRenderedLiveMessages, setClientRenderedLiveMessages] = useState<Array<LiveAgentMessageType & { formattedTimestamp: string }>>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  useEffect(() => {
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

    const storedStatementPdf = localStorage.getItem(STATEMENT_PDF_KEY);
    if (storedStatementPdf) setStatementPdfName('statement.pdf');


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
    if (file.type !== "application/pdf" || file.size > 8 * 1024 * 1024) {
      toast({ title: "Invalid Statement PDF", description: "Select a PDF file smaller than 8 MB.", variant: "destructive" });
      event.target.value = '';
      return;
    }
    try {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read the selected PDF.'));
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not encode the selected PDF.'));
        reader.readAsDataURL(file);
      });
      localStorage.setItem(STATEMENT_PDF_KEY, dataUri);
      setStatementPdfName(file.name);
      try {
        const assets = await extractStatementBrandAssets(await file.arrayBuffer());
        if (assets.bobWorldLogo) {
          localStorage.setItem(STATEMENT_LOGO_KEY, assets.bobWorldLogo);
          setImageStates(prev => ({ ...prev, statementLogo: { ...prev.statementLogo, dataUri: assets.bobWorldLogo!, preview: assets.bobWorldLogo! } }));
        }
        if (assets.bankLogo) {
          localStorage.setItem(STATEMENT_BANK_LOGO_KEY, assets.bankLogo);
          setImageStates(prev => ({ ...prev, statementBankLogo: { ...prev.statementBankLogo, dataUri: assets.bankLogo!, preview: assets.bankLogo! } }));
        }
        toast({ title: "Statement resources saved", description: file.name + " saved locally; logo artwork extracted into Settings." });
      } catch (assetError) {
        console.warn('Statement logo extraction failed:', assetError);
        toast({ title: "Statement PDF saved", description: "The original PDF is saved. Upload the BOB World logo manually in Manage Application Images if needed." });
      }
    } catch (error) {
      toast({ title: "Statement PDF could not be saved", description: error instanceof Error ? error.message : "Local storage is unavailable.", variant: "destructive" });
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


  const handleSaveChanges = (e: FormEvent) => {
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
    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        const importedData = JSON.parse(jsonString);

        if (importedData.accountDetails) localStorage.setItem(ACCOUNT_DETAILS_STORAGE_KEY, JSON.stringify(importedData.accountDetails));
        if (importedData.balance !== null && importedData.balance !== undefined) localStorage.setItem(BALANCE_STORAGE_KEY, importedData.balance.toString());
        if (importedData.transactions) localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(importedData.transactions));
        if (importedData.payees) localStorage.setItem(PAYEES_STORAGE_KEY, JSON.stringify(importedData.payees));
        if (importedData.liveAgentMessages) localStorage.setItem(LIVE_AGENT_MESSAGES_STORAGE_KEY, JSON.stringify(importedData.liveAgentMessages));
        if (importedData.statementPdf) localStorage.setItem(STATEMENT_PDF_KEY, importedData.statementPdf);
        
        if (importedData.passbookTotalIn) localStorage.setItem(PASSBOOK_TOTAL_IN_KEY, importedData.passbookTotalIn);
        else localStorage.removeItem(PASSBOOK_TOTAL_IN_KEY);

        if (importedData.passbookTotalOut) localStorage.setItem(PASSBOOK_TOTAL_OUT_KEY, importedData.passbookTotalOut);
        else localStorage.removeItem(PASSBOOK_TOTAL_OUT_KEY);

        if (importedData.passbookClosingBalance) localStorage.setItem(PASSBOOK_CLOSING_BALANCE_KEY, importedData.passbookClosingBalance);
        else localStorage.removeItem(PASSBOOK_CLOSING_BALANCE_KEY);

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
        window.location.reload();
      } catch (error) {
        toast({ title: "Import Failed", description: "Could not parse the file. Ensure it's valid JSON.", variant: "destructive" });
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
      const statementPdfData = localStorage.getItem(STATEMENT_PDF_KEY);

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
        accountDetails: accountDetailsData ? JSON.parse(accountDetailsData) : null,
        balance: balanceData ? parseFloat(balanceData) : null,
        transactions: transactionsData ? JSON.parse(transactionsData) : [],
        payees: payeesData ? JSON.parse(payeesData) : [],
        liveAgentMessages: liveAgentMessagesData ? JSON.parse(liveAgentMessagesData) : [],
        passbookTotalIn: passbookTotalInData,
        passbookTotalOut: passbookTotalOutData,
        passbookClosingBalance: passbookClosingBalanceData,
        statementPdf: statementPdfData,
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
    if (file.type !== "application/pdf" || file.size > 8 * 1024 * 1024) {
      toast({ title: "Invalid Statement PDF", description: "Select a PDF file smaller than 8 MB.", variant: "destructive" });
      event.target.value = '';
      return;
    }
    setIsProcessingPdf(true);
    try {
      const pdfDataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read the statement PDF.'));
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not encode the statement PDF.'));
        reader.readAsDataURL(file);
      });
      // Keep the original source PDF even when the file is scanned and cannot
      // be text-parsed. A parsing failure never replaces live account data.
      localStorage.setItem(STATEMENT_PDF_KEY, pdfDataUri);
      setStatementPdfName(file.name);
      try {
        const assets = await extractStatementBrandAssets(await file.arrayBuffer());
        if (assets.bobWorldLogo) {
          localStorage.setItem(STATEMENT_LOGO_KEY, assets.bobWorldLogo);
          setImageStates(prev => ({ ...prev, statementLogo: { ...prev.statementLogo, dataUri: assets.bobWorldLogo!, preview: assets.bobWorldLogo! } }));
        }
        if (assets.bankLogo) {
          localStorage.setItem(STATEMENT_BANK_LOGO_KEY, assets.bankLogo);
          setImageStates(prev => ({ ...prev, statementBankLogo: { ...prev.statementBankLogo, dataUri: assets.bankLogo!, preview: assets.bankLogo! } }));
        }
      } catch (assetError) {
        console.warn('Statement logo extraction failed:', assetError);
      }
      const parsed = await parseBobStatementPdf(await file.arrayBuffer());
      const parsedDetails = Object.fromEntries(Object.entries(parsed.accountDetails).filter(([, value]) => value !== undefined && value !== null && value !== '')) as Partial<AccountDetailsType>;
      const nextAccountDetails: AccountDetailsType = { ...INITIAL_ACCOUNT_DETAILS, ...accountDetails, ...parsedDetails, accountNumber: parsed.accountNumber };
      const netMovement = parsed.transactions.reduce((total, tx) => total + (tx.type === 'credit' ? Math.abs(tx.amount) : -Math.abs(tx.amount)), 0);
      const nextBalance = parsed.closingBalance ?? ((parsed.openingBalance ?? balance) + netMovement);
      const newestFirst = [...parsed.transactions].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());

      localStorage.setItem(ACCOUNT_DETAILS_STORAGE_KEY, JSON.stringify(nextAccountDetails));
      localStorage.setItem(BALANCE_STORAGE_KEY, String(nextBalance));
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(newestFirst));
      setAccountDetails(nextAccountDetails);
      setBalance(nextBalance);
      setTransactions(newestFirst);
      try {
        const assets = await extractStatementBrandAssets(await file.arrayBuffer());
        if (assets.bobWorldLogo) {
          localStorage.setItem(STATEMENT_LOGO_KEY, assets.bobWorldLogo);
          setImageStates(prev => ({ ...prev, statementLogo: { ...prev.statementLogo, dataUri: assets.bobWorldLogo!, preview: assets.bobWorldLogo! } }));
        }
        if (assets.bankLogo) {
          localStorage.setItem(STATEMENT_BANK_LOGO_KEY, assets.bankLogo);
          setImageStates(prev => ({ ...prev, statementBankLogo: { ...prev.statementBankLogo, dataUri: assets.bankLogo!, preview: assets.bankLogo! } }));
        }
      } catch (assetError) {
        console.warn('Statement logo extraction failed after import:', assetError);
      }
      toast({ title: "Statement imported", description: newestFirst.length + " transactions replaced the previous list. Account details and balance updated; payees and app appearance preserved." });
    } catch (error) {
      console.error("Local statement extraction failed:", error);
      toast({ title: "Statement extraction failed", description: error instanceof Error ? error.message : "Could not parse the statement. Existing account and transaction data were not changed.", variant: "destructive" });
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
               <h3 className="text-lg font-medium flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" />Statement Account & Branch Fields</h3>
               <CardDescription>Complete any detail that is missing from the uploaded statement. These values are used when generating a new statement PDF.</CardDescription>
               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                 <div><Label htmlFor="customerAddress">Customer Address</Label><Input id="customerAddress" value={accountDetails.customerAddress || ''} onChange={(e) => handleDetailsChange('customerAddress', e.target.value)} className="mt-1" placeholder="Customer postal address" /></div>
                 <div><Label htmlFor="customerCity">Customer City</Label><Input id="customerCity" value={accountDetails.customerCity || ''} onChange={(e) => handleDetailsChange('customerCity', e.target.value)} className="mt-1" placeholder="City" /></div>
                 <div><Label htmlFor="ckycNumber">CKYC Number</Label><Input id="ckycNumber" value={accountDetails.ckycNumber || ''} onChange={(e) => handleDetailsChange('ckycNumber', e.target.value)} className="mt-1" placeholder="CKYC number" /></div>
                 <div><Label htmlFor="nominee">Nominee Name</Label><Input id="nominee" value={accountDetails.nominee || ''} onChange={(e) => handleDetailsChange('nominee', e.target.value)} className="mt-1" placeholder="Nominee name" /></div>
                 <div><Label htmlFor="customerPin">Customer PIN / Postal Code</Label><Input id="customerPin" value={accountDetails.customerPin || ''} onChange={(e) => handleDetailsChange('customerPin', e.target.value)} className="mt-1" inputMode="numeric" maxLength={10} placeholder="Postal code" /></div>
                 <div><Label htmlFor="branchAddress">Branch Address</Label><Input id="branchAddress" value={accountDetails.branchAddress || ''} onChange={(e) => handleDetailsChange('branchAddress', e.target.value)} className="mt-1" placeholder="Branch postal address" /></div>
                 <div><Label htmlFor="branchCity">Branch City</Label><Input id="branchCity" value={accountDetails.branchCity || ''} onChange={(e) => handleDetailsChange('branchCity', e.target.value)} className="mt-1" placeholder="City" /></div>
                 <div><Label htmlFor="branchPin">Branch PIN / Postal Code</Label><Input id="branchPin" value={accountDetails.branchPin || ''} onChange={(e) => handleDetailsChange('branchPin', e.target.value)} className="mt-1" inputMode="numeric" maxLength={10} placeholder="Postal code" /></div>
                 <div><Label htmlFor="micrCode">MICR Code</Label><Input id="micrCode" value={accountDetails.micrCode || ''} onChange={(e) => handleDetailsChange('micrCode', e.target.value)} className="mt-1" inputMode="numeric" maxLength={9} placeholder="9-digit MICR" /></div>
                 <div><Label htmlFor="statementOpeningBalance">Statement Opening Balance (INR)</Label><Input id="statementOpeningBalance" type="number" min="0" step="0.01" value={accountDetails.statementOpeningBalance ?? ''} onChange={(e) => setAccountDetails(prev => ({ ...prev, statementOpeningBalance: e.target.value === '' ? undefined : Number(e.target.value) }))} className="mt-1" placeholder="Opening balance" /></div>
                 <div><Label htmlFor="statementPeriodFrom">Statement Period From</Label><Input id="statementPeriodFrom" type="date" value={accountDetails.statementPeriodFrom ? accountDetails.statementPeriodFrom.slice(0, 10) : ''} onChange={(e) => handleDetailsChange('statementPeriodFrom', e.target.value ? new Date(e.target.value + 'T00:00:00').toISOString() : '')} className="mt-1" /></div>
                 <div><Label htmlFor="statementPeriodTo">Statement Period To</Label><Input id="statementPeriodTo" type="date" value={accountDetails.statementPeriodTo ? accountDetails.statementPeriodTo.slice(0, 10) : ''} onChange={(e) => handleDetailsChange('statementPeriodTo', e.target.value ? new Date(e.target.value + 'T00:00:00').toISOString() : '')} className="mt-1" /></div>
                 <div className="sm:col-span-2"><Label htmlFor="statementNote">Statement Footer Note</Label><Textarea id="statementNote" value={accountDetails.statementNote || ''} onChange={(e) => handleDetailsChange('statementNote', e.target.value)} className="mt-1" rows={2} placeholder="Computer-generated statement note" /></div>
               </div>
             </section>

             <section className="space-y-4">
              <h3 className="text-lg font-medium flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" />Statement PDF Management</h3>
              <CardDescription>Save the original statement locally and extract the BOB World and bank logo artwork into Settings. The Account Statement page generates a new PDF from saved transactions.</CardDescription>
              <div>
                <Label htmlFor="statement-pdf-upload">Statement PDF</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Button type="button" variant="outline" onClick={() => statementPdfInputRef.current?.click()}>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Upload PDF
                  </Button>
                  <input
                    id="statement-pdf-upload"
                    type="file"
                    accept=".pdf"
                    ref={statementPdfInputRef}
                    onChange={handleStatementPdfUpload}
                    className="hidden"
                  />
                  {statementPdfName && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>{statementPdfName}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          localStorage.removeItem(STATEMENT_PDF_KEY);
                          setStatementPdfName(null);
                          toast({ title: "PDF Removed", description: "The statement PDF has been cleared." });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
                 <p className="text-xs text-muted-foreground mt-1">The source PDF is retained locally. It is not reused as the generated statement background, so old account transactions cannot be carried into a new statement.</p>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-medium flex items-center"><ImageIconLucide className="mr-2 h-5 w-5 text-primary" />Manage Application Images</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {imageUploadConfig.map(config => (
                  <div key={config.key} className="space-y-2">
                    <Label htmlFor={`image-${config.key}`}>{config.label}</Label>
                    <div className="flex items-center gap-2">
                       <Input
                        id={`image-${config.key}`}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload(config.key)}
                        className="flex-1"
                      />
                       <Button type="button" variant="outline" size="icon" onClick={() => clearImage(config.key)} title="Clear image">
                         <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <img
                         src={imageStates[config.key].preview}
                         alt={`${config.label} preview`}
                         width={config.key === 'profile' ? 80 : 150}
                         height={config.key === 'profile' ? 80 : (config.key.includes('Banner') ? 75 : 50)}
                        className={cn("mt-2 rounded-md border object-contain bg-muted/30", config.key === 'profile' && "rounded-full")}
                        data-ai-hint={imageStates[config.key].defaultHint}
                        key={imageStates[config.key].preview} 
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
               <h3 className="text-lg font-medium flex items-center"><IndianRupee className="mr-2 h-5 w-5 text-primary" />Master Account Balance</h3>
               <div>
                  <Label htmlFor="balance">Current Balance (INR)</Label>
                  <Input id="balance" type="text" value={balance.toString()} onChange={handleBalanceChange} className="mt-1" placeholder="e.g., 75000.00" pattern="\d*(\.\d{0,2})?" />
                  <p className="text-xs text-muted-foreground mt-1">This balance is updated by transactions. Manual edits set a new base.</p>
                </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-medium flex items-center"><BookOpen className="mr-2 h-5 w-5 text-primary" />Passbook Display Overrides</h3>
              <CardDescription>Optionally override calculated values shown on the Passbook page. Leave blank to use calculated/default values.</CardDescription>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="passbookTotalIn">Total In Override</Label>
                  <Input id="passbookTotalIn" type="text" value={passbookTotalIn} onChange={handlePassbookNumericChange(setPassbookTotalIn)} className="mt-1" placeholder="e.g., 50000.00" />
                </div>
                <div>
                  <Label htmlFor="passbookTotalOut">Total Out Override</Label>
                  <Input id="passbookTotalOut" type="text" value={passbookTotalOut} onChange={handlePassbookNumericChange(setPassbookTotalOut)} className="mt-1" placeholder="e.g., 20000.00" />
                </div>
                <div>
                  <Label htmlFor="passbookClosingBalance">Closing Balance Override</Label>
                  <Input id="passbookClosingBalance" type="text" value={passbookClosingBalance} onChange={handlePassbookNumericChange(setPassbookClosingBalance)} className="mt-1" placeholder="e.g., 100000.00" />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium flex items-center"><Users className="mr-2 h-5 w-5 text-primary" />Manage Payees</h3>
                <Button type="button" onClick={() => { setEditingPayee(null); setIsPayeeDialogOpen(true); }} size="sm">
                  <UserPlus className="mr-2 h-4 w-4" /> Add New Payee
                </Button>
              </div>
              {payees.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Account No.</TableHead>
                        <TableHead>IFSC</TableHead>
                        <TableHead>Nickname</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payees.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{p.accountNumber}</TableCell>
                          <TableCell>{p.ifscCode}</TableCell>
                          <TableCell>{p.nickname || 'N/A'}</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button type="button" variant="ghost" size="icon" onClick={() => openEditPayeeDialog(p)} title="Edit Payee">
                              <Edit3 className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" onClick={() => confirmDeletePayee(p)} title="Delete Payee">
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No payees added yet.</p>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium flex items-center"><ListPlus className="mr-2 h-5 w-5 text-primary" />Manage Transactions</h3>
                <Button type="button" onClick={() => { setEditingTransaction(null); setIsAddTransactionOpen(true); }} size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New
                </Button>
              </div>
              {clientRenderedTransactions.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                  <TableCaption>A list of your recent transactions.</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead> 
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientRenderedTransactions.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-xs max-w-[80px] truncate" title={t.id}>{t.id}</TableCell> 
                          <TableCell>{t.formattedDate}</TableCell>
                          <TableCell className="max-w-[150px] truncate" title={t.description}>{t.description}</TableCell>
                          <TableCell className={cn(t.type === 'debit' ? 'text-red-600' : 'text-green-600')}>
                            {t.amount.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell>
                             <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full capitalize", t.type === 'debit' ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                                {t.type}
                              </span>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button type="button" variant="ghost" size="icon" onClick={() => openEditTransactionDialog(t)} title="Edit Transaction">
                              <Edit3 className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteTransaction(t.id)} title="Delete Transaction">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                 <p className="text-sm text-muted-foreground text-center py-4">
                  {isClient ? "No transactions yet. Add one to see it here." : "Loading transactions..."}
                </p>
              )}
            </section>

            <section className="space-y-4">
                 <h3 className="text-lg font-medium flex items-center"><FileUp className="mr-2 h-5 w-5 text-primary" />Local Statement Transaction Import</h3>
                <CardDescription>Extract selectable PDF text locally. Image-only pages are processed with the bundled offline OCR engine on this device. No Genkit, generative AI, cloud OCR, or document upload is used. A successful parse replaces the saved account, balance and transaction data.</CardDescription>
                <div>
                    <Button
                        type="button"
                        onClick={() => pdfFileInputRef.current?.click()}
                        className="w-full sm:w-auto"
                        disabled={isProcessingPdf}
                    >
                        {isProcessingPdf ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <UploadCloud className="mr-2 h-4 w-4" />
                        )}
                        {isProcessingPdf ? "Parsing statement locally..." : "Import Statement Transactions"}
                    </Button>
                    <input
                        type="file"
                        accept=".pdf"
                        ref={pdfFileInputRef}
                        onChange={handlePdfUpload}
                        className="hidden"
                        disabled={isProcessingPdf}
                    />
                </div>
            </section>

            <section className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-primary" />Manage Live Agent Chat Messages</h3>
                    <Button type="button" onClick={openAddLiveAgentMessageDialog} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Message
                    </Button>
                </div>
                <CardDescription>Manage the messages that appear in the "Agent Live Chat" feature.</CardDescription>
                {clientRenderedLiveMessages.length > 0 ? (
                    <div className="overflow-x-auto rounded-md border">
                    <Table>
                    <TableCaption>Messages for Agent Live Chat.</TableCaption>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Sender</TableHead>
                            <TableHead>Content</TableHead>
                            <TableHead>Timestamp</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {clientRenderedLiveMessages.map(msg => (
                            <TableRow key={msg.id}>
                            <TableCell className="capitalize">{msg.sender}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={msg.content}>{msg.content}</TableCell>
                            <TableCell>{msg.formattedTimestamp}</TableCell>
                            <TableCell className="text-right space-x-1">
                                <Button type="button" variant="ghost" size="icon" onClick={() => openEditLiveAgentMessageDialog(msg)} title="Edit Message">
                                <Edit3 className="h-4 w-4 text-blue-600" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" onClick={() => confirmDeleteLiveAgentMessage(msg)} title="Delete Message">
                                <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                    {isClient ? "No live agent messages yet." : "Loading messages..."}
                    </p>
                )}
            </section>

          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t">
            <Button type="submit" className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" /> Save All Settings
            </Button>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => fileInputRef.current?.click()}>
                <UploadCloud className="mr-2 h-4 w-4" /> Import App Data
                </Button>
                <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleImportData}
                className="hidden"
                />
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleExportData}>
                <UploadCloud className="mr-2 h-4 w-4 rotate-180" /> Export App Data
                </Button>
            </div>
          </CardFooter>
        </Card>
      </form>

      {(isAddTransactionOpen || (isEditTransactionOpen && editingTransaction)) && (
          <AddTransactionDialog
            open={isAddTransactionOpen || isEditTransactionOpen}
            onOpenChange={isEditTransactionOpen ? setIsEditTransactionOpen : setIsAddTransactionOpen}
            onSaveTransaction={(data, id) => handleAddOrEditTransaction(data, id)}
            existingTransaction={editingTransaction}
            dialogTitle={editingTransaction ? "Edit Transaction" : "Add New Transaction"}
            payees={payees}
          />
      )}
       <AddPayeeDialog
        open={isPayeeDialogOpen}
        onOpenChange={setIsPayeeDialogOpen}
        onSavePayee={handleSavePayee}
        existingPayee={editingPayee}
        dialogTitle={editingPayee ? "Edit Payee" : "Add New Payee"}
      />
      {payeeToDelete && (
        <AlertDialog open={!!payeeToDelete} onOpenChange={() => setPayeeToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the payee "{payeeToDelete.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPayeeToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePayee} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Dialog for Adding/Editing Live Agent Messages */}
      <Dialog open={isLiveAgentMessageDialogOpen} onOpenChange={(open) => {
          setIsLiveAgentMessageDialogOpen(open);
          if (!open) setEditingLiveAgentMessage(null);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <FormDialogTitle>{editingLiveAgentMessage ? "Edit Message" : "Add New Message"}</FormDialogTitle>
            <FormDialogDescription>
              {editingLiveAgentMessage ? "Modify the details of this message." : "Enter details for the new message."}
            </FormDialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveLiveAgentMessage}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="msg-sender" className="text-right">Sender</Label>
                <Select value={currentMessageSender} onValueChange={(value: 'user' | 'agent' | 'system') => setCurrentMessageSender(value)}>
                  <SelectTrigger id="msg-sender-trigger" className="col-span-3">
                    <SelectValue placeholder="Select sender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="msg-content" className="text-right pt-2">Content</Label>
                <Textarea
                  id="msg-content"
                  value={currentMessageContent}
                  onChange={(e) => setCurrentMessageContent(e.target.value)}
                  className="col-span-3"
                  placeholder="Enter message content"
                  rows={4}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="msg-date" className="text-right">Date</Label>
                <Input
                  id="msg-date"
                  type="date"
                  value={currentMessageTimestamp}
                  onChange={(e) => setCurrentMessageTimestamp(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="msg-time" className="text-right">Time</Label>
                <Input
                  id="msg-time"
                  type="time"
                  value={currentMessageTime}
                  onChange={(e) => setCurrentMessageTime(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            <FormDialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                  setIsLiveAgentMessageDialogOpen(false);
                  setEditingLiveAgentMessage(null);
              }}>Cancel</Button>
              <Button type="submit">Save Message</Button>
            </FormDialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for Deleting Live Agent Message */}
      {liveAgentMessageToDelete && (
        <AlertDialog open={!!liveAgentMessageToDelete} onOpenChange={() => setLiveAgentMessageToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this message?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The message "{liveAgentMessageToDelete.content.substring(0, 50)}..." will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setLiveAgentMessageToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteLiveAgentMessage} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}

    