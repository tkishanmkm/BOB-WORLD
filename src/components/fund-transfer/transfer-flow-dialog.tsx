"use client";

import { persistStorageKeys, BOB_WORLD_STATE_KEYS } from '@/lib/indexed-db';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, ShieldCheck, Smartphone, FileDown, AlertCircle, IndianRupee, Loader2, CircleHelp } from 'lucide-react';
import type { AccountDetailsType, PayeeType, TransactionType } from '@/lib/types';
import {
  ACCOUNT_DETAILS_STORAGE_KEY,
  BALANCE_STORAGE_KEY,
  INITIAL_ACCOUNT_DETAILS,
  INITIAL_BALANCE,
  INITIAL_TRANSACTIONS,
  PASSBOOK_TOTAL_IN_KEY,
  PASSBOOK_TOTAL_OUT_KEY,
  PASSBOOK_CLOSING_BALANCE_KEY,
  TPIN_HASH_STORAGE_KEY,
  TRANSACTIONS_STORAGE_KEY,
  OTP_NOTIFICATION_AVATAR_KEY,
} from '@/lib/constants';
import { buildImpsNarrations, calculateImpsCharge, createImpsReference, generateLocalOtp } from '@/lib/fund-transfer';
import { verifyTpin } from '@/lib/tpin-security';
import { TransactionReceiptDialog } from '@/components/fund-transfer/transaction-receipt-dialog';

type Stage = 'amount' | 'tpin' | 'otp' | 'success';

interface TransferFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payee: PayeeType | null;
  onTransferCompleted?: (transactions: TransactionType[], newBalance: number) => void;
}

interface TransferResult {
  transaction: TransactionType;
  chargeTransaction: TransactionType;
  remitter: AccountDetailsType;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'BO';
}

function maskAccount(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits ? 'XXXX' + digits.slice(-4) : 'N/A';
}

