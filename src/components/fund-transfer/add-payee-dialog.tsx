
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
  const [photoDataUri, setPhotoDataUri] = useState<string | undefined>(undefined);
  const [photoError, setPhotoError] = useState('');
  const { toast } = useToast();

  const effectiveDialogTitle = existingPayee ? "Edit Payee" : initialDialogTitle;

  useEffect(() => {
    if (open) {
      if (existingPayee) {
        setName(existingPayee.name);
        setAccountNumber(existingPayee.accountNumber);
        setIfscCode(existingPayee.ifscCode);
        setNickname(existingPayee.nickname || '');
        setPhotoDataUri(existingPayee.photoDataUri);
      } else {
        // Reset form for adding new payee
        setName('');
        setAccountNumber('');
        setIfscCode('');
        setNickname('');
        setPhotoDataUri(undefined);
      }
      setPhotoError('');
    }
  }, [open, existingPayee]);

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setPhotoError('');
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setPhotoError('Choose an image smaller than 5 MB.');
      return;
    }
    try {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('The image could not be read.'));
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('The image could not be read.'));
        reader.readAsDataURL(file);
      });
      const photo = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('The selected file is not a usable image.'));
        image.src = dataUri;
      });
      const canvas = document.createElement('canvas');
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image processing is unavailable on this device.');
      const cropSize = Math.min(photo.naturalWidth, photo.naturalHeight);
      const cropX = (photo.naturalWidth - cropSize) / 2;
      const cropY = (photo.naturalHeight - cropSize) / 2;
      context.drawImage(photo, cropX, cropY, cropSize, cropSize, 0, 0, size, size);
      const compressed = canvas.toDataURL('image/jpeg', 0.78);
      canvas.width = 0;
      canvas.height = 0;
      setPhotoDataUri(compressed);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'The image could not be processed.');
    }
  };

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
    if (!/^\d{9,18}$/.test(accountNumber.trim())) {
        toast({ title: "Error", description: "Account number must contain 9 to 18 digits only.", variant: "destructive" });
        return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.trim().toUpperCase())) {
         toast({ title: "Error", description: "Enter a valid 11-character IFSC code.", variant: "destructive" });
        return;
    }

    onSavePayee({
      name: name.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      nickname: nickname.trim() || undefined,
      photoDataUri,
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
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 18))}
                inputMode="numeric"
                maxLength={18}
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payee-photo" className="text-right">Photo</Label>
              <div className="col-span-3 space-y-2">
                <Input id="payee-photo" type="file" accept="image/*" onChange={handlePhotoChange} className="text-xs" />
                {photoDataUri && (
                  <div className="flex items-center gap-3">
                    <img src={photoDataUri} alt="Payee photo preview" className="h-12 w-12 rounded-full border object-cover" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPhotoDataUri(undefined)}>Remove photo</Button>
                  </div>
                )}
                {photoError && <p role="alert" className="text-xs text-destructive">{photoError}</p>}
                <p className="text-xs text-muted-foreground">Optional. The image is resized and saved on this device.</p>
              </div>
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
