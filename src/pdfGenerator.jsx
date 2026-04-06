import React from 'react';
import {
  Document, Page, View, Text, Image, StyleSheet, pdf,
  Svg, Defs, LinearGradient, Stop, Rect,
} from '@react-pdf/renderer';
import { calculateItemTotal, calculateDocumentTotals } from './calculations';

// ── Colors (exact match to HTML) ──────────────────────────────────────────────
const C = {
  dark:      '#111827',
  text:      '#1f2937',
  textMd:    '#4b5563',
  textLt:    '#6b7280',
  red:       '#991b1b',
  redMid:    '#7f1d1d',
  redAccent: '#b91c1c',
  redBright: '#dc2626',
  redLt:     '#fef2f2',
  redBorder: '#e8c4c4',
  border:    '#e5e7eb',
  borderLt:  '#f0f1f4',
  bgPage:    '#f3f4f6',
  bgCard:    '#ffffff',
  bgSoft:    '#fafafa',
  bgTh:      '#f3f4f6',
  white:     '#ffffff',
  footer:    '#9ca3af',
};

// ── Gradient helpers (SVG-based for real gradients) ───────────────────────────

// Accent bar: dark → #7f1d1d → #dc2626
const AccentBar = () => (
  <Svg width="100%" height={5} viewBox="0 0 595 5" style={{ display: 'block' }}>
    <Defs>
      <LinearGradient id="ab" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0%"   stopColor={C.dark}      stopOpacity={1} />
        <Stop offset="50%"  stopColor={C.redMid}    stopOpacity={1} />
        <Stop offset="100%" stopColor={C.redBright}  stopOpacity={1} />
      </LinearGradient>
    </Defs>
    <Rect x="0" y="0" width="595" height="5" fill="url(#ab)" />
  </Svg>
);

// Total bar background: dark → #7f1d1d → #b91c1c  (width=full, height=36)
const TotalBarBg = ({ width = 300, height = 36 }) => (
  <Svg
    width={width} height={height}
    viewBox={`0 0 ${width} ${height}`}
    style={{ position: 'absolute', top: 0, left: 0 }}
  >
    <Defs>
      <LinearGradient id="tb" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0%"   stopColor={C.dark}      stopOpacity={1} />
        <Stop offset="50%"  stopColor={C.redMid}    stopOpacity={1} />
        <Stop offset="100%" stopColor={C.redAccent}  stopOpacity={1} />
      </LinearGradient>
    </Defs>
    <Rect x="0" y="0" width={width} height={height} rx="8" ry="8" fill="url(#tb)" />
  </Svg>
);