function money(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TransferFlowDialog({
  open,
  onOpenChange,
  payee,
  onTransferCompleted,
}: TransferFlowDialogProps) {
  const [stage, setStage] = useState<Stage>('amount');
  const [amountText, setAmountText] = useState('');
  const [remarks, setRemarks] = useState('');
  const [tpin, setTpin] = useState('');
  const [otp, setOtp] = useState('');
  const [localOtp, setLocalOtp] = useState('');
  const [otpIssuedAt, setOtpIssuedAt] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpAvatarUrl, setOtpAvatarUrl] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [remitter, setRemitter] = useState<AccountDetailsType>(INITIAL_ACCOUNT_DETAILS);
  const [result, setResult] = useState<TransferResult | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const amount = Number(amountText);
  const charge = useMemo(() => calculateImpsCharge(amount), [amount]);
  const totalDebit = charge ? Math.round((amount + charge.total) * 100) / 100 : 0;

  useEffect(() => {
    if (!open) return;
    setStage('amount');
    setAmountText('');
    setRemarks('');
    setTpin('');
    setOtp('');
    setLocalOtp('');
    setOtpIssuedAt(0);
    setOtpAttempts(0);
    setError('');
    setResult(null);
    setReceiptOpen(false);
    try {
      const storedAccount = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
      const account = storedAccount ? { ...INITIAL_ACCOUNT_DETAILS, ...JSON.parse(storedAccount) } as AccountDetailsType : INITIAL_ACCOUNT_DETAILS;
      const savedBalance = localStorage.getItem(BALANCE_STORAGE_KEY);
      const storedBalance = savedBalance === null ? INITIAL_BALANCE : Number(savedBalance);
      setRemitter(account);
      setBalance(Number.isFinite(storedBalance) ? storedBalance : INITIAL_BALANCE);
      const savedOtpAvatar = localStorage.getItem(OTP_NOTIFICATION_AVATAR_KEY);
      setOtpAvatarUrl(savedOtpAvatar && savedOtpAvatar.startsWith('data:image/') ? savedOtpAvatar : null);
    } catch (loadError) {
      console.error('Could not load transfer account details:', loadError);
      setRemitter(INITIAL_ACCOUNT_DETAILS);
      setBalance(INITIAL_BALANCE);
    }
  }, [open]);

  const beginTpin = () => {
    setError('');
    if (!payee) return;
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid transfer amount.');
      return;
    }
    if (amount > 500_000) {
      setError('IMPS transfers in this flow are limited to ₹5,00,000.');
      return;
    }
    if (!charge) {
      setError('The amount does not match an available IMPS charge slab.');
      return;
    }
    if (totalDebit > balance) {
      setError('Insufficient balance. Transfer amount and IMPS charges together exceed the available balance.');
      return;
    }
    const verifier = localStorage.getItem(TPIN_HASH_STORAGE_KEY);
    if (!verifier) {
      setError('Set your four-digit transfer TPIN in Settings before making a transfer.');
      return;
    }
    setStage('tpin');
  };

  const verifyTransferTpin = async () => {
    setError('');
    setIsVerifying(true);
    try {
      const valid = await verifyTpin(tpin, localStorage.getItem(TPIN_HASH_STORAGE_KEY));
      if (!valid) {
        setError('Incorrect TPIN. Check your four-digit transfer TPIN and try again.');
        return;
      }
      const nextOtp = generateLocalOtp();
      setLocalOtp(nextOtp);
      setOtpIssuedAt(Date.now());
      setOtp('');
      setOtpAttempts(0);
      setStage('otp');
    } catch (verificationError) {
      console.error('TPIN verification failed:', verificationError);
      setError('TPIN verification is unavailable on this device.');
    } finally {
      setIsVerifying(false);
    }
  };

  const resendOtp = () => {
    setLocalOtp(generateLocalOtp());
    setOtpIssuedAt(Date.now());
    setOtp('');
    setOtpAttempts(0);
    setError('');
  };

  const completeTransfer = async () => {
    if (!payee || !charge) return;
    if (!otpIssuedAt || Date.now() - otpIssuedAt > 3 * 60 * 1000) {
      setError('This OTP has expired. Request a new OTP notification.');
      return;
    }
    if (otp !== localOtp) {
      const attempts = otpAttempts + 1;
      setOtpAttempts(attempts);
      setError(attempts >= 3 ? 'Three incorrect OTP attempts. Request a new OTP to continue.' : 'Incorrect OTP. Please check the notification and try again.');
      if (attempts >= 3) setLocalOtp('');
      return;
    }

    try {
      const storedAccount = localStorage.getItem(ACCOUNT_DETAILS_STORAGE_KEY);
      const currentAccount = storedAccount ? { ...INITIAL_ACCOUNT_DETAILS, ...JSON.parse(storedAccount) } as AccountDetailsType : remitter;
      const savedBalance = localStorage.getItem(BALANCE_STORAGE_KEY);
      const storedBalance = savedBalance === null ? INITIAL_BALANCE : Number(savedBalance);
      const currentBalance = Number.isFinite(storedBalance) ? storedBalance : balance;
      if (totalDebit > currentBalance) {
        setBalance(currentBalance);
        setError('Your available balance changed. Review the amount and charges again.');
        setStage('amount');
        return;
      }

      const now = new Date();
      const reference = createImpsReference();
      const narrations = buildImpsNarrations(reference, payee.accountNumber, remarks);
      const afterTransfer = Math.round((currentBalance - amount) * 100) / 100;
      const afterCharge = Math.round((afterTransfer - charge.total) * 100) / 100;
      const transferDate = now.toISOString();
      const chargeDate = new Date(now.getTime() + 1000).toISOString();

      const transferTransaction: TransactionType = {
        id: crypto.randomUUID(),
        date: transferDate,
        valueDate: transferDate,
        description: narrations.transfer,
        amount,
        type: 'debit',
        transactionMainType: 'T-Transfer',
        transactionSubType: 'IMPS',
        comments: remarks.trim() || 'IMPS Transfer',
        payeeId: payee.id,
        referenceNumber: reference,
        balanceAfter: afterTransfer,
      };
      const chargeTransaction: TransactionType = {
        id: crypto.randomUUID(),
        date: chargeDate,
        valueDate: chargeDate,
        description: narrations.charge,
        amount: charge.total,
        type: 'debit',
        transactionMainType: 'T-Transfer',
        transactionSubType: 'IMPS',
        comments: 'IMPS service charge inclusive of 18% GST',
        payeeId: payee.id,
        referenceNumber: reference,
        balanceAfter: afterCharge,
      };

      const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      const parsedTransactions = storedTransactions ? JSON.parse(storedTransactions) : INITIAL_TRANSACTIONS;
      const previousTransactions = Array.isArray(parsedTransactions)
        ? parsedTransactions as TransactionType[]
        : INITIAL_TRANSACTIONS;
      const nextTransactions = [chargeTransaction, transferTransaction, ...previousTransactions]
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
      const previousBalanceValue = localStorage.getItem(BALANCE_STORAGE_KEY);
      const previousTotalIn = localStorage.getItem(PASSBOOK_TOTAL_IN_KEY);
      const previousTotalOut = localStorage.getItem(PASSBOOK_TOTAL_OUT_KEY);
      const previousClosingBalance = localStorage.getItem(PASSBOOK_CLOSING_BALANCE_KEY);
      const totalIn = Math.round(nextTransactions
        .filter(tx => tx.type === 'credit')
        .reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0) * 100) / 100;
      const totalOut = Math.round(nextTransactions
        .filter(tx => tx.type === 'debit')
        .reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0) * 100) / 100;
      try {
        localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(nextTransactions));
        localStorage.setItem(BALANCE_STORAGE_KEY, String(afterCharge));
        localStorage.setItem(PASSBOOK_TOTAL_IN_KEY, String(totalIn));
        localStorage.setItem(PASSBOOK_TOTAL_OUT_KEY, String(totalOut));
        localStorage.setItem(PASSBOOK_CLOSING_BALANCE_KEY, String(afterCharge));
        await persistStorageKeys(BOB_WORLD_STATE_KEYS);
      } catch (storageError) {
        if (storedTransactions === null) localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
        else localStorage.setItem(TRANSACTIONS_STORAGE_KEY, storedTransactions);
        if (previousBalanceValue === null) localStorage.removeItem(BALANCE_STORAGE_KEY);
        else localStorage.setItem(BALANCE_STORAGE_KEY, previousBalanceValue);
        if (previousTotalIn === null) localStorage.removeItem(PASSBOOK_TOTAL_IN_KEY);
        else localStorage.setItem(PASSBOOK_TOTAL_IN_KEY, previousTotalIn);
        if (previousTotalOut === null) localStorage.removeItem(PASSBOOK_TOTAL_OUT_KEY);
        else localStorage.setItem(PASSBOOK_TOTAL_OUT_KEY, previousTotalOut);
        if (previousClosingBalance === null) localStorage.removeItem(PASSBOOK_CLOSING_BALANCE_KEY);
        else localStorage.setItem(PASSBOOK_CLOSING_BALANCE_KEY, previousClosingBalance);
        throw storageError;
      }

      setRemitter(currentAccount);
      setBalance(afterCharge);
      setResult({ transaction: transferTransaction, chargeTransaction, remitter: currentAccount });
      setStage('success');
      setError('');
      onTransferCompleted?.(nextTransactions, afterCharge);
    } catch (transferError) {
      console.error('Local IMPS transfer failed:', transferError);
      setError('The transfer could not be saved locally. No success receipt was created.');
    }
  };

  const close = (nextOpen: boolean) => {
    if (!nextOpen) {
      setReceiptOpen(false);
      setError('');
    }
    onOpenChange(nextOpen);
  };

  const shareReceipt = () => {
    if (!result || !payee) return;
    setReceiptOpen(true);
  };

  if (!payee) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="w-[94vw] max-w-[460px] max-h-[92vh] overflow-y-auto rounded-2xl">
          {stage === 'amount' && (
            <>
              <DialogHeader>
                <DialogTitle>Transfer to {payee.name}</DialogTitle>
                <DialogDescription>IMPS transfer · {maskAccount(payee.accountNumber)} · {payee.ifscCode}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                  <Avatar className="h-11 w-11">
                    {payee.photoDataUri ? <AvatarImage src={payee.photoDataUri} alt={payee.name} /> : null}
                    <AvatarFallback className="bg-primary text-primary-foreground">{initials(payee.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{payee.name}</p>
                    <p className="text-xs text-muted-foreground">{maskAccount(payee.accountNumber)} · {payee.ifscCode}</p>
                  </div>
                  <div className="ml-auto text-xs font-medium text-muted-foreground">IMPS</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imps-amount">Transfer amount</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="imps-amount" value={amountText} onChange={event => setAmountText(event.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))} inputMode="decimal" type="text" placeholder="0.00" className="pl-9 text-lg font-semibold" />
                  </div>
                  <p className="text-xs text-muted-foreground">IMPS limit in this flow: ₹1 to ₹5,00,000.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imps-remarks">Remarks</Label>
                  <Textarea id="imps-remarks" value={remarks} onChange={event => setRemarks(event.target.value)} placeholder="Add transfer remarks" rows={2} maxLength={40} />
                </div>

                <div className='rounded-xl border bg-muted/20 p-3 space-y-2 text-sm'>
  <div className='flex justify-between'><span className='text-muted-foreground'>Available balance</span><span className='font-semibold'>{'₹'}{money(balance)}</span></div>
  {charge && <div className='flex justify-between border-t pt-2 font-semibold'><span>Total debit (including applicable fee)</span><span>{'₹'}{money(totalDebit)}</span></div>}
</div>
              </div>
              {error && <p role="alert" className="text-sm text-destructive flex items-start gap-2"><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />{error}{error.includes('Settings') && <Link className="underline font-semibold" href="/settings">Open Settings</Link>}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button>
                <Button type="button" onClick={beginTpin} disabled={!charge}>Continue</Button>
              </DialogFooter>
            </>
          )}

          {stage === 'tpin' && (
            <>
              <DialogHeader>
                <DialogTitle>Enter Transfer TPIN</DialogTitle>
                <DialogDescription>Verify your four-digit TPIN to continue this IMPS transfer.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                  <div><p className='font-semibold'>{payee.name}</p><p className='text-sm text-muted-foreground'>Total debit: {'₹'}{money(totalDebit)}</p></div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-tpin">4-digit TPIN</Label>
                  <Input id="transfer-tpin" type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={tpin} onChange={event => setTpin(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" className="text-center tracking-[0.6em] text-xl" />
                </div>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setStage('amount'); setError(''); }}>Back</Button>
                <Button onClick={verifyTransferTpin} disabled={tpin.length !== 4 || isVerifying}>{isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Verify TPIN</Button>
              </DialogFooter>
            </>
          )}

          {stage === 'otp' && (
            <>
              <DialogHeader>
                <DialogTitle>OTP Verification</DialogTitle>
                <DialogDescription>Confirm the transfer to {payee.name}.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-3">
                <div className="animate-otp-notification rounded-xl border bg-background p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border">
                      {otpAvatarUrl ? <AvatarImage src={otpAvatarUrl} alt="JK-BOBSMS-S" /> : null}
                      <AvatarFallback className="bg-[#173b68] text-white font-bold">JK</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">JK-BOBSMS-S</p>
                      <p className="text-xs text-muted-foreground">BOB World transfer notification · now</p>
                    </div>
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="mt-3 rounded-lg bg-muted/50 p-3">
                    <p className="text-sm">One-time password for your IMPS transfer of <strong>₹{money(amount)}</strong> to <strong>{payee.name}</strong>.</p>
                    <p className="mt-2 text-center text-2xl font-bold tracking-[0.28em]">{localOtp}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">Local verification notification for this app only. No SMS or bank OTP is sent.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-otp">Enter 6-digit OTP</Label>
                  <Input id="transfer-otp" value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" className="text-center tracking-[0.5em] text-xl" />
                  <p className="text-xs text-muted-foreground">OTP expires after 3 minutes. {otpAttempts}/3 incorrect attempts.</p>
                </div>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter className="flex-col sm:flex-row">
                <Button variant="outline" onClick={() => { setStage('tpin'); setOtp(''); setError(''); }}>Back</Button>
                <Button variant="outline" onClick={resendOtp}>Resend OTP</Button>
                <Button onClick={completeTransfer} disabled={otp.length !== 6}>Confirm Transfer</Button>
              </DialogFooter>
            </>
          )}

          {stage === 'success' && result && (
            <>
              <div className="relative -mx-6 -mt-6 rounded-t-2xl bg-gradient-to-br from-[#ff624a] to-[#f34b32] px-6 pb-10 pt-8 text-center text-white">
                <CheckCircle2 className="mx-auto h-14 w-14 rounded-full bg-white p-1 text-emerald-500" />
                <h2 className="mt-3 text-xl font-bold">Transaction successful</h2>
                <p className="mt-1 text-sm text-white/90">The transaction and charge were recorded in this app.</p>
              </div>
              <div className="-mt-7 relative rounded-xl border bg-background px-5 pb-5 pt-5 shadow-lg">
                <div className="border-b border-dashed pb-4 text-center">
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="mt-1 text-2xl font-bold">₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="space-y-4 pt-4 text-sm">
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Paying to</span><strong className="text-right">{payee.name}</strong></div>
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">From account</span><strong>{maskAccount(remitter.accountNumber)}</strong></div>
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Transfer type</span><strong>IMPS</strong></div>
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Date</span><strong>{new Date(result.transaction.date).toLocaleDateString('en-GB')}</strong></div>
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Reference number</span><strong className="text-right">{result.transaction.referenceNumber}</strong></div>
                </div>

              </div>
              <div className="flex flex-col items-center gap-3 pt-4">
                <Button variant="ghost" onClick={shareReceipt} className="w-full text-[#1c385e] hover:bg-[#1c385e]/5">
                  <FileDown className="mr-2 h-5 w-5" />Receipt
                </Button>
                <Button onClick={() => close(false)} className="w-full rounded-full bg-[#1c385e] py-6 text-base font-semibold text-white hover:bg-[#142c4c]">Done</Button>
                <Link href="/help" className="inline-flex items-center gap-2 py-2 text-sm font-semibold text-[#1c385e]">
                  <CircleHelp className="h-4 w-4" />Need help?
                </Link>
                <p className="text-center text-[11px] text-muted-foreground">Local transaction record only. No bank network was contacted.</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {result && payee && (
        <TransactionReceiptDialog
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          transaction={result.transaction}
          payee={payee}
          remitterAccountDetails={result.remitter}
        />
      )}
    </>
  );
}
