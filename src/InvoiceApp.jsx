import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  FileText,
  Users,
  Package,
  BarChart3,
  Plus,
  Search,
  ChevronLeft,
  Trash2,
  Edit,
  ArrowRightLeft,
  MoreVertical,
  Check,
  X,
  Phone,
  Mail,
  MapPin,
  Building2,
  CreditCard,
  FileSignature,
  Printer,
  Palette,
  Wallet,
  CalendarDays,
} from 'lucide-react';
import FinancePage from './FinancePage';
import StaffEventPage from './StaffEventPage';
import ImportPdfModal from './ImportPdfModal';
import {
  MobileLayout,
  MobileScrollAssist,
  getInvoiceAppShellLayout,
  InvoiceAppDesktopSidebar,
  useDeviceLayout,
} from './InvoiceAppLayout.jsx';
import { generatePDF } from './pdfGenerator.jsx';
import {
  isDocumentTaxEnabled,
  calculateItemTotal,
  calculateSubtotal,
  calculateTotalDiscount,
  calculateTotalTax,
  calculateDocumentTotals,
  calculateDocumentTotal,
  parseDocumentNumber,
  formatDocumentNumber,
  generateDocumentNumber,
} from './calculations';

// ============================================================================
// DATABASE LAYER - localStorage
// ============================================================================

const DB_KEYS = {
  settings: 'invoiceapp_settings',
  clients: 'invoiceapp_clients',
  items: 'invoiceapp_items',
  invoices: 'invoiceapp_invoices',
  estimates: 'invoiceapp_estimates',
};

// Migration function to fix old document numbers
const migrateDocumentNumbers = (invoices = [], estimates = []) => {
  let invoiceCounter = 1;
  let estimateCounter = 1;

  const fixedInvoices = invoices.map((inv) => {
    if (String(inv.number || '').startsWith('EST')) {
      return {
        ...inv,
        number: `INV${String(invoiceCounter++).padStart(5, '0')}`,
      };
    }
    return inv;
  });

  const fixedEstimates = estimates.map((est) => {
    if (!String(est.number || '').startsWith('EST')) {
      return {
        ...est,
        number: `EST${String(estimateCounter++).padStart(5, '0')}`,
      };
    }
    return est;
  });

  return { fixedInvoices, fixedEstimates };
};

const useDatabase = () => {
  const [data, setData] = useState({
    settings: null,
    clients: [],
    items: [],
    invoices: [],
    estimates: [],
  });
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const results = {};
      for (const [key, dbKey] of Object.entries(DB_KEYS)) {
        try {
          const raw = localStorage.getItem(dbKey);
          results[key] = raw ? JSON.parse(raw) : key === 'settings' ? null : [];
        } catch {
          results[key] = key === 'settings' ? null : [];
        }
      }

      // Apply migration to fix old document numbers
      const { fixedInvoices, fixedEstimates } = migrateDocumentNumbers(
        results.invoices || [],
        results.estimates || []
      );

      // Update results with migrated data
      results.invoices = fixedInvoices;
      results.estimates = fixedEstimates;

      // Save migrated data back to localStorage
      localStorage.setItem(DB_KEYS.invoices, JSON.stringify(fixedInvoices));
      localStorage.setItem(DB_KEYS.estimates, JSON.stringify(fixedEstimates));

      if (results.settings) {
        const normalizedSettings = {
          ...SAMPLE_SETTINGS,
          ...results.settings,
          defaultInvoiceNotes: String(results.settings.defaultInvoiceNotes || '').trim()
            ? results.settings.defaultInvoiceNotes
            : SAMPLE_SETTINGS.defaultInvoiceNotes,
          defaultEstimateNotes: String(results.settings.defaultEstimateNotes || '').trim()
            ? results.settings.defaultEstimateNotes
            : SAMPLE_SETTINGS.defaultEstimateNotes,
        };

        results.settings = normalizedSettings;
        localStorage.setItem(DB_KEYS.settings, JSON.stringify(normalizedSettings));
      }

      setData(results);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const save = useCallback(async (key, value) => {
    try {
      localStorage.setItem(DB_KEYS[key], JSON.stringify(value));
      setData((prev) => ({ ...prev, [key]: value }));
      return true;
    } catch (error) {
      console.error('Save error:', error);
      return false;
    }
  }, []);

  // Theme-only update: merges appTheme into settings without replacing other data
  const saveTheme = useCallback((themeName) => {
    setData((prev) => {
      const updated = { ...(prev.settings || {}), appTheme: themeName };
      localStorage.setItem(DB_KEYS.settings, JSON.stringify(updated));
      return { ...prev, settings: updated };
    });
  }, []);

  return { data, save, saveTheme, loading, reload: loadAll };
};

// ============================================================================
// SAMPLE DATA
// ============================================================================

const SAMPLE_SETTINGS = {
  businessName: 'RECORD PRODUCTIONS',
  businessNumber: '2021/160719/07',
  address: '240 Waterberry Heights\n1 Waterberry Street, Potchefstroom 2531\nNorth West',
  phone: '0760200509',
  email: 'recordproductions777@gmail.com',
  bankName: 'FNB',
  accountNumber: '62929725101',
  accountType: 'FNB GOLD BUSINESS ACCOUNT',
  branchCode: '240438',
  branchName: 'POTCHEFSTROOM',
  swiftCode: 'FIRNZAJJ',
  taxRate: 15,
  taxLabel: 'VAT',
  customBlock1:
    'Event ends at 24:00/Formal arrangement.\n50% deposit required to book the event.\nFull payment due before the event starts.',
  customBlock2:
    'Events must be cancelled 15 days prior to reclaim the deposit.\nIf hired equipment is not returned or is damaged, charges will apply.',
  defaultInvoiceNotes:
    "Kindly observe the following formal arrangements for our events:\n\n1. The event will conclude promptly at midnight./Formal arrangement\n2. Any additional hours requested beyond midnight will incur an additional charge of R700 per hour./Formal arrangement\n3. A 50% deposit is mandatory to secure a booking. The remaining balance must be settled in full before the event commences.\n4. In the event of cancellation, 15 days' notice is required to be eligible for a deposit refund. Failure to provide timely notice will result in forfeiture of the deposit.\n\nHiring Equipment:\n\n1. If hired equipment is not returned, the client will be charged the full price.\n2. If equipment is damaged, the client will be charged for the damages.",
  defaultEstimateNotes:
    '• Event ends at 24:00/Formal arrangement.\n• 50% deposit required to book the event/Formal arrangement.\n• Full payment due before the event starts.\n• Events must be cancelled 15 days prior to reclaim the deposit; otherwise, the deposit is non-refundable.\n• If hired equipment is not returned or is damaged, charges will apply.',
  nextInvoiceNumber: '00000',
  nextEstimateNumber: '00000',
  logo: null,
  appTheme: 'default',
};

// ============================================================================
// THEMES
// ============================================================================

const THEMES = {
  default: {
    appBg: 'bg-slate-100',
    panelBg: 'bg-white',
    cardBg: 'bg-white',
    sidebarBg: 'bg-white',
    sidebarActive: 'bg-slate-900 text-white',
    sidebarInactive: 'text-slate-700 hover:bg-slate-200',
    sidebarText: 'text-slate-900 font-semibold text-base',
    sidebarTextMuted: 'text-slate-500 font-medium',
    border: 'border-slate-300',
    textPrimary: 'text-slate-900 font-bold text-base',
    textSecondary: 'text-slate-700 font-medium',
    textMuted: 'text-slate-500 font-normal',
    accent: 'bg-slate-900 text-white',
    accentHover: 'hover:bg-slate-800',
    inputBg: 'bg-white',
    inputBorder: 'border-slate-400',
    modalBg: 'bg-white',
    badgePending: 'bg-yellow-100 text-yellow-800',
    badgeAccepted: 'bg-emerald-100 text-emerald-800',
    badgeDeclined: 'bg-red-100 text-red-800',
    badgeOutstanding: 'bg-slate-100 text-slate-800',
    subtleBg: 'bg-slate-50',
    cardHover: 'hover:bg-slate-100',
    buttonHover: 'hover:bg-slate-200',
    iconColor: 'text-slate-700',
    labelColor: 'text-slate-800 font-semibold',
    toggleInactive: 'bg-slate-300',
    tableHeaderBg: 'bg-slate-100',
    tableRowHover: 'hover:bg-slate-100',
    mobileNavBg: 'bg-white border-t border-slate-300',
    mobileNavActive: 'text-slate-900 bg-slate-200',
    mobileNavInactive: 'text-slate-500',
    sectionHeaderBg: 'bg-slate-100',
    spinner: 'border-slate-300 border-t-slate-900',
  },
  'crimson-dusk': {
    appBg: 'bg-[#06141B]',
    panelBg: 'bg-[#11212D]',
    cardBg: 'bg-[#253745]',
    sidebarBg: 'bg-[#11212D]',
    sidebarActive: 'bg-[#4A5C6A] text-[#CCD0CF]',
    sidebarInactive: 'text-[#9BA8AB] hover:bg-[#253745]',
    sidebarText: 'text-[#CCD0CF]',
    sidebarTextMuted: 'text-[#9BA8AB]/70',
    border: 'border-[#4A5C6A]',
    textPrimary: 'text-[#CCD0CF]',
    textSecondary: 'text-[#9BA8AB]',
    textMuted: 'text-[#9BA8AB]/70',
    accent: 'bg-[#4A5C6A] text-[#CCD0CF]',
    accentHover: 'hover:bg-[#253745]',
    inputBg: 'bg-[#253745]',
    inputBorder: 'border-[#4A5C6A]',
    modalBg: 'bg-[#11212D]',
    badgePending: 'bg-[#9BA8AB]/20 text-[#9BA8AB]',
    badgeAccepted: 'bg-[#CCD0CF]/20 text-[#CCD0CF]',
    badgeDeclined: 'bg-[#4A5C6A]/20 text-[#4A5C6A]',
    badgeOutstanding: 'bg-[#253745] text-[#9BA8AB]',
    subtleBg: 'bg-[#06141B]',
    cardHover: 'hover:bg-[#253745]/80',
    buttonHover: 'hover:bg-[#253745]',
    iconColor: 'text-[#9BA8AB]',
    labelColor: 'text-[#9BA8AB]',
    toggleInactive: 'bg-[#4A5C6A]',
    tableHeaderBg: 'bg-[#4A5C6A]',
    tableRowHover: 'hover:bg-[#253745]/60',
    mobileNavBg: 'bg-[#11212D] border-t border-[#4A5C6A]',
    mobileNavActive: 'text-[#CCD0CF] bg-[#4A5C6A]',
    mobileNavInactive: 'text-[#9BA8AB]/70',
    sectionHeaderBg: 'bg-[#06141B]',
    spinner: 'border-[#4A5C6A] border-t-[#CCD0CF]',
  },
  'aurora-teal': {
    appBg: 'bg-[#061A1F]',
    panelBg: 'bg-[#072E33]',
    cardBg: 'bg-[#0A3D44]',
    sidebarBg: 'bg-[#072E33]',
    sidebarActive: 'bg-[#0F969C] text-white',
    sidebarInactive: 'text-[#6DA5C0]/80 hover:bg-[#0C7075]/30',
    sidebarText: 'text-[#E0F2F7]',
    sidebarTextMuted: 'text-[#6DA5C0]/60',
    border: 'border-[#0F969C]/30',
    textPrimary: 'text-[#E0F2F7]',
    textSecondary: 'text-[#6DA5C0]',
    textMuted: 'text-[#6DA5C0]/60',
    accent: 'bg-[#0F969C] text-white',
    accentHover: 'hover:bg-[#0C7075]',
    inputBg: 'bg-[#061A1F]',
    inputBorder: 'border-[#0F969C]/40',
    modalBg: 'bg-[#072E33]',
    badgePending: 'bg-[#0F969C]/20 text-[#6DA5C0]',
    badgeAccepted: 'bg-[#0F969C]/30 text-[#0F969C]',
    badgeDeclined: 'bg-red-900/30 text-red-300',
    badgeOutstanding: 'bg-[#0A3D44] text-[#6DA5C0]',
    subtleBg: 'bg-[#061A1F]',
    cardHover: 'hover:bg-[#0C7075]/20',
    buttonHover: 'hover:bg-[#294D61]',
    iconColor: 'text-[#6DA5C0]/60',
    labelColor: 'text-[#6DA5C0]',
    toggleInactive: 'bg-[#294D61]',
    tableHeaderBg: 'bg-[#0C7075]/30',
    tableRowHover: 'hover:bg-[#0C7075]/20',
    mobileNavBg: 'bg-[#072E33] border-t border-[#0F969C]/30',
    mobileNavActive: 'text-[#0F969C] bg-[#0F969C]/20',
    mobileNavInactive: 'text-[#6DA5C0]/60',
    sectionHeaderBg: 'bg-[#061A1F]',
    spinner: 'border-[#0F969C]/30 border-t-[#0F969C]',
  },
  'crimson-glass': {
    appBg: 'bg-[#0A0607]',
    panelBg: 'bg-[#0F0809]',
    cardBg: 'bg-[#1A0D10]',
    sidebarBg: 'bg-[#0F0809]',
    sidebarActive: 'bg-[#8E1020] text-white',
    sidebarInactive: 'text-white/60 hover:bg-[#5C0B16]/40',
    sidebarText: 'text-white',
    sidebarTextMuted: 'text-white/45',
    border: 'border-white/10',
    textPrimary: 'text-white',
    textSecondary: 'text-white/70',
    textMuted: 'text-white/45',
    accent: 'bg-[#D4142A] text-white',
    accentHover: 'hover:bg-[#8E1020]',
    inputBg: 'bg-[#1A0D10]',
    inputBorder: 'border-white/15',
    modalBg: 'bg-[#0F0809]',
    badgePending: 'bg-[#5C0B16]/50 text-white/80',
    badgeAccepted: 'bg-emerald-900/40 text-emerald-300',
    badgeDeclined: 'bg-[#D4142A]/30 text-[#FF3347]',
    badgeOutstanding: 'bg-[#5C0B16]/30 text-white/65',
    subtleBg: 'bg-[#0A0607]',
    cardHover: 'hover:bg-[#5C0B16]/25',
    buttonHover: 'hover:bg-[#5C0B16]/50',
    iconColor: 'text-white/40',
    labelColor: 'text-white/75',
    toggleInactive: 'bg-[#5C0B16]',
    tableHeaderBg: 'bg-[#8E1020]/40',
    tableRowHover: 'hover:bg-[#5C0B16]/20',
    mobileNavBg: 'bg-[#0F0809] border-t border-white/10',
    mobileNavActive: 'text-white bg-[#8E1020]',
    mobileNavInactive: 'text-white/45',
    sectionHeaderBg: 'bg-[#0A0607]',
    spinner: 'border-white/15 border-t-[#D4142A]',
  },
  'graphite-noir': {
    appBg: 'bg-[#c8c8c8]',
    panelBg: 'bg-[#d8d8d8]',
    cardBg: 'bg-[#e8e8e8]',
    sidebarBg: 'bg-black',
    sidebarActive: 'bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
    sidebarInactive: 'text-white/55 hover:bg-white/8',
    sidebarText: 'text-white',
    sidebarTextMuted: 'text-white/40',
    border: 'border-[#b8b8b8]',
    textPrimary: 'text-[#1a1a1c]',
    textSecondary: 'text-[#4a4a4a]',
    textMuted: 'text-[#888888]',
    accent: 'bg-[#1a1a1c] text-white',
    accentHover: 'hover:bg-[#333336]',
    inputBg: 'bg-[#dcdcdc]',
    inputBorder: 'border-[#b8b8b8]',
    modalBg: 'bg-[#d8d8d8]',
    badgePending: 'bg-[#f5e6b8] text-[#7a6510]',
    badgeAccepted: 'bg-[#d4e8d4] text-[#3a6a3a]',
    badgeDeclined: 'bg-[#f0c8c8] text-[#a01a1a]',
    badgeOutstanding: 'bg-[#cecece] text-[#5a5a5a]',
    subtleBg: 'bg-[#d0d0d0]',
    cardHover: 'hover:bg-[#e0e0e0]',
    buttonHover: 'hover:bg-[#cccccc]',
    iconColor: 'text-[#888888]',
    labelColor: 'text-[#4a4a4a]',
    toggleInactive: 'bg-[#b5b5b5]',
    tableHeaderBg: 'bg-[#d0d0d0]',
    tableRowHover: 'hover:bg-[#e0e0e0]',
    mobileNavBg: 'bg-black border-t border-white/10',
    mobileNavActive: 'text-white bg-white/15',
    mobileNavInactive: 'text-white/45',
    sectionHeaderBg: 'bg-[#d0d0d0]',
    spinner: 'border-[#b8b8b8] border-t-[#1a1a1c]',
  },
};

const SAMPLE_CLIENTS = [
  {
    id: 'c1',
    name: 'North-West University - TAD RAG FARM EVENT',
    addressLine1: '11 HOFFMAN STR',
    addressLine2: 'Private Bag X60013',
    city: 'Potchefstroom',
    postalCode: '2526',
    phone: '+27 60 944 9814',
    email: 'events@nwu.ac.za',
    vatNumber: '4500 209 301',
    notes: 'University events department',
  },
  {
    id: 'c2',
    name: 'Makarios ---> 14 May (Lehan & Anli)',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    phone: '+27 84 581 3421',
    email: '',
    notes: 'Wedding event',
  },
  {
    id: 'c3',
    name: 'Sunset Lounge Bar',
    addressLine1: '45 Main Street',
    addressLine2: '',
    city: 'Potchefstroom',
    postalCode: '2531',
    phone: '+27 82 555 1234',
    email: 'info@sunsetlounge.co.za',
    notes: 'Regular weekend events',
  },
];

const SAMPLE_ITEMS = [
  {
    id: 'i1',
    name: '3 Block Stage for DJ',
    description: 'Modular stage blocks for DJ setup',
    unitCost: 500,
    unit: 'block',
    quantity: 1,
    discountType: 'percentage',
    discountAmount: 0,
    taxable: true,
    additionalDetails: '',
  },
  {
    id: 'i2',
    name: 'Sound for Event (Full Package)',
    description: '4x Line array Tops, 4x 18-inch bassbins, 1x DJ Monitor, 1x Mic',
    unitCost: 8500,
    unit: 'package',
    quantity: 1,
    discountType: 'percentage',
    discountAmount: 0,
    taxable: true,
    additionalDetails: '',
  },
  {
    id: 'i3',
    name: 'Sound for Event (Wedding)',
    description: 'Sound for chapel, Canapés, Reception: 4 Tops, 1 Sub',
    unitCost: 5000,
    unit: 'package',
    quantity: 1,
    discountType: 'percentage',
    discountAmount: 0,
    taxable: true,
    additionalDetails: '',
  },
  {
    id: 'i4',
    name: 'DJ + Labour',
    description: 'Professional DJ services including setup',
    unitCost: 1500,
    unit: 'service',
    quantity: 1,
    discountType: 'percentage',
    discountAmount: 0,
    taxable: true,
    additionalDetails: '',
  },
  {
    id: 'i5',
    name: 'DJ + Traveling',
    description: 'DJ services with travel included',
    unitCost: 1500,
    unit: 'service',
    quantity: 1,
    discountType: 'percentage',
    discountAmount: 0,
    taxable: true,
    additionalDetails: '',
  },
  {
    id: 'i6',
    name: 'Light Package (Standard)',
    description: '4x Parcans, 2x Moving heads, 2x Derby lights (disco ball effect)',
    unitCost: 1500,
    unit: 'package',
    quantity: 1,
    discountType: 'percentage',
    discountAmount: 0,
    taxable: true,
    additionalDetails: '',
  },
  {
    id: 'i7',
    name: 'Light Package (Premium)',
    description: '4x Parcans, 2x Moving wash, 1x Derby light, Smoker',
    unitCost: 4000,
    unit: 'package',
    quantity: 1,
    discountType: 'percentage',
    discountAmount: 0,
    taxable: true,
    additionalDetails: '',
  },
];

const SAMPLE_INVOICES = [
  {
    id: 'inv1',
    number: 'INV17054',
    clientId: 'c2',
    date: '2026-03-02',
    dueDate: '2026-03-02',
    status: 'outstanding',
    amountPaid: 0,
    items: [
      {
        id: 'li1',
        description: 'Sound for Event',
        notes: 'Sound for chapel\nSound for Canapés\nSound for Reception:\n- 4 Tops\n- 1 Sub',
        rate: 5000,
        qty: 1,
        unit: 'package',
        discountType: 'percentage',
        discountAmount: 0,
        taxable: true,
      },
      {
        id: 'li2',
        description: 'Light package',
        notes: '4 - Parcans\n2 - Moving wash\n1 - Derby light\nSmoker',
        rate: 4000,
        qty: 1,
        unit: 'package',
        discountType: 'percentage',
        discountAmount: 0,
        taxable: true,
      },
      {
        id: 'li3',
        description: 'DJ + Traveling',
        notes: '',
        rate: 1500,
        qty: 1,
        unit: 'service',
        discountType: 'percentage',
        discountAmount: 0,
        taxable: true,
      },
    ],
    notes: '',
    overallDiscount: 0,
    overallDiscountType: 'percentage',
    taxEnabled: true,
    createdAt: '2026-03-02',
  },
];

const SAMPLE_ESTIMATES = [
  {
    id: 'est1',
    number: 'EST033',
    clientId: 'c1',
    date: '2026-03-02',
    status: 'pending',
    items: [
      {
        id: 'li1',
        description: '3 block Stage for DJ',
        notes: '',
        rate: 500,
        qty: 3,
        unit: 'block',
        discountType: 'percentage',
        discountAmount: 0,
        taxable: true,
      },
      {
        id: 'li2',
        description: 'Sound for Event',
        notes: '4x Line array Tops\n4X 18-inch bassbins\n1x DJ Monitor\n1x Mic',
        rate: 8500,
        qty: 1,
        unit: 'package',
        discountType: 'percentage',
        discountAmount: 0,
        taxable: true,
      },
    ],
    notes: '',
    overallDiscount: 0,
    overallDiscountType: 'percentage',
    taxEnabled: true,
    createdAt: '2026-03-02',
  },
];

// ============================================================================
// UTILITIES
// ============================================================================

const generateId = () => Math.random().toString(36).slice(2, 11);

const getBusinessMonogram = (businessName = 'Invoice App') => {
  const initials = String(businessName)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();

  return initials || 'IA';
};

