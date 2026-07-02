/**
 * Sticker Invoice Generator using jsPDF
 * Generates a 100mm × 100mm PDF sticker in a new window with auto-print.
 * This is the most reliable approach — identical to how A4 invoice printing works.
 */

import jsPDF from 'jspdf';
import { format, isValid } from 'date-fns';

// ─── Code39 SVG barcode generator (returns base64 data URL usable in jsPDF) ─────
function drawBarcode(doc: jsPDF, value: string, x: number, y: number, maxWidth: number, barHeight: number): number {
  const CODE39_MAP: Record<string, string> = {
    '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
    '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
    '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
    'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
    'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
    'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
    'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
    'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
    'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
    '-': '010000101', '.': '110000100', ' ': '011000100', '*': '010010100',
  };

  const clean = value.trim().toUpperCase().replace(/[^0-9A-Z\-\.\ ]/g, '');
  const encoded = `*${clean}*`;

  // Calculate total width of all bars
  const narrow = 0.4; // mm
  const wide = 0.9;   // mm
  const gap = 0.4;    // inter-character gap

  let totalUnscaledW = 0;
  for (const char of encoded) {
    const pat = CODE39_MAP[char] || CODE39_MAP['*'];
    for (let j = 0; j < 9; j++) totalUnscaledW += pat[j] === '1' ? wide : narrow;
    totalUnscaledW += gap;
  }

  // Scale to fit maxWidth
  const scale = Math.min(1, maxWidth / totalUnscaledW);
  const unitNarrow = narrow * scale;
  const unitWide = wide * scale;
  const unitGap = gap * scale;

  let cx = x;
  doc.setFillColor(0, 0, 0);
  for (const char of encoded) {
    const pat = CODE39_MAP[char] || CODE39_MAP['*'];
    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const w = pat[j] === '1' ? unitWide : unitNarrow;
      if (isBar) doc.rect(cx, y, w, barHeight, 'F');
      cx += w;
    }
    cx += unitGap;
  }

  // Return the actual width used
  return cx - x;
}

