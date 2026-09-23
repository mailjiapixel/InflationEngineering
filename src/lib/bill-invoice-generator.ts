/* eslint-disable @typescript-eslint/no-explicit-any */
import { format, isValid } from 'date-fns';
import { toast } from 'sonner';

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertBengaliStyle = (n: number): string => {
    if (n < 0) return 'Minus ' + convertBengaliStyle(Math.abs(n));
    let words = '';

    if (n >= 10000000) {
      words += convertBengaliStyle(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }

    if (n >= 100000) {
      words += convertBengaliStyle(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }

    if (n >= 1000) {
      words += convertBengaliStyle(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }

    if (n >= 100) {
      words += convertBengaliStyle(Math.floor(n / 100)) + ' Hundred ';
      n %= 100;
    }

    if (n > 0) {
      if (n < 20) {
        words += a[n];
      } else {
        words += b[Math.floor(n / 10)];
        if (n % 10 > 0) {
          words += ' ' + a[n % 10];
        }
      }
    }

    return words.trim();
  };

  return convertBengaliStyle(num).trim();
}

// Converts TipTap JSON description to safe HTML for PDF embedding
// Mirrors the renderNode logic from src/lib/server-html.ts
function renderDescriptionNode(node: any): string {
  if (!node) return '';
  if (node.type === 'text') {
    let text = (node.text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    if (node.marks) {
      node.marks.forEach((mark: any) => {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`;
        else if (mark.type === 'italic') text = `<em>${text}</em>`;
        else if (mark.type === 'underline') text = `<u>${text}</u>`;
        else if (mark.type === 'strike') text = `<s>${text}</s>`;
        else if (mark.type === 'textStyle') {
          const color = mark.attrs?.color;
          if (color) text = `<span style="color:${color}">${text}</span>`;
        } else if (mark.type === 'highlight') {
          const color = mark.attrs?.color;
          text = color ? `<mark style="background-color:${color}">${text}</mark>` : `<mark>${text}</mark>`;
        }
      });
    }
    return text;
  }
  const children = node.content ? node.content.map(renderDescriptionNode).join('') : '';
  switch (node.type) {
    case 'doc': return children;
    case 'paragraph': return `<p style="margin:2px 0">${children || '&nbsp;'}</p>`;
    case 'hardBreak': return '<br>';
    case 'heading': {
      const level = Math.max(1, Math.min(6, Number(node.attrs?.level) || 2));
      return `<h${level} style="margin:4px 0;font-weight:600">${children}</h${level}>`;
    }
    case 'bulletList': return `<ul style="margin:2px 0;padding-left:16px;list-style:disc">${children}</ul>`;
    case 'orderedList': return `<ol style="margin:2px 0;padding-left:16px;list-style:decimal">${children}</ol>`;
    case 'listItem': return `<li style="margin:1px 0">${children}</li>`;
    case 'blockquote': return `<blockquote style="border-left:3px solid #ccc;padding-left:8px;margin:4px 0">${children}</blockquote>`;
    case 'horizontalRule': return '<hr style="margin:4px 0">';
    default: return children;
  }
}

export function generateDescriptionHtml(description?: string): string {
  if (!description) return '';
  const trimmed = description.trim();
  if (trimmed.startsWith('{')) {
    try {
      let parsed = JSON.parse(trimmed);
      // Handle double-stringified JSON
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      return renderDescriptionNode(parsed);
    } catch (e) {
      // Not valid JSON, fall through
    }
  }
  // Plain text / HTML fallback — escape and wrap in paragraph
  const escaped = trimmed.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<p style="margin:2px 0">${escaped.replace(/\n/g, '<br>')}</p>`;
}


export async function generateBillPDF(bill: any, settings: any, mode: 'download' | 'print' = 'download') {
  const brandName = settings?.brandName || "Inflation Engineering";
  const brandEmail = settings?.contact?.email || "";
  const brandPhone = settings?.contact?.phone || "";
  const brandAddress = settings?.contact?.address || "";

  // Dynamic colors based on shadcn/tailwind config (HSL values usually)
  let primary = '#00D1B2';
  let primaryForeground = '#ffffff';
  let border = '#e2e8f0';
  let mutedForeground = '#64748b';
  let foreground = '#0f172a';
  let background = '#ffffff';

  if (typeof window !== 'undefined') {
    const rootStyle = getComputedStyle(document.documentElement);
    const getColor = (varName: string, fallback: string) => {
      const val = rootStyle.getPropertyValue(varName).trim();
      if (!val) return fallback;
      if (val.startsWith('#') || val.startsWith('rgb') || val.startsWith('hsl') || val.startsWith('oklch') || val.includes('(')) {
        return val;
      }
      return `hsl(${val})`;
    };
    primary = getColor('--primary', primary);
    primaryForeground = getColor('--primary-foreground', primaryForeground);
    border = getColor('--border', border);
    mutedForeground = getColor('--muted-foreground', mutedForeground);
    foreground = getColor('--foreground', foreground);
    background = getColor('--background', background);
  }

  const getAbsoluteUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return url;
  };

  const docType = bill.documentType || (bill.billNo ? 'supplier-bill' : 'bill');

  // Titles & Labels
  let title = "BILL INVOICE";
  let labelTo = "BILL TO:";
  let labelNo = "BILL NO #:";
  if (docType === 'offer') {
    title = "QUOTATION";
    labelTo = "QUOTATION TO:";
    labelNo = "QUOTATION NO #:";
  } else if (docType === 'chalan') {
    title = "DELIVERY CHALLAN";
    labelTo = "DELIVER TO:";
    labelNo = "CHALLAN NO #:";
  } else if (docType === 'supplier-bill') {
    title = "PURCHASE BILL";
    labelTo = "SUPPLIER:";
    labelNo = "BILL NO #:";
  }

  const invoiceId = String(bill.invoiceNo || bill.billNo || bill._id || "").slice(-11).toUpperCase();
  const billDate = bill.date ? new Date(bill.date) : new Date();
  const formattedDate = billDate && isValid(billDate) ? format(billDate, "dd MMM yyyy") : "N/A";

  const items = Array.isArray(bill.items) ? bill.items : [];

  let footerThankYou = `Thank you for doing business with ${brandName}!`;
  let footerGenerated = `This is a computer generated bill, no signature required.`;
  if (docType === 'offer') {
    footerThankYou = `Thank you for requesting a quotation from ${brandName}!`;
    footerGenerated = `This is a computer generated offer, no signature required.`;
  } else if (docType === 'chalan') {
    footerThankYou = `Thank you for choosing ${brandName}!`;
    footerGenerated = `This is a computer generated delivery challan, no signature required.`;
  } else if (docType === 'supplier-bill') {
    footerThankYou = `Thank you for your business!`;
    footerGenerated = `This is a computer generated purchase bill, no signature required.`;
  }

  const clientName = bill.clientName || bill.supplier?.name || "N/A";
  const clientAddress = bill.clientAddress || bill.supplier?.companyName || "";
  const clientPhone = bill.clientPhone || bill.supplier?.phone || "";

  const amountToConvert = docType === 'bill' || docType === 'supplier-bill' ? Math.round(bill.gTotal || bill.total || 0) : Math.round(bill.total || 0);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title} #${invoiceId}</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            --primary: ${primary};
            --primary-foreground: ${primaryForeground};
            --border: ${border};
            --muted-foreground: ${mutedForeground};
            --foreground: ${foreground};
            --background: ${background};
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Inter', 'Noto Sans Bengali', sans-serif;
            margin: 0;
            padding: 20px;
            color: var(--foreground);
            background-color: var(--background);
            font-size: 14px;
            line-height: 1.5;
          }
          .bill-container {
            max-width: 800px;
            margin: 0 auto;
            background: var(--background);
            padding: 20px;
            min-height: 260mm;
            display: flex;
            flex-direction: column;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid var(--border);
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .brand-logo-container {
            display: flex;
            flex-direction: column;
          }
          .brand-logo-img {
            max-height: 60px;
            max-width: 220px;
            object-fit: contain;
            margin-bottom: 5px;
          }
          .brand-logo {
            font-size: 14px;
            font-weight: 700;
            color: var(--primary);
            text-transform: uppercase;
            margin-bottom: 4px;
            letter-spacing: 0.05em;
          }
          .brand-details {
            font-size: 12px;
            color: var(--muted-foreground);
            line-height: 1.4;
          }
          .bill-title {
            font-size: 32px;
            font-weight: 800;
            color: var(--foreground);
            text-align: left;
            margin: 0 0 8px 0;
            letter-spacing: -0.025em;
            text-transform: uppercase;
          }
          .details-grid {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .bill-to, .bill-info {
            width: 48%;
          }
          .bill-to h3, .bill-info h3 {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 10px;
            color: var(--muted-foreground);
          }
          .bill-to p, .bill-info p {
            margin: 4px 0;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          .info-label {
            font-weight: 600;
            color: var(--muted-foreground);
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          th {
            background-color: var(--primary);
            color: var(--primary-foreground);
            text-align: left;
            padding: 8px 10px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-top: 1px solid #cbd5e1;
            border-bottom: 2px solid #94a3b8;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .totals-container {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 20px;
          }
          .totals-box {
            width: 320px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 13px;
          }
          .total-row.highlight {
            font-weight: 600;
            color: var(--foreground);
          }
          .total-row.grand-total {
            border-top: 2px solid var(--border);
            font-size: 15px;
            font-weight: 700;
            padding-top: 8px;
          }
          .footer {
            text-align: center;
            font-size: 11px;
            color: var(--muted-foreground);
            border-top: 1px solid var(--border);
            padding-top: 20px;
            margin-top: auto;
          }
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              padding: 0 !important;
              margin: 0 !important;
            }
            .bill-container {
              padding: 0 !important;
              max-width: 100% !important;
              width: 100% !important;
              min-height: 277mm !important;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="position: sticky; top: 0; z-index: 9999; background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin: -20px -20px 24px -20px;">
          <div style="font-weight: 600; font-size: 14px; color: #1e293b; display: flex; align-items: center; gap: 8px;">
            <span>${title} #${invoiceId}</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <button onclick="window.print()" style="cursor: pointer; background-color: ${primary}; color: ${primaryForeground}; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Print / Save PDF
            </button>
            <button onclick="window.close()" style="cursor: pointer; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-weight: 500; font-size: 13px;">
              Close
            </button>
          </div>
        </div>
        <div class="bill-container">
          <div class="header">
            <div class="brand-logo-container">
              <h1 class="bill-title">${title}</h1>
              <div class="brand-logo">${brandName}</div>
              <div class="brand-details">
                ${brandAddress ? `<div>${brandAddress}</div>` : ''}
                <div>Email: ${brandEmail} | Phone: ${brandPhone}</div>
              </div>
            </div>
          </div>

          <div class="details-grid">
            <div class="bill-to">
              <h3>${labelTo}</h3>
              <p><strong>${clientName}</strong></p>
              ${clientAddress ? `<p>Address: ${clientAddress}</p>` : ''}
              ${clientPhone ? `<p>Phone: ${clientPhone}</p>` : ''}
              ${bill.clientEmail ? `<p>Email: ${bill.clientEmail}</p>` : ''}
            </div>
            <div class="bill-info">
              <h3>Document Info</h3>
              <div class="info-row">
                <span class="info-label">${labelNo}</span>
                <span>${invoiceId}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date</span>
                <span>${formattedDate}</span>
              </div>
              ${docType === 'bill' ? `
                <div class="info-row">
                  <span class="info-label">Status</span>
                  <span>${bill.status || "Pending"}</span>
                </div>
                ${bill.status === 'Due' && bill.expectedReceivableDate ? `
                  <div class="info-row">
                    <span class="info-label">Expected Date</span>
                    <span>${format(new Date(bill.expectedReceivableDate), "dd MMM yyyy")}</span>
                  </div>
                ` : ''}
              ` : ''}
              ${docType === 'offer' && bill.expectedDeliveryDate ? `
                <div class="info-row">
                  <span class="info-label">Exp. Delivery</span>
                  <span>${format(new Date(bill.expectedDeliveryDate), "dd MMM yyyy")}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th>Title/Description</th>
                <th class="text-center" style="width: 80px;">Qty</th>
                ${docType !== 'chalan' ? `
                  <th class="text-right" style="width: 120px;">Rate</th>
                  <th class="text-right" style="width: 120px;">Amount</th>
                ` : ''}
              </tr>
            </thead>
            <tbody>
              ${items.map((item: any, index: number) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>
                    <strong>${item.name || ""}</strong>
                    ${(() => { const html = generateDescriptionHtml(item.description); return html ? `<div style="color:var(--muted-foreground);font-size:11px;margin-top:3px;line-height:1.4;">${html}</div>` : ''; })()}
                  </td>
                  <td class="text-center">${item.quantity || 1}</td>
                  ${docType !== 'chalan' ? `
                    <td class="text-right">৳${Math.round(item.price || 0)}</td>
                    <td class="text-right">৳${Math.round((item.price || 0) * (item.quantity || 1))}</td>
                  ` : ''}
                </tr>
              `).join('')}


            </tbody>
          </table>

          ${docType !== 'chalan' ? `
            <div class="totals-container">
              <div class="totals-box">
                <div class="total-row">
                  <span>Subtotal:</span>
                  <span>৳${Math.round(bill.subtotal || 0)}</span>
                </div>
                ${bill.deliveryCharge > 0 ? `
                  <div class="total-row">
                    <span>Delivery Charge:</span>
                    <span>৳${Math.round(bill.deliveryCharge)}</span>
                  </div>
                ` : ''}
                ${bill.serviceFee > 0 ? `
                  <div class="total-row">
                    <span>Service Fee:</span>
                    <span>৳${Math.round(bill.serviceFee)}</span>
                  </div>
                ` : ''}
                ${bill.discount > 0 ? `
                  <div class="total-row" style="color: var(--primary);">
                    <span>${bill.discountType === 'percentage' ? `Discount (${bill.discountValue}%):` : 'Discount:'}</span>
                    <span>- ৳${Math.round(bill.discount)}</span>
                  </div>
                ` : ''}
                <div class="total-row highlight">
                  <span>Total:</span>
                  <span>৳${Math.round(bill.total || 0)}</span>
                </div>
                
                ${docType === 'bill' ? `
                  ${bill.prevDue > 0 ? `
                    <div class="total-row">
                      <span>Previous Due:</span>
                      <span>৳${Math.round(bill.prevDue)}</span>
                    </div>
                  ` : ''}
                  <div class="total-row grand-total">
                    <span>Grand Total:</span>
                    <span>৳${Math.round(bill.gTotal || 0)}</span>
                  </div>
                  <div class="total-row">
                    <span>Paid Amount:</span>
                    <span>৳${Math.round(bill.cashIn || 0)}</span>
                  </div>
                  <div class="total-row highlight" style="${bill.currentBillDue > 0 ? 'color: #ef4444;' : 'color: var(--primary);'}">
                    <span>Remaining Due:</span>
                    <span>৳${Math.round(bill.currentBillDue || 0)}</span>
                  </div>
                ` : ''}
              </div>
            </div>
            
            <div style="margin-top: 15px; margin-bottom: 25px; font-size: 13px; border-top: 1px dashed var(--border); padding-top: 10px;">
              <div>
                <strong>Amount in Words:</strong> ${numberToWords(amountToConvert)} Taka Only ${bill.vatTaxIncluded !== undefined ? `(${bill.vatTaxIncluded ? 'VAT & Tax Included' : 'VAT & Tax Excluded'})` : ''}
              </div>
              
              ${bill.termsAndConditions ? `
                <div style="margin-top: 8px;">
                  <strong>Terms & Conditions:</strong>
                  <div style="white-space: pre-wrap; font-style: italic; color: #555; margin-top: 4px;">${bill.termsAndConditions}</div>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <div class="footer">
            <p style="margin: 5px 0; font-weight: 600;">${footerThankYou}</p>
            <p style="margin: 5px 0; font-style: italic;">${footerGenerated}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    let hasPrinted = false;
    const triggerPrint = () => {
      if (hasPrinted) return;
      hasPrinted = true;
      try {
        printWindow.focus();
        printWindow.print();
      } catch (err) {
        console.error('Print trigger error:', err);
      }
    };

    if (printWindow.document.fonts && printWindow.document.fonts.ready) {
      printWindow.document.fonts.ready.then(() => {
        setTimeout(triggerPrint, 250);
      });
    }

    printWindow.onload = () => {
      setTimeout(triggerPrint, 250);
    };

    setTimeout(triggerPrint, 1000);
  } else {
    toast.error('Pop-up was blocked. Please allow pop-ups for this website to print/view PDF.');
  }
}

