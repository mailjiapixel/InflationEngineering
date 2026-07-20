'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  Plus,
  Search,
  ArrowRightLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign,
  Wallet,
  Landmark,
  Edit2,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { Pagination } from '@/components/ui/pagination';

function AccountsLedgerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [journalSearchTerm, setJournalSearchTerm] = useState('');
  
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });

  // Editing Opening Balance state
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [newOpeningBalance, setNewOpeningBalance] = useState<number>(0);
  const [updatingOpening, setUpdatingOpening] = useState(false);

  // Manual Transaction Dialog state
  const [isTxOpen, setIsTxOpen] = useState(false);
  
  const initialTab = (searchParams.get('tab') as 'journal' | 'transfer') || 'journal';
  const [activeTab, setActiveTab] = useState<'journal' | 'transfer'>(initialTab);

  // Sync state to URL search params
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    } else {
      params.delete('page');
    }
    if (activeTab !== 'journal') {
      params.set('tab', activeTab);
    } else {
      params.delete('tab');
    }
    router.push(`/admin/ledger?${params.toString()}`);
  }, [currentPage, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    router.push(`/admin/ledger?${params.toString()}`);
  }, [journalSearchTerm, dateFilter.from, dateFilter.to]);

  const [accountCode, setAccountCode] = useState<'CASH' | 'BANK'>('CASH');
  const [fromAccountCode, setFromAccountCode] = useState<'CASH' | 'BANK'>('CASH');
  const [toAccountCode, setToAccountCode] = useState<'CASH' | 'BANK'>('BANK');
  const [journalType, setJournalType] = useState<'in' | 'out'>('out');
  const [journalAmount, setJournalAmount] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [creatingTx, setCreatingTx] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAccounts();
    fetchTransactions();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/admin/ledger/accounts');
      if (!res.ok) throw new Error('Failed to fetch accounts');
      const data = await res.json();
      setAccounts(data);
    } catch (error) {
      toast.error('Failed to load accounts');
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ledger/transactions');
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      setTransactions(data);
    } catch (error) {
      toast.error('Failed to load transaction logs');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    try {
      setUpdatingOpening(true);
      const res = await fetch('/api/admin/ledger/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editingAccount.code,
          openingBalance: newOpeningBalance,
        }),
      });

      if (!res.ok) throw new Error('Failed to update opening balance');
      toast.success(`${editingAccount.name} opening balance updated!`);
      setEditingAccount(null);
      fetchAccounts();
      fetchTransactions();
    } catch (error) {
      toast.error('Failed to update opening balance');
    } finally {
      setUpdatingOpening(false);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Title is required');
      return;
    }

    let finalEntryType: 'deposit' | 'withdrawal' | 'transfer' = 'deposit';
    let finalAmount = 0;

    if (activeTab === 'journal') {
      const amtVal = parseFloat(journalAmount) || 0;
      if (amtVal <= 0) {
        toast.error('Please enter a positive amount.');
        return;
      }

      if (journalType === 'in') {
        finalEntryType = 'deposit';
        finalAmount = amtVal;
      } else {
        finalEntryType = 'withdrawal';
        finalAmount = amtVal;
      }
    } else {
      const transVal = parseFloat(transferAmount) || 0;
      if (transVal <= 0) {
        toast.error('Please enter a positive transfer amount.');
        return;
      }
      finalEntryType = 'transfer';
      finalAmount = transVal;
    }

    try {
      setCreatingTx(true);
      const payload = {
        entryType: finalEntryType,
        amount: finalAmount,
        description,
        date,
        accountCode: finalEntryType !== 'transfer' ? accountCode : undefined,
        fromAccountCode: finalEntryType === 'transfer' ? fromAccountCode : undefined,
        toAccountCode: finalEntryType === 'transfer' ? toAccountCode : undefined,
      };

      const url = editingTx ? `/api/admin/ledger/transactions/${editingTx._id}` : '/api/admin/ledger/transactions';
      const method = editingTx ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Transaction saving failed');
      }

      toast.success(editingTx ? 'Ledger entry updated successfully!' : 'Ledger entry recorded successfully!');
      
      if (editingTx) {
        setIsTxOpen(false);
        setEditingTx(null);
        resetTxForm();
      } else {
        setJournalAmount('');
        setTransferAmount('');
        setDescription('');
        setTimeout(() => {
          titleRef.current?.focus();
        }, 50);
      }
      
      fetchAccounts();
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save transaction');
    } finally {
      setCreatingTx(false);
    }
  };

  const handleEditClick = (tx: any) => {
    setEditingTx(tx);
    const tab = tx.reference === 'manual-transfer' ? 'transfer' : 'journal';
    setActiveTab(tab);
    
    setAccountCode(tx.account?.code || 'CASH');
    setJournalType(tx.type === 'debit' ? 'in' : 'out');
    
    const cleanDesc = tx.description.replace(/^(Transfer to |Transfer from |Manual Deposit: |Manual Withdrawal: |Transfer to CASH: |Transfer to BANK: |Transfer from CASH: |Transfer from BANK: )/g, '');
    setDescription(cleanDesc);
    setDate(format(new Date(tx.date), 'yyyy-MM-dd'));

    if (tab === 'journal') {
      setJournalAmount(tx.amount.toString());
    } else {
      setTransferAmount(tx.amount.toString());
      if (tx.type === 'debit') {
        setToAccountCode(tx.account?.code || 'BANK');
        setFromAccountCode(tx.account?.code === 'CASH' ? 'BANK' : 'CASH');
      } else {
        setFromAccountCode(tx.account?.code || 'CASH');
        setToAccountCode(tx.account?.code === 'CASH' ? 'BANK' : 'CASH');
      }
    }
    setIsTxOpen(true);
  };

  const handleDeleteTx = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Ledger Entry?',
      text: 'Are you sure you want to delete this manual transaction? This will update the running balances of the ledger.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/admin/ledger/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Transaction deleted successfully');
        fetchAccounts();
        fetchTransactions();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to delete transaction');
      }
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const resetTxForm = () => {
    setActiveTab('journal');
    setAccountCode('CASH');
    setFromAccountCode('CASH');
    setToAccountCode('BANK');
    setJournalType('out');
    setJournalAmount('');
    setTransferAmount('');
    setDescription('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setEditingTx(null);
  };

  const filteredTransactions = transactions.filter((tx) => {
    const term = journalSearchTerm.toLowerCase();
    const name = tx.account?.name?.toLowerCase() || '';
    const desc = tx.description?.toLowerCase() || '';
    const ref = tx.reference?.toLowerCase() || '';
    const matchesSearch = name.includes(term) || desc.includes(term) || ref.includes(term);

    let matchesDate = true;
    if (dateFilter.from) {
      matchesDate = matchesDate && new Date(tx.date) >= new Date(dateFilter.from + 'T00:00:00');
    }
    if (dateFilter.to) {
      matchesDate = matchesDate && new Date(tx.date) <= new Date(dateFilter.to + 'T23:59:59');
    }

    return matchesSearch && matchesDate;
  });

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Accounts Ledger</h2>
          <p className="text-muted-foreground text-sm">
            Manage cash & bank opening balances, record manual entries, and track account receivables.
          </p>
        </div>
        <Button onClick={() => setIsTxOpen(true)} className="w-full md:w-auto bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> New Journal Entry
        </Button>
      </div>

      {/* Account Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {accounts.map((acc) => {
          const isCash = acc.code === 'CASH';
          const isBank = acc.code === 'BANK';

          return (
            <Card key={acc._id} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {acc.name}
                </CardTitle>
                {isCash ? (
                  <Wallet className="h-5 w-5 text-primary" />
                ) : isBank ? (
                  <Landmark className="h-5 w-5 text-primary" />
                ) : (
                  <DollarSign className="h-5 w-5 text-primary" />
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-bold tracking-tight">৳{Math.round(acc.currentBalance)}</div>
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                  <span>Opening: ৳{Math.round(acc.openingBalance || 0)}</span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setEditingAccount(acc);
                      setNewOpeningBalance(acc.openingBalance || 0);
                    }}
                    className="h-6 px-2 hover:bg-muted"
                  >
                    <Edit2 className="h-3 w-3 mr-1" /> Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Transactions Journal */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Transaction Journal</CardTitle>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search description or reference..."
                  className="pl-8"
                  value={journalSearchTerm}
                  onChange={(e) => setJournalSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md border text-sm">
                <Input
                  type="date"
                  className="h-8 w-36 border-none bg-transparent focus-visible:ring-0"
                  value={dateFilter.from}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                />
                <span className="text-muted-foreground text-xs">to</span>
                <Input
                  type="date"
                  className="h-8 w-36 border-none bg-transparent focus-visible:ring-0"
                  value={dateFilter.to}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                />
              </div>
              {(dateFilter.from || dateFilter.to || journalSearchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFilter({ from: '', to: '' });
                    setJournalSearchTerm('');
                  }}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
              <Plus className="h-10 w-10 mb-2 stroke-1" />
              <p>No journal entries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount (৳)</TableHead>
                    <TableHead className="text-right">Running Balance (৳)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((tx) => (
                    <TableRow key={tx._id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tx.date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">{tx.account?.name}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p>{tx.description}</p>
                          {tx.reference && (
                            <span className="text-xs text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
                              Ref: {tx.reference}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tx.type === 'debit' ? 'default' : 'outline'}
                          className={tx.type === 'debit' ? 'bg-primary/20 text-primary hover:bg-primary/20 border-transparent' : ''}
                        >
                          {tx.type === 'debit' ? 'Debit (+)' : 'Credit (-)'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">৳{Math.round(tx.amount)}</TableCell>
                      <TableCell className="text-right font-semibold">৳{Math.round(tx.balanceAfter)}</TableCell>
                      <TableCell className="text-right">
                        {tx.reference && ['manual-deposit', 'manual-withdrawal', 'manual-transfer'].includes(tx.reference) ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(tx)}>
                                  <Edit2 className="mr-2 h-4 w-4 text-indigo-600" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteTx(tx._id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="py-4 border-t bg-background px-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Opening Balance Dialog */}
      <Dialog open={!!editingAccount} onOpenChange={(open) => { if (!open) setEditingAccount(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Opening Balance — {editingAccount?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateOpeningBalance} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openingBal">Opening Balance (৳)</Label>
              <Input
                id="openingBal"
                type="number"
                value={newOpeningBalance}
                onChange={(e) => setNewOpeningBalance(parseFloat(e.target.value) || 0)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Note: Changing the opening balance will recalculate the entire ledger running balance.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingAccount(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updatingOpening} className="bg-primary text-primary-foreground">
                {updatingOpening && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Balance
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manual Entry Transaction Dialog */}
      <Dialog open={isTxOpen} onOpenChange={(open) => { setIsTxOpen(open); if(!open) resetTxForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTx ? 'Edit' : 'New'} Journal Entry</DialogTitle>
          </DialogHeader>

          {/* Custom Tabs */}
          {!editingTx && (
            <div className="flex border-b border-muted">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'journal'
                    ? 'border-primary text-primary font-bold animate-pulse-subtle'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('journal')}
              >
                Cash In / Out (Journal)
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'transfer'
                    ? 'border-primary text-primary font-bold animate-pulse-subtle'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('transfer')}
              >
                Account Transfer
              </button>
            </div>
          )}

          <form onSubmit={handleCreateTransaction} className="space-y-4 pt-2">
            {activeTab === 'journal' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="txDate">Transaction Date</Label>
                    <Input
                      id="txDate"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accCode">Target Account</Label>
                    <Select
                      value={accountCode}
                      onValueChange={(val: any) => setAccountCode(val)}
                    >
                      <SelectTrigger id="accCode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash Account</SelectItem>
                        <SelectItem value="BANK">Bank Account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="journalType"
                        value="in"
                        checked={journalType === 'in'}
                        onChange={() => setJournalType('in')}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                      />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                        Debit (Cash In)
                      </span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="journalType"
                        value="out"
                        checked={journalType === 'out'}
                        onChange={() => setJournalType('out')}
                        className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-gray-300"
                      />
                      <span className="text-rose-600 dark:text-rose-400 font-semibold text-sm">
                        Credit (Cash Out)
                      </span>
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="txDate">Transaction Date</Label>
                  <Input
                    id="txDate"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fromAcc">From Account</Label>
                    <Select
                      value={fromAccountCode}
                      onValueChange={(val: any) => {
                        setFromAccountCode(val);
                        if (val === toAccountCode) {
                          setToAccountCode(val === 'CASH' ? 'BANK' : 'CASH');
                        }
                      }}
                    >
                      <SelectTrigger id="fromAcc">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="BANK">Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toAcc">To Account</Label>
                    <Select
                      value={toAccountCode}
                      onValueChange={(val: any) => {
                        setToAccountCode(val);
                        if (val === fromAccountCode) {
                          setFromAccountCode(val === 'CASH' ? 'BANK' : 'CASH');
                        }
                      }}
                    >
                      <SelectTrigger id="toAcc">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="BANK">Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="txDesc">Title</Label>
              <Input
                id="txDesc"
                ref={titleRef}
                autoFocus
                placeholder={
                  activeTab === 'journal'
                    ? "e.g. Sales Income or Facebook Ads Cost"
                    : "e.g. Account Transfer"
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {activeTab === 'journal' ? (
              <div className="space-y-2">
                <Label htmlFor="journalAmt">Amount (৳)</Label>
                <Input
                  id="journalAmt"
                  type="number"
                  min="1"
                  placeholder="Enter amount"
                  value={journalAmount}
                  onChange={(e) => setJournalAmount(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="transferAmt">Transfer Amount (৳)</Label>
                <Input
                  id="transferAmt"
                  type="number"
                  min="1"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  required
                />
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsTxOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creatingTx} className="bg-primary text-primary-foreground">
                {creatingTx && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log Transaction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AccountsLedgerPage() {
  return (
    <Suspense fallback={<div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <AccountsLedgerContent />
    </Suspense>
  );
}
