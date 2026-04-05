// ============================================================================
// DOCUMENT CALCULATIONS
// ============================================================================

export const isDocumentTaxEnabled = (doc) => doc?.taxEnabled !== false;

export const calculateItemTotal = (item, taxRate = 0, options = {}) => {
  const applyTax = options.applyTax !== false;
  const subtotal = (Number(item.rate) || 0) * (Number(item.qty) || 0);
  let discountedTotal = subtotal;

  if (item.discountAmount && item.discountAmount > 0) {
    if (item.discountType === 'percentage') {
      discountedTotal = subtotal * (1 - item.discountAmount / 100);
    } else {
      discountedTotal = subtotal - item.discountAmount;
    }
  }

  const tax = applyTax && item.taxable ? discountedTotal * (taxRate / 100) : 0;
  const total = discountedTotal + tax;

  return {
    subtotal,
    discount: subtotal - discountedTotal,
    tax,
    total: Math.max(0, total),
  };
};

export const calculateSubtotal = (items) =>
  items.reduce((sum, item) => sum + (Number(item.rate) || 0) * (Number(item.qty) || 0), 0);

export const calculateTotalDiscount = (items) =>
  items.reduce((sum, item) => {
    const subtotal = (Number(item.rate) || 0) * (Number(item.qty) || 0);
    if (item.discountAmount > 0) {
      if (item.discountType === 'percentage') {
        return sum + subtotal * (item.discountAmount / 100);
      }
      return sum + item.discountAmount;
    }
    return sum;
  }, 0);

export const calculateTotalTax = (items, taxRate = 0, options = {}) =>
  items.reduce((sum, item) => sum + calculateItemTotal(item, taxRate, options).tax, 0);

export const calculateDocumentTotals = (doc = {}, taxRate = 0) => {
  const items = doc.items || [];
  const subtotal = calculateSubtotal(items);
  const itemDiscount = calculateTotalDiscount(items);
  const subtotalAfterItemDiscounts = subtotal - itemDiscount;
  const rawOverallDiscountAmount =
    doc.overallDiscountType === 'percentage'
      ? subtotalAfterItemDiscounts * ((doc.overallDiscount || 0) / 100)
      : doc.overallDiscount || 0;
  const overallDiscountAmount = Math.min(
    Math.max(Number(rawOverallDiscountAmount) || 0, 0),
    Math.max(subtotalAfterItemDiscounts, 0),
  );
  const taxEnabled = isDocumentTaxEnabled(doc);
  const totalTax = taxEnabled ? calculateTotalTax(items, taxRate, { applyTax: true }) : 0;
  const total = Math.max(0, subtotalAfterItemDiscounts - overallDiscountAmount + totalTax);
  const amountPaid = Math.min(Math.max(Number(doc.amountPaid) || 0, 0), total);
  const balanceDue = Math.max(0, total - amountPaid);

  return {
    subtotal,
    itemDiscount,
    subtotalAfterItemDiscounts,
    overallDiscountAmount,
    totalTax,
    total,
    amountPaid,
    balanceDue,
    taxEnabled,
  };
};

export const calculateDocumentTotal = (doc, taxRate = 0) => calculateDocumentTotals(doc, taxRate).total;

// ============================================================================
// DOCUMENT NUMBERING
// ============================================================================

export const parseDocumentNumber = (value, prefix, allowPlain = false) => {
  const raw = String(value || '').trim().toUpperCase();
  const match = raw.match(new RegExp(`^${prefix}(\\d+)$`))
    || (allowPlain ? raw.match(/^(\d+)$/) : null);
  if (!match) return null;
  return {
    number: parseInt(match[1], 10),
    width: match[1].length,
  };
};

export const formatDocumentNumber = (prefix, number, width = 5) => `${prefix}${String(number).padStart(width, '0')}`;

export const generateDocumentNumber = (type, existingInvoices, existingEstimates, settings) => {
  const prefix = type === 'invoice' ? 'INV' : 'EST';
  const items = type === 'invoice' ? existingInvoices : existingEstimates;
  const settingKey = type === 'invoice' ? 'nextInvoiceNumber' : 'nextEstimateNumber';
  const configured = parseDocumentNumber(settings?.[settingKey], prefix, true);
  const parsedItems = items
    .map((item) => parseDocumentNumber(item.number, prefix))
    .filter(Boolean);
  const maxExisting = Math.max(0, ...parsedItems.map((item) => item.number));
  const width = parsedItems.length > 0
    ? Math.max(...parsedItems.map((item) => item.width))
    : Math.max(configured?.width || 0, 3);
  const nextFromSetting = configured ? configured.number + 1 : 1;
  const nextNumber = Math.max(nextFromSetting, maxExisting + 1);
  return formatDocumentNumber(prefix, nextNumber, width);
};