const formatCurrency = (amount) =>
  `R${Number(amount || 0).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-ZA');
};

const formatClientAddress = (client, forHtml = false) => {
  if (!client) return '';

  if (client.addressLine1 || client.addressLine2 || client.city || client.postalCode) {
    const lines = [];
    if (client.addressLine1) lines.push(client.addressLine1);
    if (client.addressLine2) lines.push(client.addressLine2);
    if (client.city || client.postalCode) {
      lines.push([client.city, client.postalCode].filter(Boolean).join(', '));
    }
    return forHtml ? lines.join('<br>') : lines.join('\n');
  }

  if (client.address) {
    return forHtml ? client.address.replace(/\n/g, '<br>') : client.address;
  }

  return '';
};

// ============================================================================
// UI HELPERS
// ============================================================================

const StatusBadge = ({ status, theme = THEMES.default }) => {
  const styles = {
    paid: theme.badgeAccepted,
    outstanding: theme.badgeOutstanding,
    accepted: theme.badgeAccepted,
    declined: theme.badgeDeclined,
    pending: theme.badgePending,
  };
  const labelMap = {
    accepted: 'Approved',
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${styles[status] || styles.pending}`}>
      {labelMap[status] || (status?.charAt(0).toUpperCase() + status?.slice(1))}
    </span>
  );
};

const EmptyState = ({ icon: Icon, title, description, action, theme = THEMES.default }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className={`w-16 h-16 rounded-2xl ${theme.subtleBg} flex items-center justify-center mb-4`}>
      <Icon className={`w-8 h-8 ${theme.iconColor}`} />
    </div>
    <h3 className={`text-lg font-semibold ${theme.textPrimary} mb-1`}>{title}</h3>
    <p className={`text-sm ${theme.textMuted} mb-6 max-w-xs`}>{description}</p>
    {action}
  </div>
);

const ChartEmptyState = ({ title = 'No data available', description = 'Adjust your filters or create more activity to see this chart.', theme = THEMES.default }) => (
  <div className={`flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed ${theme.border} ${theme.subtleBg} px-6 text-center`}>
    <p className={`text-sm font-semibold ${theme.textPrimary}`}>{title}</p>
    <p className={`mt-2 max-w-xs text-xs ${theme.textMuted}`}>{description}</p>
  </div>
);

const AnalyticsCard = ({ title, subtitle, children, theme = THEMES.default, className = '' }) => (
  <div className={`${theme.cardBg} border border-transparent rounded-xl sm:rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden transition hover:shadow-[0_6px_25px_rgba(0,0,0,0.08)] ${className}`}>
    <div className={`px-3 py-2.5 sm:p-5 border-b ${theme.border}`}>
      <h3 className={`text-sm sm:text-[16px] font-bold ${theme.textPrimary}`}>{title}</h3>
      {subtitle ? <p className={`mt-0.5 text-xs sm:mt-1 sm:text-sm ${theme.textMuted}`}>{subtitle}</p> : null}
    </div>
    <div className="p-3 sm:p-5">{children}</div>
  </div>
);

const SummaryMetricCard = ({ title, value, detail, accentClass, theme = THEMES.default }) => (
  <div className={`${theme.cardBg} border border-transparent rounded-2xl p-3 sm:rounded-[24px] sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition hover:shadow-[0_6px_25px_rgba(0,0,0,0.08)]`}>
    <div className="flex items-start justify-between gap-2 sm:gap-3">
      <div>
        <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-[0.16em] ${theme.textMuted}`}>{title}</p>
        <p className={`mt-1.5 text-base sm:mt-3 sm:text-2xl font-bold ${theme.textPrimary}`}>{value}</p>
        {detail ? <p className={`mt-1 text-xs sm:mt-2 sm:text-sm ${theme.textSecondary}`}>{detail}</p> : null}
      </div>
      <span className={`h-8 w-1 sm:h-10 sm:w-1.5 rounded-full ${accentClass}`} />
    </div>
  </div>
);

const formatCompactCurrency = (amount) => {
  const value = Number(amount || 0);
  if (Math.abs(value) >= 1000000) return `R${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `R${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
};

const SimpleMultiBarChart = ({ data, series, theme = THEMES.default, height = 260 }) => {
  if (!data.length) {
    return <ChartEmptyState theme={theme} title="No revenue data" description="There is no period activity for the current filters." />;
  }

  const maxValue = Math.max(1, ...data.flatMap((item) => series.map((entry) => Number(item[entry.key] || 0))));

  return (
    <div className="space-y-2.5 sm:space-y-4">
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {series.map((entry) => (
          <div key={entry.key} className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
            <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className={theme.textMuted}>{entry.label}</span>
          </div>
        ))}
      </div>
      <div
        className="flex items-end gap-1.5 sm:gap-4 overflow-x-auto pb-1 sm:pb-2 min-h-[140px] sm:min-h-[var(--chart-height)]"
        style={{ '--chart-height': `${height}px`, '--chart-body-height': `${Math.max(height - 40, 140)}px` }}
      >
        {data.map((item) => (
          <div key={item.label} className="flex min-w-[32px] sm:min-w-[96px] flex-1 flex-col items-center gap-1.5 sm:gap-3">
            <div className="flex h-[140px] sm:h-[var(--chart-body-height)] w-full items-end justify-center gap-1 sm:gap-2">
              {series.map((entry) => {
                const value = Number(item[entry.key] || 0);
                const barHeight = `${Math.max((value / maxValue) * 100, value > 0 ? 6 : 0)}%`;
                return (
                  <div key={entry.key} className="flex h-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-xl transition-all"
                      style={{
                        height: barHeight,
                        background: `linear-gradient(180deg, ${entry.color}, ${entry.color}bb)`,
                        boxShadow: `0 10px 30px ${entry.color}22`,
                      }}
                      title={`${entry.label}: ${formatCurrency(value)}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="text-center">
              <p className={`text-[10px] sm:text-xs font-semibold leading-tight ${theme.textPrimary}`}>{item.label}</p>
              <p className={`mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] ${theme.textMuted}`}>{formatCompactCurrency(item.total)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DonutChart = ({ data, centerLabel, centerValue, theme = THEMES.default }) => {
  if (!data.length || data.every((item) => !item.value)) {
    return <ChartEmptyState theme={theme} title="No chart data" description="There is not enough activity for this breakdown yet." />;
  }

  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const radius = 72;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
      <div className="relative mx-auto h-[220px] w-[220px]">
        <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
          <circle cx="110" cy="110" r={radius} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth={strokeWidth} />
          {data.map((item) => {
            const value = Number(item.value || 0);
            const dash = total > 0 ? (value / total) * circumference : 0;
            const element = (
              <circle
                key={item.label}
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-currentOffset}
                strokeLinecap="round"
              />
            );
            currentOffset += dash;
            return element;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${theme.textMuted}`}>{centerLabel}</p>
          <p className={`mt-2 text-3xl font-bold ${theme.textPrimary}`}>{centerValue}</p>
        </div>
      </div>
      <div className="space-y-3">
        {data.map((item) => {
          const percent = total > 0 ? ((Number(item.value || 0) / total) * 100).toFixed(1) : '0.0';
          return (
            <div key={item.label} className={`flex items-center justify-between rounded-xl border ${theme.border} ${theme.subtleBg} px-4 py-3`}>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <div>
                  <p className={`text-sm font-medium ${theme.textPrimary}`}>{item.label}</p>
                  <p className={`text-xs ${theme.textMuted}`}>{item.detail || `${percent}% of total`}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${theme.textPrimary}`}>{item.value}</p>
                <p className={`text-xs ${theme.textMuted}`}>{percent}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const HorizontalBarChart = ({ data, theme = THEMES.default, formatter = formatCurrency }) => {
  if (!data.length) {
    return <ChartEmptyState theme={theme} title="No client data" description="Client rankings will appear here when invoices exist for the selected filters." />;
  }

  const maxValue = Math.max(1, ...data.map((item) => Number(item.value || 0)));

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.label} className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className={`truncate text-sm font-medium ${theme.textPrimary}`}>{item.label}</p>
              {item.detail ? <p className={`text-xs ${theme.textMuted}`}>{item.detail}</p> : null}
            </div>
            <p className={`shrink-0 text-sm font-semibold ${theme.textPrimary}`}>{formatter(item.value)}</p>
          </div>
          <div className={`h-3 overflow-hidden rounded-full ${theme.subtleBg}`}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((Number(item.value || 0) / maxValue) * 100, item.value > 0 ? 8 : 0)}%`,
                background: item.color || 'linear-gradient(90deg, #8E1020, #D4142A)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const CompactFormContext = React.createContext(false);

const useCompactFormMode = () => React.useContext(CompactFormContext);

const FormInput = ({ label, type = 'text', value, onChange, placeholder, multiline, rows = 3, theme = THEMES.default }) => {
  const compactMode = useCompactFormMode();
  const fieldClasses = compactMode
    ? 'px-3 py-2 rounded-lg text-[13px]'
    : 'px-4 py-2.5 rounded-xl text-sm';

  return (
    <div className={compactMode ? 'space-y-1' : 'space-y-1.5'}>
      <label className={`${compactMode ? 'text-xs' : 'text-sm'} font-medium ${theme.textSecondary}`}>{label}</label>
      {multiline ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={compactMode ? Math.max(2, rows - 1) : rows}
          className={`w-full ${fieldClasses} border ${theme.inputBg} ${theme.inputBorder} focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 shadow-sm resize-none ${theme.textPrimary} transition-colors`}
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${fieldClasses} border ${theme.inputBg} ${theme.inputBorder} focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 shadow-sm ${theme.textPrimary} transition-colors`}
        />
      )}
    </div>
  );
};

const ToggleSwitch = ({ checked, onChange, theme = THEMES.default }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative h-7 w-12 rounded-full transition-colors ${checked ? theme.accent : theme.toggleInactive}`}
  >
    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-1'}`} />
  </button>
);

