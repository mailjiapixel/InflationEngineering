'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Edit2, Loader2, ArrowLeft, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/transaction-categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setSubmitting(true);
    try {
      const url = editingCategory
        ? `/api/admin/transaction-categories/${editingCategory._id}`
        : '/api/admin/transaction-categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), type }),
      });

      if (res.ok) {
        toast.success(`Category ${editingCategory ? 'updated' : 'created'} successfully`);
        setOpen(false);
        setEditingCategory(null);
        setName('');
        setType('expense');
        fetchCategories();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to save category');
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (cat: any) => {
    setEditingCategory(cat);
    setName(cat.name);
    setType(cat.type);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Category?',
      text: 'Are you sure you want to delete this category?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/transaction-categories/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Category deleted');
        fetchCategories();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to delete category');
      }
    } catch (err) {
      toast.error('Failed to delete category');
    }
  };

  return (
    <div className="space-y-6 px-[2px] md:px-4 max-w-5xl mx-auto">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-muted-foreground">
              <Link href="/admin/expenses-incomes">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Transaction Categories</h1>
          </div>
          <p className="text-muted-foreground text-sm pl-1">
            Manage custom income and expense categories for your accounts.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingCategory(null);
            setName('');
            setType('expense');
            setOpen(true);
          }}
          className="bg-primary text-primary-foreground font-bold w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      {/* Categories Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>All Categories ({categories.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Loading categories...
                    </div>
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No categories found. Click 'Add Category' to create one.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat._id}>
                    <TableCell className="font-semibold text-sm">
                      {cat.name}
                    </TableCell>
                    <TableCell>
                      {cat.type === 'income' ? (
                        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 font-semibold">
                          Income
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 font-semibold">
                          Expense
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(cat)} className="text-indigo-600">
                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(cat._id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit Category Dialog */}
      <Dialog
        open={open}
        onOpenChange={(val) => {
          setOpen(val);
          if (!val) {
            setEditingCategory(null);
            setName('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Category Type</Label>
              <RadioGroup
                value={type}
                onValueChange={(val: 'expense' | 'income') => setType(val)}
                className="grid grid-cols-2 gap-3"
              >
                <Label
                  htmlFor="cat-income"
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                    type === 'income'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-bold'
                      : 'border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="income" id="cat-income" className="sr-only" />
                  Income
                </Label>
                <Label
                  htmlFor="cat-expense"
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                    type === 'expense'
                      ? 'border-rose-600 bg-rose-50 text-rose-700 font-bold'
                      : 'border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="expense" id="cat-expense" className="sr-only" />
                  Expense
                </Label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="catName">Category Name</Label>
              <Input
                id="catName"
                placeholder={type === 'income' ? 'e.g. Consulting Fee or Workshop' : 'e.g. Office Supplies, Travel, etc.'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full bg-primary text-primary-foreground font-bold">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCategory ? 'Update Category' : 'Create Category'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
