'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Receipt, FileText, CheckCircle2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const INCOME_CATEGORIES = [
  'Receive Client Bill',
  'Sales Income',
  'Service Revenue',
  'Investment / Capital',
  'Refund Received',
  'Others',
];

const EXPENSE_CATEGORIES = [
  'Office Rent',
  'Utility & Electricity',
  'Salary & Allowance',
  'Marketing & Ads',
  'Office Supplies & Stationery',
  'Entertainment & Refreshment',
  'Transport & Conveyance',
  'Equipment & Maintenance',
  'Software & Subscriptions',
  'Bank & Transaction Fees',
  'Others',
];

const transactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  category: z.string().min(1, 'Category is required'),
  billId: z.string().optional(),
  invoiceNo: z.string().optional(),
  accountCode: z.string().default('CASH'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  amount: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number({ message: 'Amount is required' }).min(1, 'Amount must be at least 1')
  ),
  date: z.string().min(1, 'Date is required').refine(s => !isNaN(Date.parse(s)), { message: 'Invalid date format' }),
  description: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  initialData?: any;
  onSuccess: (wasEdit: boolean) => void;
}

export function TransactionForm({ initialData, onSuccess }: TransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [dueBills, setDueBills] = useState<any[]>([]);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [loadingBills, setLoadingBills] = useState(false);
  const [dbCategories, setDbCategories] = useState<any[]>([]);

  // Refs for keyboard navigation
  const titleRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: {
      type: initialData?.type || 'expense',
      category: initialData?.category || (initialData?.type === 'income' ? 'Receive Client Bill' : 'Office Supplies & Stationery'),
      billId: initialData?.bill?._id || initialData?.bill || '',
      invoiceNo: initialData?.invoiceNo || initialData?.reference || '',
      accountCode: initialData?.accountCode || 'CASH',
      title: initialData?.title || '',
      amount: initialData?.amount !== undefined ? initialData.amount : '',
      date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      description: initialData?.description || '',
    },
  });

  const selectedType = form.watch('type');
  const selectedCategory = form.watch('category');

  // Load Accounts, Categories & Due Client Bills
  useEffect(() => {
    fetch('/api/admin/ledger/accounts')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAccounts(data);
      })
      .catch((err) => console.error('Error fetching accounts:', err));

    fetch('/api/admin/transaction-categories')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDbCategories(data);
      })
      .catch((err) => console.error('Error fetching categories:', err));

    setLoadingBills(true);
    fetch('/api/admin/bills')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Filter bills that have remaining due or are Due status
          const dueList = data.filter((b: any) => b.documentType === 'bill' && (b.status === 'Due' || (b.currentBillDue && b.currentBillDue > 0)));
          setDueBills(dueList);
        }
      })
      .catch((err) => console.error('Error fetching bills:', err))
      .finally(() => setLoadingBills(false));
  }, []);

  // When type changes, adjust default category if needed
  const handleTypeChange = (newType: 'income' | 'expense') => {
    form.setValue('type', newType);
    if (newType === 'income') {
      form.setValue('category', 'Receive Client Bill');
    } else {
      form.setValue('category', 'Office Supplies & Stationery');
      setSelectedBill(null);
      form.setValue('billId', '');
      form.setValue('invoiceNo', '');
    }
  };

  // When a due client bill is selected
  const handleSelectBill = (billId: string) => {
    const bill = dueBills.find((b: any) => b._id === billId);
    if (bill) {
      setSelectedBill(bill);
      form.setValue('billId', bill._id);
      form.setValue('invoiceNo', bill.invoiceNo);
      form.setValue('title', `Bill Payment: ${bill.invoiceNo} - ${bill.clientName}`);
      form.setValue('amount', bill.currentBillDue || (bill.gTotal - (bill.cashIn || 0)));
      form.setValue('description', `Received payment from ${bill.clientName} for Bill #${bill.invoiceNo}`);
    } else {
      setSelectedBill(null);
      form.setValue('billId', '');
      form.setValue('invoiceNo', '');
    }
  };

  const onSubmit = async (values: TransactionFormValues) => {
    setLoading(true);
    try {
      const url = initialData ? `/api/admin/expenses-incomes/${initialData._id}` : '/api/admin/expenses-incomes';
      const method = initialData ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        toast.success(`Transaction ${initialData ? 'updated' : 'recorded'} successfully`);
        if (initialData) {
          onSuccess(true);
        } else {
          form.reset({
            type: form.getValues('type'),
            category: form.getValues('type') === 'income' ? 'Receive Client Bill' : 'Office Supplies & Stationery',
            accountCode: form.getValues('accountCode') || 'CASH',
            billId: '',
            invoiceNo: '',
            title: '',
            amount: '' as any,
            date: form.getValues('date'),
            description: '',
          });
          setSelectedBill(null);
          onSuccess(false);
          setTimeout(() => {
            titleRef.current?.focus();
          }, 50);
        }
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.message || 'Failed to save transaction');
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const isClientBillIncome = selectedType === 'income' && selectedCategory === 'Receive Client Bill';
  const customCats = dbCategories.filter((c: any) => c.type === selectedType).map((c: any) => c.name);
  const defaultCats = selectedType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const categoryOptions = Array.from(new Set([...defaultCats, ...customCats]));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Date & Account */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    {...field} 
                    ref={(e) => {
                      field.ref(e);
                      dateRef.current = e;
                    }}
                    autoFocus
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deposit / Pay Account</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Account" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="CASH">Cash Account</SelectItem>
                    <SelectItem value="BANK">Bank Account</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Type Toggle */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel>Transaction Type</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={(val: any) => handleTypeChange(val)}
                  className="grid grid-cols-2 gap-3 pt-1"
                >
                  <Label
                    htmlFor="type-income"
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                      field.value === 'income'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-500 font-bold'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem value="income" id="type-income" className="sr-only" />
                    <CheckCircle2 className={`h-4 w-4 ${field.value === 'income' ? 'opacity-100' : 'opacity-0'}`} />
                    Income (+)
                  </Label>

                  <Label
                    htmlFor="type-expense"
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                      field.value === 'expense'
                        ? 'border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:border-rose-500 font-bold'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem value="expense" id="type-expense" className="sr-only" />
                    <CheckCircle2 className={`h-4 w-4 ${field.value === 'expense' ? 'opacity-100' : 'opacity-0'}`} />
                    Expense (-)
                  </Label>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categoryOptions.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Client Due Bills Dropdown (When Receive Client Bill is chosen) */}
        {isClientBillIncome && (
          <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900/50 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-emerald-600" /> Select Due Client Bill
              </span>
              <span>{dueBills.length} Bill(s) Pending</span>
            </div>

            <Select value={form.watch('billId')} onValueChange={handleSelectBill}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={loadingBills ? "Loading due bills..." : "Choose a client bill to receive payment..."} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {dueBills.length === 0 ? (
                  <div className="p-3 text-xs text-center text-muted-foreground">
                    No pending due client bills found.
                  </div>
                ) : (
                  dueBills.map((bill: any) => (
                    <SelectItem key={bill._id} value={bill._id}>
                      <div className="flex items-center justify-between w-full gap-4 text-xs">
                        <span className="font-bold">{bill.invoiceNo}</span>
                        <span className="truncate">{bill.clientName}</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          Due: ৳{Math.round(bill.currentBillDue || (bill.gTotal - (bill.cashIn || 0))).toLocaleString()}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {selectedBill && (
              <div className="flex items-center justify-between text-xs bg-background/80 p-2 rounded border text-muted-foreground">
                <span>Grand Total: <strong>৳{Math.round(selectedBill.gTotal).toLocaleString()}</strong></span>
                <span>Paid so far: <strong>৳{Math.round(selectedBill.cashIn || 0).toLocaleString()}</strong></span>
                <span className="text-emerald-700 font-bold">Remaining Due: ৳{Math.round(selectedBill.currentBillDue).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title / Payee / Client</FormLabel>
              <FormControl>
                <Input 
                  placeholder={selectedType === 'expense' ? 'e.g. Office Rent April or Facebook Ads' : 'e.g. Client Payment or Project Income'} 
                  {...field} 
                  ref={(e) => {
                    field.ref(e);
                    titleRef.current = e;
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Amount */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (Tk)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="Enter amount"
                  {...field} 
                  onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                  ref={(e) => {
                    field.ref(e);
                    amountRef.current = e;
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description / Note (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional payment details or remarks..." 
                  {...field} 
                  ref={(e) => {
                    field.ref(e);
                    descriptionRef.current = e;
                  }}
                  rows={2}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button ref={submitBtnRef} type="submit" className="w-full bg-primary text-primary-foreground font-bold" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Update Record' : `Record ${selectedType === 'expense' ? 'Expense' : 'Income'}`}
        </Button>
      </form>
    </Form>
  );
}