const DocumentTotalsSummary = ({
  doc,
  taxRate,
  taxLabel = 'VAT',
  theme = THEMES.default,
  showPayments = false,
}) => {
  const totals = calculateDocumentTotals(doc, taxRate);

  return (
    <div className={`rounded-2xl border ${theme.border} ${theme.subtleBg} p-4`}>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className={theme.textSecondary}>Subtotal</span>
          <span className={theme.textPrimary}>{formatCurrency(totals.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className={theme.textSecondary}>Item Discounts</span>
          <span className={theme.textPrimary}>{formatCurrency(totals.itemDiscount)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className={theme.textSecondary}>Document Discount</span>
          <span className={theme.textPrimary}>{formatCurrency(totals.overallDiscountAmount)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className={theme.textSecondary}>{`${taxLabel} ${totals.taxEnabled ? `(${taxRate}%)` : '(Off)'}`}</span>
          <span className={theme.textPrimary}>{formatCurrency(totals.totalTax)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-2">
          <span className={`font-semibold ${theme.textPrimary}`}>Total</span>
          <span className={`font-semibold ${theme.textPrimary}`}>{formatCurrency(totals.total)}</span>
        </div>
        {showPayments && (
          <>
            <div className="flex items-center justify-between gap-4">
              <span className={theme.textSecondary}>Payments Received</span>
              <span className={theme.textPrimary}>{formatCurrency(totals.amountPaid)}</span>
            </div>
            <div className={`flex items-center justify-between gap-4 border-t ${theme.border} pt-3`}>
              <span className={`text-base font-bold ${theme.textPrimary}`}>Balance Due</span>
              <span className={`text-base font-bold ${theme.textPrimary}`}>{formatCurrency(totals.balanceDue)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const DocumentTotalsEditor = ({
  form,
  setForm,
  taxRate,
  taxLabel = 'VAT',
  theme = THEMES.default,
  showPayments = false,
}) => {
  const compactMode = useCompactFormMode();
  const taxEnabled = isDocumentTaxEnabled(form);
  const selectClasses = compactMode
    ? `w-full px-3 py-2 border ${theme.inputBg} ${theme.inputBorder} rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 shadow-sm ${theme.textPrimary} transition-colors`
    : `w-full px-4 py-2.5 border ${theme.inputBg} ${theme.inputBorder} rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 shadow-sm ${theme.textPrimary} transition-colors`;

  return (
    <div className={`${theme.cardBg} border border-transparent ${compactMode ? 'rounded-2xl p-3 space-y-3' : 'rounded-[24px] p-5 space-y-5'} shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition hover:shadow-[0_6px_25px_rgba(0,0,0,0.08)]`}>
      <div className={`flex flex-col ${compactMode ? 'gap-2.5' : 'gap-3'} sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <p className={`font-semibold ${theme.textPrimary}`}>Totals</p>
          {!compactMode ? (
            <p className={`mt-1 text-sm ${theme.textMuted}`}>
              {showPayments
                ? `Add a document discount, control whether ${taxLabel} is applied, and track payments already received.`
                : `Add a document discount and control whether ${taxLabel} is applied.`}
            </p>
          ) : null}
        </div>
        <div className={`flex items-center ${compactMode ? 'gap-2.5 rounded-xl px-2.5 py-1.5' : 'gap-3 rounded-2xl px-3 py-2'} border ${theme.border} ${theme.subtleBg}`}>
          <div className="text-right">
            <p className={`${compactMode ? 'text-xs' : 'text-sm'} font-medium ${theme.textPrimary}`}>{taxLabel}</p>
            <p className={`text-xs ${theme.textMuted}`}>{taxEnabled ? `${taxRate}% on taxable items` : 'Not applied to this document'}</p>
          </div>
          <ToggleSwitch
            checked={taxEnabled}
            onChange={() => setForm({ ...form, taxEnabled: !taxEnabled })}
            theme={theme}
          />
        </div>
      </div>

      <div className={`grid ${compactMode ? 'gap-2.5' : 'gap-3'} ${showPayments ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        <div className={compactMode ? 'space-y-1' : 'space-y-1.5'}>
          <label className={`${compactMode ? 'text-xs' : 'text-sm'} font-medium ${theme.textSecondary}`}>Discount Type</label>
          <select
            value={form.overallDiscountType || 'percentage'}
            onChange={(e) => setForm({ ...form, overallDiscountType: e.target.value })}
            className={selectClasses}
          >
            <option value="percentage">Percentage</option>
            <option value="flat">Flat Amount</option>
          </select>
        </div>

        <FormInput
          label={form.overallDiscountType === 'percentage' ? 'Document Discount (%)' : 'Document Discount (R)'}
          type="number"
          value={form.overallDiscount}
          onChange={(v) => setForm({ ...form, overallDiscount: parseFloat(v) || 0 })}
          theme={theme}
        />

        {showPayments ? (
          <FormInput
            label="Payments Received (R)"
            type="number"
            value={form.amountPaid}
            onChange={(v) => setForm({ ...form, amountPaid: parseFloat(v) || 0 })}
            theme={theme}
          />
        ) : null}
      </div>

      <DocumentTotalsSummary
        doc={form}
        taxRate={taxRate}
        taxLabel={taxLabel}
        theme={theme}
        showPayments={showPayments}
      />
    </div>
  );
};

const ClientSelect = ({ label, value, onChange, clients, onAddNew, theme = THEMES.default }) => {
  const compactMode = useCompactFormMode();
  const [showModal, setShowModal] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    email: '',
    vatNumber: '',
    extraLine1: '',
    extraLine2: '',
    extraLine3: '',
    extraLine4: '',
    extraLine5: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    notes: '',
  });

  const handleSaveNewClient = () => {
    if (!newClient.name.trim()) return;
    const clientId = onAddNew(newClient);
    onChange(clientId);
    setShowModal(false);
    setNewClient({
      name: '',
      phone: '',
      email: '',
      vatNumber: '',
      extraLine1: '',
      extraLine2: '',
      extraLine3: '',
      extraLine4: '',
      extraLine5: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      postalCode: '',
      notes: '',
    });
  };

  return (
    <>
      <div className={compactMode ? 'space-y-1' : 'space-y-1'}>
        <label className={`${compactMode ? 'text-xs' : 'text-sm'} font-medium ${theme.labelColor}`}>{label}</label>
        <div className="flex gap-2">
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`flex-1 ${compactMode ? 'px-3 py-2 rounded-lg text-[13px]' : 'px-3 py-2 rounded-xl text-sm'} border ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary} focus:outline-none focus:ring-2 focus:ring-slate-900`}
          >
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className={`${compactMode ? 'px-2.5 py-2 rounded-lg text-[13px]' : 'px-3 py-2 rounded-xl text-sm'} ${theme.accent} font-medium ${theme.accentHover}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div
            className={`${theme.modalBg} rounded-t-2xl sm:rounded-2xl w-full max-w-md flex flex-col max-h-[90vh] sm:max-h-[85vh] min-h-0 overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
            style={{ touchAction: 'auto' }}
          >
            <div className={`px-4 py-3 border-b ${theme.border} flex items-center justify-between shrink-0`}>
              <h2 className={`font-semibold ${theme.textPrimary}`}>New Client</h2>
              <button onClick={() => setShowModal(false)}>
                <X className={`w-5 h-5 ${theme.iconColor}`} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ touchAction: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <FormInput label="Client Name" value={newClient.name} onChange={(v) => setNewClient({ ...newClient, name: v })} theme={theme} />
              <FormInput label="Phone" value={newClient.phone} onChange={(v) => setNewClient({ ...newClient, phone: v })} theme={theme} />
              <FormInput label="Email" value={newClient.email} onChange={(v) => setNewClient({ ...newClient, email: v })} theme={theme} />
              <FormInput label="VAT Number" value={newClient.vatNumber} onChange={(v) => setNewClient({ ...newClient, vatNumber: v })} theme={theme} />
              <FormInput label="Extra Info 1" value={newClient.extraLine1} onChange={(v) => setNewClient({ ...newClient, extraLine1: v })} theme={theme} />
              <FormInput label="Extra Info 2" value={newClient.extraLine2} onChange={(v) => setNewClient({ ...newClient, extraLine2: v })} theme={theme} />
              <FormInput label="Extra Info 3" value={newClient.extraLine3} onChange={(v) => setNewClient({ ...newClient, extraLine3: v })} theme={theme} />
              <FormInput label="Extra Info 4" value={newClient.extraLine4} onChange={(v) => setNewClient({ ...newClient, extraLine4: v })} theme={theme} />
              <FormInput label="Extra Info 5" value={newClient.extraLine5} onChange={(v) => setNewClient({ ...newClient, extraLine5: v })} theme={theme} />
              <FormInput label="Address Line 1" value={newClient.addressLine1} onChange={(v) => setNewClient({ ...newClient, addressLine1: v })} theme={theme} />
              <FormInput label="Address Line 2" value={newClient.addressLine2} onChange={(v) => setNewClient({ ...newClient, addressLine2: v })} theme={theme} />
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="City" value={newClient.city} onChange={(v) => setNewClient({ ...newClient, city: v })} theme={theme} />
                <FormInput label="Postal Code" value={newClient.postalCode} onChange={(v) => setNewClient({ ...newClient, postalCode: v })} theme={theme} />
              </div>
              <FormInput label="Notes" value={newClient.notes} onChange={(v) => setNewClient({ ...newClient, notes: v })} multiline rows={2} theme={theme} />
            </div>
            <div className={`px-4 py-3 border-t ${theme.border} flex gap-2 shrink-0`}>
              <button onClick={() => setShowModal(false)} className={`flex-1 ${compactMode ? 'py-2 text-sm rounded-lg' : 'py-2 rounded-xl'} border ${theme.border} ${theme.textPrimary}`}>
                Cancel
              </button>
              <button onClick={handleSaveNewClient} className={`flex-1 ${compactMode ? 'py-2 text-sm rounded-lg' : 'py-2 rounded-xl'} ${theme.accent}`}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const LineItemModal = ({
  isOpen,
  onClose,
  onSave,
  item,
  savedItems,
  taxRate,
  applyDocumentTax = true,
  theme = THEMES.default,
}) => {
  const compactMode = useCompactFormMode();
  const defaultItem = {
    id: generateId(),
    description: '',
    notes: '',
    rate: 0,
    qty: 1,
    unit: 'unit',
    discountType: 'percentage',
    discountAmount: 0,
    taxable: false,
  };

  const [form, setForm] = useState(item || defaultItem);

  useEffect(() => {
    if (isOpen) {
      setForm(item || { ...defaultItem, id: generateId() });
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const handleSavedItemSelect = (itemId) => {
    if (!itemId) return;
    const savedItem = savedItems.find((i) => i.id === itemId);
    if (savedItem) {
      setForm((prev) => ({
        ...prev,
        description: savedItem.name,
        notes: savedItem.description || savedItem.additionalDetails || '',
        rate: savedItem.unitCost || 0,
        unit: savedItem.unit || 'unit',
        qty: savedItem.quantity || 1,
        discountType: savedItem.discountType || 'percentage',
        discountAmount: savedItem.discountAmount || 0,
        taxable: !!savedItem.taxable,
      }));
    }
  };

  const calc = calculateItemTotal(form, taxRate, { applyTax: applyDocumentTax });

  const handleSave = () => {
    if (!form.description.trim()) {
      alert('Please enter a description');
      return;
    }
    onSave({
      ...form,
      rate: Number(form.rate) || 0,
      qty: form.qty === '' ? 0 : Number(form.qty) || 0,
      discountAmount: Number(form.discountAmount) || 0,
    });
    onClose();
  };

  return (
    <div className={`fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center ${compactMode ? 'p-0 sm:p-4' : 'p-4'}`}>
      <div className={`${theme.modalBg} ${theme.textPrimary} border ${theme.border} ${compactMode ? 'rounded-t-[24px] sm:rounded-2xl' : 'rounded-2xl'} w-full max-w-lg max-h-[92vh] overflow-auto shadow-2xl`}>
        <div className={`${compactMode ? 'px-3 py-2.5' : 'p-4'} border-b ${theme.border} flex items-center justify-between sticky top-0 ${theme.modalBg}`}>
          <button onClick={onClose}>
            <X className={`w-5 h-5 ${theme.textPrimary}`} />
          </button>
          <h2 className="font-semibold">{item ? 'Edit Item' : 'Add Item'}</h2>
          <button onClick={handleSave} className={`${compactMode ? 'px-3 py-1.5 text-[13px]' : 'px-4 py-2 text-sm'} ${theme.accent} ${theme.accentHover} rounded-xl`}>
            Save
          </button>
        </div>

        <div className={`${compactMode ? 'p-3 space-y-3' : 'p-4 space-y-4'}`}>
          {savedItems?.length > 0 && (
            <div>
              <label className={`${compactMode ? 'text-xs' : 'text-sm'} font-medium ${theme.labelColor}`}>Quick Add</label>
              <select
                onChange={(e) => handleSavedItemSelect(e.target.value)}
                defaultValue=""
                className={`w-full mt-1 ${compactMode ? 'px-3 py-2 rounded-lg text-[13px]' : 'px-3 py-2 rounded-xl text-sm'} border ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary}`}
              >
                <option value="">Select a saved item...</option>
                {savedItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} - {formatCurrency(i.unitCost)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <FormInput label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} theme={theme} />
          <FormInput label="Additional Details" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} multiline theme={theme} />
          <div className={`grid grid-cols-2 ${compactMode ? 'gap-2.5' : 'gap-3'}`}>
            <FormInput
              label="Rate"
              type="number"
              value={form.rate}
              onChange={(v) => setForm({ ...form, rate: parseFloat(v) || 0 })}
              theme={theme}
            />
            <FormInput
              label="Qty"
              type="number"
              value={form.qty}
              onChange={(v) => setForm({ ...form, qty: v === '' ? '' : parseFloat(v) || 0 })}
              theme={theme}
            />
          </div>

          <div className={`grid grid-cols-2 ${compactMode ? 'gap-2.5' : 'gap-3'}`}>
            <div className={compactMode ? 'space-y-1' : 'space-y-1'}>
              <label className={`${compactMode ? 'text-xs' : 'text-sm'} font-medium ${theme.labelColor}`}>Unit</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className={`w-full ${compactMode ? 'px-3 py-2 rounded-lg text-[13px]' : 'px-3 py-2 rounded-xl text-sm'} border ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary}`}
              >
                <option value="unit">Unit</option>
                <option value="hour">Hour</option>
                <option value="day">Day</option>
                <option value="package">Package</option>
                <option value="service">Service</option>
                <option value="block">Block</option>
              </select>
            </div>
            <div className={compactMode ? 'space-y-1' : 'space-y-1'}>
              <label className={`${compactMode ? 'text-xs' : 'text-sm'} font-medium ${theme.labelColor}`}>Discount Type</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                className={`w-full ${compactMode ? 'px-3 py-2 rounded-lg text-[13px]' : 'px-3 py-2 rounded-xl text-sm'} border ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary}`}
              >
                <option value="percentage">Percentage</option>
                <option value="flat">Flat Amount</option>
              </select>
            </div>
          </div>

          <FormInput
            label={form.discountType === 'percentage' ? 'Discount (%)' : 'Discount (R)'}
            type="number"
            value={form.discountAmount}
            onChange={(v) => setForm({ ...form, discountAmount: parseFloat(v) || 0 })}
            theme={theme}
          />

          <div className="flex items-center justify-between">
            <span className={`${compactMode ? 'text-xs' : 'text-sm'} font-medium ${theme.textPrimary}`}>Taxable</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, taxable: !form.taxable })}
              className={`relative w-12 h-7 rounded-full ${form.taxable ? theme.accent : theme.toggleInactive}`}
            >
              <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${form.taxable ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <div className={`${theme.accent} ${compactMode ? 'rounded-xl p-3' : 'rounded-2xl p-4'}`}>
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(calc.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span>Total</span>
              <span className="font-bold">{formatCurrency(calc.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SETTINGS PAGE (top-level component — must not be nested inside App)
// ============================================================================

const SettingsPage = ({ save, saveTheme, activeTheme, uploadLogo }) => {
  const [form, setForm] = useState(() => {
    try {
      const raw = localStorage.getItem(DB_KEYS.settings);
      const parsed = raw ? { ...SAMPLE_SETTINGS, ...JSON.parse(raw) } : SAMPLE_SETTINGS;
      return {
        ...parsed,
        nextInvoiceNumber: String(parsed.nextInvoiceNumber || '').replace(/^INV/i, '') || SAMPLE_SETTINGS.nextInvoiceNumber,
        nextEstimateNumber: String(parsed.nextEstimateNumber || '').replace(/^EST/i, '') || SAMPLE_SETTINGS.nextEstimateNumber,
      };
    } catch {
      return SAMPLE_SETTINGS;
    }
  });
  const [savedState, setSavedState] = useState(false);
  const buildSettingsPayload = (values) => ({
    ...values,
    nextInvoiceNumber: String(values.nextInvoiceNumber || '').replace(/\D/g, '') || SAMPLE_SETTINGS.nextInvoiceNumber,
    nextEstimateNumber: String(values.nextEstimateNumber || '').replace(/\D/g, '') || SAMPLE_SETTINGS.nextEstimateNumber,
  });

  // Persist draft to localStorage only — no React state update, no remount, no focus loss
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(DB_KEYS.settings, JSON.stringify(buildSettingsPayload(form)));
    }, 300);
    return () => clearTimeout(timer);
  }, [form]);

  const handleSave = async () => {
    await save('settings', buildSettingsPayload(form));
    setSavedState(true);
    setTimeout(() => setSavedState(false), 1500);
  };
  const businessMonogram = getBusinessMonogram(form.businessName);

  return (
    <div className="flex flex-col h-full">
      <div className={`px-4 py-3 lg:px-8 lg:py-5 border-b ${activeTheme.border} flex items-center justify-between`}>
        <h1 className={`text-lg font-bold lg:text-2xl ${activeTheme.textPrimary}`}>Settings</h1>
        <button onClick={handleSave} className={`px-3 py-1.5 text-sm font-medium ${activeTheme.accent} rounded-xl ${activeTheme.accentHover}`}>
          {savedState ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 py-4 lg:px-8 lg:py-8 space-y-4"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl p-4 space-y-4`}>
          <div className={`flex items-center gap-2 pb-1 border-b ${activeTheme.border}`}>
            <Building2 className={`w-4 h-4 ${activeTheme.iconColor}`} />
            <p className={`text-sm font-semibold ${activeTheme.textPrimary}`}>Business Details</p>
          </div>

          {/* Compact logo block */}
          <div className={`rounded-2xl border ${activeTheme.border} ${activeTheme.subtleBg} p-3`}>
            <div className="flex items-center gap-3">
              {/* Preview */}
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border ${form.logo ? activeTheme.border : `border-dashed ${activeTheme.border}`} ${activeTheme.inputBg} overflow-hidden`}>
                {form.logo ? (
                  <img src={form.logo} alt="Logo" className="max-h-full max-w-full object-contain p-1" />
                ) : (
                  <span className="text-[18px] font-black tracking-wide text-slate-400">{businessMonogram}</span>
                )}
              </div>
              {/* Actions */}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${activeTheme.textPrimary}`}>Brand Logo</p>
                <p className={`text-xs ${activeTheme.textMuted} mt-0.5`}>Shown in the sidebar and drawer.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium ${activeTheme.accent} ${activeTheme.accentHover}`}>
                    <span>{form.logo ? 'Replace' : 'Upload Logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        e.target.value = '';
                        let logoValue = null;
                        if (uploadLogo) {
                          const url = await uploadLogo(file);
                          if (url) logoValue = url;
                        }
                        if (!logoValue) {
                          logoValue = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => resolve(ev.target.result);
                            reader.readAsDataURL(file);
                          });
                        }
                        setForm((prev) => {
                          const next = { ...prev, logo: logoValue };
                          localStorage.setItem(DB_KEYS.settings, JSON.stringify(next));
                          return next;
                        });
                      }}
                    />
                  </label>
                  {form.logo ? (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, logo: null })}
                      className={`inline-flex items-center gap-1.5 rounded-xl border ${activeTheme.border} px-3 py-1.5 text-xs font-medium ${activeTheme.textPrimary} ${activeTheme.buttonHover}`}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <FormInput label="Business Name" value={form.businessName} onChange={(v) => setForm({ ...form, businessName: v })} theme={activeTheme} />
          <FormInput label="Business Number" value={form.businessNumber} onChange={(v) => setForm({ ...form, businessNumber: v })} theme={activeTheme} />
          <FormInput label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} multiline theme={activeTheme} />
          <FormInput label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} theme={activeTheme} />
          <FormInput label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} theme={activeTheme} />
        </div>

        <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl p-4 space-y-4`}>
          <div className={`flex items-center gap-2 pb-1 border-b ${activeTheme.border}`}>
            <CreditCard className={`w-4 h-4 ${activeTheme.iconColor}`} />
            <p className={`text-sm font-semibold ${activeTheme.textPrimary}`}>Banking Details</p>
          </div>
          <FormInput label="Bank Name" value={form.bankName} onChange={(v) => setForm({ ...form, bankName: v })} theme={activeTheme} />
          <FormInput label="Account Number" value={form.accountNumber} onChange={(v) => setForm({ ...form, accountNumber: v })} theme={activeTheme} />
          <FormInput label="Account Type" value={form.accountType} onChange={(v) => setForm({ ...form, accountType: v })} theme={activeTheme} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Branch Code" value={form.branchCode} onChange={(v) => setForm({ ...form, branchCode: v })} theme={activeTheme} />
            <FormInput label="Branch Name" value={form.branchName} onChange={(v) => setForm({ ...form, branchName: v })} theme={activeTheme} />
          </div>
          <FormInput label="Swift Code" value={form.swiftCode} onChange={(v) => setForm({ ...form, swiftCode: v })} theme={activeTheme} />
        </div>

        <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl p-4 space-y-4`}>
          <div className={`flex items-center gap-2 pb-1 border-b ${activeTheme.border}`}>
            <BarChart3 className={`w-4 h-4 ${activeTheme.iconColor}`} />
            <p className={`text-sm font-semibold ${activeTheme.textPrimary}`}>Tax</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Tax Rate (%)" type="number" value={form.taxRate} onChange={(v) => setForm({ ...form, taxRate: parseFloat(v) || 0 })} theme={activeTheme} />
            <FormInput label="Tax Label" value={form.taxLabel} onChange={(v) => setForm({ ...form, taxLabel: v })} theme={activeTheme} />
          </div>
        </div>

        <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl p-4`}>
          <div className={`flex items-center gap-2 pb-2 mb-3 border-b ${activeTheme.border}`}>
            <FileSignature className={`w-4 h-4 ${activeTheme.iconColor}`} />
            <p className={`text-sm font-semibold ${activeTheme.textPrimary}`}>Document Numbers</p>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Invoice No', field: 'nextInvoiceNumber', placeholder: '00000', prefix: 'INV' },
              { label: 'Estimate No', field: 'nextEstimateNumber', placeholder: '00000', prefix: 'EST' },
            ].map(({ label, field, placeholder, prefix }) => (
              <div key={field} className="flex items-center gap-3">
                <span className={`w-24 shrink-0 text-xs font-medium ${activeTheme.labelColor}`}>{label}</span>
                <div className="flex-1 relative flex items-center">
                  <span className={`px-3 py-2 border border-r-0 ${activeTheme.inputBorder} ${activeTheme.subtleBg} ${activeTheme.textSecondary} rounded-l-xl text-xs font-semibold`}>
                    {prefix}
                  </span>
                  <input
                    value={form[field] || ''}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value.replace(/\D/g, '') })}
                    placeholder={placeholder}
                    className={`w-full px-3 py-2 pr-9 border ${activeTheme.inputBorder} ${activeTheme.inputBg} ${activeTheme.textPrimary} rounded-r-xl rounded-l-none text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400`}
                  />
                  <Check className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl p-4`}>
          <div className={`flex items-center gap-2 pb-2 mb-3 border-b ${activeTheme.border}`}>
            <FileText className={`w-4 h-4 ${activeTheme.iconColor}`} />
            <p className={`text-sm font-semibold ${activeTheme.textPrimary}`}>Default Notes</p>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Invoices', field: 'defaultInvoiceNotes' },
              { label: 'Estimates', field: 'defaultEstimateNotes' },
            ].map(({ label, field }) => (
              <div key={field} className="flex items-start gap-3">
                <span className={`w-20 shrink-0 pt-2 text-xs font-medium ${activeTheme.labelColor}`}>{label}</span>
                <textarea
                  value={form[field] || ''}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  rows={4}
                  placeholder={`Default notes for ${label.toLowerCase()}…`}
                  className={`flex-1 px-3 py-2 border ${activeTheme.inputBorder} ${activeTheme.inputBg} ${activeTheme.textPrimary} rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-400/50 resize-none`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl p-4 space-y-4`}>
          <div className={`flex items-center gap-2 pb-1 border-b ${activeTheme.border}`}>
            <Palette className={`w-4 h-4 ${activeTheme.iconColor}`} />
            <p className={`text-sm font-semibold ${activeTheme.textPrimary}`}>App Theme</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Default */}
            <button
              onClick={() => { setForm({ ...form, appTheme: 'default' }); saveTheme('default'); }}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                form.appTheme === 'default' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-4 bg-slate-900 rounded-full"></div>
                <span className="font-medium text-slate-800">Default</span>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-slate-200 rounded"></div>
                <div className="h-2 bg-slate-100 rounded w-3/4"></div>
              </div>
            </button>

            {/* Aurora Teal */}
            <button
              onClick={() => { setForm({ ...form, appTheme: 'aurora-teal' }); saveTheme('aurora-teal'); }}
              className={`p-4 rounded-xl border-2 transition-all text-left bg-[#061A1F] ${
                form.appTheme === 'aurora-teal' ? 'border-[#0F969C]' : 'border-[#0F969C]/30 hover:border-[#0F969C]/60'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-4 bg-[#0F969C] rounded-full"></div>
                <span className="font-medium text-[#6DA5C0]">Aurora Teal</span>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-[#0F969C]/40 rounded"></div>
                <div className="h-2 bg-[#6DA5C0]/30 rounded w-3/4"></div>
              </div>
            </button>

            {/* Crimson Glass */}
            <button
              onClick={() => { setForm({ ...form, appTheme: 'crimson-glass' }); saveTheme('crimson-glass'); }}
              className={`p-4 rounded-xl border-2 transition-all text-left bg-[#0A0607] ${
                form.appTheme === 'crimson-glass' ? 'border-[#D4142A]' : 'border-white/10 hover:border-[#D4142A]/50'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(135deg,#FF3347,#8E1020)' }}></div>
                <span className="font-medium text-white/80">Crimson Glass</span>
              </div>
              <div className="space-y-2">
                <div className="h-2 rounded" style={{ background: 'rgba(212,20,42,0.45)' }}></div>
                <div className="h-2 rounded w-3/4" style={{ background: 'rgba(255,51,71,0.25)' }}></div>
              </div>
            </button>

            {/* Lunar Stone */}
            <button
              onClick={() => { setForm({ ...form, appTheme: 'graphite-noir' }); saveTheme('graphite-noir'); }}
              className={`p-4 rounded-xl border-2 transition-all text-left bg-[#c8c8c8] ${
                form.appTheme === 'graphite-noir' ? 'border-[#1a1a1c]' : 'border-[#b8b8b8] hover:border-[#888888]'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-4 bg-black rounded-full"></div>
                <span className="font-medium text-[#1a1a1c]">Lunar Stone</span>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-[#b8b8b8] rounded"></div>
                <div className="h-2 bg-[#d0d0d0] rounded w-3/4"></div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// APP
// ============================================================================

export function InvoiceApp({ cloudToolbarProps = null, renderCloudToolbar = null, uploadLogo = null }) {
  const { data, save, saveTheme, loading } = useDatabase();
  const deviceLayout = useDeviceLayout();
  const [activeTab, setActiveTab] = useState('invoices');
  const [view, setView] = useState('list');
  const [currentItem, setCurrentItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(() => () => {});
  const [showImportPdf, setShowImportPdf] = useState(false);

  useEffect(() => {
    const initSampleData = async () => {
      const isFirstRun = Object.values(DB_KEYS).every((dbKey) => localStorage.getItem(dbKey) === null);

      if (!loading && isFirstRun) {
        await save('settings', SAMPLE_SETTINGS);
        await save('clients', SAMPLE_CLIENTS);
        await save('items', SAMPLE_ITEMS);
        await save('invoices', SAMPLE_INVOICES);
        await save('estimates', SAMPLE_ESTIMATES);
      }
    };
    initSampleData();
  }, [loading, data.clients.length, save]);

  const updateNextDocumentSetting = async (type, number) => {
    const currentSettings = { ...SAMPLE_SETTINGS, ...(data.settings || {}) };
    const field = type === 'invoice' ? 'nextInvoiceNumber' : 'nextEstimateNumber';
    const parsed = parseDocumentNumber(number, type === 'invoice' ? 'INV' : 'EST');
    await save('settings', {
      ...currentSettings,
      [field]: parsed ? String(parsed.number).padStart(parsed.width, '0') : currentSettings[field],
    });
  };

  const getClient = (clientId) => data.clients.find((c) => c.id === clientId);

  const downloadInvoicePDF = async (invoice) => {
    try {
      const rawSettings = localStorage.getItem('invoiceapp_settings');
      const parsed = rawSettings ? JSON.parse(rawSettings) : {};
      // Remove null values so they don't overwrite real data (e.g. logo from Supabase)
      Object.keys(parsed).forEach(k => { if (parsed[k] == null) delete parsed[k]; });
      const mergedSettings = { ...(data.settings || {}), ...parsed };

      const client = data.clients.find((c) => c.id === invoice.clientId);
      await generatePDF('invoice', invoice, client, mergedSettings);
    } catch (error) {
      console.error('Invoice PDF action failed', error);
    }
  };

  const handlePdfImport = async (importData) => {
    let clientId = importData.clientId;
    if (!clientId && importData.newClientName) {
      const newClient = {
        id: generateId(),
        name: importData.newClientName,
        phone: importData.newClientPhone || '',
        email: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        postalCode: '',
        vatNumber: '',
        notes: '',
        createdAt: new Date().toISOString().split('T')[0],
      };
      await save('clients', [...data.clients, newClient]);
      clientId = newClient.id;
    }

    const newInvoice = {
      id: generateId(),
      number: importData.number || generateDocumentNumber('invoice', data.invoices, data.estimates, data.settings),
      clientId: clientId || '',
      date: importData.date || new Date().toISOString().split('T')[0],
      dueDate: importData.dueDate || '',
      status: 'outstanding',
      amountPaid: 0,
      items: (importData.items || []).map((item) => ({
        ...item,
        id: generateId(),
      })),
      notes: importData.notes || '',
      overallDiscount: 0,
      overallDiscountType: 'percentage',
      taxEnabled: importData.taxEnabled || false,
      createdAt: new Date().toISOString().split('T')[0],
    };
    await save('invoices', [...data.invoices, newInvoice]);
  };

  const navItems = [
    { id: 'invoices', icon: FileText, label: 'Invoices' },
    { id: 'estimates', icon: FileSignature, label: 'Estimates' },
    { id: 'clients', icon: Users, label: 'Clients' },
    { id: 'items', icon: Package, label: 'Items' },
    { id: 'finance', icon: Wallet, label: 'Finance' },
    { id: 'staff-events', icon: CalendarDays, label: 'Staff & Events' },
    { id: 'reports', icon: BarChart3, label: 'Reports' },
  ];

  const activeTheme = THEMES[data.settings?.appTheme] || THEMES.default;
  const {
    usePhoneLayout,
    useTabletLayout,
    rootOverflowClass,
    frameStyle,
    mainContentPaddingClass,
    panelShellClass,
  } = getInvoiceAppShellLayout({ activeTab, deviceLayout });
  const mobileScrollRootRef = useRef(null);

  const selectAppTab = useCallback((tab) => {
    setActiveTab(tab);
    setView('list');
    setSearchTerm('');
  }, []);

  const openNewInvoice = useCallback(() => {
    setCurrentItem({
      id: generateId(),
      number: generateDocumentNumber('invoice', data.invoices, data.estimates, data.settings),
      date: new Date().toISOString().split('T')[0],
      dueDate: '',
      status: 'outstanding',
      clientId: '',
      items: [],
      amountPaid: 0,
      overallDiscount: 0,
      overallDiscountType: 'percentage',
      taxEnabled: false,
      notes: '',
    });
    setView('edit-invoice');
  }, [data.estimates, data.invoices, data.settings]);

  const openNewEstimate = useCallback(() => {
    setCurrentItem({
      id: generateId(),
      number: generateDocumentNumber('estimate', data.invoices, data.estimates, data.settings),
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      clientId: '',
      items: [],
      overallDiscount: 0,
      overallDiscountType: 'percentage',
      taxEnabled: false,
      notes: '',
    });
    setView('edit-estimate');
  }, [data.estimates, data.invoices, data.settings]);

  const openNewClient = useCallback(() => {
    setCurrentItem({
      id: generateId(),
      name: '',
      phone: '',
      email: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      postalCode: '',
      vatNumber: '',
      extraLine1: '',
      extraLine2: '',
      extraLine3: '',
      extraLine4: '',
      extraLine5: '',
      notes: '',
    });
    setView('edit-client');
  }, []);

  const openNewItem = useCallback(() => {
    setCurrentItem({
      id: generateId(),
      name: '',
      description: '',
      unitCost: 0,
      unit: '',
      quantity: 1,
      discountType: 'percentage',
      discountAmount: 0,
      taxable: false,
      additionalDetails: '',
    });
    setView('edit-item');
  }, []);

  const handlePhonePlusPress = useCallback(() => {
    switch (activeTab) {
      case 'invoices':
        openNewInvoice();
        break;
      case 'estimates':
        openNewEstimate();
        break;
      case 'clients':
        openNewClient();
        break;
      case 'items':
        openNewItem();
        break;
      default:
        break;
    }
  }, [activeTab, openNewClient, openNewEstimate, openNewInvoice, openNewItem]);

  // ============================================================================
  // INVOICES
  // ============================================================================

  const InvoicesList = () => {
    const filtered = data.invoices.filter((inv) => {
      if (!searchTerm) return true;
      const client = getClient(inv.clientId);
      return (
        inv.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    const [activeInvoiceMenu, setActiveInvoiceMenu] = useState(null);
    const [invoiceMenuPosition, setInvoiceMenuPosition] = useState(null);
    const invoiceMenuRef = useRef(null);

    useEffect(() => {
      if (!activeInvoiceMenu) return undefined;

      const handleOutsideClick = (event) => {
        if (invoiceMenuRef.current && !invoiceMenuRef.current.contains(event.target)) {
          setActiveInvoiceMenu(null);
          setInvoiceMenuPosition(null);
        }
      };

      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);

      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('touchstart', handleOutsideClick);
      };
    }, [activeInvoiceMenu]);

    const closeInvoiceMenu = () => {
      setActiveInvoiceMenu(null);
      setInvoiceMenuPosition(null);
    };

    const handleStatusChange = async (status, invoiceToUpdate) => {
      if (!invoiceToUpdate) return;
      const updatedInvoice = { ...invoiceToUpdate, status };
      const updated = data.invoices.map((inv) => (inv.id === invoiceToUpdate.id ? updatedInvoice : inv));
      await save('invoices', updated);
      closeInvoiceMenu();
    };

    const duplicateInvoice = async (invoice) => {
      const duplicatedInvoice = {
        ...invoice,
        id: generateId(),
        number: generateDocumentNumber('invoice', data.invoices, data.estimates, data.settings),
        items: (invoice.items || []).map((item) => ({ ...item, id: generateId() })),
        amountPaid: 0,
        createdAt: new Date().toISOString().split('T')[0],
      };
      await save('invoices', [...data.invoices, duplicatedInvoice]);
      await updateNextDocumentSetting('invoice', duplicatedInvoice.number);
      closeInvoiceMenu();
    };

    return (
      <div className="flex flex-col h-full">
        {!usePhoneLayout ? (
          <div className={`shrink-0 px-4 pt-3 pb-3 lg:px-6 lg:pt-4 lg:pb-4 border-b ${activeTheme.border}`}>
            <div className="flex items-center justify-between gap-2">
              <h1 className={`text-xl font-bold ${activeTheme.textPrimary}`}>Invoices</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={openNewInvoice}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${activeTheme.accent} rounded-xl font-medium shadow-sm`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Invoice
                </button>
              </div>
            </div>

            <div className="relative mt-3 max-w-sm">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${activeTheme.iconColor}`} />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border ${activeTheme.inputBorder} rounded-xl text-sm ${activeTheme.inputBg} ${activeTheme.textPrimary}`}
              />
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-auto px-3 pt-3 phone-dock-scroll-space lg:px-5 lg:pt-4 lg:pb-4">
          {filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              description="Create your first invoice"
              theme={activeTheme}
              action={
                <button className={`px-4 py-2 ${activeTheme.accent} rounded-xl`} onClick={() => setView('edit-invoice')}>
                  Create Invoice
                </button>
              }
            />
          ) : (
            <div className={usePhoneLayout ? 'space-y-1.5' : 'space-y-2'}>
              {filtered.map((invoice) => {
                const client = getClient(invoice.clientId);
                const total = calculateDocumentTotal(invoice, data.settings?.taxRate || 15);
                return (
                  <div
                    key={invoice.id}
                    className={`${activeTheme.cardBg} border ${usePhoneLayout ? `${activeTheme.border} rounded-2xl shadow-[0_1px_6px_rgba(0,0,0,0.06)] active:scale-[0.98]` : `${activeTheme.border} rounded-xl`} ${activeTheme.cardHover} group transition-all duration-150`}
                  >
                    {usePhoneLayout ? (
                      <div className="px-3 py-2.5">
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <div
                            onClick={() => {
                              setCurrentItem(invoice);
                              setView('view-invoice');
                            }}
                            className="min-w-0 cursor-pointer"
                          >
                            <p className={`text-sm font-bold tracking-tight ${activeTheme.textPrimary}`}>
                              {invoice.number}
                            </p>
                          </div>
                          <StatusBadge status={invoice.status} theme={activeTheme} />
                        </div>

                        <div
                          onClick={() => {
                            setCurrentItem(invoice);
                            setView('view-invoice');
                          }}
                          className="cursor-pointer"
                        >
                          <p className={`mb-1 truncate text-xs ${activeTheme.textMuted}`}>
                            {client?.name || 'No client'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <p className={`text-[11px] ${activeTheme.iconColor}`}>
                            {formatDate(invoice.date)}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            <p className={`text-sm font-bold ${activeTheme.textPrimary}`}>
                              {formatCurrency(total)}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const menuHeight = 180;
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const openUpward = spaceBelow < menuHeight;
                                setActiveInvoiceMenu((current) => {
                                  if (current === invoice.id) {
                                    setInvoiceMenuPosition(null);
                                    return null;
                                  }
                                  setInvoiceMenuPosition({
                                    ...(openUpward
                                      ? { bottom: window.innerHeight - rect.top }
                                      : { top: rect.bottom + 4 }),
                                    right: window.innerWidth - rect.right,
                                  });
                                  return invoice.id;
                                });
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              className={`p-1.5 ${activeTheme.buttonHover} rounded-lg ${usePhoneLayout ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                            >
                              <MoreVertical className={`w-4 h-4 ${activeTheme.textSecondary}`} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                closeInvoiceMenu();
                                setConfirmMessage(`Are you sure you want to delete invoice ${invoice.number}? This action cannot be undone.`);
                                setConfirmAction(() => async () => {
                                  await save('invoices', data.invoices.filter((inv) => inv.id !== invoice.id));
                                });
                                setConfirmOpen(true);
                              }}
                              className={`${usePhoneLayout ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} p-1.5 hover:bg-red-50 rounded-lg transition-opacity`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <div
                          onClick={() => {
                            setCurrentItem(invoice);
                            setView('view-invoice');
                          }}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <div className="flex items-baseline gap-2">
                            <p className={`text-sm font-semibold leading-tight ${activeTheme.textPrimary}`}>{invoice.number}</p>
                            <p className={`text-xs truncate ${activeTheme.textMuted}`}>{client?.name || 'No client'}</p>
                          </div>
                          <p className={`text-[11px] ${activeTheme.iconColor} mt-0.5`}>{formatDate(invoice.date)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="text-right">
                            <StatusBadge status={invoice.status} theme={activeTheme} />
                            <p className={`text-sm font-bold mt-1 ${activeTheme.textPrimary}`}>{formatCurrency(total)}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              const menuHeight = 180;
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const openUpward = spaceBelow < menuHeight;
                              setActiveInvoiceMenu((current) => {
                                if (current === invoice.id) {
                                  setInvoiceMenuPosition(null);
                                  return null;
                                }
                                setInvoiceMenuPosition({
                                  ...(openUpward
                                    ? { bottom: window.innerHeight - rect.top }
                                    : { top: rect.bottom + 4 }),
                                  right: window.innerWidth - rect.right,
                                });
                                return invoice.id;
                              });
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            className={`p-1.5 ${activeTheme.buttonHover} rounded-lg ${usePhoneLayout ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                          >
                            <MoreVertical className={`w-4 h-4 ${activeTheme.textSecondary}`} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              closeInvoiceMenu();
                              setConfirmMessage(`Are you sure you want to delete invoice ${invoice.number}? This action cannot be undone.`);
                              setConfirmAction(() => async () => {
                                await save('invoices', data.invoices.filter((inv) => inv.id !== invoice.id));
                              });
                              setConfirmOpen(true);
                            }}
                            className={`${usePhoneLayout ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} p-1.5 hover:bg-red-50 rounded-lg transition-opacity`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {activeInvoiceMenu && invoiceMenuPosition && ReactDOM.createPortal(
          <div
            ref={invoiceMenuRef}
            className={`fixed z-[9999] min-w-44 rounded-xl border ${activeTheme.border} ${activeTheme.modalBg} shadow-xl`}
            style={{
              ...(invoiceMenuPosition.top != null ? { top: `${invoiceMenuPosition.top}px` } : {}),
              ...(invoiceMenuPosition.bottom != null ? { bottom: `${invoiceMenuPosition.bottom}px` } : {}),
              right: `${invoiceMenuPosition.right}px`,
            }}
          >
            {(() => {
              const invoice = data.invoices.find((item) => item.id === activeInvoiceMenu);
              if (!invoice) return null;
              return (
                <>
                  <button
                    onClick={async () => {
                      await handleStatusChange('outstanding', invoice);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm ${activeTheme.textPrimary} ${activeTheme.cardHover}`}
                  >
                    Mark as Outstanding
                  </button>
                  <button
                    onClick={async () => {
                      await handleStatusChange('paid', invoice);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm border-t ${activeTheme.border} ${activeTheme.textPrimary} ${activeTheme.cardHover}`}
                  >
                    Mark as Paid
                  </button>
                  <button
                    onClick={() => duplicateInvoice(invoice)}
                    className={`w-full px-4 py-3 text-left text-sm border-t ${activeTheme.border} ${activeTheme.textPrimary} ${activeTheme.cardHover}`}
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={async () => {
                      await downloadInvoicePDF(invoice);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm border-t ${activeTheme.border} ${activeTheme.textPrimary} ${activeTheme.cardHover}`}
                  >
                    Download PDF
                  </button>
                </>
              );
            })()}
          </div>,
          document.body
        )}
      </div>
    );
  };

  const InvoiceView = () => {
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const client = getClient(currentItem?.clientId);
    const taxRate = data.settings?.taxRate || 15;
    const taxLabel = data.settings?.taxLabel || 'VAT';
    const totals = calculateDocumentTotals(currentItem, taxRate);
    const total = totals.total;

    const saveInvoice = async (updatedInvoice) => {
      const updated = data.invoices.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv));
      await save('invoices', updated);
      setCurrentItem(updatedInvoice);
    };

    const handleSaveItem = async (updatedItem) => {
      const updatedInvoice = {
        ...currentItem,
        items: currentItem.items.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
      };
      await saveInvoice(updatedInvoice);
    };

    return (
      <div className="flex flex-col h-full">
        <div className="p-4 lg:p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setView('list')} className={`p-2 ${activeTheme.buttonHover} rounded-xl`}>
              <ChevronLeft className={`w-5 h-5 ${activeTheme.textPrimary}`} />
            </button>
            <h1 className={`font-bold text-xl ${activeTheme.textPrimary}`}>{currentItem.number}</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => downloadInvoicePDF(currentItem)}
              className={`p-2 ${activeTheme.buttonHover} rounded-xl`}
              title="Download Invoice PDF"
            >
              <Printer className={`w-5 h-5 ${activeTheme.textPrimary}`} />
            </button>
            <button onClick={() => setView('edit-invoice')} className={`p-2 ${activeTheme.buttonHover} rounded-xl`}>
              <Edit className={`w-5 h-5 ${activeTheme.textPrimary}`} />
            </button>
            <button
              onClick={() => {
                setConfirmMessage(`Are you sure you want to delete invoice ${currentItem.number}? This action cannot be undone.`);
                setConfirmAction(() => async () => {
                  await save('invoices', data.invoices.filter((inv) => inv.id !== currentItem.id));
                  setView('list');
                });
                setConfirmOpen(true);
              }}
              className="p-2 hover:bg-red-50 rounded-xl"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 phone-dock-scroll-space lg:p-6 lg:pb-6 space-y-4">
          <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl p-4`}>
            <div className="flex justify-between items-start">
              <div>
                <p className={`text-sm ${activeTheme.textMuted}`}>Invoice</p>
                <p className={`text-2xl font-bold ${activeTheme.textPrimary}`}>{currentItem.number}</p>
              </div>
              <StatusBadge status={currentItem.status} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <p className={activeTheme.textMuted}>Date</p>
                <p className={activeTheme.textPrimary}>{formatDate(currentItem.date)}</p>
              </div>
              <div>
                <p className={activeTheme.textMuted}>Due Date</p>
                <p className={activeTheme.textPrimary}>{formatDate(currentItem.dueDate)}</p>
              </div>
            </div>
          </div>

          <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl p-4`}>
            <p className={`text-sm ${activeTheme.textMuted} mb-2`}>Bill To</p>
            <p className={`font-semibold ${activeTheme.textPrimary}`}>{client?.name || 'No client selected'}</p>
            {formatClientAddress(client) && <p className={`text-sm ${activeTheme.textSecondary} whitespace-pre-line mt-1`}>{formatClientAddress(client)}</p>}
          </div>

          <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl overflow-hidden`}>
            <div className={`p-4 border-b ${activeTheme.border} flex items-center justify-between`}>
              <p className={`font-semibold ${activeTheme.textPrimary}`}>Line Items</p>
              <span className={`text-xs ${activeTheme.iconColor}`}>Tap to edit</span>
            </div>
            <div
              className={`${
                usePhoneLayout ? 'hidden' : 'grid'
              } grid-cols-[minmax(0,1fr)_140px_90px_140px_140px] gap-4 px-4 py-3 border-b ${activeTheme.border} ${activeTheme.tableHeaderBg}`}
            >
              <span className={`text-xs font-semibold uppercase tracking-wide ${activeTheme.textMuted}`}>Description</span>
              <span className={`text-xs font-semibold uppercase tracking-wide text-right ${activeTheme.textMuted}`}>Discount</span>
              <span className={`text-xs font-semibold uppercase tracking-wide text-center ${activeTheme.textMuted}`}>Qty</span>
              <span className={`text-xs font-semibold uppercase tracking-wide text-right ${activeTheme.textMuted}`}>Rate</span>
              <span className={`text-xs font-semibold uppercase tracking-wide text-right ${activeTheme.textMuted}`}>Amount</span>
            </div>
            <div className="divide-y">
              {currentItem.items.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 ${activeTheme.tableRowHover} cursor-pointer`}
                  onClick={() => {
                    setEditingItem(item);
                    setItemModalOpen(true);
                  }}
                >
                  <div
                    className={`grid gap-3 ${
                      usePhoneLayout ? '' : 'grid-cols-[minmax(0,1fr)_140px_90px_140px_140px] items-start'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`font-medium ${activeTheme.textPrimary}`}>{item.description}</p>
                      <div className={`${usePhoneLayout ? 'block' : 'hidden'} text-xs ${activeTheme.textMuted} mt-1 space-y-1`}>
                        <p>{`${item.qty || 0} x ${formatCurrency(item.rate || 0)}`}</p>
                        {item.discountAmount > 0 && (
                          <p>
                            {item.discountType === 'percentage'
                              ? `${item.discountAmount}% discount`
                              : `${formatCurrency(item.discountAmount)} discount`}
                          </p>
                        )}
                      </div>
                      {item.notes && <p className={`text-xs ${activeTheme.textMuted} mt-1 whitespace-pre-line`}>{item.notes}</p>}
                    </div>
                    <p className={`${usePhoneLayout ? 'hidden' : 'block'} text-sm text-right ${activeTheme.textPrimary}`}>
                      {item.discountAmount > 0
                        ? item.discountType === 'percentage'
                          ? `${item.discountAmount}%`
                          : formatCurrency(item.discountAmount)
                        : '—'}
                    </p>
                    <p className={`${usePhoneLayout ? 'hidden' : 'block'} text-sm text-center ${activeTheme.textPrimary}`}>
                      {item.qty || 0}
                    </p>
                    <p className={`${usePhoneLayout ? 'hidden' : 'block'} text-sm text-right ${activeTheme.textPrimary}`}>
                      {formatCurrency(item.rate || 0)}
                    </p>
                    <p className={`font-semibold ${usePhoneLayout ? '' : 'text-right'} ${activeTheme.textPrimary}`}>
                      {formatCurrency(calculateItemTotal(item, taxRate, { applyTax: totals.taxEnabled }).total)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className={`p-4 ${activeTheme.tableHeaderBg} border-t ${activeTheme.border}`}>
              <div className="flex justify-between">
                <span className={`font-semibold ${activeTheme.textPrimary}`}>Total</span>
                <span className={`font-bold ${activeTheme.textPrimary}`}>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <DocumentTotalsSummary
            doc={currentItem}
            taxRate={taxRate}
            taxLabel={taxLabel}
            theme={activeTheme}
            showPayments
          />

          <div className="flex gap-2">
            <button
              onClick={async () => {
                const newEstimate = {
                  id: generateId(),
                  number: generateDocumentNumber('estimate', data.invoices, data.estimates, data.settings),
                  clientId: currentItem.clientId,
                  date: new Date().toISOString().split('T')[0],
                  status: 'pending',
                  items: currentItem.items.map((item) => ({ ...item, id: generateId() })),
                  overallDiscount: currentItem.overallDiscount || 0,
                  overallDiscountType: currentItem.overallDiscountType || 'percentage',
                  taxEnabled: currentItem.taxEnabled !== false,
                  notes: currentItem.notes,
                  createdAt: new Date().toISOString().split('T')[0],
                };
                await save('estimates', [...data.estimates, newEstimate]);
                await updateNextDocumentSetting('estimate', newEstimate.number);
                setActiveTab('estimates');
                setCurrentItem(newEstimate);
                setView('view-estimate');
              }}
              className={`w-full py-3 ${activeTheme.subtleBg} ${activeTheme.labelColor} rounded-xl flex items-center justify-center gap-2`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              Convert
            </button>
          </div>
        </div>

        <LineItemModal
          isOpen={itemModalOpen}
          onClose={() => setItemModalOpen(false)}
          onSave={handleSaveItem}
          item={editingItem}
          savedItems={data.items}
          taxRate={taxRate}
          applyDocumentTax={totals.taxEnabled}
          theme={activeTheme}
        />
      </div>
    );
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const InvoiceEdit = () => {
    const [form, setForm] = useState(
      currentItem || {
        id: generateId(),
        number: generateDocumentNumber('invoice', data.invoices, data.estimates, data.settings),
        date: new Date().toISOString().split('T')[0],
        dueDate: '',
        status: 'outstanding',
        clientId: '',
        items: [],
        amountPaid: 0,
        overallDiscount: 0,
        overallDiscountType: 'percentage',
        taxEnabled: true,
        notes: '',
      },
    );
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const taxRate = data.settings?.taxRate || 15;
    const taxLabel = data.settings?.taxLabel || 'VAT';
    const taxEnabled = isDocumentTaxEnabled(form);
    const compactForm = usePhoneLayout;

    const isExistingInvoice = data.invoices.some((inv) => inv.id === form.id);

    const handleSave = async () => {
      const isNew = !data.invoices.find((i) => i.id === form.id);
      const updated = isNew
        ? [...data.invoices, { ...form, createdAt: new Date().toISOString().split('T')[0] }]
        : data.invoices.map((inv) => (inv.id === form.id ? form : inv));
      await save('invoices', updated);
      if (isNew) {
        await updateNextDocumentSetting('invoice', form.number);
      }
      setView('list');
    };

    const handleSaveItem = (item) => {
      if (editingItem) {
        setForm({ ...form, items: form.items.map((i) => (i.id === item.id ? item : i)) });
      } else {
        setForm({ ...form, items: [...form.items, item] });
      }
    };

    const handleAddClient = async (newClientData) => {
      const newClient = { id: generateId(), ...newClientData, createdAt: new Date().toISOString().split('T')[0] };
      await save('clients', [...data.clients, newClient]);
      return newClient.id;
    };

    return (
      <CompactFormContext.Provider value={compactForm}>
        <div className="flex flex-col h-full">
          <div className={`${compactForm ? 'px-3 py-2.5' : 'p-4'} border-b ${activeTheme.border} flex items-center justify-between`}>
            <button onClick={() => setView(isExistingInvoice ? 'view-invoice' : 'list')} className={`${compactForm ? 'p-1.5' : 'p-2'} ${activeTheme.buttonHover} rounded-xl`}>
              <ChevronLeft className={`w-5 h-5 ${activeTheme.textPrimary}`} />
            </button>
            <h1 className={`font-semibold ${activeTheme.textPrimary}`}>{isExistingInvoice ? 'Edit Invoice' : 'New Invoice'}</h1>
            <button onClick={handleSave} className={`${compactForm ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'} ${activeTheme.accent} rounded-xl`}>
              Save
            </button>
          </div>

          <div className={`flex-1 overflow-auto ${compactForm ? 'p-3 space-y-3' : 'p-4 space-y-4'} phone-dock-scroll-space lg:pb-4`}>
            <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl ${compactForm ? 'p-3 space-y-3' : 'p-4 space-y-4'}`}>
              <FormInput label="Invoice Number" value={form.number} onChange={(v) => setForm({ ...form, number: v })} theme={activeTheme} />
              <div className={`grid grid-cols-2 ${compactForm ? 'gap-2.5' : 'gap-3'}`}>
                <FormInput label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} theme={activeTheme} />
                <FormInput label="Due Date" type="date" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} theme={activeTheme} />
              </div>
              <ClientSelect
                label="Client"
                value={form.clientId}
                onChange={(v) => setForm({ ...form, clientId: v })}
                clients={data.clients}
                onAddNew={handleAddClient}
                theme={activeTheme}
              />
            </div>

            <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl overflow-hidden`}>
              <div className={`${compactForm ? 'px-3 py-2.5' : 'p-4'} border-b ${activeTheme.border} flex items-center justify-between`}>
                <p className={`font-semibold ${activeTheme.textPrimary}`}>Line Items</p>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setItemModalOpen(true);
                  }}
                  className={`${compactForm ? 'px-2.5 py-1.5 text-[13px]' : 'px-3 py-1.5 text-sm'} ${activeTheme.accent} rounded-lg flex items-center gap-1`}
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {form.items.length === 0 ? (
                <div className={`${compactForm ? 'p-5 text-sm' : 'p-8'} text-center ${activeTheme.textMuted}`}>No items added yet</div>
              ) : (
                <div className="divide-y">
                  {form.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`${compactForm ? 'px-3 py-2.5' : 'p-4'} ${activeTheme.tableRowHover} cursor-pointer`}
                      onClick={() => {
                        setEditingItem(item);
                        setItemModalOpen(true);
                      }}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <p className={`font-medium ${activeTheme.textPrimary}`}>{item.description}</p>
                          {item.notes && <p className={`text-xs ${activeTheme.textMuted} mt-1`}>{item.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold ${activeTheme.textPrimary}`}>
                            {formatCurrency(calculateItemTotal(item, taxRate, { applyTax: taxEnabled }).total)}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
                            }}
                            className="p-1.5 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DocumentTotalsEditor
              form={form}
              setForm={setForm}
              taxRate={taxRate}
              taxLabel={taxLabel}
              theme={activeTheme}
              showPayments
            />

            <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl ${compactForm ? 'p-3' : 'p-4'}`}>
              <FormInput label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} multiline theme={activeTheme} />
            </div>
          </div>

          <LineItemModal
            isOpen={itemModalOpen}
            onClose={() => setItemModalOpen(false)}
            onSave={handleSaveItem}
            item={editingItem}
            savedItems={data.items}
            taxRate={taxRate}
            applyDocumentTax={taxEnabled}
            theme={activeTheme}
          />
        </div>
      </CompactFormContext.Provider>
    );
  };

  // ============================================================================
  // ESTIMATES
  // ============================================================================

  const EstimatesList = () => {
    const filtered = data.estimates.filter((est) => {
      if (!searchTerm) return true;
      const client = getClient(est.clientId);
      return (
        est.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    const [activeEstimateMenu, setActiveEstimateMenu] = useState(null);
    const [estimateMenuPosition, setEstimateMenuPosition] = useState(null);
    const estimateMenuRef = useRef(null);

    useEffect(() => {
      if (!activeEstimateMenu) return undefined;

      const handleOutsideClick = (event) => {
        if (estimateMenuRef.current && !estimateMenuRef.current.contains(event.target)) {
          setActiveEstimateMenu(null);
          setEstimateMenuPosition(null);
        }
      };

      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);

      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('touchstart', handleOutsideClick);
      };
    }, [activeEstimateMenu]);

    const closeEstimateMenu = () => {
      setActiveEstimateMenu(null);
      setEstimateMenuPosition(null);
    };

    const handleStatusChange = async (status, estimateToUpdate) => {
      if (!estimateToUpdate) return;
      const updatedEstimate = { ...estimateToUpdate, status };
      const updated = data.estimates.map((est) => (est.id === estimateToUpdate.id ? updatedEstimate : est));
      await save('estimates', updated);
      closeEstimateMenu();
    };

    const duplicateEstimate = async (estimate) => {
      const duplicatedEstimate = {
        ...estimate,
        id: generateId(),
        number: generateDocumentNumber('estimate', data.invoices, data.estimates, data.settings),
        items: (estimate.items || []).map((item) => ({ ...item, id: generateId() })),
        createdAt: new Date().toISOString().split('T')[0],
      };
      await save('estimates', [...data.estimates, duplicatedEstimate]);
      await updateNextDocumentSetting('estimate', duplicatedEstimate.number);
      closeEstimateMenu();
    };

    return (
      <div className="flex flex-col h-full">
        {!usePhoneLayout ? (
          <div className={`shrink-0 px-4 pt-3 pb-3 lg:px-6 lg:pt-4 lg:pb-4 border-b ${activeTheme.border}`}>
            <div className="flex items-center justify-between">
              <h1 className={`text-xl font-bold ${activeTheme.textPrimary}`}>Estimates</h1>
              <button
                onClick={openNewEstimate}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${activeTheme.accent} rounded-xl font-medium shadow-sm`}
              >
                <Plus className="w-3.5 h-3.5" />
                New Estimate
              </button>
            </div>

            <div className="relative mt-3 max-w-sm">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${activeTheme.iconColor}`} />
              <input
                type="text"
                placeholder="Search estimates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border ${activeTheme.inputBorder} rounded-xl text-sm ${activeTheme.inputBg} ${activeTheme.textPrimary}`}
              />
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-auto px-3 pt-3 phone-dock-scroll-space lg:px-5 lg:pt-4 lg:pb-4">
          {filtered.length === 0 ? (
            <EmptyState icon={FileSignature} title="No estimates yet" description="Create your first estimate" theme={activeTheme} />
          ) : (
            <div className={usePhoneLayout ? 'space-y-1.5' : 'space-y-2'}>
              {filtered.map((estimate) => {
                const client = getClient(estimate.clientId);
                const total = calculateDocumentTotal(estimate, data.settings?.taxRate || 15);
                return (
                  <div
                    key={estimate.id}
                    className={`${activeTheme.cardBg} border ${usePhoneLayout ? `${activeTheme.border} rounded-2xl shadow-[0_1px_6px_rgba(0,0,0,0.06)] active:scale-[0.98]` : `${activeTheme.border} rounded-xl`} ${activeTheme.cardHover} group transition-all duration-150`}
                  >
                    {usePhoneLayout ? (
                      <div className="px-3 py-2.5">
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <div
                            onClick={() => {
                              setCurrentItem(estimate);
                              setView('view-estimate');
                            }}
                            className="min-w-0 cursor-pointer"
                          >
                            <p className={`text-sm font-bold tracking-tight ${activeTheme.textPrimary}`}>
                              {estimate.number}
                            </p>
                          </div>
                          <StatusBadge status={estimate.status} theme={activeTheme} />
                        </div>

                        <div
                          onClick={() => {
                            setCurrentItem(estimate);
                            setView('view-estimate');
                          }}
                          className="cursor-pointer"
                        >
                          <p className={`mb-1 truncate text-xs ${activeTheme.textMuted}`}>
                            {client?.name || 'No client'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <p className={`text-[11px] ${activeTheme.iconColor}`}>
                            {formatDate(estimate.date)}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            <p className={`text-sm font-bold ${activeTheme.textPrimary}`}>
                              {formatCurrency(total)}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const menuHeight = 180;
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const openUpward = spaceBelow < menuHeight;
                                setActiveEstimateMenu((current) => {
                                  if (current === estimate.id) {
                                    setEstimateMenuPosition(null);
                                    return null;
                                  }
                                  setEstimateMenuPosition({
                                    ...(openUpward
                                      ? { bottom: window.innerHeight - rect.top }
                                      : { top: rect.bottom + 4 }),
                                    right: window.innerWidth - rect.right,
                                  });
                                  return estimate.id;
                                });
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              className={`p-1.5 ${activeTheme.buttonHover} rounded-lg ${usePhoneLayout ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                            >
                              <MoreVertical className={`w-4 h-4 ${activeTheme.textSecondary}`} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                closeEstimateMenu();
                                setConfirmMessage(`Are you sure you want to delete estimate ${estimate.number}? This action cannot be undone.`);
                                setConfirmAction(() => async () => {
                                  await save('estimates', data.estimates.filter((est) => est.id !== estimate.id));
                                });
                                setConfirmOpen(true);
                              }}
                              className={`${usePhoneLayout ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} p-1.5 hover:bg-red-50 rounded-lg transition-opacity`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <div
                          onClick={() => {
                            setCurrentItem(estimate);
                            setView('view-estimate');
                          }}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <div className="flex items-baseline gap-2">
                            <p className={`text-sm font-semibold leading-tight ${activeTheme.textPrimary}`}>{estimate.number}</p>
                            <p className={`text-xs truncate ${activeTheme.textMuted}`}>{client?.name || 'No client'}</p>
                          </div>
                          <p className={`text-[11px] ${activeTheme.iconColor} mt-0.5`}>{formatDate(estimate.date)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="text-right">
                            <StatusBadge status={estimate.status} theme={activeTheme} />
                            <p className={`text-sm font-bold mt-1 ${activeTheme.textPrimary}`}>{formatCurrency(total)}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              const menuHeight = 180;
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const openUpward = spaceBelow < menuHeight;
                              setActiveEstimateMenu((current) => {
                                if (current === estimate.id) {
                                  setEstimateMenuPosition(null);
                                  return null;
                                }
                                setEstimateMenuPosition({
                                  ...(openUpward
                                    ? { bottom: window.innerHeight - rect.top }
                                    : { top: rect.bottom + 4 }),
                                  right: window.innerWidth - rect.right,
                                });
                                return estimate.id;
                              });
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            className={`p-1.5 ${activeTheme.buttonHover} rounded-lg ${usePhoneLayout ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                          >
                            <MoreVertical className={`w-4 h-4 ${activeTheme.textSecondary}`} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              closeEstimateMenu();
                              setConfirmMessage(`Are you sure you want to delete estimate ${estimate.number}? This action cannot be undone.`);
                              setConfirmAction(() => async () => {
                                await save('estimates', data.estimates.filter((est) => est.id !== estimate.id));
                              });
                              setConfirmOpen(true);
                            }}
                            className={`${usePhoneLayout ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} p-1.5 hover:bg-red-50 rounded-lg transition-opacity`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {activeEstimateMenu && estimateMenuPosition && ReactDOM.createPortal(
          <div
            ref={estimateMenuRef}
            className={`fixed z-[9999] min-w-44 rounded-xl border ${activeTheme.border} ${activeTheme.modalBg} shadow-xl`}
            style={{
              ...(estimateMenuPosition.top != null ? { top: `${estimateMenuPosition.top}px` } : {}),
              ...(estimateMenuPosition.bottom != null ? { bottom: `${estimateMenuPosition.bottom}px` } : {}),
              right: `${estimateMenuPosition.right}px`,
            }}
          >
            {(() => {
              const estimate = data.estimates.find((item) => item.id === activeEstimateMenu);
              if (!estimate) return null;
              return (
                <>
                  <button
                    onClick={async () => {
                      await handleStatusChange('pending', estimate);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm ${activeTheme.textPrimary} ${activeTheme.cardHover}`}
                  >
                    Mark as Pending
                  </button>
                  <button
                    onClick={async () => {
                      await handleStatusChange('accepted', estimate);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm border-t ${activeTheme.border} ${activeTheme.textPrimary} ${activeTheme.cardHover}`}
                  >
                    Mark as Approved
                  </button>
                  <button
                    onClick={async () => {
                      await handleStatusChange('declined', estimate);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm border-t ${activeTheme.border} ${activeTheme.textPrimary} ${activeTheme.cardHover}`}
                  >
                    Mark as Declined
                  </button>
                  <button
                    onClick={() => duplicateEstimate(estimate)}
                    className={`w-full px-4 py-3 text-left text-sm border-t ${activeTheme.border} ${activeTheme.textPrimary} ${activeTheme.cardHover}`}
                  >
                    Duplicate
                  </button>
                </>
              );
            })()}
          </div>,
          document.body
        )}
      </div>
    );
  };

  const EstimateView = () => {
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const client = getClient(currentItem?.clientId);
    const taxRate = data.settings?.taxRate || 15;
    const taxLabel = data.settings?.taxLabel || 'VAT';
    const totals = calculateDocumentTotals(currentItem, taxRate);
    const total = totals.total;

    const saveEstimate = async (updatedEstimate) => {
      const updated = data.estimates.map((est) => (est.id === updatedEstimate.id ? updatedEstimate : est));
      await save('estimates', updated);
      setCurrentItem(updatedEstimate);
    };

    const handleSaveItem = async (updatedItem) => {
      const updatedEstimate = {
        ...currentItem,
        items: currentItem.items.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
      };
      await saveEstimate(updatedEstimate);
    };

    return (
      <div className="flex flex-col h-full">
        <div className="p-4 lg:p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setView('list')} className={`p-2 ${activeTheme.buttonHover} rounded-xl`}>
              <ChevronLeft className={`w-5 h-5 ${activeTheme.textPrimary}`} />
            </button>
            <h1 className={`font-bold text-xl ${activeTheme.textPrimary}`}>{currentItem.number}</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => generatePDF('estimate', currentItem, client, data.settings)}
              className={`p-2 ${activeTheme.buttonHover} rounded-xl`}
              title="Download PDF"
            >
              <Printer className={`w-5 h-5 ${activeTheme.textPrimary}`} />
            </button>
            <button onClick={() => setView('edit-estimate')} className={`p-2 ${activeTheme.buttonHover} rounded-xl`}>
              <Edit className={`w-5 h-5 ${activeTheme.textPrimary}`} />
            </button>
            <button
              onClick={() => {
                setConfirmMessage(`Are you sure you want to delete estimate ${currentItem.number}? This action cannot be undone.`);
                setConfirmAction(() => async () => {
                  await save('estimates', data.estimates.filter((est) => est.id !== currentItem.id));
                  setView('list');
                });
                setConfirmOpen(true);
              }}
              className="p-2 hover:bg-red-50 rounded-xl"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 phone-dock-scroll-space lg:p-6 lg:pb-6 space-y-4">
          <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl p-4`}>
            <div className="flex justify-between items-start">
              <div>
                <p className={`text-sm ${activeTheme.textMuted}`}>Estimate</p>
                <p className={`text-2xl font-bold ${activeTheme.textPrimary}`}>{currentItem.number}</p>
              </div>
              <StatusBadge status={currentItem.status} theme={activeTheme} />
            </div>
          </div>

          <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl p-4`}>
            <p className={`text-sm ${activeTheme.textMuted} mb-2`}>Prepared For</p>
            <p className={`font-semibold ${activeTheme.textPrimary}`}>{client?.name || 'No client selected'}</p>
            {formatClientAddress(client) && <p className={`text-sm ${activeTheme.textSecondary} whitespace-pre-line mt-1`}>{formatClientAddress(client)}</p>}
          </div>

          <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl overflow-hidden`}>
            <div className={`p-4 border-b ${activeTheme.border} flex items-center justify-between`}>
              <p className={`font-semibold ${activeTheme.textPrimary}`}>Line Items</p>
              <span className={`text-xs ${activeTheme.iconColor}`}>Tap to edit</span>
            </div>
            <div
              className={`${
                usePhoneLayout ? 'hidden' : 'grid'
              } grid-cols-[minmax(0,1fr)_140px_90px_140px_140px] gap-4 px-4 py-3 border-b ${activeTheme.border} ${activeTheme.tableHeaderBg}`}
            >
              <span className={`text-xs font-semibold uppercase tracking-wide ${activeTheme.textMuted}`}>Description</span>
              <span className={`text-xs font-semibold uppercase tracking-wide text-right ${activeTheme.textMuted}`}>Discount</span>
              <span className={`text-xs font-semibold uppercase tracking-wide text-center ${activeTheme.textMuted}`}>Qty</span>
              <span className={`text-xs font-semibold uppercase tracking-wide text-right ${activeTheme.textMuted}`}>Rate</span>
              <span className={`text-xs font-semibold uppercase tracking-wide text-right ${activeTheme.textMuted}`}>Amount</span>
            </div>
            <div className="divide-y">
              {currentItem.items.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 ${activeTheme.tableRowHover} cursor-pointer`}
                  onClick={() => {
                    setEditingItem(item);
                    setItemModalOpen(true);
                  }}
                >
                  <div
                    className={`grid gap-3 ${
                      usePhoneLayout ? '' : 'grid-cols-[minmax(0,1fr)_140px_90px_140px_140px] items-start'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`font-medium ${activeTheme.textPrimary}`}>{item.description}</p>
                      <div className={`${usePhoneLayout ? 'block' : 'hidden'} text-xs ${activeTheme.textMuted} mt-1 space-y-1`}>
                        <p>{`${item.qty || 0} x ${formatCurrency(item.rate || 0)}`}</p>
                        {item.discountAmount > 0 && (
                          <p>
                            {item.discountType === 'percentage'
                              ? `${item.discountAmount}% discount`
                              : `${formatCurrency(item.discountAmount)} discount`}
                          </p>
                        )}
                      </div>
                      {item.notes && <p className={`text-xs ${activeTheme.textMuted} mt-1 whitespace-pre-line`}>{item.notes}</p>}
                    </div>
                    <p className={`${usePhoneLayout ? 'hidden' : 'block'} text-sm text-right ${activeTheme.textPrimary}`}>
                      {item.discountAmount > 0
                        ? item.discountType === 'percentage'
                          ? `${item.discountAmount}%`
                          : formatCurrency(item.discountAmount)
                        : '—'}
                    </p>
                    <p className={`${usePhoneLayout ? 'hidden' : 'block'} text-sm text-center ${activeTheme.textPrimary}`}>
                      {item.qty || 0}
                    </p>
                    <p className={`${usePhoneLayout ? 'hidden' : 'block'} text-sm text-right ${activeTheme.textPrimary}`}>
                      {formatCurrency(item.rate || 0)}
                    </p>
                    <p className={`font-semibold ${usePhoneLayout ? '' : 'text-right'} ${activeTheme.textPrimary}`}>
                      {formatCurrency(calculateItemTotal(item, taxRate, { applyTax: totals.taxEnabled }).total)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className={`p-4 ${activeTheme.tableHeaderBg} border-t ${activeTheme.border}`}>
              <div className="flex justify-between">
                <span className={`font-semibold ${activeTheme.textPrimary}`}>Total</span>
                <span className={`font-bold ${activeTheme.textPrimary}`}>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <DocumentTotalsSummary
            doc={currentItem}
            taxRate={taxRate}
            taxLabel={taxLabel}
            theme={activeTheme}
          />

          <div className="flex gap-2">
            <button
              onClick={async () => {
                const newInvoice = {
                  id: generateId(),
                  number: generateDocumentNumber('invoice', data.invoices, data.estimates, data.settings),
                  clientId: currentItem.clientId,
                  date: new Date().toISOString().split('T')[0],
                  dueDate: '',
                  status: 'outstanding',
                  items: currentItem.items.map((item) => ({ ...item, id: generateId() })),
                  amountPaid: 0,
                  overallDiscount: currentItem.overallDiscount || 0,
                  overallDiscountType: currentItem.overallDiscountType || 'percentage',
                  taxEnabled: currentItem.taxEnabled !== false,
                  notes: currentItem.notes,
                  createdAt: new Date().toISOString().split('T')[0],
                };
                await save('invoices', [...data.invoices, newInvoice]);
                await updateNextDocumentSetting('invoice', newInvoice.number);
                setActiveTab('invoices');
                setCurrentItem(newInvoice);
                setView('view-invoice');
              }}
              className={`w-full py-3 ${activeTheme.subtleBg} ${activeTheme.labelColor} rounded-xl flex items-center justify-center gap-2`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              Convert
            </button>
          </div>
        </div>

        <LineItemModal
          isOpen={itemModalOpen}
          onClose={() => setItemModalOpen(false)}
          onSave={handleSaveItem}
          item={editingItem}
          savedItems={data.items}
          taxRate={taxRate}
          applyDocumentTax={totals.taxEnabled}
          theme={activeTheme}
        />
      </div>
    );
  };

  const EstimateEdit = () => {
    const [form, setForm] = useState(
      currentItem || {
        id: generateId(),
        number: generateDocumentNumber('estimate', data.invoices, data.estimates, data.settings),
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        clientId: '',
        items: [],
        overallDiscount: 0,
        overallDiscountType: 'percentage',
        taxEnabled: true,
        notes: '',
      },
    );
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const taxRate = data.settings?.taxRate || 15;
    const taxLabel = data.settings?.taxLabel || 'VAT';
    const taxEnabled = isDocumentTaxEnabled(form);
    const compactForm = usePhoneLayout;

    const isExistingEstimate = data.estimates.some((est) => est.id === form.id);

    const handleSave = async () => {
      const isNew = !data.estimates.find((e) => e.id === form.id);
      const updated = isNew
        ? [...data.estimates, { ...form, createdAt: new Date().toISOString().split('T')[0] }]
        : data.estimates.map((est) => (est.id === form.id ? form : est));
      await save('estimates', updated);
      if (isNew) {
        await updateNextDocumentSetting('estimate', form.number);
      }
      setView('list');
    };

    const handleSaveItem = (item) => {
      if (editingItem) {
        setForm({ ...form, items: form.items.map((i) => (i.id === item.id ? item : i)) });
      } else {
        setForm({ ...form, items: [...form.items, item] });
      }
    };

    const handleAddClient = async (newClientData) => {
      const newClient = { id: generateId(), ...newClientData, createdAt: new Date().toISOString().split('T')[0] };
      await save('clients', [...data.clients, newClient]);
      return newClient.id;
    };

    return (
      <CompactFormContext.Provider value={compactForm}>
        <div className="flex flex-col h-full">
          <div className={`${compactForm ? 'px-3 py-2.5' : 'p-4'} border-b ${activeTheme.border} flex items-center justify-between`}>
            <button onClick={() => setView(isExistingEstimate ? 'view-estimate' : 'list')} className={`${compactForm ? 'p-1.5' : 'p-2'} ${activeTheme.buttonHover} rounded-xl`}>
              <ChevronLeft className={`w-5 h-5 ${activeTheme.textPrimary}`} />
            </button>
            <h1 className={`font-semibold ${activeTheme.textPrimary}`}>{isExistingEstimate ? 'Edit Estimate' : 'New Estimate'}</h1>
            <button onClick={handleSave} className={`${compactForm ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'} ${activeTheme.accent} rounded-xl`}>
              Save
            </button>
          </div>

          <div className={`flex-1 overflow-auto ${compactForm ? 'p-3 space-y-3' : 'p-4 space-y-4'} phone-dock-scroll-space lg:pb-4`}>
            <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl ${compactForm ? 'p-3 space-y-3' : 'p-4 space-y-4'}`}>
              <FormInput label="Estimate Number" value={form.number} onChange={(v) => setForm({ ...form, number: v })} theme={activeTheme} />
              <FormInput label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} theme={activeTheme} />
              <ClientSelect
                label="Client"
                value={form.clientId}
                onChange={(v) => setForm({ ...form, clientId: v })}
                clients={data.clients}
                onAddNew={handleAddClient}
                theme={activeTheme}
              />
            </div>

            <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl overflow-hidden`}>
              <div className={`${compactForm ? 'px-3 py-2.5' : 'p-4'} border-b ${activeTheme.border} flex items-center justify-between`}>
                <p className={`font-semibold ${activeTheme.textPrimary}`}>Line Items</p>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setItemModalOpen(true);
                  }}
                  className={`${compactForm ? 'px-2.5 py-1.5 text-[13px]' : 'px-3 py-1.5 text-sm'} ${activeTheme.accent} rounded-lg flex items-center gap-1`}
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {form.items.length === 0 ? (
                <div className={`${compactForm ? 'p-5 text-sm' : 'p-8'} text-center ${activeTheme.textMuted}`}>No items added yet</div>
              ) : (
                <div className="divide-y">
                  {form.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`${compactForm ? 'px-3 py-2.5' : 'p-4'} ${activeTheme.tableRowHover} cursor-pointer`}
                      onClick={() => {
                        setEditingItem(item);
                        setItemModalOpen(true);
                      }}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <p className={`font-medium ${activeTheme.textPrimary}`}>{item.description}</p>
                          {item.notes && <p className={`text-xs ${activeTheme.textMuted} mt-1`}>{item.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold ${activeTheme.textPrimary}`}>
                            {formatCurrency(calculateItemTotal(item, taxRate, { applyTax: taxEnabled }).total)}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
                            }}
                            className="p-1.5 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DocumentTotalsEditor
              form={form}
              setForm={setForm}
              taxRate={taxRate}
              taxLabel={taxLabel}
              theme={activeTheme}
            />

            <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl ${compactForm ? 'p-3' : 'p-4'}`}>
              <FormInput label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} multiline theme={activeTheme} />
            </div>
          </div>

          <LineItemModal
            isOpen={itemModalOpen}
            onClose={() => setItemModalOpen(false)}
            onSave={handleSaveItem}
            item={editingItem}
            savedItems={data.items}
            taxRate={taxRate}
            applyDocumentTax={taxEnabled}
            theme={activeTheme}
          />
        </div>
      </CompactFormContext.Provider>
    );
  };

  // ============================================================================
  // CLIENTS
  // ============================================================================

  const ClientsList = () => {
    const filtered = data.clients.filter((client) => {
      if (!searchTerm) return true;
      return (
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    return (
      <div className="flex flex-col h-full">
        {!usePhoneLayout ? (
          <div className="px-4 pt-3 pb-3 lg:px-6 lg:pt-4 lg:pb-4 border-b">
            <div className="flex items-center justify-between">
              <h1 className={`text-xl font-bold ${activeTheme.textPrimary}`}>Clients</h1>
              <button
                onClick={openNewClient}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${activeTheme.accent} rounded-xl font-medium shadow-sm`}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Client
              </button>
            </div>

            <div className="relative mt-3 max-w-sm">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${activeTheme.iconColor}`} />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border ${activeTheme.inputBorder} rounded-xl text-sm ${activeTheme.inputBg} ${activeTheme.textPrimary}`}
              />
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-auto px-3 pt-3 phone-dock-scroll-space lg:px-5 lg:pt-4 lg:pb-4">
          {filtered.length === 0 ? (
            <EmptyState icon={Users} title="No clients yet" description="Add your first client" theme={activeTheme} />
          ) : (
            <div className={usePhoneLayout ? 'space-y-1.5' : 'space-y-2'}>
              {filtered.map((client) => (
                <div
                  key={client.id}
                  className={`${activeTheme.cardBg} border ${usePhoneLayout ? `${activeTheme.border} rounded-2xl shadow-[0_1px_6px_rgba(0,0,0,0.06)] active:scale-[0.98]` : `${activeTheme.border} rounded-xl`} ${activeTheme.cardHover} group transition-all duration-150`}
                >
                  {usePhoneLayout ? (
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                      <div
                        onClick={() => {
                          setCurrentItem(client);
                          setView('view-client');
                        }}
                        className={`w-10 h-10 rounded-full ${activeTheme.subtleBg} border ${activeTheme.border} flex items-center justify-center shrink-0 cursor-pointer`}
                      >
                        <span className={`text-xs font-bold ${activeTheme.textSecondary}`}>
                          {(client.name || '')
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((word) => word.charAt(0))
                            .join('')
                            .toUpperCase() || '?'}
                        </span>
                      </div>
                      <div
                        onClick={() => {
                          setCurrentItem(client);
                          setView('view-client');
                        }}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <p className={`text-sm font-semibold leading-tight ${activeTheme.textPrimary}`}>{client.name}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {client.email && (
                            <span className={`text-[11px] ${activeTheme.textMuted} truncate max-w-[160px]`}>
                              {client.email}
                            </span>
                          )}
                          {client.email && client.phone && (
                            <span className={`text-[11px] ${activeTheme.textMuted}`}>·</span>
                          )}
                          {client.phone && (
                            <span className={`text-[11px] ${activeTheme.textMuted}`}>{client.phone}</span>
                          )}
                        </div>
                        {client.city && (
                          <p className={`text-[10px] ${activeTheme.iconColor} mt-0.5`}>{client.city}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmMessage(`Are you sure you want to delete client ${client.name}? This action cannot be undone.`);
                          setConfirmAction(() => async () => {
                            await save('clients', data.clients.filter((c) => c.id !== client.id));
                          });
                          setConfirmOpen(true);
                        }}
                        className={`${usePhoneLayout ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} p-1.5 hover:bg-red-50 rounded-lg transition-opacity shrink-0`}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <div
                        onClick={() => {
                          setCurrentItem(client);
                          setView('view-client');
                        }}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <p className={`text-sm font-semibold leading-tight ${activeTheme.textPrimary}`}>{client.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {client.email && <p className={`text-xs truncate ${activeTheme.textMuted}`}>{client.email}</p>}
                          {client.email && client.phone && <span className={`text-xs ${activeTheme.textMuted}`}>·</span>}
                          {client.phone && <p className={`text-xs ${activeTheme.textMuted}`}>{client.phone}</p>}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmMessage(`Are you sure you want to delete client ${client.name}? This action cannot be undone.`);
                          setConfirmAction(() => async () => {
                            await save('clients', data.clients.filter((c) => c.id !== client.id));
                          });
                          setConfirmOpen(true);
                        }}
                        className={`${usePhoneLayout ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} p-1.5 hover:bg-red-50 rounded-lg transition-opacity shrink-0`}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const ClientView = () => (
    <div className="flex flex-col h-full">
      <div className={`p-4 border-b ${activeTheme.border} flex items-center justify-between`}>
        <button onClick={() => setView('list')} className={`p-2 ${activeTheme.buttonHover} rounded-xl`}>
          <ChevronLeft className={`w-5 h-5 ${activeTheme.textPrimary}`} />
        </button>
        <h1 className={`font-semibold ${activeTheme.textPrimary}`}>Client Details</h1>
        <div className="flex gap-2">
          <button onClick={() => setView('edit-client')} className={`p-2 ${activeTheme.buttonHover} rounded-xl`}>
            <Edit className={`w-5 h-5 ${activeTheme.textSecondary}`} />
          </button>
          <button
            onClick={() => {
              setConfirmMessage(`Are you sure you want to delete client ${currentItem.name}? This action cannot be undone.`);
              setConfirmAction(() => async () => {
                await save('clients', data.clients.filter((c) => c.id !== currentItem.id));
                setView('list');
              });
              setConfirmOpen(true);
            }}
            className="p-2 hover:bg-red-50 rounded-xl"
          >
            <Trash2 className="w-5 h-5 text-red-500" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 phone-dock-scroll-space lg:pb-4">
        <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl p-4`}>
          <h2 className={`text-xl font-bold mb-4 ${activeTheme.textPrimary}`}>{currentItem?.name}</h2>
          {currentItem?.phone && (
            <div className={`flex items-center gap-3 py-3 border-t ${activeTheme.border}`}>
              <Phone className={`w-5 h-5 ${activeTheme.iconColor}`} />
              <div>
                <p className={`text-xs ${activeTheme.textMuted}`}>Phone</p>
                <p className={`text-sm font-medium ${activeTheme.textPrimary}`}>{currentItem.phone}</p>
              </div>
            </div>
          )}
          {currentItem?.email && (
            <div className={`flex items-center gap-3 py-3 border-t ${activeTheme.border}`}>
              <Mail className={`w-5 h-5 ${activeTheme.iconColor}`} />
              <div>
                <p className={`text-xs ${activeTheme.textMuted}`}>Email</p>
                <p className={`text-sm font-medium ${activeTheme.textPrimary}`}>{currentItem.email}</p>
              </div>
            </div>
          )}
          {formatClientAddress(currentItem) && (
            <div className={`flex items-center gap-3 py-3 border-t ${activeTheme.border}`}>
              <MapPin className={`w-5 h-5 ${activeTheme.iconColor}`} />
              <div>
                <p className={`text-xs ${activeTheme.textMuted}`}>Address</p>
                <p className={`text-sm font-medium whitespace-pre-line ${activeTheme.textPrimary}`}>{formatClientAddress(currentItem)}</p>
              </div>
            </div>
          )}
          {currentItem?.vatNumber && (
            <div className={`flex items-center gap-3 py-3 border-t ${activeTheme.border}`}>
              <Building2 className={`w-5 h-5 ${activeTheme.iconColor}`} />
              <div>
                <p className={`text-xs ${activeTheme.textMuted}`}>VAT Number</p>
                <p className={`text-sm font-medium ${activeTheme.textPrimary}`}>{currentItem.vatNumber}</p>
              </div>
            </div>
          )}
          {[currentItem?.extraLine1, currentItem?.extraLine2, currentItem?.extraLine3, currentItem?.extraLine4, currentItem?.extraLine5]
            .filter(Boolean)
            .map((line, index) => (
              <div key={index} className={`flex items-center gap-3 py-3 border-t ${activeTheme.border}`}>
                <Building2 className={`w-5 h-5 ${activeTheme.iconColor}`} />
                <div>
                  <p className={`text-xs ${activeTheme.textMuted}`}>Extra Info {index + 1}</p>
                  <p className={`text-sm font-medium ${activeTheme.textPrimary}`}>{line}</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const ClientEdit = () => {
    const [form, setForm] = useState(
      currentItem || {
        id: generateId(),
        name: '',
        phone: '',
        email: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        postalCode: '',
        vatNumber: '',
        extraLine1: '',
        extraLine2: '',
        extraLine3: '',
        extraLine4: '',
        extraLine5: '',
        notes: '',
      },
    );

    const handleSave = async () => {
      const isNew = !data.clients.find((c) => c.id === form.id);
      const updated = isNew ? [...data.clients, form] : data.clients.map((c) => (c.id === form.id ? form : c));
      await save('clients', updated);
      setView('list');
    };

    const compactForm = usePhoneLayout;

    return (
      <CompactFormContext.Provider value={compactForm}>
        <div className="flex flex-col h-full">
          <div className={`${compactForm ? 'px-3 py-2.5' : 'p-4'} border-b ${activeTheme.border} flex items-center justify-between`}>
            <button onClick={() => setView(currentItem?.name ? 'view-client' : 'list')} className={`${compactForm ? 'p-1.5' : 'p-2'} ${activeTheme.buttonHover} rounded-xl`}>
              <ChevronLeft className={`w-5 h-5 ${activeTheme.textPrimary}`} />
            </button>
            <h1 className={`font-semibold ${activeTheme.textPrimary}`}>{currentItem?.name ? 'Edit Client' : 'New Client'}</h1>
            <button onClick={handleSave} className={`${compactForm ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'} ${activeTheme.accent} rounded-xl`}>
              Save
            </button>
          </div>

          <div className={`flex-1 overflow-auto ${compactForm ? 'p-3 space-y-3' : 'p-4 space-y-4'} phone-dock-scroll-space lg:pb-4`}>
            <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl ${compactForm ? 'p-3 space-y-3' : 'p-4 space-y-4'}`}>
              <FormInput label="Client Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} theme={activeTheme} />
              <FormInput label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} theme={activeTheme} />
              <FormInput label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} theme={activeTheme} />
              <FormInput label="VAT Number" value={form.vatNumber} onChange={(v) => setForm({ ...form, vatNumber: v })} theme={activeTheme} />
              <FormInput label="Extra Info 1" value={form.extraLine1 || ''} onChange={(v) => setForm({ ...form, extraLine1: v })} theme={activeTheme} />
              <FormInput label="Extra Info 2" value={form.extraLine2 || ''} onChange={(v) => setForm({ ...form, extraLine2: v })} theme={activeTheme} />
              <FormInput label="Extra Info 3" value={form.extraLine3 || ''} onChange={(v) => setForm({ ...form, extraLine3: v })} theme={activeTheme} />
              <FormInput label="Extra Info 4" value={form.extraLine4 || ''} onChange={(v) => setForm({ ...form, extraLine4: v })} theme={activeTheme} />
              <FormInput label="Extra Info 5" value={form.extraLine5 || ''} onChange={(v) => setForm({ ...form, extraLine5: v })} theme={activeTheme} />
              <FormInput label="Address Line 1" value={form.addressLine1} onChange={(v) => setForm({ ...form, addressLine1: v })} theme={activeTheme} />
              <FormInput label="Address Line 2" value={form.addressLine2} onChange={(v) => setForm({ ...form, addressLine2: v })} theme={activeTheme} />
              <div className={`grid grid-cols-2 ${compactForm ? 'gap-2.5' : 'gap-3'}`}>
                <FormInput label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} theme={activeTheme} />
                <FormInput label="Postal Code" value={form.postalCode} onChange={(v) => setForm({ ...form, postalCode: v })} theme={activeTheme} />
              </div>
              <FormInput label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} multiline theme={activeTheme} />
            </div>
          </div>
        </div>
      </CompactFormContext.Provider>
    );
  };

  // ============================================================================
  // ITEMS
  // ============================================================================

  const ItemsList = () => {
    const filtered = data.items.filter((item) => {
      if (!searchTerm) return true;
      return item.name?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
      <div className="flex flex-col h-full">
        {!usePhoneLayout ? (
          <div className="px-4 pt-3 pb-3 lg:px-6 lg:pt-4 lg:pb-4 border-b">
            <div className="flex items-center justify-between">
              <h1 className={`text-xl font-bold ${activeTheme.textPrimary}`}>Items</h1>
              <button
                onClick={openNewItem}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${activeTheme.accent} rounded-xl font-medium shadow-sm`}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="relative mt-3 max-w-sm">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${activeTheme.iconColor}`} />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border ${activeTheme.inputBorder} rounded-xl text-sm ${activeTheme.inputBg} ${activeTheme.textPrimary}`}
              />
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-auto px-3 pt-3 phone-dock-scroll-space lg:px-5 lg:pt-4 lg:pb-4">
          {filtered.length === 0 ? (
            <EmptyState icon={Package} title="No items yet" description="Add your products and services" theme={activeTheme} />
          ) : (
            <div className={usePhoneLayout ? 'space-y-2' : 'space-y-2'}>
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className={`${activeTheme.cardBg} border ${usePhoneLayout ? `${activeTheme.border} rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.06)] active:scale-[0.98]` : `${activeTheme.border} rounded-xl`} ${activeTheme.cardHover} group transition-all duration-150`}
                >
                  {usePhoneLayout ? (
                    <div className="px-3 py-2.5">
                      <div
                        onClick={() => {
                          setCurrentItem(item);
                          setView('edit-item');
                        }}
                        className="flex items-center justify-between mb-0.5 cursor-pointer"
                      >
                        <p className={`text-sm font-bold ${activeTheme.textPrimary} truncate mr-3`}>
                          {item.name}
                        </p>
                        <p className={`text-sm font-bold ${activeTheme.textPrimary} shrink-0`}>
                          {formatCurrency(item.unitCost || 0)}
                        </p>
                      </div>

                      {item.description && (
                        <div
                          onClick={() => {
                            setCurrentItem(item);
                            setView('edit-item');
                          }}
                          className="cursor-pointer"
                        >
                          <p
                            className={`text-[11px] leading-tight ${activeTheme.textMuted} mb-1.5`}
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {item.description}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.unit && (
                            <span className={`text-[9px] ${activeTheme.subtleBg} ${activeTheme.textSecondary} px-1.5 py-px rounded-full border ${activeTheme.border}`}>
                              per {item.unit}
                            </span>
                          )}
                          {item.taxable && (
                            <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-px rounded-full border border-emerald-200">
                              Taxable
                            </span>
                          )}
                          {item.discountAmount > 0 && (
                            <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-px rounded-full border border-amber-200">
                              {item.discountType === 'percentage'
                                ? `${item.discountAmount}% off`
                                : `${formatCurrency(item.discountAmount)} off`}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmMessage(`Are you sure you want to delete item ${item.name}? This action cannot be undone.`);
                            setConfirmAction(() => async () => {
                              await save('items', data.items.filter((i) => i.id !== item.id));
                            });
                            setConfirmOpen(true);
                          }}
                          className={`${usePhoneLayout ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} p-1.5 hover:bg-red-50 rounded-lg transition-opacity shrink-0`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <div
                        onClick={() => {
                          setCurrentItem(item);
                          setView('edit-item');
                        }}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="flex items-baseline gap-2">
                          <p className={`text-sm font-semibold leading-tight ${activeTheme.textPrimary}`}>{item.name}</p>
                          {item.description && (
                            <p className={`text-xs truncate ${activeTheme.textMuted}`}>{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {item.unit && <span className={`text-[10px] ${activeTheme.subtleBg} ${activeTheme.textSecondary} px-1.5 py-0.5 rounded`}>per {item.unit}</span>}
                          {item.taxable && <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">Taxable</span>}
                          {item.discountAmount > 0 && (
                            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                              {item.discountType === 'percentage'
                                ? `${item.discountAmount}% off`
                                : `${formatCurrency(item.discountAmount)} off`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <p className={`text-sm font-bold ${activeTheme.textPrimary}`}>{formatCurrency(item.unitCost || 0)}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmMessage(`Are you sure you want to delete item ${item.name}? This action cannot be undone.`);
                            setConfirmAction(() => async () => {
                              await save('items', data.items.filter((i) => i.id !== item.id));
                            });
                            setConfirmOpen(true);
                          }}
                          className={`${usePhoneLayout ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} p-1.5 hover:bg-red-50 rounded-lg transition-opacity`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const ItemEdit = () => {
    const [form, setForm] = useState(
      currentItem || {
        id: generateId(),
        name: '',
        description: '',
        unitCost: 0,
        unit: '',
        quantity: 1,
        discountType: 'percentage',
        discountAmount: 0,
        taxable: false,
        additionalDetails: '',
      },
    );

    const itemTotal = (form.unitCost || 0) * (form.quantity || 1);
    const discount =
      form.discountType === 'percentage'
        ? itemTotal * ((form.discountAmount || 0) / 100)
        : form.discountAmount || 0;
    const finalTotal = itemTotal - discount;

    const handleSave = async () => {
      const normalizedForm = {
        ...form,
        unitCost: Number(form.unitCost) || 0,
        quantity: form.quantity === '' ? 0 : parseInt(form.quantity, 10) || 0,
        discountAmount: Number(form.discountAmount) || 0,
      };
      const isNew = !data.items.find((i) => i.id === form.id);
      const updated = isNew
        ? [...data.items, normalizedForm]
        : data.items.map((i) => (i.id === form.id ? normalizedForm : i));
      await save('items', updated);
      setView('list');
    };

    const compactForm = usePhoneLayout;

    return (
      <CompactFormContext.Provider value={compactForm}>
        <div className="flex flex-col h-full">
          <div className={`${compactForm ? 'px-3 py-2.5' : 'p-4'} border-b ${activeTheme.border} flex items-center justify-between`}>
            <button onClick={() => setView('list')} className={`${compactForm ? 'p-1.5' : 'p-2'} ${activeTheme.buttonHover} rounded-xl`}>
              <ChevronLeft className={`w-5 h-5 ${activeTheme.textPrimary}`} />
            </button>
            <h1 className={`font-semibold ${activeTheme.textPrimary}`}>{currentItem?.name ? 'Edit Item' : 'New Item'}</h1>
            <div className="flex gap-2">
              {currentItem?.name && (
                <button
                  onClick={() => {
                    setConfirmMessage(`Are you sure you want to delete item ${form.name}? This action cannot be undone.`);
                    setConfirmAction(() => async () => {
                      await save('items', data.items.filter((i) => i.id !== form.id));
                      setView('list');
                    });
                    setConfirmOpen(true);
                  }}
                  className={`${compactForm ? 'p-1.5' : 'p-2'} hover:bg-red-50 rounded-xl`}
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              )}
              <button onClick={handleSave} className={`${compactForm ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'} ${activeTheme.accent} rounded-xl`}>
                Save
              </button>
            </div>
          </div>

          <div className={`flex-1 overflow-auto ${compactForm ? 'p-3 space-y-3' : 'p-4 space-y-4'} phone-dock-scroll-space lg:pb-4`}>
            <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl ${compactForm ? 'p-3 space-y-3' : 'p-4 space-y-4'}`}>
              <FormInput label="Item Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} theme={activeTheme} />
              <FormInput label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} multiline theme={activeTheme} />
              <FormInput
                label="Unit Cost"
                type="number"
                value={form.unitCost}
                onChange={(v) => setForm({ ...form, unitCost: parseFloat(v) || 0 })}
                theme={activeTheme}
              />
              <div className={`grid grid-cols-2 ${compactForm ? 'gap-2.5' : 'gap-3'}`}>
                <FormInput label="Unit" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} theme={activeTheme} />
                <FormInput
                  label="Quantity"
                  type="number"
                  value={form.quantity}
                  onChange={(v) => setForm({ ...form, quantity: v === '' ? '' : parseInt(v, 10) || 0 })}
                  theme={activeTheme}
                />
              </div>

              <div className={`grid grid-cols-2 ${compactForm ? 'gap-2.5' : 'gap-3'}`}>
                <div className={compactForm ? 'space-y-1' : 'space-y-1'}>
                  <label className={`${compactForm ? 'text-xs' : 'text-sm'} font-medium ${activeTheme.labelColor}`}>Discount Type</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                    className={`w-full ${compactForm ? 'px-3 py-2 rounded-lg text-[13px]' : 'px-3 py-2 rounded-xl text-sm'} border ${activeTheme.inputBorder} ${activeTheme.inputBg} ${activeTheme.textPrimary}`}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="flat">Fixed Amount</option>
                  </select>
                </div>
                <FormInput
                  label="Discount Amount"
                  type="number"
                  value={form.discountAmount}
                  onChange={(v) => setForm({ ...form, discountAmount: parseFloat(v) || 0 })}
                  theme={activeTheme}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className={`${compactForm ? 'text-xs' : 'text-sm'} font-medium ${activeTheme.textPrimary}`}>Taxable</span>
                <button
                  onClick={() => setForm({ ...form, taxable: !form.taxable })}
                  className={`relative w-12 h-7 rounded-full ${form.taxable ? activeTheme.accent : activeTheme.toggleInactive}`}
                >
                  <span className={`absolute top-1 w-5 h-5 bg-white rounded-full ${form.taxable ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              <div className={`flex justify-between items-center ${compactForm ? 'pt-3' : 'pt-4'} border-t ${activeTheme.border}`}>
                <span className={`font-semibold ${activeTheme.textPrimary}`}>Total</span>
                <span className={`${compactForm ? 'text-lg' : 'text-xl'} font-bold ${activeTheme.textPrimary}`}>{formatCurrency(finalTotal)}</span>
              </div>
            </div>

            <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl ${compactForm ? 'p-3' : 'p-4'}`}>
              <FormInput
                label="Additional Details"
                value={form.additionalDetails}
                onChange={(v) => setForm({ ...form, additionalDetails: v })}
                multiline
                theme={activeTheme}
              />
            </div>
          </div>
        </div>
      </CompactFormContext.Provider>
    );
  };

  // ============================================================================
  // REPORTS + SETTINGS
  // ============================================================================

  const ReportsPage = () => {
    const taxRate = data.settings?.taxRate || 15;

    // Current date helpers
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Filter states
    const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
    const [selectedYear, setSelectedYear] = useState(currentYear.toString());
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedClient, setSelectedClient] = useState('all');
    const [reportView, setReportView] = useState('overview');

    // Helper functions
    const getClientName = (clientId) => {
      const client = data.clients.find(c => c.id === clientId);
      return client?.name || 'No client';
    };

    const getMonthYear = (dateStr) => {
      const date = new Date(dateStr);
      return {
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      };
    };

    const formatMonthYear = (month, year) => {
      const date = new Date(year, month - 1);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    };

    // Filtered data
    const filteredInvoices = useMemo(() => {
      return data.invoices.filter(inv => {
        const { month, year } = getMonthYear(inv.date);
        const matchesMonth = selectedMonth === 'all' || month === parseInt(selectedMonth);
        const matchesYear = selectedYear === 'all' || year === parseInt(selectedYear);
        const matchesClient = selectedClient === 'all' || inv.clientId === selectedClient;
        let matchesStatus = true;
        if (selectedStatus !== 'all') {
          if (selectedStatus === 'paid') matchesStatus = inv.status === 'paid';
          else if (selectedStatus === 'outstanding') matchesStatus = inv.status === 'outstanding';
          else if (selectedStatus === 'estimate') matchesStatus = false; // invoices are not estimates
          else if (selectedStatus === 'converted') matchesStatus = false; // for now, assume not
        }
        return matchesMonth && matchesYear && matchesClient && matchesStatus;
      });
    }, [data.invoices, selectedMonth, selectedYear, selectedClient, selectedStatus]);

    const filteredEstimates = useMemo(() => {
      return data.estimates.filter(est => {
        const { month, year } = getMonthYear(est.date);
        const matchesMonth = selectedMonth === 'all' || month === parseInt(selectedMonth);
        const matchesYear = selectedYear === 'all' || year === parseInt(selectedYear);
        const matchesClient = selectedClient === 'all' || est.clientId === selectedClient;
        let matchesStatus = true;
        if (selectedStatus !== 'all') {
          if (selectedStatus === 'estimate') matchesStatus = true;
          else if (selectedStatus === 'converted') matchesStatus = est.status === 'accepted';
          else matchesStatus = false; // estimates don't have paid/outstanding
        }
        return matchesMonth && matchesYear && matchesClient && matchesStatus;
      });
    }, [data.estimates, selectedMonth, selectedYear, selectedClient, selectedStatus]);

    // Summary calculations
    const summary = useMemo(() => {
      const totalInvoiced = filteredInvoices.reduce((sum, inv) => sum + calculateDocumentTotal(inv, taxRate), 0);
      const totalPaid = filteredInvoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + calculateDocumentTotal(inv, taxRate), 0);
      const totalOutstanding = filteredInvoices.filter(i => i.status !== 'paid').reduce((sum, inv) => sum + calculateDocumentTotal(inv, taxRate), 0);
      const totalEstimates = filteredEstimates.reduce((sum, est) => sum + calculateDocumentTotal(est, taxRate), 0);
      const invoiceCount = filteredInvoices.length;
      const estimateCount = filteredEstimates.length;
      const activeClients = new Set([...filteredInvoices.map(i => i.clientId), ...filteredEstimates.map(e => e.clientId)]).size;
      const conversionRate = estimateCount > 0 ? (invoiceCount / estimateCount) * 100 : 0;

      return {
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        totalEstimates,
        invoiceCount,
        estimateCount,
        activeClients,
        conversionRate,
        averageInvoiceValue: invoiceCount > 0 ? totalInvoiced / invoiceCount : 0,
        averageEstimateValue: estimateCount > 0 ? totalEstimates / estimateCount : 0,
      };
    }, [filteredInvoices, filteredEstimates, taxRate]);

    // Monthly breakdown
    const monthlyBreakdown = useMemo(() => {
      const breakdown = {};
      const allItems = [
        ...filteredInvoices.map(item => ({ ...item, docType: 'invoice' })),
        ...filteredEstimates.map(item => ({ ...item, docType: 'estimate' }))
      ];
      allItems.forEach(item => {
        const { key, month, year } = getMonthYear(item.date);
        if (!breakdown[key]) {
          breakdown[key] = {
            period: formatMonthYear(month, year),
            invoices: 0,
            paid: 0,
            outstanding: 0,
            estimates: 0,
            totalInvoiced: 0,
            totalEstimated: 0,
            clients: new Set()
          };
        }
        const total = calculateDocumentTotal(item, taxRate);
        if (item.docType === 'invoice') { // invoice
          breakdown[key].invoices++;
          breakdown[key].totalInvoiced += total;
          if (item.status === 'paid') breakdown[key].paid++;
          else breakdown[key].outstanding++;
        } else { // estimate
          breakdown[key].estimates++;
          breakdown[key].totalEstimated += total;
        }
        breakdown[key].clients.add(item.clientId);
      });

      // Convert clients to count
      Object.keys(breakdown).forEach(key => {
        breakdown[key].clients = breakdown[key].clients.size;
      });

      return Object.values(breakdown).sort((a, b) => new Date(b.period) - new Date(a.period));
    }, [filteredInvoices, filteredEstimates, taxRate]);

    // Client reporting
    const clientReporting = useMemo(() => {
      const clients = {};
      data.clients.forEach(client => {
        clients[client.id] = {
          name: client.name,
          invoices: 0,
          estimates: 0,
          totalInvoiced: 0,
          totalPaid: 0,
          outstanding: 0,
          lastActivity: null
        };
      });

      filteredInvoices.forEach(inv => {
        if (clients[inv.clientId]) {
          clients[inv.clientId].invoices++;
          const total = calculateDocumentTotal(inv, taxRate);
          clients[inv.clientId].totalInvoiced += total;
          if (inv.status === 'paid') clients[inv.clientId].totalPaid += total;
          else clients[inv.clientId].outstanding += total;
          const date = new Date(inv.date);
          if (!clients[inv.clientId].lastActivity || date > clients[inv.clientId].lastActivity) {
            clients[inv.clientId].lastActivity = date;
          }
        }
      });

      filteredEstimates.forEach(est => {
        if (clients[est.clientId]) {
          clients[est.clientId].estimates++;
          const date = new Date(est.date);
          if (!clients[est.clientId].lastActivity || date > clients[est.clientId].lastActivity) {
            clients[est.clientId].lastActivity = date;
          }
        }
      });

      return Object.values(clients).filter(c => c.invoices > 0 || c.estimates > 0).sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0));
    }, [data.clients, filteredInvoices, filteredEstimates, taxRate]);

    // Recent activity
    const recentActivity = useMemo(() => {
      const activities = [
        ...filteredInvoices.map(inv => ({ ...inv, type: 'Invoice', status: inv.status })),
        ...filteredEstimates.map(est => ({ ...est, type: 'Estimate', status: est.status }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);

      return activities.map(item => ({
        ...item,
        clientName: getClientName(item.clientId),
        total: calculateDocumentTotal(item, taxRate)
      }));
    }, [filteredInvoices, filteredEstimates, taxRate]);

    const revenueChartData = useMemo(() => {
      return monthlyBreakdown
        .slice()
        .reverse()
        .map((row) => ({
          label: row.period,
          invoiced: row.totalInvoiced,
          paid: filteredInvoices
            .filter((inv) => {
              const period = getMonthYear(inv.date);
              return formatMonthYear(period.month, period.year) === row.period && inv.status === 'paid';
            })
            .reduce((sum, inv) => sum + calculateDocumentTotal(inv, taxRate), 0),
          estimated: row.totalEstimated,
          total: row.totalInvoiced + row.totalEstimated,
        }));
    }, [monthlyBreakdown, filteredInvoices, taxRate]);

    const invoiceStatusChartData = useMemo(() => {
      const paidCount = filteredInvoices.filter((inv) => inv.status === 'paid').length;
      const outstandingCount = filteredInvoices.filter((inv) => inv.status !== 'paid').length;
      return [
        { label: 'Paid', value: paidCount, color: '#10B981', detail: `${formatCurrency(summary.totalPaid)} collected` },
        { label: 'Outstanding', value: outstandingCount, color: '#F59E0B', detail: `${formatCurrency(summary.totalOutstanding)} open` },
      ];
    }, [filteredInvoices, summary.totalPaid, summary.totalOutstanding]);

    const estimateStatusChartData = useMemo(() => {
      const statuses = [
        { key: 'pending', label: 'Pending', color: '#F59E0B' },
        { key: 'accepted', label: 'Accepted', color: '#10B981' },
        { key: 'declined', label: 'Declined', color: '#EF4444' },
      ];

      return statuses.map((status) => ({
        label: status.label,
        value: filteredEstimates.filter((estimate) => estimate.status === status.key).length,
        color: status.color,
      }));
    }, [filteredEstimates]);

    const clientPerformanceChartData = useMemo(() => {
      return clientReporting
        .filter((client) => client.totalInvoiced > 0)
        .slice(0, 6)
        .map((client, index) => ({
          label: client.name,
          value: client.totalInvoiced,
          detail: `${client.invoices} invoices`,
          color: [
            'linear-gradient(90deg, #8E1020, #D4142A)',
            'linear-gradient(90deg, #0F766E, #14B8A6)',
            'linear-gradient(90deg, #7C3AED, #A855F7)',
            'linear-gradient(90deg, #1D4ED8, #3B82F6)',
            'linear-gradient(90deg, #B45309, #F59E0B)',
            'linear-gradient(90deg, #BE123C, #FB7185)',
          ][index % 6],
        }));
    }, [clientReporting]);

    const conversionChartData = useMemo(() => {
      const acceptedEstimates = filteredEstimates.filter((estimate) => estimate.status === 'accepted').length;
      const invoiceCount = filteredInvoices.length;
      return [
        {
          label: 'Accepted Estimates',
          value: acceptedEstimates,
          detail: `${acceptedEstimates} accepted`,
          color: 'linear-gradient(90deg, #0F766E, #14B8A6)',
        },
        {
          label: 'Invoices Issued',
          value: invoiceCount,
          detail: `${summary.conversionRate.toFixed(1)}% estimate-to-invoice rate`,
          color: 'linear-gradient(90deg, #8E1020, #D4142A)',
        },
      ];
    }, [filteredEstimates, filteredInvoices, summary.conversionRate]);

    // Filter options
    const monthOptions = useMemo(() => {
      return Array.from({ length: 12 }, (_, i) => i + 1).map(m => ({ value: m, label: new Date(2023, m - 1).toLocaleString('default', { month: 'long' }) }));
    }, []);

    const yearOptions = useMemo(() => {
      const years = new Set();
      [...data.invoices, ...data.estimates].forEach(item => {
        const { year } = getMonthYear(item.date);
        years.add(year);
      });
      years.add(currentYear);
      return Array.from(years).sort((a, b) => b - a);
    }, [data.invoices, data.estimates, currentYear]);

    const statusOptions = [
      { value: 'all', label: 'All' },
      { value: 'paid', label: 'Paid' },
      { value: 'outstanding', label: 'Outstanding' },
      { value: 'estimate', label: 'Estimate' },
      { value: 'converted', label: 'Converted' }
    ];

    const clientOptions = [
      { value: 'all', label: 'All Clients' },
      ...data.clients.map(c => ({ value: c.id, label: c.name }))
    ];

    const resetFilters = () => {
      setSelectedMonth(currentMonth.toString());
      setSelectedYear(currentYear.toString());
      setSelectedStatus('all');
      setSelectedClient('all');
    };

    const topClient = clientReporting[0] || null;
    const latestPeriod = monthlyBreakdown[0] || null;
    const paidRatio = summary.totalInvoiced > 0 ? (summary.totalPaid / summary.totalInvoiced) * 100 : 0;
    const outstandingRatio = summary.totalInvoiced > 0 ? (summary.totalOutstanding / summary.totalInvoiced) * 100 : 0;
    const businessSignals = [
      {
        title: 'Collections',
        value: `${paidRatio.toFixed(1)}%`,
        detail: `${formatCurrency(summary.totalPaid)} collected from invoiced work`,
      },
      {
        title: 'Exposure',
        value: `${outstandingRatio.toFixed(1)}%`,
        detail: `${formatCurrency(summary.totalOutstanding)} still outstanding`,
      },
      {
        title: 'Momentum',
        value: latestPeriod ? latestPeriod.period : 'No period',
        detail: latestPeriod
          ? `${latestPeriod.invoices} invoices and ${latestPeriod.estimates} estimates in the latest period`
          : 'No activity for the selected filters',
      },
    ];

    const analyticsSummaryCards = [
      {
        title: 'Total Invoiced',
        value: formatCurrency(summary.totalInvoiced),
        detail: `${summary.invoiceCount} invoices issued`,
        accentClass: 'bg-sky-500',
      },
      {
        title: 'Total Paid',
        value: formatCurrency(summary.totalPaid),
        detail: `${summary.totalInvoiced > 0 ? ((summary.totalPaid / summary.totalInvoiced) * 100).toFixed(1) : '0.0'}% collected`,
        accentClass: 'bg-emerald-500',
      },
      {
        title: 'Outstanding',
        value: formatCurrency(summary.totalOutstanding),
        detail: `${summary.totalInvoiced > 0 ? ((summary.totalOutstanding / summary.totalInvoiced) * 100).toFixed(1) : '0.0'}% still open`,
        accentClass: 'bg-amber-500',
      },
      {
        title: 'Total Estimates',
        value: formatCurrency(summary.totalEstimates),
        detail: `${summary.estimateCount} estimates created`,
        accentClass: 'bg-violet-500',
      },
      {
        title: 'Active Clients',
        value: `${summary.activeClients}`,
        detail: 'Clients with filtered activity',
        accentClass: 'bg-cyan-500',
      },
      {
        title: 'Conversion Rate',
        value: `${summary.conversionRate.toFixed(1)}%`,
        detail: 'Invoices compared with estimates',
        accentClass: 'bg-rose-500',
      },
      {
        title: 'Average Invoice Value',
        value: formatCurrency(summary.averageInvoiceValue),
        detail: 'Average across filtered invoices',
        accentClass: 'bg-indigo-500',
      },
      {
        title: 'Average Estimate Value',
        value: formatCurrency(summary.averageEstimateValue),
        detail: 'Average across filtered estimates',
        accentClass: 'bg-fuchsia-500',
      },
    ];

    return (
      <div className="flex flex-col h-full">
        <div className="p-4 lg:p-6 border-b">
          {!usePhoneLayout ? (
            <>
              <h1 className={`text-2xl font-bold ${activeTheme.textPrimary}`}>Reports</h1>
              <p className={`text-sm ${activeTheme.textMuted}`}>Detailed business performance overview</p>
            </>
          ) : null}
          <div
            className={`${usePhoneLayout ? '' : 'mt-4 '} inline-flex rounded-xl sm:rounded-2xl ${
              usePhoneLayout
                ? 'bg-white/80 p-1 shadow-[0_2px_12px_rgba(0,0,0,0.06)] backdrop-blur-xl'
                : `border ${activeTheme.border} ${activeTheme.subtleBg} p-1`
            }`}
          >
            <button
              onClick={() => setReportView('overview')}
              className={`${usePhoneLayout ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'} rounded-lg sm:rounded-xl transition-all ${
                reportView === 'overview'
                  ? usePhoneLayout
                    ? 'bg-gradient-to-r from-zinc-900 to-black text-white shadow-sm'
                    : activeTheme.accent
                  : usePhoneLayout
                    ? 'bg-zinc-100 text-zinc-600'
                    : `${activeTheme.textSecondary} ${activeTheme.buttonHover}`
              }`}
            >
              {usePhoneLayout ? 'Overview' : 'Reports Overview'}
            </button>
            <button
              onClick={() => setReportView('business')}
              className={`${usePhoneLayout ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'} rounded-lg sm:rounded-xl transition-all ${
                reportView === 'business'
                  ? usePhoneLayout
                    ? 'bg-gradient-to-r from-zinc-900 to-black text-white shadow-sm'
                    : activeTheme.accent
                  : usePhoneLayout
                    ? 'bg-zinc-100 text-zinc-600'
                    : `${activeTheme.textSecondary} ${activeTheme.buttonHover}`
              }`}
            >
              {usePhoneLayout ? 'Business' : 'Business View'}
            </button>
            <button
              onClick={() => setReportView('analytics')}
              className={`${usePhoneLayout ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'} rounded-lg sm:rounded-xl transition-all ${
                reportView === 'analytics'
                  ? usePhoneLayout
                    ? 'bg-gradient-to-r from-zinc-900 to-black text-white shadow-sm'
                    : activeTheme.accent
                  : usePhoneLayout
                    ? 'bg-zinc-100 text-zinc-600'
                    : `${activeTheme.textSecondary} ${activeTheme.buttonHover}`
              }`}
            >
              Analytics
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className={`px-3 py-2.5 sm:px-4 sm:py-4 lg:px-6 border-b ${activeTheme.sectionHeaderBg}`}>
          <div className={`${usePhoneLayout ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-3'} items-center`}>
            {/* Month */}
            <div className={`flex items-center gap-0 border ${activeTheme.inputBorder} rounded-lg sm:rounded-xl overflow-hidden shadow-sm`}>
              <span className={`px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm font-medium ${activeTheme.labelColor} ${activeTheme.subtleBg} border-r ${activeTheme.inputBorder} whitespace-nowrap`}>Month</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={`px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm ${activeTheme.inputBg} ${activeTheme.textPrimary} focus:outline-none min-w-0`}
              >
                <option value="all">All Months</option>
                {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            {/* Year */}
            <div className={`flex items-center gap-0 border ${activeTheme.inputBorder} rounded-lg sm:rounded-xl overflow-hidden shadow-sm`}>
              <span className={`px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm font-medium ${activeTheme.labelColor} ${activeTheme.subtleBg} border-r ${activeTheme.inputBorder} whitespace-nowrap`}>Year</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className={`px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm ${activeTheme.inputBg} ${activeTheme.textPrimary} focus:outline-none min-w-0`}
              >
                <option value="all">All Years</option>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {/* Status */}
            <div className={`flex items-center gap-0 border ${activeTheme.inputBorder} rounded-lg sm:rounded-xl overflow-hidden shadow-sm`}>
              <span className={`px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm font-medium ${activeTheme.labelColor} ${activeTheme.subtleBg} border-r ${activeTheme.inputBorder} whitespace-nowrap`}>Status</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={`px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm ${activeTheme.inputBg} ${activeTheme.textPrimary} focus:outline-none min-w-0`}
              >
                {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {/* Client */}
            <div className={`flex items-center gap-0 border ${activeTheme.inputBorder} rounded-lg sm:rounded-xl overflow-hidden shadow-sm`}>
              <span className={`px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm font-medium ${activeTheme.labelColor} ${activeTheme.subtleBg} border-r ${activeTheme.inputBorder} whitespace-nowrap`}>Client</span>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className={`px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm ${activeTheme.inputBg} ${activeTheme.textPrimary} focus:outline-none min-w-0`}
              >
                {clientOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <button
              onClick={resetFilters}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 ${activeTheme.accent} ${activeTheme.accentHover} rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium shadow-sm transition-colors ${usePhoneLayout ? 'col-span-2' : ''}`}
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-2.5 pt-2 pb-3 phone-dock-scroll-space sm:p-4 lg:p-6 lg:pb-6 space-y-3 sm:space-y-6">
          {reportView === 'analytics' ? (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
                {analyticsSummaryCards.map((card) => (
                  <SummaryMetricCard key={card.title} {...card} theme={activeTheme} />
                ))}
              </div>

              <div className="grid xl:grid-cols-[1.5fr_0.9fr] gap-6">
                <AnalyticsCard
                  title="Revenue Overview"
                  subtitle="Invoiced, paid, and estimated value grouped by period"
                  theme={activeTheme}
                >
                  <SimpleMultiBarChart
                    data={revenueChartData}
                    theme={activeTheme}
                    series={[
                      { key: 'invoiced', label: 'Invoiced', color: '#3B82F6' },
                      { key: 'paid', label: 'Paid', color: '#10B981' },
                      { key: 'estimated', label: 'Estimated', color: '#A855F7' },
                    ]}
                  />
                </AnalyticsCard>

                <AnalyticsCard
                  title="Invoice Status"
                  subtitle="Paid versus outstanding invoice count"
                  theme={activeTheme}
                >
                  <DonutChart
                    data={invoiceStatusChartData}
                    centerLabel="Invoices"
                    centerValue={String(summary.invoiceCount)}
                    theme={activeTheme}
                  />
                </AnalyticsCard>
              </div>

              <div className="grid xl:grid-cols-2 gap-6">
                <AnalyticsCard
                  title="Estimate Status"
                  subtitle="Pending, accepted, and declined estimates"
                  theme={activeTheme}
                >
                  <DonutChart
                    data={estimateStatusChartData}
                    centerLabel="Estimates"
                    centerValue={String(summary.estimateCount)}
                    theme={activeTheme}
                  />
                </AnalyticsCard>

                <AnalyticsCard
                  title="Client Performance"
                  subtitle="Top clients ranked by invoiced amount"
                  theme={activeTheme}
                >
                  <HorizontalBarChart data={clientPerformanceChartData} theme={activeTheme} formatter={formatCurrency} />
                </AnalyticsCard>
              </div>

              <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-6">
                <AnalyticsCard
                  title="Conversion View"
                  subtitle="Accepted estimates compared with invoices issued"
                  theme={activeTheme}
                >
                  <HorizontalBarChart data={conversionChartData} theme={activeTheme} formatter={(value) => `${value}`} />
                </AnalyticsCard>

                <AnalyticsCard
                  title="Recent Activity"
                  subtitle="Latest invoices and estimates in the filtered period"
                  theme={activeTheme}
                >
                  <div className={`divide-y ${activeTheme.border}`}>
                    {recentActivity.slice(0, 8).map((item, idx) => (
                      <div key={`${item.id || item.number}-${idx}`} className={`flex items-center justify-between gap-4 py-3 ${activeTheme.tableRowHover}`}>
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-medium ${activeTheme.textPrimary}`}>{item.number}</p>
                          <p className={`truncate text-xs ${activeTheme.textMuted}`}>{item.clientName}</p>
                          <p className={`mt-1 text-[11px] ${activeTheme.iconColor}`}>{formatDate(item.date)} • {item.type}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`text-sm font-semibold ${activeTheme.textPrimary}`}>{formatCurrency(item.total)}</p>
                          <p className={`text-xs ${activeTheme.textMuted}`}>{item.status}</p>
                        </div>
                      </div>
                    ))}
                    {recentActivity.length === 0 && (
                      <ChartEmptyState
                        theme={activeTheme}
                        title="No recent activity"
                        description="Create invoices or estimates to populate this panel."
                      />
                    )}
                  </div>
                </AnalyticsCard>
              </div>

              <div className="grid gap-6">
                <AnalyticsCard
                  title="Period Breakdown"
                  subtitle="Revenue and document activity by period"
                  theme={activeTheme}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={activeTheme.tableHeaderBg}>
                        <tr>
                          <th className={`px-2 py-1.5 text-left text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Period</th>
                          <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Invoices</th>
                          <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Paid</th>
                          <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Outstanding</th>
                          <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Estimates</th>
                          <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Invoiced Value</th>
                          <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Estimated Value</th>
                          <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Clients</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${activeTheme.border}`}>
                        {monthlyBreakdown.map((row, idx) => (
                          <tr key={idx} className={activeTheme.tableRowHover}>
                            <td className={`px-2 py-1.5 text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.textPrimary}`}>{row.period}</td>
                            <td className={`px-2 py-1.5 text-[11px] text-right sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{row.invoices}</td>
                            <td className="px-2 py-1.5 text-[11px] text-right text-emerald-600 sm:px-4 sm:py-3 sm:text-sm">{row.paid}</td>
                            <td className="px-2 py-1.5 text-[11px] text-right text-amber-600 sm:px-4 sm:py-3 sm:text-sm">{row.outstanding}</td>
                            <td className={`px-2 py-1.5 text-[11px] text-right sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{row.estimates}</td>
                            <td className={`px-2 py-1.5 text-[11px] text-right font-semibold sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{formatCurrency(row.totalInvoiced)}</td>
                            <td className={`px-2 py-1.5 text-[11px] text-right font-semibold sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{formatCurrency(row.totalEstimated)}</td>
                            <td className={`px-2 py-1.5 text-[11px] text-right sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{row.clients}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {monthlyBreakdown.length === 0 && (
                    <div className="pt-4">
                      <ChartEmptyState theme={activeTheme} title="No period data" description="There is no period breakdown for the selected filters." />
                    </div>
                  )}
                </AnalyticsCard>

                <div className="grid xl:grid-cols-2 gap-6">
                  <AnalyticsCard
                    title="Client Performance"
                    subtitle="Detailed client-level financial activity"
                    theme={activeTheme}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className={activeTheme.tableHeaderBg}>
                          <tr>
                            <th className={`px-2 py-1.5 text-left text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Client</th>
                            <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Invoices</th>
                            <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Estimates</th>
                            <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Invoiced</th>
                            <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Paid</th>
                            <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Outstanding</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${activeTheme.border}`}>
                          {clientReporting.map((client, idx) => (
                            <tr key={idx} className={activeTheme.tableRowHover}>
                              <td className={`px-2 py-1.5 text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.textPrimary}`}>{client.name}</td>
                              <td className={`px-2 py-1.5 text-[11px] text-right sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{client.invoices}</td>
                              <td className={`px-2 py-1.5 text-[11px] text-right sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{client.estimates}</td>
                              <td className={`px-2 py-1.5 text-[11px] text-right font-semibold sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{formatCurrency(client.totalInvoiced)}</td>
                              <td className="px-2 py-1.5 text-[11px] text-right text-emerald-600 sm:px-4 sm:py-3 sm:text-sm">{formatCurrency(client.totalPaid)}</td>
                              <td className="px-2 py-1.5 text-[11px] text-right text-amber-600 sm:px-4 sm:py-3 sm:text-sm">{formatCurrency(client.outstanding)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {clientReporting.length === 0 && (
                      <div className="pt-4">
                        <ChartEmptyState theme={activeTheme} title="No client performance data" description="Client metrics will appear here once documents exist." />
                      </div>
                    )}
                  </AnalyticsCard>

                  <AnalyticsCard
                    title="Recent Activity Log"
                    subtitle="Readable list of the latest documents"
                    theme={activeTheme}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className={activeTheme.tableHeaderBg}>
                          <tr>
                            <th className={`px-2 py-1.5 text-left text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Document</th>
                            <th className={`px-2 py-1.5 text-left text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Client</th>
                            <th className={`px-2 py-1.5 text-left text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Date</th>
                            <th className={`px-2 py-1.5 text-left text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Status</th>
                            <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Total</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${activeTheme.border}`}>
                          {recentActivity.map((item, idx) => (
                            <tr key={`${item.id || item.number}-${idx}`} className={activeTheme.tableRowHover}>
                              <td className={`px-2 py-1.5 text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.textPrimary}`}>{item.number}</td>
                              <td className={`px-2 py-1.5 text-[11px] sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{item.clientName}</td>
                              <td className={`px-2 py-1.5 text-[11px] sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{formatDate(item.date)}</td>
                              <td className={`px-2 py-1.5 text-[11px] sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{item.status}</td>
                              <td className={`px-2 py-1.5 text-[11px] text-right font-semibold sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {recentActivity.length === 0 && (
                      <div className="pt-4">
                        <ChartEmptyState theme={activeTheme} title="No recent activity" description="The recent activity log is empty for the current filters." />
                      </div>
                    )}
                  </AnalyticsCard>
                </div>
              </div>
            </>
          ) : reportView === 'business' ? (
            <>
              <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-3xl p-6 lg:p-8 overflow-hidden relative`}>
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_right,rgba(212,20,42,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(92,11,22,0.18),transparent_25%)]" />
                <div className="relative grid lg:grid-cols-[1.4fr_0.9fr] gap-6 items-start">
                  <div>
                    <p className={`text-xs uppercase tracking-[0.25em] ${activeTheme.textMuted}`}>Business View</p>
                    <h2 className={`mt-3 text-3xl font-bold ${activeTheme.textPrimary}`}>Operational snapshot</h2>
                    <p className={`mt-3 max-w-2xl text-sm ${activeTheme.textSecondary}`}>
                      A management-focused summary of revenue, collections, client activity, and recent document flow for the selected filters.
                    </p>
                    <div className="grid sm:grid-cols-3 gap-4 mt-6">
                      <div className={`rounded-2xl border ${activeTheme.border} ${activeTheme.subtleBg} p-4`}>
                        <p className={`text-xs uppercase tracking-wide ${activeTheme.textMuted}`}>Revenue</p>
                        <p className={`mt-2 text-2xl font-bold ${activeTheme.textPrimary}`}>{formatCurrency(summary.totalInvoiced)}</p>
                        <p className={`mt-1 text-xs ${activeTheme.textMuted}`}>{summary.invoiceCount} invoices issued</p>
                      </div>
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-emerald-600">Collected</p>
                        <p className="mt-2 text-2xl font-bold text-emerald-700">{formatCurrency(summary.totalPaid)}</p>
                        <p className="mt-1 text-xs text-emerald-600">{paidRatio.toFixed(1)}% collection rate</p>
                      </div>
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-amber-600">Outstanding</p>
                        <p className="mt-2 text-2xl font-bold text-amber-700">{formatCurrency(summary.totalOutstanding)}</p>
                        <p className="mt-1 text-xs text-amber-600">{summary.activeClients} active clients</p>
                      </div>
                    </div>
                  </div>
                  <div className={`rounded-3xl border ${activeTheme.border} ${activeTheme.subtleBg} p-5`}>
                    <p className={`text-xs uppercase tracking-[0.2em] ${activeTheme.textMuted}`}>Top Client</p>
                    <p className={`mt-3 text-xl font-semibold ${activeTheme.textPrimary}`}>{topClient?.name || 'No client activity'}</p>
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${activeTheme.textMuted}`}>Invoiced</span>
                        <span className={`text-sm font-semibold ${activeTheme.textPrimary}`}>{topClient ? formatCurrency(topClient.totalInvoiced) : formatCurrency(0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${activeTheme.textMuted}`}>Paid</span>
                        <span className="text-sm font-semibold text-emerald-600">{topClient ? formatCurrency(topClient.totalPaid) : formatCurrency(0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${activeTheme.textMuted}`}>Outstanding</span>
                        <span className="text-sm font-semibold text-amber-600">{topClient ? formatCurrency(topClient.outstanding) : formatCurrency(0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${activeTheme.textMuted}`}>Last Activity</span>
                        <span className={`text-sm font-semibold ${activeTheme.textPrimary}`}>
                          {topClient?.lastActivity ? formatDate(topClient.lastActivity.toISOString().split('T')[0]) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-4">
                {businessSignals.map((signal) => (
                  <div key={signal.title} className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl p-5`}>
                    <p className={`text-xs uppercase tracking-[0.18em] ${activeTheme.textMuted}`}>{signal.title}</p>
                    <p className={`mt-3 text-2xl font-bold ${activeTheme.textPrimary}`}>{signal.value}</p>
                    <p className={`mt-2 text-sm ${activeTheme.textSecondary}`}>{signal.detail}</p>
                  </div>
                ))}
              </div>

              <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-6">
                <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl overflow-hidden shadow-sm`}>
                  <div className={`p-4 border-b ${activeTheme.border}`}>
                    <h2 className={`text-lg font-semibold ${activeTheme.textPrimary}`}>Best Clients</h2>
                    <p className={`text-sm ${activeTheme.textMuted}`}>Clients ranked by invoiced value</p>
                  </div>
                  <div className={`divide-y ${activeTheme.border}`}>
                    {clientReporting.slice(0, 5).map((clientItem) => (
                      <div key={clientItem.name} className={`p-4 ${activeTheme.tableRowHover}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className={`font-medium ${activeTheme.textPrimary}`}>{clientItem.name}</p>
                            <p className={`text-xs ${activeTheme.textMuted} mt-1`}>
                              {clientItem.invoices} invoices • {clientItem.estimates} estimates
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${activeTheme.textPrimary}`}>{formatCurrency(clientItem.totalInvoiced)}</p>
                            <p className="text-xs text-amber-600 mt-1">{formatCurrency(clientItem.outstanding)} outstanding</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {clientReporting.length === 0 && (
                      <div className={`p-8 text-center ${activeTheme.textMuted}`}>No client activity for the selected filters.</div>
                    )}
                  </div>
                </div>

                <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl overflow-hidden shadow-sm`}>
                  <div className={`p-4 border-b ${activeTheme.border}`}>
                    <h2 className={`text-lg font-semibold ${activeTheme.textPrimary}`}>Recent Activity</h2>
                    <p className={`text-sm ${activeTheme.textMuted}`}>Latest invoices and estimates</p>
                  </div>
                  <div className={`divide-y ${activeTheme.border}`}>
                    {recentActivity.slice(0, 8).map((item, idx) => (
                      <div key={`${item.id || item.number}-${idx}`} className={`p-4 ${activeTheme.tableRowHover}`}>
                        <div className="flex justify-between gap-4">
                          <div>
                            <p className={`font-medium ${activeTheme.textPrimary}`}>{item.number}</p>
                            <p className={`text-sm ${activeTheme.textMuted}`}>{item.clientName}</p>
                            <p className={`text-xs ${activeTheme.iconColor} mt-1`}>{formatDate(item.date)} • {item.type}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${activeTheme.textPrimary}`}>{formatCurrency(item.total)}</p>
                            <p className={`text-xs ${activeTheme.textMuted} mt-1`}>{item.status}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {recentActivity.length === 0 && (
                      <div className={`p-8 text-center ${activeTheme.textMuted}`}>No activity for the selected filters.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl overflow-hidden shadow-sm`}>
                <div className={`p-4 border-b ${activeTheme.border}`}>
                  <h2 className={`text-lg font-semibold ${activeTheme.textPrimary}`}>Period Snapshot</h2>
                  <p className={`text-sm ${activeTheme.textMuted}`}>Latest period performance at a glance</p>
                </div>
                {latestPeriod ? (
                  <div className="grid md:grid-cols-4 gap-4 p-4">
                    <div className={`${activeTheme.subtleBg} rounded-2xl p-4`}>
                      <p className={`text-xs uppercase tracking-wide ${activeTheme.textMuted}`}>Period</p>
                      <p className={`mt-2 font-semibold ${activeTheme.textPrimary}`}>{latestPeriod.period}</p>
                    </div>
                    <div className={`${activeTheme.subtleBg} rounded-2xl p-4`}>
                      <p className={`text-xs uppercase tracking-wide ${activeTheme.textMuted}`}>Invoice Value</p>
                      <p className={`mt-2 font-semibold ${activeTheme.textPrimary}`}>{formatCurrency(latestPeriod.totalInvoiced)}</p>
                    </div>
                    <div className={`${activeTheme.subtleBg} rounded-2xl p-4`}>
                      <p className={`text-xs uppercase tracking-wide ${activeTheme.textMuted}`}>Estimate Value</p>
                      <p className={`mt-2 font-semibold ${activeTheme.textPrimary}`}>{formatCurrency(latestPeriod.totalEstimated)}</p>
                    </div>
                    <div className={`${activeTheme.subtleBg} rounded-2xl p-4`}>
                      <p className={`text-xs uppercase tracking-wide ${activeTheme.textMuted}`}>Clients</p>
                      <p className={`mt-2 font-semibold ${activeTheme.textPrimary}`}>{latestPeriod.clients}</p>
                    </div>
                  </div>
                ) : (
                  <div className={`p-8 text-center ${activeTheme.textMuted}`}>No period data available for the selected filters.</div>
                )}
              </div>
            </>
          ) : (
            <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl p-4 shadow-sm`}>
              <p className={`text-sm ${activeTheme.textMuted}`}>Total Invoiced</p>
              <p className={`text-2xl font-bold mt-1 ${activeTheme.textPrimary}`}>{formatCurrency(summary.totalInvoiced)}</p>
              <p className={`text-xs ${activeTheme.iconColor} mt-1`}>{summary.invoiceCount} invoices</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-emerald-600">Total Paid</p>
              <p className="text-2xl font-bold mt-1 text-emerald-700">{formatCurrency(summary.totalPaid)}</p>
              <p className="text-xs text-emerald-500 mt-1">{summary.totalInvoiced > 0 ? ((summary.totalPaid / summary.totalInvoiced) * 100).toFixed(1) : 0}% of invoiced</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-amber-600">Outstanding</p>
              <p className="text-2xl font-bold mt-1 text-amber-700">{formatCurrency(summary.totalOutstanding)}</p>
              <p className="text-xs text-amber-500 mt-1">{summary.totalInvoiced > 0 ? ((summary.totalOutstanding / summary.totalInvoiced) * 100).toFixed(1) : 0}% of invoiced</p>
            </div>
            <div className={`${activeTheme.subtleBg} border ${activeTheme.border} rounded-2xl p-4 shadow-sm`}>
              <p className={`text-sm ${activeTheme.textMuted}`}>Estimates</p>
              <p className={`text-2xl font-bold mt-1 ${activeTheme.textPrimary}`}>{formatCurrency(summary.totalEstimates)}</p>
              <p className={`text-xs ${activeTheme.iconColor} mt-1`}>{summary.estimateCount} estimates</p>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl p-4 shadow-sm`}>
              <p className={`text-sm ${activeTheme.textMuted}`}>Active Clients</p>
              <p className={`text-xl font-bold mt-1 ${activeTheme.textPrimary}`}>{summary.activeClients}</p>
            </div>
            <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl p-4 shadow-sm`}>
              <p className={`text-sm ${activeTheme.textMuted}`}>Conversion Rate</p>
              <p className={`text-xl font-bold mt-1 ${activeTheme.textPrimary}`}>{summary.conversionRate.toFixed(1)}%</p>
              <p className={`text-xs ${activeTheme.iconColor} mt-1`}>Estimates to invoices</p>
            </div>
            <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl p-4 shadow-sm`}>
              <p className={`text-sm ${activeTheme.textMuted}`}>Average Invoice Value</p>
              <p className={`text-xl font-bold mt-1 ${activeTheme.textPrimary}`}>{summary.invoiceCount > 0 ? formatCurrency(summary.totalInvoiced / summary.invoiceCount) : formatCurrency(0)}</p>
            </div>
          </div>

          {/* Monthly Breakdown */}
          <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl overflow-hidden shadow-sm`}>
            <div className={`p-4 border-b ${activeTheme.border}`}>
              <h2 className={`text-lg font-semibold ${activeTheme.textPrimary}`}>Period Breakdown</h2>
              <p className={`text-sm ${activeTheme.textMuted}`}>Revenue and activity by period</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={activeTheme.tableHeaderBg}>
                  <tr>
                    <th className={`px-2 py-1.5 text-left text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Period</th>
                    <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Invoices</th>
                    <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Paid</th>
                    <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Outstanding</th>
                    <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Estimates</th>
                    <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Total Invoiced</th>
                    <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Total Estimated</th>
                    <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Clients</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${activeTheme.border}`}>
                  {monthlyBreakdown.map((row, idx) => (
                    <tr key={idx} className={activeTheme.tableRowHover}>
                      <td className={`px-2 py-1.5 text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.textPrimary}`}>{row.period}</td>
                      <td className={`px-2 py-1.5 text-[11px] text-right sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{row.invoices}</td>
                      <td className="px-2 py-1.5 text-[11px] text-right text-emerald-600 sm:px-4 sm:py-3 sm:text-sm">{row.paid}</td>
                      <td className="px-2 py-1.5 text-[11px] text-right text-amber-600 sm:px-4 sm:py-3 sm:text-sm">{row.outstanding}</td>
                      <td className={`px-2 py-1.5 text-[11px] text-right sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{row.estimates}</td>
                      <td className={`px-2 py-1.5 text-[11px] text-right font-medium sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{formatCurrency(row.totalInvoiced)}</td>
                      <td className={`px-2 py-1.5 text-[11px] text-right font-medium sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{formatCurrency(row.totalEstimated)}</td>
                      <td className={`px-2 py-1.5 text-[11px] text-right sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{row.clients}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {monthlyBreakdown.length === 0 && (
              <div className={`p-8 text-center ${activeTheme.textMuted}`}>
                No data available for the selected filters.
              </div>
            )}
          </div>

          {/* Client Reporting */}
          <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl overflow-hidden shadow-sm`}>
            <div className={`p-4 border-b ${activeTheme.border}`}>
              <h2 className={`text-lg font-semibold ${activeTheme.textPrimary}`}>Client Performance</h2>
              <p className={`text-sm ${activeTheme.textMuted}`}>Revenue and activity by client</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={activeTheme.tableHeaderBg}>
                  <tr>
                    <th className={`px-2 py-1.5 text-left text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Client</th>
                    <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Invoices</th>
                    <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Estimates</th>
                    <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Total Invoiced</th>
                    <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Total Paid</th>
                    <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Outstanding</th>
                    <th className={`px-2 py-1.5 text-right text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.labelColor}`}>Last Activity</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${activeTheme.border}`}>
                  {clientReporting.map((client, idx) => (
                    <tr key={idx} className={activeTheme.tableRowHover}>
                      <td className={`px-2 py-1.5 text-[11px] sm:px-4 sm:py-3 sm:text-sm font-medium ${activeTheme.textPrimary}`}>{client.name}</td>
                      <td className={`px-2 py-1.5 text-[11px] text-right sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{client.invoices}</td>
                      <td className={`px-2 py-1.5 text-[11px] text-right sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{client.estimates}</td>
                      <td className={`px-2 py-1.5 text-[11px] text-right font-medium sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{formatCurrency(client.totalInvoiced)}</td>
                      <td className="px-2 py-1.5 text-[11px] text-right text-emerald-600 sm:px-4 sm:py-3 sm:text-sm">{formatCurrency(client.totalPaid)}</td>
                      <td className="px-2 py-1.5 text-[11px] text-right text-amber-600 sm:px-4 sm:py-3 sm:text-sm">{formatCurrency(client.outstanding)}</td>
                      <td className={`px-2 py-1.5 text-[11px] text-right sm:px-4 sm:py-3 sm:text-sm ${activeTheme.textPrimary}`}>{client.lastActivity ? formatDate(client.lastActivity.toISOString().split('T')[0]) : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {clientReporting.length === 0 && (
              <div className={`p-8 text-center ${activeTheme.textMuted}`}>
                No client data available for the selected filters.
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className={`${activeTheme.cardBg} border ${activeTheme.border} rounded-2xl overflow-hidden shadow-sm`}>
            <div className={`p-4 border-b ${activeTheme.border}`}>
              <h2 className={`text-lg font-semibold ${activeTheme.textPrimary}`}>Recent Activity</h2>
              <p className={`text-sm ${activeTheme.textMuted}`}>Latest invoices and estimates</p>
            </div>
            <div className={`divide-y ${activeTheme.border}`}>
              {recentActivity.map((item, idx) => (
                <div key={idx} className={`p-4 ${activeTheme.tableRowHover}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={`font-medium ${activeTheme.textPrimary}`}>{item.number}</p>
                      <p className={`text-sm ${activeTheme.textMuted}`}>{item.clientName} • {formatDate(item.date)} • {item.status}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${activeTheme.textPrimary}`}>{formatCurrency(item.total)}</p>
                      <p className={`text-xs ${activeTheme.iconColor}`}>{item.type}</p>
                    </div>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <div className={`p-8 text-center ${activeTheme.textMuted}`}>
                  No activity for the selected filters.
                </div>
              )}
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className={`min-h-screen ${activeTheme.appBg} flex items-center justify-center`}>
        <div className={`animate-spin w-8 h-8 border-4 ${activeTheme.spinner} rounded-full`} />
      </div>
    );
  }

  const renderContent = () => {
    switch (view) {
      case 'view-invoice':
        return <InvoiceView />;
      case 'edit-invoice':
        return <InvoiceEdit />;
      case 'view-estimate':
        return <EstimateView />;
      case 'edit-estimate':
        return <EstimateEdit />;
      case 'view-client':
        return <ClientView />;
      case 'edit-client':
        return <ClientEdit />;
      case 'edit-item':
        return <ItemEdit />;
      default:
        switch (activeTab) {
          case 'invoices':
            return <InvoicesList />;
          case 'estimates':
            return <EstimatesList />;
          case 'clients':
            return <ClientsList />;
          case 'items':
            return <ItemsList />;
          case 'finance':
            return <FinancePage data={data} save={save} theme={activeTheme} />;
          case 'staff-events':
            return <StaffEventPage data={data} save={save} theme={activeTheme} />;
          case 'reports':
            return <ReportsPage />;
          case 'settings':
            return <SettingsPage save={save} saveTheme={saveTheme} activeTheme={activeTheme} uploadLogo={uploadLogo ?? null} />;
          default:
            return <InvoicesList />;
        }
    }
  };

  const modals = (
    <>
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${activeTheme.modalBg} rounded-2xl w-full max-w-md p-6 shadow-xl ${activeTheme.border}`}>
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
              <h2 className={`font-semibold text-lg ${activeTheme.textPrimary}`}>Confirm Delete</h2>
            </div>
            <p className={`${activeTheme.textSecondary} mb-6`}>{confirmMessage}</p>
            <div className="flex gap-2">
              <button
                className={`flex-1 py-2 ${activeTheme.border} rounded-xl ${activeTheme.textPrimary} hover:${activeTheme.panelBg}`}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className={`flex-1 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700`}
                onClick={async () => {
                  setConfirmOpen(false);
                  await confirmAction();
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <ImportPdfModal
        isOpen={showImportPdf}
        onClose={() => setShowImportPdf(false)}
        onImport={handlePdfImport}
        existingClients={data.clients}
        theme={activeTheme}
      />
    </>
  );

  if (usePhoneLayout) {
    return (
      <MobileLayout
        activeTab={activeTab}
        onSelectTab={selectAppTab}
        onPlusPress={handlePhonePlusPress}
        navItems={navItems}
        businessName={data.settings?.businessName}
        businessEmail={data.settings?.email}
        logo={data.settings?.logo}
        activeTheme={activeTheme}
        view={view}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      >
        {renderContent()}
        {modals}
      </MobileLayout>
    );
  }

  return (
    <div
      className={`h-[100dvh] ${rootOverflowClass} ${activeTheme.appBg}`}
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      <div className="flex h-full" style={frameStyle}>
        <InvoiceAppDesktopSidebar
          visible
          isTablet={useTabletLayout}
          activeTheme={activeTheme}
          businessName={data.settings?.businessName}
          logo={data.settings?.logo}
          navItems={navItems}
          activeTab={activeTab}
          onSelectTab={selectAppTab}
        />
        <main className="flex flex-1 flex-col overflow-hidden">
          {activeTab === 'settings' && cloudToolbarProps && renderCloudToolbar ? renderCloudToolbar(cloudToolbarProps) : null}
          <div className={`min-h-0 flex-1 ${mainContentPaddingClass}`}>
            <div
              ref={mobileScrollRootRef}
              className={`${activeTheme.panelBg} shadow-sm ${activeTheme.border} h-full overflow-hidden ${panelShellClass}`}
              style={activeTab === 'settings' ? undefined : { maxWidth: '1600px' }}
            >
              <div className="flex h-full flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {renderContent()}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <MobileScrollAssist
        visible={useTabletLayout}
        hasBottomDock={false}
        scrollRootRef={mobileScrollRootRef}
      />
      {modals}
    </div>
  );
}
