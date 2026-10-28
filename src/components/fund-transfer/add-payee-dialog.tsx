
"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { PayeeType } from '@/lib/types';

interface AddPayeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSavePayee: (payee: Omit<PayeeType, 'id'>, id?: string) => void;
  existingPayee?: PayeeType | null;
  dialogTitle?: string;
}

export function AddPayeeDialog({ 
  open, 
  onOpenChange, 
  onSavePayee, 
  existingPayee = null,
  dialogTitle: initialDialogTitle = "Add New Payee" 
}: AddPayeeDialogProps) {
  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [nickname, setNickname] = useState('');
  const { toast } = useToast();

  const effectiveDialogTitle = existingPayee ? "Edit Payee" : initialDialogTitle;

  useEffect(() => {
    if (open) {
      if (existingPayee) {
        setName(existingPayee.name);
        setAccountNumber(existingPayee.accountNumber);
        setIfscCode(existingPayee.ifscCode);
        setNickname(existingPayee.nickname || '');
      } else {
        // Reset form for adding new payee
        setName('');
        setAccountNumber('');
        setIfscCode('');
        setNickname('');
      }
    }
  }, [open, existingPayee]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !accountNumber.trim() || !ifscCode.trim()) {
      toast({
        title: "Error",
        description: "Payee Name, Account Number, and IFSC Code are required.",
        variant: "destructive",
      });
      return;
    }
    if (accountNumber.trim().length < 9 || accountNumber.trim().length > 18) {
        toast({ title: "Error", description: "Account number must be between 9 and 18 digits.", variant: "destructive" });
        return;
    }
    if (ifscCode.trim().length !== 11) {
         toast({ title: "Error", description: "IFSC code must be 11 characters long.", variant: "destructive" });
        return;
    }

    onSavePayee({
      name: name.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      nickname: nickname.trim() || undefined,
    }, existingPayee?.id);

    toast({
      title: existingPayee ? "Payee Updated" : "Payee Added",
      description: `${name.trim()} has been successfully ${existingPayee ? 'updated' : 'added'}.`,
    });
    onOpenChange(false); 
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{effectiveDialogTitle}</DialogTitle>
          <DialogDescription>
            {existingPayee ? "Edit the details of this payee." : "Enter the details of the new payee you want to add."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payee-name" className="text-right">
                Name*
              </Label>
              <Input
                id="payee-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="Payee full name"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payee-account-number" className="text-right">
                Account No.*
              </Label>
              <Input
                id="payee-account-number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="col-span-3"
                placeholder="Payee account number"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payee-ifsc-code" className="text-right">
                IFSC Code*
              </Label>
              <Input
                id="payee-ifsc-code"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                className="col-span-3"
                placeholder="IFSC code (e.g., FINO0001101)"
                maxLength={11}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payee-nickname" className="text-right">
                Nickname
              </Label>
              <Input
                id="payee-nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="col-span-3"
                placeholder="Optional nickname"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save Payee</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
