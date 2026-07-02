import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Expense from '@/models/Expense';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !(['admin', 'super_admin'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid expense ID' }, { status: 400 });
    }

    const body = await req.json();
    const { title, amount, category, date, description } = body;
    
    // Sanitize update data (whitelist)
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (amount !== undefined) updateData.amount = amount;
    if (category !== undefined) updateData.category = category;
    if (date !== undefined) updateData.date = date;
    if (description !== undefined) updateData.description = description;

    await connectToDatabase();
    
    const expense = await Expense.findOneAndUpdate(
      { _id: id }, 
      updateData, 
      { new: true, runValidators: true }
    );

    if (!expense) {
      return NextResponse.json({ message: 'Expense not found' }, { status: 404 });
    }
    
    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !(['admin', 'super_admin'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid expense ID' }, { status: 400 });
    }

    await connectToDatabase();
    
    const expense = await Expense.findOneAndDelete({ _id: id });
    if (!expense) {
      return NextResponse.json({ message: 'Expense not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
