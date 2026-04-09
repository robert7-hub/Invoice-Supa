import React from 'react';
import {
  Document, Page, View, Text, Image, StyleSheet, pdf, Font,
  Svg, Rect,
} from '@react-pdf/renderer';
import { calculateItemTotal, calculateDocumentTotals } from './calculations';

const GOTHAM_BOLD_FAMILY = 'Gotham-Bold';
const GOTHAM_BOLD_SRC = '/fonts/Gotham-Bold.ttf';
let gothamCheckComplete = false;
let gothamBoldAvailable = false;

const ensureGothamBoldFont = async () => {
  if (gothamCheckComplete) return gothamBoldAvailable;

  gothamCheckComplete = true;

  try {
    const probe = await fetch(GOTHAM_BOLD_SRC, { method: 'HEAD' });
    if (!probe.ok) {
      gothamBoldAvailable = false;
      return gothamBoldAvailable;
    }

    Font.register({ family: GOTHAM_BOLD_FAMILY, src: GOTHAM_BOLD_SRC, fontWeight: 700 });
    gothamBoldAvailable = true;
  } catch {
    gothamBoldAvailable = false;
  }

  return gothamBoldAvailable;
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  black:    '#000000',
  dark:     '#1a1a1a',
  charcoal: '#333333',
  text:     '#2d2d2d',
  textMd:   '#555555',
  textLt:   '#888888',
  border:   '#d4d4d4',
  borderLt: '#e8e8e8',
  stripe:   '#f7f7f7',
  white:    '#ffffff',
  page:     '#ffffff',
};

// ── Thin rule component ───────────────────────────────────────────────────────
const Rule = ({ color = C.borderLt, mt = 0, mb = 0 }) => (
  <View style={{ borderBottomWidth: 0.5, borderBottomColor: color, marginTop: mt, marginBottom: mb }} />
);

