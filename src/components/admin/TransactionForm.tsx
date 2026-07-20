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
import { Loader2 } from 'lucide-react';

const transactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  amount: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number({ message: 'Amount is required' }).min(1, 'Amount must be at least 1')
  ),
  category: z.string().default('Others'),
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
      title: initialData?.title || '',
      amount: initialData?.amount !== undefined ? initialData.amount : '',
      category: initialData?.category || 'Others',
      date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      description: initialData?.description || '',
    },
  });

  const selectedType = form.watch('type');

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
        toast.success(`Transaction ${initialData ? 'updated' : 'created'} successfully`);
        if (initialData) {
          onSuccess(true);
        } else {
          form.reset({
            type: form.getValues('type'),
            title: '',
            amount: '' as any,
            category: 'Others',
            date: form.getValues('date'),
            description: '',
          });
          onSuccess(false);
          setTimeout(() => {
            titleRef.current?.focus();
          }, 50);
        }
      } else {
        toast.error('Failed to save transaction');
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleRef.current?.focus();
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      amountRef.current?.focus();
    }
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      descriptionRef.current?.focus();
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitBtnRef.current?.click();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input 
                  onKeyDown={handleDateKeyDown}
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
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Type</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex items-center gap-6 pt-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="income" id="type-income" />
                    <Label htmlFor="type-income" className="text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer select-none">
                      Income
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="expense" id="type-expense" />
                    <Label htmlFor="type-expense" className="text-rose-600 dark:text-rose-400 font-semibold cursor-pointer select-none">
                      Expense
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input 
                  onKeyDown={handleTitleKeyDown}
                  placeholder={selectedType === 'expense' ? 'e.g. Facebook Ads April' : 'e.g. Client Project Payment'} 
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
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (Tk)</FormLabel>
              <FormControl>
                <Input 
                  onKeyDown={handleAmountKeyDown}
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
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  onKeyDown={handleDescriptionKeyDown}
                  placeholder="Additional details..." 
                  {...field} 
                  ref={(e) => {
                    field.ref(e);
                    descriptionRef.current = e;
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button ref={submitBtnRef} type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Update' : 'Create'} {selectedType === 'expense' ? 'Expense' : 'Income'}
        </Button>
      </form>
    </Form>
  );
}
