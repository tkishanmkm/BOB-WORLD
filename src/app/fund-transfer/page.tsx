
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddPayeeDialog } from '@/components/fund-transfer/add-payee-dialog';
import { PayeeDetailSheet } from '@/components/fund-transfer/payee-detail-sheet'; // New
import { ArrowLeft, UserPlus, Search } from 'lucide-react';
import type { PayeeType, TransactionType } from '@/lib/types'; // Added TransactionType
import { INITIAL_PAYEES, PAYEES_STORAGE_KEY, TRANSACTIONS_STORAGE_KEY, INITIAL_TRANSACTIONS } from '@/lib/constants'; // Added TRANSACTIONS_STORAGE_KEY
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TransferFlowDialog } from '@/components/fund-transfer/transfer-flow-dialog';
import { BOB_WORLD_STATE_KEYS, migrateLegacyStorage, persistStorageKeys } from '@/lib/indexed-db';

export default function FundTransferPage() {
  const [payees, setPayees] = useState<PayeeType[]>([]);
  const [allTransactions, setAllTransactions] = useState<TransactionType[]>([]); // New state for transactions
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddPayeeDialogOpen, setIsAddPayeeDialogOpen] = useState(false);
  const [selectedPayeeForDetail, setSelectedPayeeForDetail] = useState<PayeeType | null>(null); // New
  const [isPayeeDetailSheetOpen, setIsPayeeDetailSheetOpen] = useState(false); // New
  const [transferPayee, setTransferPayee] = useState<PayeeType | null>(null);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void migrateLegacyStorage(BOB_WORLD_STATE_KEYS).then(() => {
      if (cancelled) return;
    const storedPayeesString = localStorage.getItem(PAYEES_STORAGE_KEY);
    if (storedPayeesString) {
      try {
        setPayees(JSON.parse(storedPayeesString).sort((a: PayeeType, b: PayeeType) => a.name.localeCompare(b.name)));
      } catch (e) {
        console.error("Failed to parse payees from localStorage", e);
        setPayees(INITIAL_PAYEES.sort((a, b) => a.name.localeCompare(b.name)));
        localStorage.setItem(PAYEES_STORAGE_KEY, JSON.stringify(INITIAL_PAYEES));
      }
    } else {
      setPayees(INITIAL_PAYEES.sort((a, b) => a.name.localeCompare(b.name)));
      localStorage.setItem(PAYEES_STORAGE_KEY, JSON.stringify(INITIAL_PAYEES));
    }

    const storedTransactionsString = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (storedTransactionsString) {
      try {
        setAllTransactions(JSON.parse(storedTransactionsString));
      } catch (e) {
        console.error("Failed to parse transactions from localStorage", e);
        setAllTransactions(INITIAL_TRANSACTIONS);
      }
    } else {
      setAllTransactions(INITIAL_TRANSACTIONS);
    }
    }).catch(error => console.error('Could not restore payees and transactions from IndexedDB:', error));
    return () => { cancelled = true; };
  }, []);

  const handleSavePayee = async (newPayeeData: Omit<PayeeType, 'id'>, id?: string) => {
    if (id) {
        console.warn("Edit payee action triggered from fund transfer page, this should be for add only.");
        return;
    }
    const newPayee: PayeeType = { ...newPayeeData, id: crypto.randomUUID() };
    const updatedPayees = [newPayee, ...payees].sort((a,b) => a.name.localeCompare(b.name)); 
    setPayees(updatedPayees);
    localStorage.setItem(PAYEES_STORAGE_KEY, JSON.stringify(updatedPayees));
    await persistStorageKeys(BOB_WORLD_STATE_KEYS);
  };

  const filteredPayees = payees.filter(payee =>
    payee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (payee.nickname && payee.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
    payee.accountNumber.includes(searchTerm) ||
    payee.ifscCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handlePayeeItemClick = (payee: PayeeType) => {
    setSelectedPayeeForDetail(payee);
    setIsPayeeDetailSheetOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-primary-foreground p-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
        <Link href="/dashboard" passHref>
          <Button variant="ghost" size="icon" className="hover:bg-white/20">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Fund Transfer</h1>
        <Button variant="ghost" size="icon" className="hover:bg-white/20" onClick={() => setIsAddPayeeDialogOpen(true)}>
          <UserPlus className="h-6 w-6" />
        </Button>
      </header>

      <main className="flex-1 p-4 space-y-4 bg-muted/30 overflow-y-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search payee by name, account, IFSC, or nickname"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 text-base rounded-lg shadow-sm"
          />
        </div>

        <Card className="shadow-lg">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-lg">Saved Payees</CardTitle>
            <CardDescription>Select a payee to view details or initiate transfer.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredPayees.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-280px)] sm:h-[calc(100vh-300px)]"> 
                <ul className="divide-y divide-border">
                  {filteredPayees.map((payee) => (
                    <li 
                        key={payee.id} 
                        className="p-4 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => handlePayeeItemClick(payee)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePayeeItemClick(payee); }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10 border">
                            {payee.photoDataUri ? <AvatarImage src={payee.photoDataUri} alt={payee.name} /> : null}
                            <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">
                              {getInitials(payee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate" title={payee.name}>{payee.name}</p>
                            {payee.nickname && <p className="text-xs text-muted-foreground font-medium truncate" title={payee.nickname}>{payee.nickname}</p>}
                            <p className="text-xs text-muted-foreground">
                              A/c: {payee.accountNumber}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              IFSC: {payee.ifscCode}
                            </p>
                          </div>
                        </div>
                        {/* Pay button removed, tap on item opens details */}
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="p-6 text-center text-muted-foreground">
                No payees found. Click the <UserPlus className="inline h-4 w-4 mx-1" /> icon above to add a new payee.
              </p>
            )}
          </CardContent>
        </Card>
      </main>

      <AddPayeeDialog
        open={isAddPayeeDialogOpen}
        onOpenChange={setIsAddPayeeDialogOpen}
        onSavePayee={handleSavePayee}
        dialogTitle="Add New Payee"
      />
      <PayeeDetailSheet
        payee={selectedPayeeForDetail}
        transactions={allTransactions}
        open={isPayeeDetailSheetOpen}
        onOpenChange={setIsPayeeDetailSheetOpen}
        onTransfer={payee => {
          setSelectedPayeeForDetail(payee);
          setTransferPayee(payee);
          setIsPayeeDetailSheetOpen(false);
          setIsTransferDialogOpen(true);
        }}
      />
      <TransferFlowDialog
        open={isTransferDialogOpen}
        onOpenChange={setIsTransferDialogOpen}
        payee={transferPayee}
        onTransferCompleted={(updatedTransactions) => setAllTransactions(updatedTransactions)}
      />
    </div>
  );
}