// ── StyleSheet ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    backgroundColor: C.page,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.text,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, paddingRight: 20 },
  headerRight: { alignItems: 'flex-end' },
  logoImg: { width: 100, height: 70, objectFit: 'contain', borderRadius: 10 },
  bizDetails: { flex: 1, paddingTop: 0 },
  bizName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  bizSub: { fontSize: 8, color: C.textLt, letterSpacing: 0.5, marginBottom: 0 },
  titleText: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  metaLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.textLt,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-end',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.textMd,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    borderWidth: 0.5,
    borderColor: C.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },

  // ── Divider bar ──
  accentBar: { height: 2, backgroundColor: C.dark, marginBottom: 24 },

  // ── Two-column info ──
  infoRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  infoCol: { flex: 1 },
  sectionLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.textLt,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  infoName: {
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: C.dark,
    marginBottom: 4,
  },
  infoLine: { fontSize: 8.5, color: C.textMd, lineHeight: 1.7 },

  // ── Table ──
  tableWrap: { marginBottom: 20 },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: C.dark,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  th: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderLt,
  },
  tableRowStripe: { backgroundColor: C.stripe },
  cellDesc: { fontSize: 9, color: C.dark, lineHeight: 1.35 },
  cellNote: { fontSize: 7.5, color: C.textLt, marginTop: 1.5, lineHeight: 1.3 },
  cellNum: { textAlign: 'right', fontSize: 9, fontFamily: 'Helvetica', color: C.text },
  cellNumBold: { textAlign: 'right', fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.dark },

  // ── Totals (right-aligned under table) ──
  totalsWrap: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  totalsLeft: { flex: 1 },
  totalsRight: { width: 220 },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderLt,
  },
  sumLabel: { fontSize: 9, color: C.textMd },
  sumValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.dark, textAlign: 'right' },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.dark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },
  totalBarLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.white, letterSpacing: 1, textTransform: 'uppercase' },
  totalBarValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.white },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 2,
  },
  balanceLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.dark, letterSpacing: 0.5 },
  balanceValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.dark },



  // ── Banking ──
  bankWrap: { marginBottom: 16 },
  bankRow: {
    flexDirection: 'row',
    paddingVertical: 3.5,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderLt,
  },
  bankLabel: {
    width: 100,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.textLt,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  bankValue: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.dark },

  // ── Notes / Terms ──
  notesWrap: { marginBottom: 20 },
  notesBody: { fontSize: 8, color: C.textMd, lineHeight: 1.65 },

  // ── Signature ──
  sigWrap: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
    marginTop: 4,
  },
  sigBlock: { width: 230, alignItems: 'flex-start' },
  sigLine: { borderBottomWidth: 0.5, borderBottomColor: C.charcoal, width: '100%', marginBottom: 10, marginTop: 8 },
  sigDateLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.textLt, letterSpacing: 0.3, marginBottom: 3 },
  sigDateLine: { borderBottomWidth: 0.5, borderBottomColor: C.borderLt, width: '100%', marginBottom: 0, marginTop: 2 },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  footerTagline: {
    fontSize: 8,
    color: C.textLt,
    letterSpacing: 0.3,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

// ── Money formatter ───────────────────────────────────────────────────────────
const fmtMoney = (v) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency', currency: 'ZAR',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Number(v || 0));

// ── PDF component ─────────────────────────────────────────────────────────────
const InvoicePDF = ({ type, doc, client, settings, totals, businessNameFontFamily }) => {
  const isInvoice = type === 'invoice';
  const title     = isInvoice ? 'INVOICE' : 'QUOTE';
  const taxRate   = settings?.taxRate  || 15;
  const taxLabel  = settings?.taxLabel || 'VAT';

  const {
    subtotal, itemDiscount, overallDiscountAmount,
    totalTax, total, amountPaid, balanceDue, taxEnabled,
  } = totals;

  const hasDiscount = (doc.items || []).some(i => Number(i.discountAmount) > 0);

  const bankFields = [
    { label: 'Bank Name',      value: settings?.bankName },
    { label: 'Account No.',    value: settings?.accountNumber },
    { label: 'Account Type',   value: settings?.accountType },
    { label: 'Branch Code',    value: settings?.branchCode },
    { label: 'Account Holder', value: settings?.businessName },
  ].filter(f => String(f.value || '').trim());

  const hasBank  = isInvoice && bankFields.length > 0;

  const documentNotes = String(doc.notes || '').trim();
  const termsAndConditions = isInvoice
    ? String(settings?.defaultInvoiceNotes  || '').trim()
    : String(settings?.defaultEstimateNotes || '').trim();
  const hasDocumentNotes = documentNotes.length > 0;
  const hasTermsAndConditions = termsAndConditions.length > 0;

  const bizAddrLines = String(settings?.address || '').split('\n').filter(Boolean);

  const clientAddrLines = [
    client?.addressLine1,
    client?.addressLine2,
    [client?.city, client?.postalCode].filter(Boolean).join(', '),
  ].filter(Boolean);
  if (clientAddrLines.length === 0 && client?.address) {
    clientAddrLines.push(...String(client.address).split('\n').filter(Boolean));
  }
  const clientExtraLines = [
    client?.extraLine1,
    client?.extraLine2,
    client?.extraLine3,
    client?.extraLine4,
    client?.extraLine5,
  ]
    .map((line) => String(line || '').trim())
    .filter(Boolean);
  const clientNotes = String(client?.notes || '').trim();

  // Column widths
  const numW   = 22;
  const descFl = hasDiscount ? 3 : 4;
  const priceW = 62;
  const qtyW   = 32;
  const discW  = 58;
  const amtW   = 70;

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Header ── */}
        <View style={S.header} wrap={false}>
          <View style={S.headerLeft}>
            {settings?.logo ? (
              <Image src={settings.logo} style={S.logoImg} />
            ) : null}
            <View style={S.bizDetails}>
              <Text style={[S.bizName, { fontFamily: businessNameFontFamily }]}>{settings?.businessName || ''}</Text>
              {settings?.businessNumber ? (
                <Text style={S.bizSub}>Reg. {settings.businessNumber}</Text>
              ) : null}
              {bizAddrLines.map((l, i) => <Text key={i} style={S.bizSub}>{l}</Text>)}
              {settings?.phone ? <Text style={S.bizSub}>{settings.phone}</Text> : null}
              {settings?.email ? <Text style={S.bizSub}>{settings.email}</Text> : null}
            </View>
          </View>
          <View style={S.headerRight}>
            <Text style={S.titleText}>{title}</Text>
            <Text style={S.metaLabel}>{isInvoice ? 'Invoice No.' : 'Quote No.'}</Text>
            <Text style={S.metaValue}>{doc.number || ''}</Text>
            <Text style={S.metaLabel}>Date</Text>
            <Text style={S.metaValue}>{doc.date || ''}</Text>
            {isInvoice && doc.dueDate ? (
              <>
                <Text style={S.metaLabel}>Due Date</Text>
                <Text style={S.metaValue}>{doc.dueDate}</Text>
              </>
            ) : null}
            {doc.status ? (
              <Text style={S.statusBadge}>
                {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ── Accent bar ── */}
        <View style={S.accentBar} />

        {/* ── Client / Payment info ── */}
        <View style={S.infoRow} wrap={false}>
          <View style={S.infoCol}>
            <Text style={S.sectionLabel}>Invoice To</Text>
            <Text style={S.infoName}>{client?.name || 'Client'}</Text>
            {client?.company ? <Text style={S.infoLine}>{client.company}</Text> : null}
            {clientAddrLines.map((l, i) => <Text key={i} style={S.infoLine}>{l}</Text>)}
            {client?.phone ? <Text style={S.infoLine}>{client.phone}</Text> : null}
            {client?.email ? <Text style={S.infoLine}>{client.email}</Text> : null}
            {client?.vatNumber ? <Text style={S.infoLine}>VAT: {client.vatNumber}</Text> : null}
            {clientExtraLines.map((line, i) => <Text key={`extra-${i}`} style={S.infoLine}>{line}</Text>)}
            {clientNotes ? <Text style={S.infoLine}>{clientNotes}</Text> : null}
          </View>
          {hasBank ? (
            <View style={S.infoCol}>
              <Text style={S.sectionLabel}>Payment Details</Text>
              {bankFields.map((f, i) => (
                <View key={i} style={{ flexDirection: 'row', marginBottom: 3 }}>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.textLt, width: 85 }}>{f.label}</Text>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica', color: C.charcoal }}>{f.value}</Text>
                </View>
              ))}
              {settings?.swiftCode ? (
                <View style={{ flexDirection: 'row', marginBottom: 3 }}>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.textLt, width: 85 }}>SWIFT Code</Text>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica', color: C.charcoal }}>{settings.swiftCode}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* ── Items table ── */}
        <View style={S.tableWrap}>
          {/* Table header */}
          <View style={S.tableHead}>
            <Text style={[S.th, { width: numW, textAlign: 'center' }]}>#</Text>
            <Text style={[S.th, { flex: descFl }]}>Description</Text>
            <Text style={[S.th, { width: priceW, textAlign: 'right' }]}>Price</Text>
            <Text style={[S.th, { width: qtyW, textAlign: 'center' }]}>Qty</Text>
            {hasDiscount ? (
              <Text style={[S.th, { width: discW, textAlign: 'right' }]}>Discount</Text>
            ) : null}
            <Text style={[S.th, { width: amtW, textAlign: 'right' }]}>Amount</Text>
          </View>

          {/* Item rows */}
          {(doc.items || []).map((item, idx) => {
            const calc = calculateItemTotal(item, taxRate, { applyTax: taxEnabled });
            const discVal = Number(item.discountAmount) > 0
              ? (item.discountType === 'percentage'
                  ? fmtMoney(item.rate * item.qty * item.discountAmount / 100)
                  : fmtMoney(item.discountAmount))
              : '';
            return (
              <View
                key={idx}
                style={[S.tableRow, idx % 2 === 1 ? S.tableRowStripe : {}]}
                wrap={false}
              >
                <Text style={[S.cellNum, { width: numW, textAlign: 'center', color: C.textLt }]}>
                  {idx + 1}
                </Text>
                <View style={{ flex: descFl }}>
                  <Text style={S.cellDesc}>{item.description || ''}</Text>
                  {item.notes ? <Text style={S.cellNote}>{item.notes}</Text> : null}
                </View>
                <Text style={[S.cellNum, { width: priceW }]}>{fmtMoney(item.rate || 0)}</Text>
                <Text style={[S.cellNum, { width: qtyW, textAlign: 'center' }]}>{item.qty || 0}</Text>
                {hasDiscount ? (
                  <Text style={[S.cellNum, { width: discW }]}>
                    {discVal ? `-${discVal}` : ''}
                  </Text>
                ) : null}
                <Text style={[S.cellNumBold, { width: amtW }]}>{fmtMoney(calc.total)}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Totals ── */}
        <View style={S.totalsWrap} wrap={false}>
          <View style={S.totalsLeft} />

          {/* Right: summary breakdown */}
          <View style={S.totalsRight}>
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
            {taxEnabled ? (
              <View style={S.sumRow}>
                <Text style={S.sumLabel}>{taxLabel} ({taxRate}%)</Text>
                <Text style={S.sumValue}>{fmtMoney(totalTax)}</Text>
              </View>
            ) : null}

            {/* Total bar */}
            <View style={S.totalBar}>
              <Text style={S.totalBarLabel}>Total</Text>
              <Text style={S.totalBarValue}>{fmtMoney(total)}</Text>
            </View>

            {isInvoice ? (
              <>
                <View style={[S.sumRow, { marginTop: 4 }]}>
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

        <Rule color={C.borderLt} mb={16} />

        {/* ── Notes ── */}
        {hasDocumentNotes ? (
          <View style={S.notesWrap} wrap={false}>
            <Text style={S.sectionLabel}>Notes</Text>
            <Text style={S.notesBody}>{documentNotes}</Text>
          </View>
        ) : null}

        {/* ── Terms & Conditions ── */}
        {hasTermsAndConditions ? (
          <View style={S.notesWrap} wrap={false}>
            <Text style={S.sectionLabel}>Terms & Conditions</Text>
            <Text style={S.notesBody}>{termsAndConditions}</Text>
          </View>
        ) : null}

        {/* ── Client signature block ── */}
        <View style={S.sigWrap} wrap={false}>
          <View style={S.sigBlock}>
            <Text style={S.sectionLabel}>Client Signature</Text>
            <View style={S.sigLine} />
            <Text style={S.sigDateLabel}>Date (DD/MM/YYYY)</Text>
            <View style={S.sigDateLine} />
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={S.footer} fixed>
          <Text style={S.footerTagline}>Let's turn your moments into memories.</Text>
        </View>

      </Page>
    </Document>
  );
};

// ── Public API ────────────────────────────────────────────────────────────────
export const generatePDF = async (type, doc, client, settings) => {
  const isInvoice     = type === 'invoice';
  const documentLabel = isInvoice ? 'Invoice' : 'Quote';
  const taxRate       = settings?.taxRate || 15;
  const totals        = calculateDocumentTotals(doc, taxRate);
  const safeNumber    = String(doc?.number || documentLabel).replace(/[\\/:*?"<>|]+/g, '_');
  const useGothamBold = await ensureGothamBoldFont();
  const businessNameFontFamily = useGothamBold ? GOTHAM_BOLD_FAMILY : 'Helvetica-Bold';

  try {
    const blob = await pdf(
      <InvoicePDF
        type={type}
        doc={doc}
        client={client}
        settings={settings}
        totals={totals}
        businessNameFontFamily={businessNameFontFamily}
      />
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
