import { format, isValid } from 'date-fns';

function generateBarcodeHtml(value: string): string {
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

  let html = `<div style="display: flex; height: 40px; justify-content: center; align-items: stretch; width: 100%; margin: 5px 0;">`;
  
  for (const char of encoded) {
    const pat = CODE39_MAP[char] || CODE39_MAP['*'];
    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const isWide = pat[j] === '1';
      const width = isWide ? '3px' : '1px';
      const color = isBar ? '#000000' : 'transparent';
      html += `<div style="width: ${width}; background-color: ${color}; flex-shrink: 0;"></div>`;
    }
    // Inter-character gap
    html += `<div style="width: 1px; background-color: transparent; flex-shrink: 0;"></div>`;
  }
  html += `</div>`;
  return html;
}

export async function printStickerInvoice(order: any, settings: any): Promise<void> {
  const storeName: string = settings?.siteName || settings?.brandName || 'Inflation Engineering';
  const orderId = String(order.shortId || order._id || '').slice(-8).toUpperCase();
  const createdAt = order.createdAt ? new Date(order.createdAt) : null;
  const dateStr = createdAt && isValid(createdAt) ? format(createdAt, 'dd/MM/yyyy') : 'N/A';
  const consignmentId: string = order.shippingDetails?.consignmentId || order.shippingDetails?.trackingId || '';
  const courierName: string = order.shippingDetails?.courierName || 'Courier';
  const items: any[] = Array.isArray(order.items) ? order.items : [];

  // Dynamic theme variables
  let primary = '#00D1B2';
  let primaryForeground = '#ffffff';
  let border = '#e2e8f0';
  let mutedForeground = '#64748b';
  let foreground = '#0f172a';
  let background = '#ffffff';
  let destructive = '#ef4444';

  if (typeof window !== 'undefined') {
    const rootStyle = getComputedStyle(document.documentElement);
    const getHsl = (varName: string, fallback: string) => {
      const val = rootStyle.getPropertyValue(varName).trim();
      if (!val) return fallback;
      if (val.startsWith('#') || val.startsWith('rgb') || val.startsWith('hsl')) return val;
      return `hsl(${val})`;
    };
    primary = getHsl('--primary', primary);
    primaryForeground = getHsl('--primary-foreground', primaryForeground);
    border = getHsl('--border', border);
    mutedForeground = getHsl('--muted-foreground', mutedForeground);
    foreground = getHsl('--foreground', foreground);
    background = getHsl('--background', background);
    destructive = getHsl('--destructive', destructive);
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Sticker #${orderId}</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            --primary: ${primary};
            --primary-foreground: ${primaryForeground};
            --border: ${border};
            --muted-foreground: ${mutedForeground};
            --foreground: ${foreground};
            --background: ${background};
            --destructive: ${destructive};
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Inter', 'Noto Sans Bengali', sans-serif;
            margin: 0;
            padding: 0;
            width: 100mm;
            height: 100mm;
            background-color: var(--background);
            color: var(--foreground);
            font-size: 11px;
            line-height: 1.3;
          }
          .sticker-container {
            width: 100mm;
            height: 100mm;
            padding: 5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .store-name {
            font-size: 14px;
            font-weight: 700;
            color: var(--primary);
          }
          .date-badge {
            text-align: right;
          }
          .date-text {
            font-size: 9px;
            color: var(--muted-foreground);
          }
          .cod-badge {
            background-color: var(--foreground);
            color: var(--background);
            font-size: 8px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 3px;
            display: inline-block;
            margin-top: 2px;
          }
          .order-id {
            font-size: 9px;
            color: var(--muted-foreground);
            margin-top: 2px;
          }
          .divider {
            border-top: 1px solid var(--border);
            margin: 6px 0;
          }
          .section-title {
            font-size: 9px;
            font-weight: 700;
            color: var(--muted-foreground);
            text-transform: uppercase;
          }
          .customer-name {
            font-size: 13px;
            font-weight: 700;
            margin: 2px 0;
          }
          .customer-phone {
            background-color: var(--primary);
            color: var(--primary-foreground);
            font-weight: 700;
            font-size: 12px;
            padding: 2px 6px;
            border-radius: 3px;
            display: inline-block;
            margin-top: 2px;
          }
          .customer-address {
            font-size: 11px;
            color: var(--foreground);
            margin-top: 4px;
          }
          .items-list {
            margin-top: 4px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin-bottom: 2px;
          }
          .item-name {
            flex-grow: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding-right: 10px;
          }
          .item-qty {
            font-weight: 700;
            flex-shrink: 0;
          }
          .amount-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            margin: 4px 0;
            border-top: 1px dashed var(--muted-foreground);
            border-bottom: 1px dashed var(--muted-foreground);
            padding: 4px 0;
          }
          .amount-value {
            font-size: 14px;
            font-weight: 700;
            color: var(--primary);
          }
          .courier-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9px;
            color: var(--muted-foreground);
            margin-bottom: 4px;
          }
          .courier-name {
            font-weight: 700;
            color: var(--primary);
            text-transform: uppercase;
          }
          .consignment-warning {
            background-color: var(--background);
            border: 1px solid var(--destructive);
            color: var(--destructive);
            border-radius: 4px;
            padding: 6px;
            text-align: center;
            font-weight: 700;
            font-size: 9px;
          }
          .barcode-container {
            margin-top: 2px;
            text-align: center;
          }
          .barcode-text {
            font-size: 9px;
            font-weight: 700;
            margin-top: 2px;
          }
          @media print {
            body {
              width: 100mm;
              height: 100mm;
            }
            .sticker-container {
              padding: 5mm;
              width: 100mm;
              height: 100mm;
            }
            @page {
              size: 100mm 100mm;
              margin: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="sticker-container">
          <div>
            <div class="header">
              <div>
                <div class="store-name">${storeName}</div>
                <div class="order-id">Order ID: #${orderId}</div>
              </div>
              <div class="date-badge">
                <div class="date-text">${dateStr}</div>
                <div class="cod-badge">COD</div>
              </div>
            </div>

            <div class="divider"></div>

            <div class="section-title">Ship To:</div>
            <div class="customer-name">${order.shippingAddress?.fullName || 'Customer'}</div>
            <div class="customer-phone">${order.shippingAddress?.phone || ''}</div>
            <div class="customer-address">
              ${order.shippingAddress?.street || ''}, ${order.shippingAddress?.city || ''}
            </div>

            <div class="divider"></div>

            <div class="section-title">Items (${items.length}):</div>
            <div class="items-list">
              ${items.slice(0, 3).map(item => `
                <div class="item-row">
                  <span class="item-name">• ${item.name}${item.size ? ` (${item.size})` : ''}</span>
                  <span class="item-qty">Qty: ${item.quantity}</span>
                </div>
              `).join('')}
              ${items.length > 3 ? `
                <div style="font-size: 9px; color: var(--muted-foreground); margin-top: 2px;">
                  +${items.length - 3} more item(s)
                </div>
              ` : ''}
            </div>
          </div>

          <div>
            <div class="amount-row">
              <span>Amount to Collect:</span>
              <span class="amount-value">৳${Math.round(order.totalAmount)}</span>
            </div>

            ${consignmentId ? `
              <div class="courier-info">
                <div>Courier: <span class="courier-name">${courierName}</span></div>
                <div>Consignment ID</div>
              </div>
              <div class="barcode-container">
                ${generateBarcodeHtml(consignmentId)}
                <div class="barcode-text">${consignmentId}</div>
              </div>
            ` : `
              <div class="consignment-warning">
                No Courier Booking / Consignment ID Missing
              </div>
            `}
          </div>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
    
    setTimeout(() => {
      if (printWindow.document.readyState === 'complete') {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }, 1000);
  }
}
