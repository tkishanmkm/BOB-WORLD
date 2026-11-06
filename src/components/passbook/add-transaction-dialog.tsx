
"use client";

import { useState, type FormEvent, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import type { TransactionType, PayeeType } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveTransaction: (transaction: TransactionType, existingId?: string) => void;
  existingTransaction?: TransactionType | null;
  dialogTitle?: string;
  payees?: PayeeType[];
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  onSaveTransaction,
  existingTransaction = null,
  dialogTitle = "Add New Transaction",
  payees = []
}: AddTransactionDialogProps) {
  const [id, setId] = useState(''); // New state for ID
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'credit' | 'debit'>('debit');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('00:00');
  const [instrumentNumber, setInstrumentNumber] = useState('');
  const [transactionMainType, setTransactionMainType] = useState('');
  const [transactionSubType, setTransactionSubType] = useState('');
  const [comments, setComments] = useState('');
  const [selectedPayeeId, setSelectedPayeeId] = useState<string | undefined>(undefined);
  const [referenceNumber, setReferenceNumber] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (existingTransaction) {
        setId(existingTransaction.id); // Pre-fill ID for editing
        setDescription(existingTransaction.description);
        setAmount(existingTransaction.amount.toString());
        setType(existingTransaction.type);
        const txDate = new Date(existingTransaction.date);
        setDate(txDate.toISOString().split('T')[0]);
        setTime(txDate.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }));
        setInstrumentNumber(existingTransaction.instrumentNumber || '');
        setTransactionMainType(existingTransaction.transactionMainType || '');
        setTransactionSubType(existingTransaction.transactionSubType || '');
        setComments(existingTransaction.comments || '');
        setSelectedPayeeId(existingTransaction.payeeId || undefined);
        setReferenceNumber(existingTransaction.referenceNumber || '');
      } else {
        setId(crypto.randomUUID()); // Pre-fill with new UUID for adding
        setDescription('');
        setAmount('');
        setType('debit');
        const now = new Date();
        setDate(now.toISOString().split('T')[0]);
        setTime(now.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }));
        setInstrumentNumber('');
        setTransactionMainType('');
        setTransactionSubType('');
        setComments('');
        setSelectedPayeeId(undefined);
        setReferenceNumber('');
      }
    }
  }, [existingTransaction, open]);


  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !description || !amount || !date || !time) {
      toast({
        title: "Error",
        description: "Please fill all required fields (ID, Description, Amount, Date, Time).",
        variant: "destructive",
      });
      return;
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid positive amount.",
        variant: "destructive",
      });
      return;
    }

    const combinedDateTime = new Date(`${date}T${time}`);
    if (isNaN(combinedDateTime.getTime())) {
        toast({
            title: "Error",
            description: "Invalid date or time.",
            variant: "destructive",
        });
        return;
    }

    const transactionData: TransactionType = {
      id: id.trim(), // Use ID from state
      date: combinedDateTime.toISOString(),
      description,
      amount: numericAmount,
      type,
      instrumentNumber: instrumentNumber || undefined,
      transactionMainType: transactionMainType || undefined,
      transactionSubType: transactionSubType || undefined,
      comments: comments || undefined,
      payeeId: type === 'debit' ? (selectedPayeeId && selectedPayeeId !== "NO_PAYEE_SELECTED_VALUE" ? selectedPayeeId : undefined) : undefined,
      referenceNumber: referenceNumber.trim() || undefined,
    };

    onSaveTransaction(transactionData, existingTransaction?.id); // Pass existing ID for matching if editing

    onOpenChange(false);
    toast({
      title: "Success!",
      description: `Transaction ${existingTransaction ? 'updated' : 'added'} successfully.`,
    });
  };

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{existingTransaction ? "Edit Transaction" : dialogTitle}</DialogTitle>
            <DialogDescription>
              Enter the details for the transaction. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-tx-id" className="text-right">
                  ID
                </Label>
                <Input
                  id="add-tx-id"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., tx001 or UUID"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-tx-date" className="text-right">
                  Date
                </Label>
                <Input
                  id="add-tx-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-tx-time" className="text-right">
                  Time
                </Label>
                <Input
                  id="add-tx-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-tx-description" className="text-right">
                  Description
                </Label>
                <Input
                  id="add-tx-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Coffee with friends"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-tx-amount" className="text-right">
                  Amount
                </Label>
                <Input
                  id="add-tx-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., 250.00"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-tx-type" className="text-right">
                  Type
                </Label>
                <Select value={type} onValueChange={(value: 'credit' | 'debit') => setType(value)}>
                  <SelectTrigger id="add-tx-type-trigger" className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {type === 'debit' && payees.length > 0 && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="add-tx-payee" className="text-right">
                    Payee
                  </Label>
                  <Select value={selectedPayeeId} onValueChange={setSelectedPayeeId}>
                    <SelectTrigger id="add-tx-payee-trigger" className="col-span-3">
                      <SelectValue placeholder="Select payee (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Payees</SelectLabel>
                        <SelectItem value="NO_PAYEE_SELECTED_VALUE">No Payee / Other</SelectItem>
                        {payees.map((payee) => (
                          <SelectItem key={payee.id} value={payee.id}>
                            {payee.name} ({payee.nickname || payee.accountNumber.slice(-4)})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-tx-instrument-number" className="text-right">
                  Instrument No.
                </Label>
                <Input
                  id="add-tx-instrument-number"
                  value={instrumentNumber}
                  onChange={(e) => setInstrumentNumber(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., CHEQUE123 (optional)"
                />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-tx-reference-number" className="text-right">
                  Reference No.
                </Label>
                <Input
                  id="add-tx-reference-number"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., TXNREF123 (optional)"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-tx-main-type" className="text-right">
                  Transaction Type
                </Label>
                <Input
                  id="add-tx-main-type"
                  value={transactionMainType}
                  onChange={(e) => setTransactionMainType(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., T-Transfer, UPI (optional)"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="add-tx-sub-type" className="text-right">
                  Sub Type
                </Label>
                <Input
                  id="add-tx-sub-type"
                  value={transactionSubType}
                  onChange={(e) => setTransactionSubType(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Customer Induced (optional)"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="add-tx-comments" className="text-right pt-2">
                  Comments
                </Label>
                <Textarea
                  id="add-tx-comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="col-span-3"
                  placeholder="Add any comments (optional)"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save Transaction</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  );
}