export async function printStickerInvoice(order: any, settings: any): Promise<void> {
  // 100mm × 100mm page
  const doc = new jsPDF({ unit: 'mm', format: [100, 100], orientation: 'portrait' });

  const primaryRGB: [number, number, number] = [0, 209, 178]; // #00D1B2
  const grayRGB: [number, number, number] = [100, 100, 100];
  const blackRGB: [number, number, number] = [0, 0, 0];
  const redRGB: [number, number, number] = [220, 38, 38];

  const storeName: string = settings?.siteName || settings?.brandName || 'Inflation Engineering SHOP';
  const orderId = String(order.shortId || order._id || '').slice(-8).toUpperCase();
  const createdAt = order.createdAt ? new Date(order.createdAt) : null;
  const dateStr = createdAt && isValid(createdAt) ? format(createdAt, 'dd/MM/yyyy') : 'N/A';
  const consignmentId: string = order.shippingDetails?.consignmentId || order.shippingDetails?.trackingId || '';
  const courierName: string = order.shippingDetails?.courierName || 'Courier';
  const items: any[] = Array.isArray(order.items) ? order.items : [];

  const margin = 5; // mm from edge
  let cy = margin; // current Y cursor

  // ── Header row ─────────────────────────────────────────────────────────
  // Store name (left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.text(storeName, margin, cy + 4);

  // Date + COD badge (right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(grayRGB[0], grayRGB[1], grayRGB[2]);
  doc.text(dateStr, 100 - margin, cy + 2, { align: 'right' });

  // COD black badge
  doc.setFillColor(0, 0, 0);
  doc.roundedRect(100 - margin - 9, cy + 3.5, 9, 3.5, 0.5, 0.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text('COD', 100 - margin - 4.5, cy + 5.8, { align: 'center' });

  // Order ID (below store name)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(grayRGB[0], grayRGB[1], grayRGB[2]);
  doc.text(`Order ID: #${orderId}`, margin, cy + 9);

  cy += 11;
  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, cy, 100 - margin, cy);
  cy += 4;

  // ── Ship To ─────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(grayRGB[0], grayRGB[1], grayRGB[2]);
  doc.text('SHIP TO:', margin, cy);
  cy += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(blackRGB[0], blackRGB[1], blackRGB[2]);
  doc.text(order.shippingAddress?.fullName || 'Customer', margin, cy);
  cy += 5;

  // Phone highlight
  const phone = order.shippingAddress?.phone || '';
  doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  const phoneW = doc.getTextWidth(phone) + 4;
  doc.roundedRect(margin, cy - 3.5, phoneW, 5, 0.8, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(phone, margin + 2, cy);
  cy += 5.5;

  // Address
  const addressLine = `${order.shippingAddress?.street || ''}, ${order.shippingAddress?.city || ''}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  const splitAddr = doc.splitTextToSize(addressLine, 90 - margin * 2);
  doc.text(splitAddr, margin, cy);
  cy += splitAddr.length * 3.5 + 1;

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, cy, 100 - margin, cy);
  cy += 3;

  // ── Items ───────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(grayRGB[0], grayRGB[1], grayRGB[2]);
  doc.text(`ITEMS (${items.length}):`, margin, cy);
  cy += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(blackRGB[0], blackRGB[1], blackRGB[2]);
  for (const item of items.slice(0, 3)) {
    const label = `• ${item.name}${item.size ? ` (${item.size})` : ''}`;
    const truncated = doc.splitTextToSize(label, 70)[0];
    doc.text(truncated, margin, cy);
    doc.setFont('helvetica', 'bold');
    doc.text(`Qty: ${item.quantity}`, 100 - margin, cy, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    cy += 3.5;
  }
  if (items.length > 3) {
    doc.setFontSize(6.5);
    doc.setTextColor(grayRGB[0], grayRGB[1], grayRGB[2]);
    doc.text(`+${items.length - 3} more item(s)`, margin, cy);
    cy += 3.5;
  }

  // Amount row
  cy += 1;
  doc.setDrawColor(200, 200, 200);
  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.line(margin, cy, 100 - margin, cy);
  doc.setLineDashPattern([], 0);
  cy += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(blackRGB[0], blackRGB[1], blackRGB[2]);
  doc.text('Amount to Collect:', margin, cy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.text(`\u09f3${Math.round(order.totalAmount)}`, 100 - margin, cy, { align: 'right' });
  cy += 2;

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.setLineDashPattern([], 0);
  doc.line(margin, cy, 100 - margin, cy);
  cy += 3;

  // ── Barcode / Consignment ───────────────────────────────────────────────
  if (consignmentId) {
    // Courier info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(grayRGB[0], grayRGB[1], grayRGB[2]);
    doc.text(`Courier:`, margin, cy);
    doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.text(courierName.toUpperCase(), margin + doc.getTextWidth('Courier: '), cy);
    doc.setTextColor(grayRGB[0], grayRGB[1], grayRGB[2]);
    doc.text('Consignment ID:', 100 - margin, cy, { align: 'right' });
    cy += 3;

    // Barcode
    const barcodeH = 10;
    const barcodeW = 100 - margin * 2;
    drawBarcode(doc, consignmentId, margin, cy, barcodeW, barcodeH);
    cy += barcodeH + 1.5;

    // Consignment ID text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(blackRGB[0], blackRGB[1], blackRGB[2]);
    doc.text(consignmentId, 50, cy, { align: 'center' });
  } else {
    // No consignment warning box
    doc.setFillColor(255, 241, 242);
    doc.setDrawColor(redRGB[0], redRGB[1], redRGB[2]);
    doc.roundedRect(margin, cy, 100 - margin * 2, 8, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(redRGB[0], redRGB[1], redRGB[2]);
    doc.text('No Courier Booking / Consignment ID Missing', 50, cy + 5, { align: 'center' });
  }

  // ── Open in new window and auto-print ──────────────────────────────────
  doc.autoPrint();
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => setTimeout(() => URL.revokeObjectURL(url), 10000);
  } else {
    URL.revokeObjectURL(url);
  }
}
