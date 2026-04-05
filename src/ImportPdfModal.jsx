import React, { useState, useCallback } from 'react';
import { Upload, FileText, X, Check, AlertTriangle, Loader2, Plus, Trash2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

const generateId = () => Math.random().toString(36).slice(2, 11);

async function extractTextFromPdf(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }
  return fullText;
}

function parseMoneyValue(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[R\s,ZAR]/g, '').replace(/\u00a0/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function extractInvoiceData(text) {
  const result = {
    number: '',
    date: '',
    dueDate: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    items: [],
    notes: '',
    taxEnabled: false,
  };

  const invMatch = text.match(/INV\s*[-#]?\s*(\d+)/i) || text.match(/(INV\d+)/i);
  if (invMatch) result.number = invMatch[0].replace(/\s/g, '');

  const dateMatch = text.match(/DATE\s+([\d]{4}[\/\-][\d]{2}[\/\-][\d]{2})/i)
    || text.match(/DATE\s+([\d]{2}[\/\-][\d]{2}[\/\-][\d]{4})/i);
  if (dateMatch) result.date = dateMatch[1].replace(/\//g, '-');

  const dueMatch = text.match(/DUE\s+([\d]{4}[\/\-][\d]{2}[\/\-][\d]{2})/i)
    || text.match(/DUE\s+On\s+Receipt/i);
  if (dueMatch) {
    if (/receipt/i.test(dueMatch[0])) {
      result.dueDate = result.date;
    } else {
      result.dueDate = dueMatch[1].replace(/\//g, '-');
    }
  }

  const billToMatch = text.match(/BILL\s+TO\s+(.+?)(?=\s+(?:\+?\d[\d\s-]{7,}|DATE|INVOICE|DUE))/is);
  if (billToMatch) result.clientName = billToMatch[1].trim().replace(/\s+/g, ' ');

  const phoneMatch = text.match(/(\+?\d{1,3}[\s-]?\d{2,3}[\s-]?\d{3}[\s-]?\d{4})/);
  if (phoneMatch) result.clientPhone = phoneMatch[1].trim();

  const itemPattern = /([A-Z][A-Za-z\s:,\-\d'"().!]+?)\s+R([\d,]+\.\d{2})\s+(\d+)\s+(?:-R([\d,]+\.\d{2})\s+)?R([\d,]+\.\d{2})/g;
  let itemMatch;
  while ((itemMatch = itemPattern.exec(text)) !== null) {
    const desc = itemMatch[1].trim().replace(/\s+/g, ' ');
    if (/SUBTOTAL|TOTAL|BALANCE|DISCOUNT/i.test(desc)) continue;
    result.items.push({
      id: generateId(),
      description: desc,
      notes: '',
      rate: parseMoneyValue(itemMatch[2]),
      qty: parseInt(itemMatch[3], 10) || 1,
      unit: 'unit',
      discountType: 'fixed',
      discountAmount: itemMatch[4] ? parseMoneyValue(itemMatch[4]) : 0,
      taxable: false,
    });
  }

  if (result.items.length === 0) {
    const simplePattern = /R([\d,]+\.\d{2})\s+(\d+)\s+R([\d,]+\.\d{2})/g;
    let sMatch;
    while ((sMatch = simplePattern.exec(text)) !== null) {
      const beforeMatch = text.substring(Math.max(0, sMatch.index - 200), sMatch.index);
      const descLines = beforeMatch.split(/\n/).filter(l => l.trim());
      const desc = descLines.length > 0 ? descLines[descLines.length - 1].trim() : 'Item';
      if (/SUBTOTAL|TOTAL|BALANCE|DISCOUNT/i.test(desc)) continue;
      result.items.push({
        id: generateId(),
        description: desc.replace(/\s+/g, ' ').substring(0, 100),
        notes: '',
        rate: parseMoneyValue(sMatch[1]),
        qty: parseInt(sMatch[2], 10) || 1,
        unit: 'unit',
        discountType: 'fixed',
        discountAmount: 0,
        taxable: false,
      });
    }
  }

  if (/VAT|TAX/i.test(text) && /\d+%/.test(text)) result.taxEnabled = true;

  return result;
}

const fmtMoney = (v) =>
  `R${Number(v || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ImportPdfModal({ isOpen, onClose, onImport, existingClients, theme }) {
  const [step, setStep] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [editData, setEditData] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState('__new__');

  const reset = useCallback(() => {
    setStep('upload');
    setLoading(false);
    setError('');
    setRawText('');
    setParsed(null);
    setEditData(null);
    setSelectedClientId('__new__');
  }, []);

  const handleClose = () => { reset(); onClose(); };

  const handleFile = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const text = await extractTextFromPdf(file);
      setRawText(text);
      const data = extractInvoiceData(text);
      setParsed(data);
      setEditData({ ...data });
      if (data.clientName && existingClients?.length) {
        const nameLower = data.clientName.toLowerCase();
        const match = existingClients.find(c => c.name && c.name.toLowerCase() === nameLower);
        if (match) setSelectedClientId(match.id);
      }
      setStep('preview');
    } catch (err) {
      console.error('PDF parse error:', err);
      setError('Failed to read PDF. Make sure it is a valid PDF file.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }, []);

  const handleConfirmImport = () => {
    if (!editData) return;
    onImport({
      ...editData,
      clientId: selectedClientId === '__new__' ? null : selectedClientId,
      newClientName: selectedClientId === '__new__' ? editData.clientName : null,
      newClientPhone: selectedClientId === '__new__' ? editData.clientPhone : null,
    });
    setStep('done');
  };

  const updateItem = (idx, field, value) => {
    setEditData((prev) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };

  const removeItem = (idx) => {
    setEditData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const addItem = () => {
    setEditData((prev) => ({
      ...prev,
      items: [...prev.items, { id: generateId(), description: '', notes: '', rate: 0, qty: 1, unit: 'unit', discountType: 'fixed', discountAmount: 0, taxable: false }],
    }));
  };

  if (!isOpen) return null;

  const calcItemTotal = (item) => {
    const base = (item.rate || 0) * (item.qty || 1);
    const disc = item.discountType === 'percentage' ? base * (item.discountAmount || 0) / 100 : (item.discountAmount || 0);
    return base - disc;
  };

  const grandTotal = editData?.items?.reduce((sum, item) => sum + calcItemTotal(item), 0) || 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
      <div className={`${theme.cardBg} rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${theme.border}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${theme.accent} flex items-center justify-center`}>
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${theme.textPrimary}`}>Import PDF Invoice</h2>
              <p className={`text-xs ${theme.textMuted || 'text-gray-500'}`}>
                {step === 'upload' && 'Upload a PDF invoice to import'}
                {step === 'preview' && 'Review and edit before importing'}
                {step === 'done' && 'Import complete!'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-black/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`border-2 border-dashed ${theme.border} rounded-2xl p-12 text-center cursor-pointer hover:border-gray-400 transition-colors`}
                onClick={() => document.getElementById('pdf-import-input').click()}
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className={`w-10 h-10 animate-spin ${theme.iconColor || 'text-gray-400'}`} />
                    <p className={`text-sm ${theme.textMuted || 'text-gray-500'}`}>Reading PDF...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <FileText className={`w-12 h-12 ${theme.iconColor || 'text-gray-400'}`} />
                    <p className={`font-medium ${theme.textPrimary}`}>Drop a PDF here or click to browse</p>
                    <p className={`text-sm ${theme.textMuted || 'text-gray-500'}`}>Supports invoices from most formats</p>
                  </div>
                )}
                <input id="pdf-import-input" type="file" accept=".pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }} />
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}
            </div>
          )}

          {step === 'preview' && editData && (
            <div className="space-y-5">
              <div className={`border ${theme.border} rounded-xl p-4 space-y-3`}>
                <p className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted || 'text-gray-500'}`}>Invoice Details</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme.labelColor || 'text-gray-600'}`}>Number</label>
                    <input value={editData.number} onChange={(e) => setEditData({ ...editData, number: e.target.value })} className={`w-full px-3 py-2 border ${theme.inputBorder || 'border-gray-200'} rounded-lg text-sm ${theme.inputBg || ''} ${theme.textPrimary}`} />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme.labelColor || 'text-gray-600'}`}>Date</label>
                    <input type="date" value={editData.date} onChange={(e) => setEditData({ ...editData, date: e.target.value })} className={`w-full px-3 py-2 border ${theme.inputBorder || 'border-gray-200'} rounded-lg text-sm ${theme.inputBg || ''} ${theme.textPrimary}`} />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme.labelColor || 'text-gray-600'}`}>Due Date</label>
                    <input type="date" value={editData.dueDate} onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })} className={`w-full px-3 py-2 border ${theme.inputBorder || 'border-gray-200'} rounded-lg text-sm ${theme.inputBg || ''} ${theme.textPrimary}`} />
                  </div>
                </div>
              </div>

              <div className={`border ${theme.border} rounded-xl p-4 space-y-3`}>
                <p className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted || 'text-gray-500'}`}>Client</p>
                <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className={`w-full px-3 py-2 border ${theme.inputBorder || 'border-gray-200'} rounded-lg text-sm ${theme.inputBg || ''} ${theme.textPrimary}`}>
                  <option value="__new__">+ Create new client: {editData.clientName || '(unnamed)'}</option>
                  {(existingClients || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {selectedClientId === '__new__' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${theme.labelColor || 'text-gray-600'}`}>Name</label>
                      <input value={editData.clientName} onChange={(e) => setEditData({ ...editData, clientName: e.target.value })} className={`w-full px-3 py-2 border ${theme.inputBorder || 'border-gray-200'} rounded-lg text-sm ${theme.inputBg || ''} ${theme.textPrimary}`} />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${theme.labelColor || 'text-gray-600'}`}>Phone</label>
                      <input value={editData.clientPhone} onChange={(e) => setEditData({ ...editData, clientPhone: e.target.value })} className={`w-full px-3 py-2 border ${theme.inputBorder || 'border-gray-200'} rounded-lg text-sm ${theme.inputBg || ''} ${theme.textPrimary}`} />
                    </div>
                  </div>
                )}
              </div>

              <div className={`border ${theme.border} rounded-xl p-4 space-y-3`}>
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted || 'text-gray-500'}`}>Line Items ({editData.items.length})</p>
                  <button onClick={addItem} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${theme.accent}`}><Plus className="w-3 h-3" /> Add</button>
                </div>
                <div className="space-y-2">
                  {editData.items.map((item, idx) => (
                    <div key={item.id} className={`border ${theme.border} rounded-lg p-3 space-y-2`}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <input value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Description" className={`w-full px-3 py-1.5 border ${theme.inputBorder || 'border-gray-200'} rounded-lg text-sm font-medium ${theme.inputBg || ''} ${theme.textPrimary}`} />
                          <div className="flex gap-2">
                            <div className="w-28">
                              <label className={`block text-[10px] mb-0.5 ${theme.textMuted || 'text-gray-500'}`}>Rate</label>
                              <input type="number" value={item.rate} onChange={(e) => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)} className={`w-full px-2 py-1.5 border ${theme.inputBorder || 'border-gray-200'} rounded-lg text-sm ${theme.inputBg || ''} ${theme.textPrimary}`} />
                            </div>
                            <div className="w-16">
                              <label className={`block text-[10px] mb-0.5 ${theme.textMuted || 'text-gray-500'}`}>Qty</label>
                              <input type="number" value={item.qty} onChange={(e) => updateItem(idx, 'qty', parseInt(e.target.value) || 1)} className={`w-full px-2 py-1.5 border ${theme.inputBorder || 'border-gray-200'} rounded-lg text-sm ${theme.inputBg || ''} ${theme.textPrimary}`} />
                            </div>
                            <div className="w-24">
                              <label className={`block text-[10px] mb-0.5 ${theme.textMuted || 'text-gray-500'}`}>Discount</label>
                              <input type="number" value={item.discountAmount} onChange={(e) => updateItem(idx, 'discountAmount', parseFloat(e.target.value) || 0)} className={`w-full px-2 py-1.5 border ${theme.inputBorder || 'border-gray-200'} rounded-lg text-sm ${theme.inputBg || ''} ${theme.textPrimary}`} />
                            </div>
                            <div className="w-28 text-right pt-4">
                              <span className={`text-sm font-bold ${theme.textPrimary}`}>{fmtMoney(calcItemTotal(item))}</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => removeItem(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg mt-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`flex justify-end pt-2 border-t ${theme.border}`}>
                  <div className="text-right">
                    <span className={`text-xs ${theme.textMuted || 'text-gray-500'}`}>Total: </span>
                    <span className={`text-lg font-bold ${theme.textPrimary}`}>{fmtMoney(grandTotal)}</span>
                  </div>
                </div>
              </div>

              <details className={`border ${theme.border} rounded-xl`}>
                <summary className={`px-4 py-3 text-xs font-medium cursor-pointer ${theme.textMuted || 'text-gray-500'}`}>View raw PDF text</summary>
                <pre className={`px-4 pb-4 text-[10px] leading-tight whitespace-pre-wrap max-h-48 overflow-auto ${theme.textMuted || 'text-gray-500'}`}>{rawText}</pre>
              </details>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center"><Check className="w-8 h-8 text-green-600" /></div>
              <p className={`text-lg font-bold ${theme.textPrimary}`}>Invoice Imported!</p>
              <p className={`text-sm ${theme.textMuted || 'text-gray-500'}`}>{editData?.number} has been added to your invoices.</p>
              <button onClick={handleClose} className={`px-6 py-2.5 ${theme.accent} rounded-xl text-sm font-medium`}>Close</button>
            </div>
          )}
        </div>

        {step === 'preview' && (
          <div className={`flex items-center justify-between px-6 py-4 border-t ${theme.border}`}>
            <button onClick={reset} className={`px-4 py-2 text-sm rounded-xl border ${theme.border} ${theme.textPrimary} hover:bg-black/5`}>Back</button>
            <button onClick={handleConfirmImport} disabled={!editData?.items?.length} className={`flex items-center gap-2 px-5 py-2.5 ${theme.accent} rounded-xl text-sm font-medium disabled:opacity-50`}>
              <Check className="w-4 h-4" /> Import Invoice
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
