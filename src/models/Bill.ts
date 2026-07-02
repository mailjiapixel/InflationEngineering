import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IBillItem {
  name: string;
  quantity: number;
  price: number;
}

export interface IBill extends Document {
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  invoiceNo: string;
  date: Date;
  items: IBillItem[];
  subtotal: number;
  deliveryCharge: number;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  discount: number;
  total: number;
  prevDue: number;
  gTotal: number;
  cashIn: number;
  currentBillDue: number;
  status: 'Paid' | 'Due';
  expectedReceivableDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BillSchema: Schema<IBill> = new Schema(
  {
    clientName: { type: String, required: true },
    clientPhone: { type: String, required: true },
    clientAddress: { type: String, required: true },
    invoiceNo: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    subtotal: { type: Number, required: true, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    discountType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
    discountValue: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    prevDue: { type: Number, default: 0, min: 0 },
    gTotal: { type: Number, required: true, min: 0 },
    cashIn: { type: Number, default: 0, min: 0 },
    currentBillDue: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['Paid', 'Due'], default: 'Due' },
    expectedReceivableDate: { type: Date },
  },
  { timestamps: true }
);

const Bill: Model<IBill> = mongoose.models.Bill || mongoose.model<IBill>('Bill', BillSchema);

export default Bill;
