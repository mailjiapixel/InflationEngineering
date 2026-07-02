import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Bill from '@/models/Bill';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // 'all', 'paid', 'due'
    
    await connectToDatabase();

    let query: any = {};
    if (filter === 'paid') {
      query.status = 'Paid';
    } else if (filter === 'due') {
      query.status = 'Due';
    }

    const bills = await Bill.find(query).sort({ createdAt: -1 });
    return NextResponse.json(bills);
  } catch (error: any) {
    console.error('Error fetching bills:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      clientName,
      clientPhone,
      clientAddress,
      items,
      subtotal,
      deliveryCharge,
      discountType,
      discountValue,
      discount,
      total,
      prevDue,
      gTotal,
      cashIn,
      currentBillDue,
      status,
      expectedReceivableDate,
    } = body;

    if (!clientName || !clientPhone || !clientAddress || !items || items.length === 0) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    // Generate unique sequential invoice number
    const lastBill = await Bill.findOne().sort({ createdAt: -1 });
    let nextNum = 101;
    if (lastBill && lastBill.invoiceNo) {
      const match = lastBill.invoiceNo.match(/\d+/);
      if (match) {
        nextNum = parseInt(match[0], 10) + 1;
      }
    }
    const invoiceNo = String(nextNum).padStart(7, '0');

    const newBill = new Bill({
      clientName,
      clientPhone,
      clientAddress,
      invoiceNo,
      items,
      subtotal,
      deliveryCharge,
      discountType,
      discountValue,
      discount,
      total,
      prevDue,
      gTotal,
      cashIn,
      currentBillDue,
      status,
      expectedReceivableDate: status === 'Due' && expectedReceivableDate ? new Date(expectedReceivableDate) : undefined,
    });

    await newBill.save();
    return NextResponse.json(newBill, { status: 201 });
  } catch (error: any) {
    console.error('Error creating bill:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
