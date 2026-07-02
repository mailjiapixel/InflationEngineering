import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, isValid } from 'date-fns';

export async function generateBillPDF(bill: any, settings: any, mode: 'download' | 'print' = 'download') {
  const doc = new jsPDF();

  const brandName = settings?.brandName || "Inflation Engineering";
  const brandEmail = settings?.contact?.email || "";
  const brandPhone = settings?.contact?.phone || "";
  const brandAddress = settings?.contact?.address || "";

  // Set Colors
  const primaryColor: [number, number, number] = [0, 209, 178]; // #00D1B2 (Teal)
  const secondaryColor: [number, number, number] = [100, 100, 100];
  const accentColor: [number, number, number] = [240, 240, 240];

  // Header / Brand
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text(brandName.toUpperCase(), 14, 20);

  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFont("helvetica", "normal");
  doc.text(brandAddress, 14, 25);
  doc.text(`Email: ${brandEmail} | Phone: ${brandPhone}`, 14, 29);

  // Invoice Title
  doc.setFontSize(30);
  doc.setTextColor(230, 230, 230);
  doc.setFont("helvetica", "bold");
  doc.text("BILL INVOICE", 120, 30);

  // Horizontal Line
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.line(14, 35, 196, 35);

  // Bill To & Client Info
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", 14, 45);

  doc.setFont("helvetica", "normal");
  doc.text(bill.clientName || "Client Name", 14, 50);
  doc.text(`Address: ${bill.clientAddress || ""}`, 14, 55);
  doc.text(`Phone: ${bill.clientPhone || ""}`, 14, 60);

  // Bill Details (Right Side)
  doc.setFont("helvetica", "bold");
  doc.text("BILL NO #:", 140, 45);
  doc.setFont("helvetica", "normal");
  const invoiceId = String(bill.invoiceNo || bill._id || "").slice(-8).toUpperCase().replace(/^0+/, '');
  doc.text(invoiceId, 170, 45);

  doc.setFont("helvetica", "bold");
  doc.text("DATE:", 140, 50);
  doc.setFont("helvetica", "normal");
  const billDate = bill.date ? new Date(bill.date) : new Date();
  const formattedDate = billDate && isValid(billDate) ? format(billDate, "dd MMM yyyy") : "N/A";
  doc.text(formattedDate, 170, 50);

  doc.setFont("helvetica", "bold");
  doc.text("STATUS:", 140, 55);
  doc.setFont("helvetica", "normal");
  doc.text(bill.status || "Pending", 170, 55);

  if (bill.status === 'Due' && bill.expectedReceivableDate) {
    doc.setFont("helvetica", "bold");
    doc.text("EXPECTED:", 140, 60);
    doc.setFont("helvetica", "normal");
    const expDate = new Date(bill.expectedReceivableDate);
    const formattedExpDate = expDate && isValid(expDate) ? format(expDate, "dd MMM yyyy") : "N/A";
    doc.text(formattedExpDate, 170, 60);
  }

  // Items Table
  const items = Array.isArray(bill.items) ? bill.items : [];
  const tableRows = items.map((item: any, index: number) => [
    index + 1,
    item.name || "",
    item.quantity || 1,
    `${Math.round(item.price || 0)}`,
    `${Math.round((item.price || 0) * (item.quantity || 1))}`,
  ]);

  autoTable(doc, {
    startY: 75,
    head: [["#", "Description", "Qty", "Rate", "Amount"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 95 },
      2: { halign: "center", cellWidth: 15 },
      3: { halign: "right", cellWidth: 35 },
      4: { halign: "right", cellWidth: 35 },
    },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

  let currentY = finalY;

  doc.text("Subtotal:", 140, currentY);
  doc.text(`${Math.round(bill.subtotal || 0)}`, 190, currentY, { align: "right" });
  currentY += 6;

  if (bill.deliveryCharge > 0) {
    doc.text("Delivery Charge:", 140, currentY);
    doc.text(`${Math.round(bill.deliveryCharge)}`, 190, currentY, { align: "right" });
    currentY += 6;
  }

  if (bill.discount > 0) {
    doc.setTextColor(0, 150, 80);
    const discLabel = bill.discountType === 'percentage' ? `Discount (${bill.discountValue}%):` : 'Discount:';
    doc.text(discLabel, 140, currentY);
    doc.text(`- ${Math.round(bill.discount)}`, 190, currentY, { align: "right" });
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    currentY += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Total:", 140, currentY);
  doc.text(`${Math.round(bill.total || 0)}`, 190, currentY, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  currentY += 6;

  if (bill.prevDue > 0) {
    doc.text("Previous Due:", 140, currentY);
    doc.text(`${Math.round(bill.prevDue)}`, 190, currentY, { align: "right" });
    currentY += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Grand Total:", 140, currentY);
  doc.text(`${Math.round(bill.gTotal || 0)}`, 190, currentY, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  currentY += 6;

  doc.text("Paid Amount (Cashin):", 140, currentY);
  doc.text(`${Math.round(bill.cashIn || 0)}`, 190, currentY, { align: "right" });
  currentY += 6;

  doc.setFont("helvetica", "bold");
  if (bill.currentBillDue > 0) {
    doc.setTextColor(180, 0, 0);
  } else {
    doc.setTextColor(0, 120, 0);
  }
  doc.text("Remaining Due:", 140, currentY);
  doc.text(`${Math.round(bill.currentBillDue || 0)}`, 190, currentY, { align: "right" });

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFont("helvetica", "italic");
  doc.text(`Thank you for doing business with ${brandName}!`, 105, pageHeight - 20, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text("This is a computer generated bill and does not require a physical signature.", 105, pageHeight - 15, { align: "center" });

  // Save or Print
  if (mode === 'print') {
    doc.autoPrint();
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 10000);
      };
    }
  } else {
    doc.save(`bill-${invoiceId}.pdf`);
  }
}