// ── StyleSheet ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    backgroundColor: C.bgPage,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.text,
    paddingBottom: 20,
  },

  // ── Header card ──
  headerCard: {
    backgroundColor: C.bgCard,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 22,
    marginBottom: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: { flex: 1, paddingRight: 16 },

  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.redBorder,
    backgroundColor: C.redLt,
    color: C.red,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.8,
    paddingHorizontal: 12,
    paddingVertical: 3.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  bizName: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  bizLine: { fontSize: 9, color: C.textMd, lineHeight: 1.7, marginBottom: 0 },

  logoWrap: {
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: C.bgCard,
  },
  logoImg: {
    width: 150,
    height: 72,
    objectFit: 'contain',
  },

  // ── Info cards row ──
  cardsRow: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    marginBottom: 0,
  },
  card: {
    flex: 1,
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 17,
  },
  cardGap: { width: 7 },

  secLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.8,
    color: C.red,
    marginBottom: 10,
    textTransform: 'uppercase',
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5.5,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLt,
  },
  detailLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.textLt,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    textAlign: 'right',
  },

  clientName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    marginBottom: 6,
  },
  clientLine: { fontSize: 9, color: C.textMd, lineHeight: 1.7 },

  // ── Items table ──
  itemsSection:    { paddingHorizontal: 12, marginTop: 10 },
  itemsCard: {
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  itemsCardHeader: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  itemsTitle:      { fontSize: 12.5, fontFamily: 'Helvetica-Bold', color: C.dark },
  itemsCount:      { fontSize: 8, color: C.textLt, marginTop: 2 },

  tableHead: {
    flexDirection: 'row',
    backgroundColor: C.bgTh,
    borderTopWidth: 2,
    borderTopColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  th: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.textLt,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: C.borderLt,
  },
  tableRowEven: { backgroundColor: C.bgSoft },

  itemDesc:    { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.dark, lineHeight: 1.35 },
  itemNote:    { fontSize: 8.5, color: C.textLt, marginTop: 2, lineHeight: 1.4 },
  numCell:     { textAlign: 'right', fontSize: 9.5, fontFamily: 'Helvetica' },
  numCellBold: { textAlign: 'right', fontSize: 9.5, fontFamily: 'Helvetica-Bold' },

  // ── Summary ──
  summarySection: { paddingHorizontal: 12, marginTop: 10, flexDirection: 'row' },
  summaryLeft:    { flex: 1, marginRight: 7 },
  summaryCard: {
    flex: 1,
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 17,
  },

  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5.5,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLt,
  },
  sumLabel: { fontSize: 9.5, color: C.textMd },
  sumValue: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.dark },

  // total bar: uses SVG bg + positioned text
  totalBarWrap: {
    marginTop: 9,
    marginBottom: 5,
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  totalBarRow: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  totalLabel: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: C.white },
  totalValue: { fontSize: 15,   fontFamily: 'Helvetica-Bold', color: C.white },

  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 9,
    paddingBottom: 2,
  },
  balanceLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.dark },
  balanceValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.redAccent },

  // ── Banking ──
  bankSection: { paddingHorizontal: 12, marginTop: 10 },
  bankCard: {
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 17,
  },
  bankRow: {
    flexDirection: 'row',
    paddingVertical: 5.5,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLt,
  },
  bankLabel: {
    width: '38%',
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: C.textLt,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  bankValue: { flex: 1, fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.dark },

  // ── Notes ──
  notesSection: { paddingHorizontal: 12, marginTop: 10 },
  notesCard: {
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 17,
    marginBottom: 4,
  },
  notesBody: { fontSize: 9, color: C.textMd, lineHeight: 1.65 },

  // ── Footer ──
  footer: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 18,
    textAlign: 'center',
    fontSize: 8.5,
    color: C.footer,
  },
});

// ── Money formatter ───────────────────────────────────────────────────────────
const fmtMoney = (v) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency', currency: 'ZAR',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Number(v || 0));

