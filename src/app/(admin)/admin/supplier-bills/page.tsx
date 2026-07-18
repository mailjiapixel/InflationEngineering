'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, FileText, CalendarDays, Eye, DollarSign, MoreHorizontal, Edit, Download, Printer } from 'lucide-react';
import { generateBillPDF } from '@/lib/bill-invoice-generator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BillItemInput {
  name: string;
  quantity: number;
  price: number;
}

export default function SupplierBillsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Create Bill State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [billDate, setBillDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [billItems, setBillItems] = useState<BillItemInput[]>([
    { name: '', quantity: 1, price: 0 }
  ]);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank'>('Cash');

  // Detail View State
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);

  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetchBills();
    fetchSuppliers();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/supplier-bills');
      if (!res.ok) throw new Error('Failed to fetch bills');
      const data = await res.json();
      setBills(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/admin/suppliers');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleAddItem = () => {
    setBillItems([...billItems, { name: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (billItems.length === 1) return;
    const newItems = [...billItems];
    newItems.splice(index, 1);
    setBillItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof BillItemInput, value: any) => {
    const newItems = [...billItems];
    if (field === 'quantity') {
      newItems[index].quantity = Math.max(1, parseInt(value) || 0);
    } else if (field === 'price') {
      newItems[index].price = Math.max(0, parseFloat(value) || 0);
    } else {
      newItems[index].name = value;
    }
    setBillItems(newItems);
  };

  // Calculations
  const subtotal = billItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const total = Math.max(0, subtotal - discountValue);
  const dueAmount = Math.max(0, total - paidAmount);

  const openCreateDialog = () => {
    setSelectedSupplierId(suppliers[0]?._id || '');
    setBillDate(format(new Date(), 'yyyy-MM-dd'));
    setBillItems([{ name: '', quantity: 1, price: 0 }]);
    setDiscountValue(0);
    setPaidAmount(0);
    setPaymentMethod('Cash');
    setEditingBill(null);
    setIsCreateOpen(true);
  };

  const handleDeleteBill = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Purchase Bill?',
      text: 'Are you sure you want to delete this purchase bill record? This will adjust the supplier outstanding balance.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/admin/supplier-bills/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Supplier Bill deleted');
        fetchBills();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to delete bill');
      }
    } catch (error) {
      toast.error('Failed to delete bill');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast.error('Please select a supplier.');
      return;
    }

    const invalidItem = billItems.find(item => !item.name || item.price <= 0);
    if (invalidItem) {
      toast.error('Please complete all item names and positive prices.');
      return;
    }

    try {
      setFormLoading(true);
      const url = editingBill ? `/api/admin/supplier-bills/${editingBill._id}` : '/api/admin/supplier-bills';
      const method = editingBill ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          date: billDate,
          items: billItems,
          subtotal,
          discount: discountValue,
          total,
          paidAmount,
          paymentMethod
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save bill');
      }

      toast.success(editingBill ? 'Supplier Bill updated successfully' : 'Supplier Bill generated successfully');
      setIsCreateOpen(false);
      setEditingBill(null);
      fetchBills();
    } catch (error: any) {
      toast.error(error.message || 'Error saving bill');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredBills = bills.filter(b =>
    b.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.supplier && b.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supplier Bills & Purchases</h1>
          <p className="text-muted-foreground text-sm">Create and track raw materials or products purchased from suppliers.</p>
        </div>
        <Button onClick={openCreateDialog} disabled={suppliers.length === 0}>
          <Plus className="mr-2 h-4 w-4" /> New Purchase Bill
        </Button>
      </div>

      {suppliers.length === 0 && (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-md border border-amber-200 text-sm">
          Please add at least one Supplier/Vendor first in the <strong>Suppliers</strong> tab before creating purchase bills.
        </div>
      )}

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by bill no or supplier name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill No</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Paid Amount</TableHead>
                <TableHead className="text-right">Due Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                    Loading bills...
                  </TableCell>
                </TableRow>
              ) : filteredBills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                    No bills found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBills.map((bill) => (
                  <TableRow key={bill._id}>
                    <TableCell className="font-semibold text-foreground">{bill.billNo}</TableCell>
                    <TableCell>
                      {bill.supplier ? (
                        <div>
                          <div className="font-medium">{bill.supplier.name}</div>
                          {bill.supplier.companyName && (
                            <div className="text-xs text-muted-foreground">{bill.supplier.companyName}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Deleted Supplier</span>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(bill.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-right font-medium">৳{bill.total.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      ৳{bill.paidAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-rose-600 font-semibold">
                      ৳{bill.dueAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                        bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                        bill.status === 'Partially Paid' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {bill.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                          onClick={() => generateBillPDF(bill, settings, 'print')}
                          title="Print Purchase Bill"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedBill(bill); setIsDetailOpen(true); }}>
                              <Eye className="mr-2 h-4 w-4 text-indigo-600" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingBill(bill);
                                setSelectedSupplierId(bill.supplier?._id || bill.supplier || '');
                                setBillDate(format(new Date(bill.date), 'yyyy-MM-dd'));
                                setBillItems(bill.items);
                                setDiscountValue(bill.discount || 0);
                                setPaidAmount(bill.paidAmount || 0);
                                setPaymentMethod(bill.paymentMethod || 'Cash');
                                setIsCreateOpen(true);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Edit Bill
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'download')}>
                              <Download className="mr-2 h-4 w-4 text-blue-600" /> Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => generateBillPDF(bill, settings, 'print')}>
                              <Printer className="mr-2 h-4 w-4 text-teal-600" /> Print Bill
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteBill(bill._id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Purchase Bill Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBill ? 'Edit' : 'Create New'} Supplier Purchase Bill</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplierSelect">Supplier *</Label>
                <select
                  id="supplierSelect"
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.companyName || 'No Company'})</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="billDate">Bill Date</Label>
                <Input
                  id="billDate"
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Bill items input table */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Bill Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>

              <div className="border rounded-md p-2 space-y-2 bg-slate-50/50">
                {billItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Input
                        placeholder="Item name / description"
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        className="bg-white"
                        required
                      />
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="bg-white text-center"
                        min="1"
                        required
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        placeholder="Price"
                        value={item.price || ''}
                        onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                        className="bg-white text-right"
                        min="0"
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={billItems.length === 1}
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculation summary */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <select
                    id="paymentMethod"
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="paidAmount">Upfront Payment Amount (BDT)</Label>
                  <Input
                    id="paidAmount"
                    type="number"
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="Amount paid now"
                    className="font-medium text-emerald-600"
                  />
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 p-4 rounded-md text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">৳{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground">Discount (fixed):</span>
                  <Input
                    type="number"
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-24 text-right h-8 bg-white"
                  />
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold text-base">
                  <span>Total Bill:</span>
                  <span>৳{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>Due to Supplier:</span>
                  <span>৳{dueAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={formLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? 'Saving...' : (editingBill ? 'Update Purchase Bill' : 'Create Purchase Bill')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bill View Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Supplier Purchase Bill Details</DialogTitle>
          </DialogHeader>

          {selectedBill && (
            <div className="space-y-6 mt-4">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="font-bold text-lg">{selectedBill.billNo}</h3>
                  <p className="text-xs text-muted-foreground">
                    Date: {format(new Date(selectedBill.date), 'dd MMM yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 text-xs rounded-full font-semibold ${
                    selectedBill.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                    selectedBill.status === 'Partially Paid' ? 'bg-amber-100 text-amber-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {selectedBill.status}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase text-muted-foreground">Supplier Details</Label>
                <div className="mt-1 font-semibold text-foreground">
                  {selectedBill.supplier?.name}
                  {selectedBill.supplier?.companyName && (
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      ({selectedBill.supplier.companyName})
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">{selectedBill.supplier?.phone}</div>
              </div>

              <div>
                <Label className="text-xs uppercase text-muted-foreground">Purchased Items</Label>
                <div className="border rounded-md mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-center">Quantity</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBill.items.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">৳{item.price.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">৳{(item.quantity * item.price).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2 text-sm max-w-xs ml-auto">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>৳{selectedBill.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount:</span>
                  <span>-৳{selectedBill.discount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-base">
                  <span>Total Amount:</span>
                  <span>৳{selectedBill.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Paid Amount:</span>
                  <span>৳{selectedBill.paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold border-t pt-1">
                  <span>Remaining Due:</span>
                  <span>৳{selectedBill.dueAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
