'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import OrderDetailsDialog from '@/components/admin/OrderDetailsDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  Eye,
  Package,
  Truck,
  CheckCircle,
  Trash2,
  XCircle,
  Download,
  MoreHorizontal,
  ChevronDown,
  Printer,
  FileText,
  Filter as FilterIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { generateInvoicePDF } from '@/lib/invoice-generator';
import { printStickerInvoice } from '@/lib/sticker-generator';


export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState({
    from: '',
    to: '',
  });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  const handleDownloadInvoice = async (order: any) => {
    try {
      toast.info('Generating PDF invoice...');
      await generateInvoicePDF(order, settings);
    } catch (error) {
      toast.error('Failed to generate PDF invoice');
    }
  };

  const handlePrint = async (ids: string[]) => {
    const toPrint = orders.filter(o => ids.includes(o._id));
    if (toPrint.length === 0) {
      toast.error('No orders found to print');
      return;
    }
    toast.info(`Generating ${toPrint.length > 1 ? toPrint.length + ' invoices' : 'invoice'}...`);
    for (const order of toPrint) {
      await generateInvoicePDF(order, settings, 'print');
      if (toPrint.length > 1) await new Promise(r => setTimeout(r, 600));
    }
  };

  const handlePrintStickers = async (ids: string[]) => {
    const toPrint = orders.filter(o => ids.includes(o._id));
    if (toPrint.length === 0) {
      toast.error('No orders found to print');
      return;
    }
    toast.info('Preparing sticker invoice...');
    // Open each sticker as a PDF in its own window - same pattern as invoice
    for (const order of toPrint) {
      await printStickerInvoice(order, settings);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders?all=true');
      if (!res.ok) {
        throw new Error(`Failed to load orders: ${res.status} ${res.statusText}`);
      }
            const data = await res.json();
      if (res.ok) {
        const hasFailures = data.results && data.results.some((r) => !r.success);
        if (hasFailures) {
          const firstFail = data.results.find((r) => !r.success);
          toast.error(`${data.message}. Reason: ${firstFail?.message || 'Unknown error'}`);
        } else {
          toast.success(data.message);
        }
        if (ids.length > 1) setSelectedIds([]);
        fetchOrders();
      } else {
        toast.error(data.message || 'Submission failed');
      }
    } catch (error) {
      toast.error('Error sending to Steadfast');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const result = await Swal.fire({
      title: 'Cancel Order?',
      text: "Are you sure you want to cancel this order?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Yes, cancel it!',
    });

    if (result.isConfirmed) {
      await updateStatus(orderId, 'Cancelled');
    }
  };

  const openDetails = (id: string) => {
    setSelectedOrderId(id);
    setIsDetailsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Order Placed': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-none">Placed</Badge>;
      case 'Confirmed': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-none">Confirmed</Badge>;
      case 'Paid': return <Badge variant="secondary" className="bg-green-100 text-green-800 border-none text-[10px]">Paid</Badge>;
      case 'Ready for Delivery': return <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-none text-[10px]">Ready</Badge>;
      case 'Released for Delivery': return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-none text-[10px]">Released</Badge>;
      case 'Delivered': return <Badge variant="default" className="bg-green-600 text-white border-none">Delivered</Badge>;
      case 'Cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 px-0 py-4 md:p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Order Management</h2>
          <p className="text-muted-foreground text-sm">Review, fulfillment and track shop orders.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Input
            placeholder="Search name, phone, email or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-72"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10">
                <FilterIcon className="mr-2 h-4 w-4" />
                {statusFilter === 'All' ? 'All Status' : statusFilter}
                <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[
                  'All',
                  'Order Placed',
                  'Confirmed',
                  'Paid',
                  'Ready for Delivery',
                  'Released for Delivery',
                  'Delivered',
                  'Cancelled'
                ].map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={statusFilter === status ? "bg-accent font-bold" : ""}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{status}</span>
                      <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                        {status === 'All'
                          ? orders.length
                          : orders.filter(o => o.status === status).length
                        }
                      </Badge>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md border">
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
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          {(statusFilter !== 'All' || dateFilter.from || dateFilter.to || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('All');
                setDateFilter({ from: '', to: '' });
                setSearchTerm('');
              }}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border bg-background overflow-hidden relative">
        {/* Bulk Action Toolbar */}
        {selectedIds.length > 0 && (
          <div className="sticky top-0 z-20 w-full bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-4 text-sm font-medium">
              <span>{selectedIds.length} orders selected</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-white/10"
                onClick={() => setSelectedIds([])}
              >
                Deselect All
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-white text-primary hover:bg-white/90"
                onClick={() => handlePrint(selectedIds)}
              >
                <Printer className="mr-2 h-3 w-3" /> Print Invoices
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="bg-white text-primary hover:bg-white/90"
                onClick={() => handlePrintStickers(selectedIds)}
              >
                <Printer className="mr-2 h-3 w-3" /> Print Stickers
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="bg-orange-500 text-white hover:bg-orange-600 border-none"
                onClick={() => handleSendToSteadfast(selectedIds)}
              >
                <Truck className="mr-2 h-3 w-3" /> Send to Steadfast
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-white text-primary hover:bg-white/90">
                    Update Status <ChevronDown className="ml-2 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Change Status to:</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBulkUpdate('Confirmed')}>Confirmed</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkUpdate('Paid')}>Paid</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkUpdate('Ready for Delivery')}>Ready for Delivery</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkUpdate('Released for Delivery')}>Released for Delivery</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkUpdate('Delivered')}>Delivered</DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === filteredOrders.length && filteredOrders.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Order Info</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No orders found.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order._id} className={selectedIds.includes(order._id) ? "bg-muted/50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(order._id)}
                      onCheckedChange={() => toggleSelect(order._id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        className="flex flex-col cursor-pointer text-left hover:opacity-80 transition-opacity"
                        onClick={() => openDetails(order._id)}
                      >
                        <span className="font-bold text-primary hover:underline">#{order._id.slice(-8).toUpperCase()}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">
                          {order.createdAt ? format(new Date(order.createdAt), 'MMM dd, p') : 'N/A'}
                        </span>
                      </button>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {order.items?.map((item: any, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-[9px] px-1 py-0 font-normal truncate max-w-[180px]">
                            {item.quantity}× {item.name}
                            {(item.color || item.size) && (
                              <span className="text-muted-foreground ml-1">
                                ({[item.color, item.size].filter(Boolean).join('/')})
                              </span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                      <span className="font-semibold">{order.user?.name || 'Guest User'}</span>
                      <span className="text-muted-foreground truncate max-w-[150px]">{order.user?.email || 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">৳{Math.round(order.totalAmount ?? 0)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant="outline"
                        className={order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700 border-none font-bold' : 'bg-yellow-100 text-yellow-700 border-none font-bold'}
                      >
                        {order.paymentStatus}
                      </Badge>
                      {order.paymentMethod === 'Manual' && order.manualPaymentDetails && (
                        <div className="flex flex-col text-[10px] text-muted-foreground bg-slate-50 dark:bg-zinc-900 p-1.5 rounded border border-slate-100 dark:border-zinc-800 font-mono">
                          <span className="font-bold text-primary uppercase text-[9px]">{order.manualPaymentDetails.methodName}</span>
                          {order.manualPaymentDetails.senderNumber && (
                            <span>No: {order.manualPaymentDetails.senderNumber}</span>
                          )}
                          {order.manualPaymentDetails.transactionId && (
                            <span className="truncate max-w-[120px] font-bold text-slate-800 dark:text-zinc-200" title={order.manualPaymentDetails.transactionId}>
                              TrxID: {order.manualPaymentDetails.transactionId}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {order.paymentMethod === 'Manual' && order.paymentStatus === 'Pending' && order.status !== 'Cancelled' && (
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" 
                            title="Approve Manual Payment"
                            onClick={() => {
                              Swal.fire({
                                title: 'Approve Payment?',
                                text: `Are you sure you want to approve manual payment for order #${order._id.slice(-8).toUpperCase()}? This will mark the order as Confirmed & Paid.`,
                                icon: 'question',
                                showCancelButton: true,
                                confirmButtonColor: '#00D1B2',
                                confirmButtonText: 'Yes, Approve!'
                              }).then((result) => {
                                if (result.isConfirmed) {
                                  updateStatus(order._id, 'Confirmed', { paymentStatus: 'Paid' });
                                }
                              });
                            }}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" 
                            title="Cancel Order"
                            onClick={() => handleCancelOrder(order._id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openDetails(order._id)}>
                        <Eye className="h-4 w-4" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleDownloadInvoice(order)}>
                              <FileText className="mr-2 h-4 w-4 text-primary" /> Download Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrint([order._id])}>
                              <Printer className="mr-2 h-4 w-4 text-primary" /> Print Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrintStickers([order._id])}>
                              <Printer className="mr-2 h-4 w-4 text-primary" /> Print Sticker Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendToSteadfast([order._id])} disabled={!!order.shippingDetails?.consignmentId}>
                              <Truck className="mr-2 h-4 w-4 text-orange-500" /> Send to Steadfast
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => updateStatus(order._id, 'Confirmed')}>Confirm</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(order._id, 'Paid', { paymentStatus: 'Paid' })}>Mark Paid</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(order._id, 'Ready for Delivery')}>Ready for Delivery</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(order._id, 'Released for Delivery')}>Release for Delivery</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(order._id, 'Delivered')}>Mark Delivered</DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleCancelOrder(order._id)}>Cancel Order</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive font-bold" onClick={() => deleteOrder(order._id)}>Delete Order</DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <OrderDetailsDialog
        orderId={selectedOrderId}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdate={fetchOrders}
      />


      {bulkActionLoading && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-bold">Processing bulk action...</p>
          </div>
        </div>
      )}
    </div>
  );
}

