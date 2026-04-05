import { calculateItemTotal, calculateDocumentTotals } from './calculations';

// ============================================================================
// PDF GENERATION
// ============================================================================

const resizeLogoForPdf = (src, maxW = 160, maxH = 70) =>
  new Promise((resolve) => {
    if (!src) { resolve(''); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > maxW) { h = h * (maxW / w); w = maxW; }
      if (h > maxH) { w = w * (maxH / h); h = maxH; }
      const c = document.createElement('canvas');
      c.width = Math.round(w);
      c.height = Math.round(h);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => resolve('');
    img.src = src;
  });

export const generatePDF = async (type, doc, client, settings) => {
  const isInvoice = type === 'invoice';
  const taxRate = settings?.taxRate || 15;
  const taxLabel = settings?.taxLabel || 'VAT';
  const documentLabel = isInvoice ? 'Invoice' : 'Estimate';
  const title = isInvoice ? 'INVOICE' : 'ESTIMATE';
  const escapeHtml = (value = '') =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const toHtmlLines = (value = '') => escapeHtml(value).replace(/\n/g, '<br>');

  const fmtMoney = (value) => {
    const num = Number(value || 0);
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const formatPdfClientAddress = (pdfClient) => {
    if (!pdfClient) return '';
    const lines = [];
    if (pdfClient.addressLine1) lines.push(pdfClient.addressLine1);
    if (pdfClient.addressLine2) lines.push(pdfClient.addressLine2);
    if (pdfClient.city || pdfClient.postalCode) {
      lines.push([pdfClient.city, pdfClient.postalCode].filter(Boolean).join(', '));
    }
    if (lines.length > 0) return lines.join('<br>');
    if (pdfClient.address) return String(pdfClient.address).replace(/\n/g, '<br>');
    return '';
  };

  // --- Resize logo for html2canvas ---
  const logoDataUrl = await resizeLogoForPdf(settings?.logo, 280, 120);

  // --- Calculations ---
  const {
    subtotal, itemDiscount, overallDiscountAmount,
    totalTax, total, amountPaid, balanceDue, taxEnabled,
  } = calculateDocumentTotals(doc, taxRate);

  // --- Notes: use doc notes, fallback to default notes from settings ---
  const docNotes = String(doc.notes || '').trim();
  const defaultNotes = isInvoice
    ? String(settings?.defaultInvoiceNotes || '').trim()
    : String(settings?.defaultEstimateNotes || '').trim();
  const finalNotes = docNotes || defaultNotes;

  // --- Design tokens ---
  const P = {
    dark: '#111827', text: '#1f2937', textMd: '#4b5563', textLt: '#6b7280',
    red: '#991b1b', redLt: '#fef2f2', redBorder: '#e8c4c4',
    border: '#e5e7eb', borderLt: '#f0f1f4', bgPage: '#f3f4f6',
    bgCard: '#ffffff', bgSoft: '#fafafa',
    bg: '#ffffff', fontStack: "Aptos, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  };
  const num = `text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;`;
  const cardStyle = `background:${P.bgCard};border:1px solid ${P.border};border-radius:12px;padding:16px 20px;`;
  const secLabel = `font-size:9.5px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${P.red};margin-bottom:10px;`;

  // --- Addresses ---
  const bizAddr = String(settings?.address || '').trim();
  const clientAddr = formatPdfClientAddress(client);

  // --- Banking fields (Invoice only) ---
  const bankFields = [
    { label: 'Bank Name', value: settings?.bankName },
    { label: 'Account Number', value: settings?.accountNumber },
    { label: 'Account Type', value: settings?.accountType },
    { label: 'Branch Code', value: settings?.branchCode },
    { label: 'Account Holder', value: settings?.businessName },
  ].filter(f => String(f.value || '').trim());

  const hasBank = isInvoice && bankFields.length > 0;
  const hasNotes = finalNotes.length > 0;
  const hasDiscount = (doc.items || []).some(item => item.discountAmount > 0);

  // --- Item rows ---
  const itemRows = (doc.items || [])
    .map((item, idx) => {
      const calc = calculateItemTotal(item, taxRate, { applyTax: taxEnabled });
      const bg = idx % 2 === 1 ? P.bgSoft : P.bgCard;
      const cellBase = `padding:10px 16px;font-size:12px;vertical-align:top;background:${bg};border-bottom:1px solid ${P.borderLt};`;
      const discVal = item.discountAmount > 0
        ? (item.discountType === 'percentage'
          ? fmtMoney(item.rate * item.qty * item.discountAmount / 100)
          : fmtMoney(item.discountAmount))
        : '';
      const meta = String(item.notes || '').trim();
      return `<tr>
        <td style="${cellBase}">
          <div style="font-weight:600;color:${P.dark};line-height:1.35;">${escapeHtml(item.description || '')}</div>
          ${meta ? `<div style="font-size:10.5px;line-height:1.4;color:${P.textLt};margin-top:2px;">${toHtmlLines(meta)}</div>` : ''}
        </td>
        <td style="${cellBase}text-align:center;">${escapeHtml(String(item.qty || 0))}</td>
        <td style="${cellBase}${num}">${escapeHtml(fmtMoney(item.rate || 0))}</td>
        ${hasDiscount ? `<td style="${cellBase}${num}">${discVal ? `-${escapeHtml(discVal)}` : ''}</td>` : ''}
        <td style="${cellBase}${num}font-weight:700;">${escapeHtml(fmtMoney(calc.total))}</td>
      </tr>`;
    }).join('');

  // --- Summary row helper ---
  const sumLine = (label, value, bold) => `<tr>
    <td style="padding:7px 0;font-size:12px;color:${P.textMd};border-bottom:1px solid ${P.borderLt};">${label}</td>
    <td style="padding:7px 0;font-size:12px;font-weight:${bold ? '800' : '600'};color:${P.dark};${num}border-bottom:1px solid ${P.borderLt};">${value}</td>
  </tr>`;

  // --- Column widths ---
  const descW = hasDiscount ? '36%' : '46%';
  const qtyW = '10%';
  const rateW = '18%';
  const discW = '16%';
  const amtW = hasDiscount ? '20%' : '26%';
  const thBase = `padding:10px 16px;background:#f3f4f6;border-bottom:2px solid ${P.border};font-size:9.5px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${P.textLt};`;

  // --- Build full HTML (100% inline styles for html2canvas) ---
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>${escapeHtml(title)} ${escapeHtml(doc.number || '')}</title></head>
<body style="margin:0;padding:0;font-family:${P.fontStack};font-size:12px;line-height:1.5;color:${P.text};background:${P.bgPage};-webkit-print-color-adjust:exact;print-color-adjust:exact;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
<div style="width:100%;max-width:760px;margin:0 auto;background:${P.bgPage};padding:0;">

  <!-- ===== TOP ACCENT BAR ===== -->
  <div style="height:5px;background:linear-gradient(90deg,${P.dark} 0%,#7f1d1d 50%,#dc2626 100%);border-radius:12px 12px 0 0;"></div>

  <!-- ===== HEADER CARD ===== -->
  <div style="background:${P.bgCard};padding:28px 32px 24px;margin-bottom:4px;page-break-inside:avoid;border-radius:0 0 12px 12px;">
    <table style="width:100%;border-collapse:collapse;"><tr>
      <td style="vertical-align:top;">
        <div style="display:inline-block;padding:5px 16px;border-radius:999px;border:1px solid ${P.redBorder};background:${P.redLt};color:${P.red};font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;line-height:18px;text-align:center;margin-bottom:10px;">${escapeHtml(title)}</div>
        <div style="font-size:26px;font-weight:900;color:${P.dark};letter-spacing:-0.5px;line-height:1.1;margin-bottom:8px;">${escapeHtml(settings?.businessName || '')}</div>
        <div style="font-size:11px;line-height:1.7;color:${P.textMd};">
          ${settings?.businessNumber ? `Reg No: ${escapeHtml(settings.businessNumber)}<br>` : ''}
          ${bizAddr ? `${toHtmlLines(bizAddr)}<br>` : ''}
          ${settings?.phone ? `Phone: ${escapeHtml(settings.phone)}<br>` : ''}
          ${settings?.email ? `Email: ${escapeHtml(settings.email)}` : ''}
        </div>
      </td>
      <td style="width:220px;text-align:right;vertical-align:top;">
        ${logoDataUrl ? `<div style="display:inline-block;padding:10px;border:1px solid ${P.border};border-radius:16px;background:${P.bgCard};overflow:hidden;"><img src="${logoDataUrl}" alt="Logo" style="display:block;border-radius:12px;max-width:200px;max-height:110px;"/></div>` : ''}
      </td>
    </tr></table>
  </div>

  <!-- ===== INFO CARDS ROW ===== -->
  <div style="padding:0 16px;page-break-inside:avoid;">
    <table style="width:100%;border-collapse:separate;border-spacing:8px;"><tr>
      <!-- Invoice/Estimate Details Card -->
      <td style="width:50%;vertical-align:top;${cardStyle}">
        <div style="${secLabel}">${isInvoice ? 'Invoice Details' : 'Estimate Details'}</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${P.textLt};width:42%;">${isInvoice ? 'Invoice No' : 'Estimate No'}</td>
            <td style="padding:6px 0;font-size:12px;font-weight:700;color:${P.dark};text-align:right;">${escapeHtml(doc.number || '')}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${P.textLt};border-top:1px solid ${P.borderLt};">Date</td>
            <td style="padding:6px 0;font-size:12px;font-weight:700;color:${P.dark};text-align:right;border-top:1px solid ${P.borderLt};">${escapeHtml(doc.date || '')}</td>
          </tr>
          ${isInvoice ? `<tr>
            <td style="padding:6px 0;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${P.textLt};border-top:1px solid ${P.borderLt};">Due Date</td>
            <td style="padding:6px 0;font-size:12px;font-weight:700;color:${P.dark};text-align:right;border-top:1px solid ${P.borderLt};">${escapeHtml(doc.dueDate || '')}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:6px 0;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${P.textLt};border-top:1px solid ${P.borderLt};">Status</td>
            <td style="padding:6px 0;font-size:12px;font-weight:700;color:${P.dark};text-align:right;border-top:1px solid ${P.borderLt};">${escapeHtml(doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : '')}</td>
          </tr>
        </table>
      </td>
      <!-- Bill To Card -->
      <td style="width:50%;vertical-align:top;${cardStyle}">
        <div style="${secLabel}">Bill To</div>
        <div style="font-size:14px;font-weight:800;color:${P.dark};margin-bottom:6px;">${escapeHtml(client?.name || 'Client')}</div>
        <div style="font-size:11px;line-height:1.7;color:${P.textMd};">
          ${clientAddr ? `${clientAddr}<br>` : ''}
          ${client?.vatNumber ? `VAT NR: ${escapeHtml(client.vatNumber)}<br>` : ''}
          ${client?.email ? `${escapeHtml(client.email)}<br>` : ''}
          ${client?.phone ? escapeHtml(client.phone) : ''}
        </div>
      </td>
    </tr></table>
  </div>

  <!-- ===== LINE ITEMS TABLE CARD ===== -->
  <div style="padding:0 16px;page-break-inside:avoid;">
    <div style="margin-top:10px;${cardStyle}padding:0;overflow:hidden;">
      <div style="padding:14px 20px 10px;">
        <div style="font-size:14px;font-weight:800;color:${P.dark};">Line Items</div>
        <div style="font-size:10px;color:${P.textLt};margin-top:1px;">${(doc.items || []).length} item${(doc.items || []).length === 1 ? '' : 's'}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr>
          <th style="${thBase}width:${descW};text-align:left;">Description</th>
          <th style="${thBase}width:${qtyW};text-align:center;">Qty</th>
          <th style="${thBase}width:${rateW};${num}">Rate</th>
          ${hasDiscount ? `<th style="${thBase}width:${discW};${num}">Discount</th>` : ''}
          <th style="${thBase}width:${amtW};${num}">Amount</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>
  </div>

  <!-- ===== SUMMARY CARD (right-aligned) ===== -->
  <div style="padding:0 16px;page-break-inside:avoid;">
    <table style="width:100%;border-collapse:separate;border-spacing:8px;margin-top:2px;"><tr>
      <td style="width:50%;vertical-align:top;"></td>
      <td style="width:50%;vertical-align:top;${cardStyle}">
        <div style="${secLabel}">Summary</div>
        <table style="width:100%;border-collapse:collapse;">
          ${sumLine('Subtotal', escapeHtml(fmtMoney(subtotal)))}
          ${itemDiscount > 0 ? sumLine('Item Discount', `-${escapeHtml(fmtMoney(itemDiscount))}`) : ''}
          ${overallDiscountAmount > 0 ? sumLine('Overall Discount', `-${escapeHtml(fmtMoney(overallDiscountAmount))}`) : ''}
          ${sumLine(`${escapeHtml(taxLabel)} (${taxEnabled ? `${taxRate}%` : 'Off'})`, escapeHtml(fmtMoney(totalTax)))}
        </table>
        <!-- Total highlight bar -->
        <div style="margin:8px 0;padding:10px 14px;border-radius:10px;background:linear-gradient(90deg,${P.dark} 0%,#7f1d1d 50%,#b91c1c 100%);">
          <table style="width:100%;border-collapse:collapse;"><tr>
            <td style="font-size:12px;font-weight:800;color:#ffffff;">Total</td>
            <td style="font-size:17px;font-weight:900;${num}color:#ffffff;">${escapeHtml(fmtMoney(total))}</td>
          </tr></table>
        </div>
        ${isInvoice ? `
        <table style="width:100%;border-collapse:collapse;">
          ${sumLine('Amount Paid', escapeHtml(fmtMoney(amountPaid)))}
        </table>
        <div style="margin-top:6px;">
          <table style="width:100%;border-collapse:collapse;"><tr>
            <td style="padding:4px 0;font-size:13px;font-weight:900;color:${P.dark};">BALANCE DUE</td>
            <td style="padding:4px 0;font-size:16px;font-weight:900;${num}color:#b91c1c;">${escapeHtml(fmtMoney(balanceDue))}</td>
          </tr></table>
        </div>` : ''}
      </td>
    </tr></table>
  </div>

  <!-- ===== BANKING DETAILS CARD (Invoice only) ===== -->
  ${hasBank ? `
  <div style="padding:0 16px;page-break-inside:avoid;">
    <div style="margin-top:10px;${cardStyle}page-break-inside:avoid;">
      <div style="${secLabel}">Banking Details</div>
      <table style="width:100%;border-collapse:collapse;">
        ${bankFields.map(f => `<tr>
          <td style="padding:7px 0;font-size:10.5px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${P.textLt};width:38%;vertical-align:top;border-bottom:1px solid ${P.borderLt};">${escapeHtml(f.label)}</td>
          <td style="padding:7px 0;font-size:12px;font-weight:700;color:${P.dark};vertical-align:top;border-bottom:1px solid ${P.borderLt};">${escapeHtml(f.value)}</td>
        </tr>`).join('')}
      </table>
    </div>
  </div>
  ` : ''}

  <!-- ===== NOTES (full width) ===== -->
  ${hasNotes ? `
  <div style="padding:0 16px;page-break-inside:avoid;">
    <div style="margin-top:10px;margin-bottom:8px;${cardStyle}page-break-inside:avoid;">
      <div style="${secLabel}">${isInvoice ? 'Invoice Notes' : 'Estimate Notes'}</div>
      <div style="font-size:11px;line-height:1.65;color:${P.textMd};white-space:pre-line;">${toHtmlLines(finalNotes)}</div>
    </div>
  </div>
  ` : ''}

  <!-- ===== FOOTER ===== -->
  
  <div style="padding:14px 24px 18px;text-align:center;font-size:10px;color:#9ca3af;">
    ${isInvoice ? 'Thank you for your business.' : 'This estimate is issued for review and approval.'}
  </div>

</div>
</body></html>`;

  let iframe = null;

  try {
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule?.default || html2pdfModule;

    iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '794px';
    iframe.style.height = '1123px';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    await Promise.all(
      Array.from(iframeDoc.images || [])
        .filter((image) => !image.complete)
        .map(
          (image) =>
            new Promise((resolve) => {
              image.onload = resolve;
              image.onerror = resolve;
            })
        )
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const contentHeight = Math.max(
      iframeDoc.documentElement?.scrollHeight || 0,
      iframeDoc.body?.scrollHeight || 0,
      1123
    );
    iframe.style.height = `${contentHeight}px`;

    const safeNumber = String(doc?.number || documentLabel).replace(/[\\/:*?"<>|]+/g, '_');

    await html2pdf()
      .from(iframeDoc.body)
      .set({
        filename: `${documentLabel}_${safeNumber}.pdf`,
        margin: [0, 0, 0, 0],
        jsPDF: { format: 'a4', unit: 'mm' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'], avoid: ['tr', 'td'] },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
        },
      })
      .save();

    return true;
  } catch (error) {
    console.error('Failed to generate PDF', error);
    return false;
  } finally {
    if (iframe?.parentNode) iframe.parentNode.removeChild(iframe);
  }
};
