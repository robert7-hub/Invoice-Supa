import React from 'react';
import {
  Document, Page, View, Text, Image,
  StyleSheet, pdf,
} from '@react-pdf/renderer';
import { calculateItemTotal, calculateDocumentTotals } from './calculations';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  dark:      '#111827',
  text:      '#1f2937',
  textMd:    '#4b5563',
  textLt:    '#6b7280',
  red:       '#991b1b',
  redAccent: '#b91c1c',
  redLt:     '#fef2f2',
  redBorder: '#fca5a5',
  border:    '#e5e7eb',
  borderLt:  '#f0f1f4',
  bgPage:    '#f3f4f6',
  bgCard:    '#ffffff',
  bgSoft:    '#fafafa',
  bgTh:      '#f3f4f6',
  totalBg:   '#7f1d1d',
  white:     '#ffffff',
  footer:    '#9ca3af',
};

// ── Shared StyleSheet ─────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // Page
  page: {
    backgroundColor: C.bgPage,
    fontSize: 10,
    color: C.text,
    paddingBottom: 24,
  },

  // Accent bar — approximates dark→red gradient with two blocks
  accentBar: { height: 5, flexDirection: 'row' },
  accentL:   { flex: 1, backgroundColor: C.dark },
  accentR:   { flex: 1, backgroundColor: C.redAccent },

  // Header card
  headerCard: {
    backgroundColor: C.bgCard,
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 20,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.redBorder,
    backgroundColor: C.redLt,
    color: C.red,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  bizName: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    marginBottom: 6,
  },
  bizLine: { fontSize: 9, color: C.textMd, lineHeight: 1.6 },

  logoWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  logoImg: { width: 120, height: 120, objectFit: 'contain' },

  // Info cards row
  cardsRow: {
    paddingHorizontal: 12,
    flexDirection: 'row',
  },
  card: {
    flex: 1,
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 16,
  },
  cardGap: { width: 8 },

  secLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    color: C.red,
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLt,
  },
  detailLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.textLt,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    textAlign: 'right',
  },

  clientName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    marginBottom: 5,
  },
  clientLine: { fontSize: 9, color: C.textMd, lineHeight: 1.6 },

  // Items table
  itemsSection: { paddingHorizontal: 12, marginTop: 10 },
  itemsCard: {
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  itemsCardHeader: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  itemsTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.dark },
  itemsCount: { fontSize: 8, color: C.textLt, marginTop: 2 },

  tableHead: {
    flexDirection: 'row',
    backgroundColor: C.bgTh,
    borderTopWidth: 2,
    borderTopColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  th: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.textLt,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.borderLt,
  },
  tableRowEven: { backgroundColor: C.bgSoft },
  itemDesc: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.dark, lineHeight: 1.35 },
  itemNote: { fontSize: 8, color: C.textLt, marginTop: 2, lineHeight: 1.4 },
  numCell: { textAlign: 'right', fontSize: 9.5 },
  numCellBold: { textAlign: 'right', fontSize: 9.5, fontFamily: 'Helvetica-Bold' },

  // Summary
  summarySection: { paddingHorizontal: 12, marginTop: 10, flexDirection: 'row' },
  summaryCard: {
    flex: 1,
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 16,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLt,
  },
  sumLabel:  { fontSize: 9.5, color: C.textMd },
  sumValue:  { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.dark },
  totalBar: {
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: C.totalBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.white },
  totalValue: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: C.white },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 2,
  },
  balanceLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.dark },
  balanceValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.redAccent },

  // Banking
  bankSection: { paddingHorizontal: 12, marginTop: 10 },
  bankCard: {
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 16,
  },
  bankRow: {
    flexDirection: 'row',
    paddingVertical: 5,
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

  // Notes
  notesSection: { paddingHorizontal: 12, marginTop: 10 },
  notesCard: {
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 16,
  },
  notesBody: { fontSize: 9, color: C.textMd, lineHeight: 1.65 },

  // Footer
  footer: { paddingHorizontal: 24, paddingVertical: 14, textAlign: 'center', fontSize: 8.5, color: C.footer },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtMoney = (value) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency', currency: 'ZAR',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Number(value || 0));

// ── PDF Document component ────────────────────────────────────────────────────
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

  // Column widths for items table
  const descFlex = hasDiscount ? 3 : 4;
  const discW    = 62;
  const amtW     = 72;
  const rateW    = 66;
  const qtyW     = 34;

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Accent bar ── */}
        <View style={S.accentBar} fixed>
          <View style={S.accentL} />
          <View style={S.accentR} />
        </View>

        {/* ── Header ── */}
        <View style={S.headerCard} wrap={false}>
          <View style={{ flex: 1, paddingRight: 14 }}>
            <Text style={S.badge}>{title}</Text>
            <Text style={S.bizName}>{settings?.businessName || ''}</Text>
            {settings?.businessNumber ? (
              <Text style={S.bizLine}>Reg No: {settings.businessNumber}</Text>
            ) : null}
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

        {/* ── Invoice details + Bill To ── */}
        <View style={S.cardsRow} wrap={false}>
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
                {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : ''}
              </Text>
            </View>
          </View>

          <View style={S.cardGap} />

          <View style={S.card}>
            <Text style={S.secLabel}>Bill To</Text>
            <Text style={S.clientName}>{client?.name || 'Client'}</Text>
            {clientAddrLines.map((l, i) => <Text key={i} style={S.clientLine}>{l}</Text>)}
            {client?.vatNumber ? <Text style={S.clientLine}>VAT NR: {client.vatNumber}</Text> : null}
            {client?.email     ? <Text style={S.clientLine}>{client.email}</Text>              : null}
            {client?.phone     ? <Text style={S.clientLine}>{client.phone}</Text>              : null}
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

            {/* Table head */}
            <View style={S.tableHead}>
              <Text style={[S.th, { flex: descFlex }]}>Description</Text>
              <Text style={[S.th, { width: qtyW, textAlign: 'center' }]}>Qty</Text>
              <Text style={[S.th, { width: rateW, textAlign: 'right' }]}>Rate</Text>
              {hasDiscount
                ? <Text style={[S.th, { width: discW, textAlign: 'right' }]}>Discount</Text>
                : null}
              <Text style={[S.th, { width: amtW, textAlign: 'right' }]}>Amount</Text>
            </View>

            {/* Table rows */}
            {(doc.items || []).map((item, idx) => {
              const calc    = calculateItemTotal(item, taxRate, { applyTax: taxEnabled });
              const discVal = Number(item.discountAmount) > 0
                ? (item.discountType === 'percentage'
                    ? fmtMoney(item.rate * item.qty * item.discountAmount / 100)
                    : fmtMoney(item.discountAmount))
                : '';
              return (
                <View key={idx} style={[S.tableRow, idx % 2 === 1 ? S.tableRowEven : {}]} wrap={false}>
                  <View style={{ flex: descFlex }}>
                    <Text style={S.itemDesc}>{item.description || ''}</Text>
                    {item.notes ? <Text style={S.itemNote}>{item.notes}</Text> : null}
                  </View>
                  <Text style={[S.numCell, { width: qtyW, textAlign: 'center' }]}>
                    {item.qty || 0}
                  </Text>
                  <Text style={[S.numCell, { width: rateW }]}>{fmtMoney(item.rate || 0)}</Text>
                  {hasDiscount
                    ? <Text style={[S.numCell, { width: discW }]}>{discVal ? `-${discVal}` : ''}</Text>
                    : null}
                  <Text style={[S.numCellBold, { width: amtW }]}>{fmtMoney(calc.total)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Summary ── */}
        <View style={S.summarySection} wrap={false}>
          <View style={{ flex: 1, marginRight: 8 }} />
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
            <View style={S.totalBar}>
              <Text style={S.totalLabel}>Total</Text>
              <Text style={S.totalValue}>{fmtMoney(total)}</Text>
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
              <Text style={S.secLabel}>{isInvoice ? 'Invoice Notes' : 'Estimate Notes'}</Text>
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
  const isInvoice    = type === 'invoice';
  const documentLabel = isInvoice ? 'Invoice' : 'Estimate';
  const taxRate       = settings?.taxRate || 15;
  const totals        = calculateDocumentTotals(doc, taxRate);
  const safeNumber    = String(doc?.number || documentLabel).replace(/[\\/:*?"<>|]+/g, '_');

  try {
    const element = React.createElement(InvoicePDF, { type, doc, client, settings, totals });
    const blob    = await pdf(element).toBlob();
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = url;
    a.download    = `${documentLabel}_${safeNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Failed to generate PDF', error);
    return false;
  }
};