// ── PDF component ─────────────────────────────────────────────────────────────
const InvoicePDF = ({ type, doc, client, settings, totals }) => {
  const isInvoice = type === 'invoice';
  const title     = isInvoice ? 'INVOICE' : 'ESTIMATE';
  const taxRate   = settings?.taxRate  || 15;
  const taxLabel  = settings?.taxLabel || 'VAT';

  const {
    subtotal, itemDiscount, overallDiscountAmount,
    totalTax, total, amountPaid, balanceDue, taxEnabled,
  } = totals;

  const hasDiscount = (doc.items || []).some(i => Number(i.discountAmount) > 0);

  const bankFields = [
    { label: 'Bank Name',      value: settings?.bankName },
    { label: 'Account Number', value: settings?.accountNumber },
    { label: 'Account Type',   value: settings?.accountType },
    { label: 'Branch Code',    value: settings?.branchCode },
    { label: 'Account Holder', value: settings?.businessName },
  ].filter(f => String(f.value || '').trim());

  const hasBank  = isInvoice && bankFields.length > 0;

  const docNotes     = String(doc.notes || '').trim();
  const defaultNotes = isInvoice
    ? String(settings?.defaultInvoiceNotes  || '').trim()
    : String(settings?.defaultEstimateNotes || '').trim();
  const finalNotes = docNotes || defaultNotes;
  const hasNotes   = finalNotes.length > 0;

  const bizAddrLines = String(settings?.address || '').split('\n').filter(Boolean);

  const clientAddrLines = [
    client?.addressLine1,
    client?.addressLine2,
    [client?.city, client?.postalCode].filter(Boolean).join(', '),
  ].filter(Boolean);

  // Column widths (pt)
  const descFlex = hasDiscount ? 3 : 4;
  const qtyW  = 30;
  const rateW = 66;
  const discW = 60;
  const amtW  = 72;

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Gradient accent bar ── */}
        <AccentBar />

        {/* ── Header card ── */}
        <View style={S.headerCard} wrap={false}>
          <View style={S.headerLeft}>
            <Text style={S.badge}>{title}</Text>
            <Text style={S.bizName}>{settings?.businessName || ''}</Text>
            {settings?.businessNumber
              ? <Text style={S.bizLine}>Reg No: {settings.businessNumber}</Text>
              : null}
            {bizAddrLines.map((l, i) => <Text key={i} style={S.bizLine}>{l}</Text>)}
            {settings?.phone ? <Text style={S.bizLine}>Phone: {settings.phone}</Text> : null}
            {settings?.email ? <Text style={S.bizLine}>Email: {settings.email}</Text>  : null}
          </View>

          {settings?.logo ? (
            <View style={S.logoWrap}>
              <Image src={settings.logo} style={S.logoImg} />
            </View>
          ) : null}
        </View>

        {/* ── Info cards row ── */}
        <View style={S.cardsRow} wrap={false}>

          {/* Invoice / Estimate details */}
          <View style={S.card}>
            <Text style={S.secLabel}>{isInvoice ? 'Invoice Details' : 'Estimate Details'}</Text>
            <View style={S.detailRow}>
              <Text style={S.detailLabel}>{isInvoice ? 'Invoice No' : 'Estimate No'}</Text>
              <Text style={S.detailValue}>{doc.number || ''}</Text>
            </View>
            <View style={S.detailRow}>
              <Text style={S.detailLabel}>Date</Text>
              <Text style={S.detailValue}>{doc.date || ''}</Text>
            </View>
            {isInvoice ? (
              <View style={S.detailRow}>
                <Text style={S.detailLabel}>Due Date</Text>
                <Text style={S.detailValue}>{doc.dueDate || ''}</Text>
              </View>
            ) : null}
            <View style={S.detailRow}>
              <Text style={S.detailLabel}>Status</Text>
              <Text style={S.detailValue}>
                {doc.status
                  ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1)
                  : ''}
              </Text>
            </View>
          </View>

          <View style={S.cardGap} />

          {/* Bill To */}
          <View style={S.card}>
            <Text style={S.secLabel}>Bill To</Text>
            <Text style={S.clientName}>{client?.name || 'Client'}</Text>
            {clientAddrLines.map((l, i) => <Text key={i} style={S.clientLine}>{l}</Text>)}
            {client?.vatNumber
              ? <Text style={S.clientLine}>VAT NR: {client.vatNumber}</Text>
              : null}
            {client?.email ? <Text style={S.clientLine}>{client.email}</Text> : null}
            {client?.phone ? <Text style={S.clientLine}>{client.phone}</Text> : null}
          </View>

        </View>

        {/* ── Line items ── */}
        <View style={S.itemsSection}>
          <View style={S.itemsCard}>
            <View style={S.itemsCardHeader}>
              <Text style={S.itemsTitle}>Line Items</Text>
              <Text style={S.itemsCount}>
                {(doc.items || []).length} item{(doc.items || []).length !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Table header */}
            <View style={S.tableHead}>
              <Text style={[S.th, { flex: descFlex }]}>Description</Text>
              <Text style={[S.th, { width: qtyW,  textAlign: 'center' }]}>Qty</Text>
              <Text style={[S.th, { width: rateW, textAlign: 'right'  }]}>Rate</Text>
              {hasDiscount
                ? <Text style={[S.th, { width: discW, textAlign: 'right' }]}>Discount</Text>
                : null}
              <Text style={[S.th, { width: amtW,  textAlign: 'right'  }]}>Amount</Text>
            </View>

            {/* Item rows */}
            {(doc.items || []).map((item, idx) => {
              const calc    = calculateItemTotal(item, taxRate, { applyTax: taxEnabled });
              const discVal = Number(item.discountAmount) > 0
                ? (item.discountType === 'percentage'
                    ? fmtMoney(item.rate * item.qty * item.discountAmount / 100)
                    : fmtMoney(item.discountAmount))
                : '';
              return (
                <View
                  key={idx}
                  style={[S.tableRow, idx % 2 === 1 ? S.tableRowEven : {}]}
                  wrap={false}
                >
                  <View style={{ flex: descFlex }}>
                    <Text style={S.itemDesc}>{item.description || ''}</Text>
                    {item.notes
                      ? <Text style={S.itemNote}>{item.notes}</Text>
                      : null}
                  </View>
                  <Text style={[S.numCell,     { width: qtyW,  textAlign: 'center' }]}>
                    {item.qty || 0}
                  </Text>
                  <Text style={[S.numCell,     { width: rateW }]}>{fmtMoney(item.rate || 0)}</Text>
                  {hasDiscount
                    ? <Text style={[S.numCell, { width: discW }]}>
                        {discVal ? `-${discVal}` : ''}
                      </Text>
                    : null}
                  <Text style={[S.numCellBold, { width: amtW  }]}>{fmtMoney(calc.total)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Summary ── */}
        <View style={S.summarySection} wrap={false}>
          <View style={S.summaryLeft} />
          <View style={S.summaryCard}>
            <Text style={S.secLabel}>Summary</Text>

            <View style={S.sumRow}>
              <Text style={S.sumLabel}>Subtotal</Text>
              <Text style={S.sumValue}>{fmtMoney(subtotal)}</Text>
            </View>
            {itemDiscount > 0 ? (
              <View style={S.sumRow}>
                <Text style={S.sumLabel}>Item Discount</Text>
                <Text style={S.sumValue}>-{fmtMoney(itemDiscount)}</Text>
              </View>
            ) : null}
            {overallDiscountAmount > 0 ? (
              <View style={S.sumRow}>
                <Text style={S.sumLabel}>Overall Discount</Text>
                <Text style={S.sumValue}>-{fmtMoney(overallDiscountAmount)}</Text>
              </View>
            ) : null}
            <View style={S.sumRow}>
              <Text style={S.sumLabel}>{taxLabel} ({taxEnabled ? `${taxRate}%` : 'Off'})</Text>
              <Text style={S.sumValue}>{fmtMoney(totalTax)}</Text>
            </View>

            {/* Gradient total bar */}
            <View style={S.totalBarWrap}>
              <TotalBarBg width={500} height={36} />
              <View style={S.totalBarRow}>
                <Text style={S.totalLabel}>Total</Text>
                <Text style={S.totalValue}>{fmtMoney(total)}</Text>
              </View>
            </View>

            {isInvoice ? (
              <>
                <View style={S.sumRow}>
                  <Text style={S.sumLabel}>Amount Paid</Text>
                  <Text style={S.sumValue}>{fmtMoney(amountPaid)}</Text>
                </View>
                <View style={S.balanceRow}>
                  <Text style={S.balanceLabel}>BALANCE DUE</Text>
                  <Text style={S.balanceValue}>{fmtMoney(balanceDue)}</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {/* ── Banking details ── */}
        {hasBank ? (
          <View style={S.bankSection} wrap={false}>
            <View style={S.bankCard}>
              <Text style={S.secLabel}>Banking Details</Text>
              {bankFields.map((f, i) => (
                <View key={i} style={S.bankRow}>
                  <Text style={S.bankLabel}>{f.label}</Text>
                  <Text style={S.bankValue}>{f.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Notes ── */}
        {hasNotes ? (
          <View style={S.notesSection} wrap={false}>
            <View style={S.notesCard}>
              <Text style={S.secLabel}>
                {isInvoice ? 'Invoice Notes' : 'Estimate Notes'}
              </Text>
              <Text style={S.notesBody}>{finalNotes}</Text>
            </View>
          </View>
        ) : null}

        {/* ── Footer ── */}
        <Text style={S.footer}>
          {isInvoice
            ? 'Thank you for your business.'
            : 'This estimate is issued for review and approval.'}
        </Text>

      </Page>
    </Document>
  );
};

// ── Public API ────────────────────────────────────────────────────────────────
export const generatePDF = async (type, doc, client, settings) => {
  const isInvoice     = type === 'invoice';
  const documentLabel = isInvoice ? 'Invoice' : 'Estimate';
  const taxRate       = settings?.taxRate || 15;
  const totals        = calculateDocumentTotals(doc, taxRate);
  const safeNumber    = String(doc?.number || documentLabel).replace(/[\\/:*?"<>|]+/g, '_');

  try {
    const blob = await pdf(
      <InvoicePDF type={type} doc={doc} client={client} settings={settings} totals={totals} />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `${documentLabel}_${safeNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Failed to generate PDF', err);
    return false;
  }
};
