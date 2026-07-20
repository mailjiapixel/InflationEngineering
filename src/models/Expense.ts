import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IExpense extends Document {
  title: string;
  amount: number;
  category: 'Ads' | 'Salary' | 'Rent' | 'Utility' | 'Sales' | 'Investment' | 'Service' | 'Others';
  type: 'expense' | 'income';
  date: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema: Schema<IExpense> = new Schema(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true, min: [0, 'Amount cannot be negative'] },
    category: {
      type: String,
      required: true,
      enum: ['Ads', 'Salary', 'Rent', 'Utility', 'Sales', 'Investment', 'Service', 'Others'],
      default: 'Others',
    },
    type: {
      type: String,
      enum: ['expense', 'income'],
      default: 'expense',
      required: true,
    },
    date: { type: Date, required: true, default: Date.now },
    description: { type: String },
  },
  { timestamps: true }
);

const Expense: Model<IExpense> = mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);

export default Expense;

