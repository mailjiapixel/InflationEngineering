import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Expense from '@/models/Expense';
import Bill from '@/models/Bill';
import { logLedgerTransaction, recalculateLedgerBalance } from '@/lib/ledgerHelper';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const query: any = {};
    if (category) query.category = category;
    if (type) query.type = type;
    
    if (from || to) {
      const dateQuery: any = {};
      
      if (from) {
        const fromDate = new Date(from);
        if (isNaN(fromDate.getTime())) {
          return NextResponse.json({ message: 'Invalid "from" date format' }, { status: 400 });
        }
        dateQuery.$gte = fromDate;
      }
      
      if (to) {
        const toDate = new Date(to);
        if (isNaN(toDate.getTime())) {
          return NextResponse.json({ message: 'Invalid "to" date format' }, { status: 400 });
        }
        dateQuery.$lte = toDate;
      }
      
      query.date = dateQuery;
    }

    const expenses = await Expense.find(query).populate('bill').sort({ date: -1, createdAt: -1 });
    return NextResponse.json(expenses);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
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
      title,
      amount,
      category,
      date,
      description,
      type,
      accountCode = 'CASH',
      billId,
      invoiceNo
    } = body;

    const numAmount = Number(amount);
    if (!title || isNaN(numAmount) || numAmount <= 0 || !category || !type) {
      return NextResponse.json({ message: 'Missing or invalid required fields' }, { status: 400 });
    }

    await connectToDatabase();
    const txDate = date ? new Date(date) : new Date();

    // SPECIAL HANDLER: Receive Client Bill (Income)
    if (type === 'income' && (category === 'Receive Client Bill' || billId || invoiceNo)) {
      let bill = null;
      if (billId) {
        bill = await Bill.findById(billId);
      } else if (invoiceNo) {
        bill = await Bill.findOne({ invoiceNo });
      }

      if (bill) {
        const billInv = bill.invoiceNo;
        const prevCashIn = bill.cashIn || 0;
        const newCashIn = prevCashIn + numAmount;
        const grandTotal = Math.round(bill.gTotal || bill.total || 0);
        const newDue = Math.max(0, grandTotal - newCashIn);

        bill.cashIn = newCashIn;
        bill.currentBillDue = newDue;
        if (newDue <= 0) {
          bill.status = 'Paid';
          bill.expectedReceivableDate = undefined;
        }
        await bill.save();

        const expense = await Expense.create({
          title,
          amount: numAmount,
          category: 'Receive Client Bill',
          type: 'income',
          date: txDate,
          description: description || `Client bill payment received for ${billInv}`,
          reference: billInv,
          bill: bill._id,
          invoiceNo: billInv,
          accountCode: accountCode || 'CASH'
        });

        // Log double entry to Ledger
        try {
          // 1. Debit Cash/Bank (money entered account)
          await logLedgerTransaction(
            accountCode as any || 'CASH',
            'debit',
            numAmount,
            `Payment Received for Bill ${billInv}`,
            billInv,
            txDate
          );

          // 2. Credit Accounts Receivable (asset due decreased)
          await logLedgerTransaction(
            'AR',
            'credit',
            numAmount,
            `Payment credit for Bill ${billInv}`,
            billInv,
            txDate
          );
        } catch (err) {
          console.error('Error logging client bill payment to ledger:', err);
        }

        return NextResponse.json(expense, { status: 201 });
      }
    }

    // GENERAL HANDLER: Standard Expense or Income
    const expense = await Expense.create({
      title,
      amount: numAmount,
      category,
      type,
      date: txDate,
      description,
      accountCode: accountCode || 'CASH'
    });

    // Log to ledger
    try {
      if (type === 'expense') {
        await logLedgerTransaction(
          accountCode as any || 'CASH',
          'credit',
          numAmount,
          `Expense Paid: ${title}`,
          expense._id.toString(),
          txDate
        );
      } else {
        await logLedgerTransaction(
          accountCode as any || 'CASH',
          'debit',
          numAmount,
          `Income Received: ${title}`,
          expense._id.toString(),
          txDate
        );
      }
    } catch (err) {
      console.error('Error logging transaction to ledger:', err);
    }

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
