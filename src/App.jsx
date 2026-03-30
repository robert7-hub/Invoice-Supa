import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { InvoiceApp } from './InvoiceApp';
import './styles.css';

const STORAGE_KEYS = [
  'invoiceapp_settings',
  'invoiceapp_clients',
  'invoiceapp_items',
  'invoiceapp_invoices',
  'invoiceapp_estimates',
];

const TABLES = {
  settings: 'business_settings',
  clients: 'clients',
  items: 'items',
  invoices: 'invoices',
  invoiceItems: 'invoice_items',
  estimates: 'estimates',
  estimateItems: 'estimate_items',
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const blankForm = { email: '', password: '' };

function getLocalState() {
  const parse = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  return {
    settings: parse('invoiceapp_settings', null),
    clients: parse('invoiceapp_clients', []),
    items: parse('invoiceapp_items', []),
    invoices: parse('invoiceapp_invoices', []),
    estimates: parse('invoiceapp_estimates', []),
  };
}

function writeLocalState(state) {
  localStorage.setItem('invoiceapp_settings', JSON.stringify(state.settings ?? null));
  localStorage.setItem('invoiceapp_clients', JSON.stringify(state.clients ?? []));
  localStorage.setItem('invoiceapp_items', JSON.stringify(state.items ?? []));
  localStorage.setItem('invoiceapp_invoices', JSON.stringify(state.invoices ?? []));
  localStorage.setItem('invoiceapp_estimates', JSON.stringify(state.estimates ?? []));
  window.dispatchEvent(new Event('invoiceapp:reload'));
}

function mapSettingsRowToLocal(row) {
  if (!row) return null;
  return {
    businessName: row.business_name ?? '',
    businessNumber: row.business_number ?? '',
    address: row.address ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    bankName: row.bank_name ?? '',
    accountNumber: row.account_number ?? '',
    accountType: row.account_type ?? '',
    branchCode: row.branch_code ?? '',
    branchName: row.branch_name ?? '',
    swiftCode: row.swift_code ?? '',
    taxRate: Number(row.tax_rate ?? 0),
    taxLabel: row.tax_label ?? 'VAT',
    customBlock1: row.custom_block_1 ?? '',
    customBlock2: row.custom_block_2 ?? '',
    defaultInvoiceNotes: row.default_invoice_notes ?? '',
    defaultEstimateNotes: row.default_estimate_notes ?? '',
    nextInvoiceNumber: row.next_invoice_number ?? '00000',
    nextEstimateNumber: row.next_estimate_number ?? '00000',
    logo: row.logo ?? null,
    appTheme: row.app_theme ?? 'default',
  };
}

function mapSettingsLocalToRow(userId, settings) {
  return {
    user_id: userId,
    business_name: settings?.businessName ?? '',
    business_number: settings?.businessNumber ?? '',
    address: settings?.address ?? '',
    phone: settings?.phone ?? '',
    email: settings?.email ?? '',
    bank_name: settings?.bankName ?? '',
    account_number: settings?.accountNumber ?? '',
    account_type: settings?.accountType ?? '',
    branch_code: settings?.branchCode ?? '',
    branch_name: settings?.branchName ?? '',
    swift_code: settings?.swiftCode ?? '',
    tax_rate: Number(settings?.taxRate ?? 0),
    tax_label: settings?.taxLabel ?? 'VAT',
    custom_block_1: settings?.customBlock1 ?? '',
    custom_block_2: settings?.customBlock2 ?? '',
    default_invoice_notes: settings?.defaultInvoiceNotes ?? '',
    default_estimate_notes: settings?.defaultEstimateNotes ?? '',
    next_invoice_number: String(settings?.nextInvoiceNumber ?? '00000'),
    next_estimate_number: String(settings?.nextEstimateNumber ?? '00000'),
    logo: settings?.logo ?? null,
    app_theme: settings?.appTheme ?? 'default',
    updated_at: new Date().toISOString(),
  };
}

function mapClientRowToLocal(row) {
  return {
    id: row.id,
    name: row.name ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    addressLine1: row.address_line1 ?? '',
    addressLine2: row.address_line2 ?? '',
    city: row.city ?? '',
    postalCode: row.postal_code ?? '',
    vatNumber: row.vat_number ?? '',
    extraLine1: row.extra_line1 ?? '',
    extraLine2: row.extra_line2 ?? '',
    extraLine3: row.extra_line3 ?? '',
    extraLine4: row.extra_line4 ?? '',
    extraLine5: row.extra_line5 ?? '',
    notes: row.notes ?? '',
    createdAt: row.created_at ?? '',
  };
}

function mapClientLocalToRow(userId, client) {
  return {
    id: client.id,
    user_id: userId,
    name: client.name ?? '',
    phone: client.phone ?? '',
    email: client.email ?? '',
    address_line1: client.addressLine1 ?? '',
    address_line2: client.addressLine2 ?? '',
    city: client.city ?? '',
    postal_code: client.postalCode ?? '',
    vat_number: client.vatNumber ?? '',
    extra_line1: client.extraLine1 ?? '',
    extra_line2: client.extraLine2 ?? '',
    extra_line3: client.extraLine3 ?? '',
    extra_line4: client.extraLine4 ?? '',
    extra_line5: client.extraLine5 ?? '',
    notes: client.notes ?? '',
    created_at: client.createdAt || null,
    updated_at: new Date().toISOString(),
  };
}

function mapItemRowToLocal(row) {
  return {
    id: row.id,
    name: row.name ?? '',
    description: row.description ?? '',
    unitCost: Number(row.unit_cost ?? 0),
    unit: row.unit ?? '',
    quantity: Number(row.quantity ?? 1),
    discountType: row.discount_type ?? 'percentage',
    discountAmount: Number(row.discount_amount ?? 0),
    taxable: Boolean(row.taxable),
    additionalDetails: row.additional_details ?? '',
    createdAt: row.created_at ?? '',
  };
}

function mapItemLocalToRow(userId, item) {
  return {
    id: item.id,
    user_id: userId,
    name: item.name ?? '',
    description: item.description ?? '',
    unit_cost: Number(item.unitCost ?? 0),
    unit: item.unit ?? '',
    quantity: Number(item.quantity ?? 1),
    discount_type: item.discountType ?? 'percentage',
    discount_amount: Number(item.discountAmount ?? 0),
    taxable: Boolean(item.taxable),
    additional_details: item.additionalDetails ?? '',
    created_at: item.createdAt || null,
    updated_at: new Date().toISOString(),
  };
}

function mapInvoiceRowToLocal(row, lineItems) {
  return {
    id: row.id,
    number: row.number ?? '',
    clientId: row.client_id ?? '',
    date: row.invoice_date ?? '',
    dueDate: row.due_date ?? '',
    status: row.status ?? 'outstanding',
    amountPaid: Number(row.amount_paid ?? 0),
    items: lineItems,
    notes: row.notes ?? '',
    overallDiscount: Number(row.overall_discount ?? 0),
    overallDiscountType: row.overall_discount_type ?? 'percentage',
    createdAt: row.created_at ?? '',
  };
}

function mapInvoiceLocalToRow(userId, invoice) {
  return {
    id: invoice.id,
    user_id: userId,
    client_id: invoice.clientId || null,
    number: invoice.number ?? '',
    invoice_date: invoice.date || null,
    due_date: invoice.dueDate || null,
    status: invoice.status ?? 'outstanding',
    amount_paid: Number(invoice.amountPaid ?? 0),
    notes: invoice.notes ?? '',
    overall_discount: Number(invoice.overallDiscount ?? 0),
    overall_discount_type: invoice.overallDiscountType ?? 'percentage',
    created_at: invoice.createdAt || null,
    updated_at: new Date().toISOString(),
  };
}

function mapEstimateRowToLocal(row, lineItems) {
  return {
    id: row.id,
    number: row.number ?? '',
    clientId: row.client_id ?? '',
    date: row.estimate_date ?? '',
    status: row.status ?? 'pending',
    items: lineItems,
    notes: row.notes ?? '',
    overallDiscount: Number(row.overall_discount ?? 0),
    overallDiscountType: row.overall_discount_type ?? 'percentage',
    createdAt: row.created_at ?? '',
  };
}

function mapEstimateLocalToRow(userId, estimate) {
  return {
    id: estimate.id,
    user_id: userId,
    client_id: estimate.clientId || null,
    number: estimate.number ?? '',
    estimate_date: estimate.date || null,
    status: estimate.status ?? 'pending',
    notes: estimate.notes ?? '',
    overall_discount: Number(estimate.overallDiscount ?? 0),
    overall_discount_type: estimate.overallDiscountType ?? 'percentage',
    created_at: estimate.createdAt || null,
    updated_at: new Date().toISOString(),
  };
}

function mapLineItemRowToLocal(row) {
  return {
    id: row.id,
    description: row.description ?? '',
    notes: row.notes ?? '',
    rate: Number(row.rate ?? 0),
    qty: Number(row.qty ?? 1),
    unit: row.unit ?? '',
    discountType: row.discount_type ?? 'percentage',
    discountAmount: Number(row.discount_amount ?? 0),
    taxable: Boolean(row.taxable),
  };
}

function mapInvoiceLineItemLocalToRow(item, invoiceId, position) {
  return {
    user_id: null,
    id: item.id,
    invoice_id: invoiceId,
    position,
    description: item.description ?? '',
    notes: item.notes ?? '',
    rate: Number(item.rate ?? 0),
    qty: Number(item.qty ?? 1),
    unit: item.unit ?? '',
    discount_type: item.discountType ?? 'percentage',
    discount_amount: Number(item.discountAmount ?? 0),
    taxable: Boolean(item.taxable),
  };
}

function mapEstimateLineItemLocalToRow(item, estimateId, position) {
  return {
    user_id: null,
    id: item.id,
    estimate_id: estimateId,
    position,
    description: item.description ?? '',
    notes: item.notes ?? '',
    rate: Number(item.rate ?? 0),
    qty: Number(item.qty ?? 1),
    unit: item.unit ?? '',
    discount_type: item.discountType ?? 'percentage',
    discount_amount: Number(item.discountAmount ?? 0),
    taxable: Boolean(item.taxable),
  };
}

async function syncUserOwnedRows(table, userId, rows) {
  const { data: existingRows, error: existingError } = await supabase
    .from(table)
    .select('id')
    .eq('user_id', userId);

  if (existingError) throw existingError;

  const desiredIds = new Set(rows.map((row) => row.id));
  const idsToDelete = (existingRows ?? [])
    .map((row) => row.id)
    .filter((id) => !desiredIds.has(id));

  if (idsToDelete.length) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId).in('id', idsToDelete);
    if (error) throw error;
  }

  if (rows.length) {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'user_id,id' });
    if (error) throw error;
  }
}

async function replaceChildRows(table, userId, parentColumn, parentIds, rows) {
  if (!parentIds.length) return;

  const { error: deleteError } = await supabase.from(table).delete().eq('user_id', userId).in(parentColumn, parentIds);
  if (deleteError) throw deleteError;

  if (rows.length) {
    const { error: insertError } = await supabase.from(table).insert(rows);
    if (insertError) throw insertError;
  }
}

async function pullRemoteState(userId) {
  if (!supabase || !userId) return null;
  const [
    { data: settingsRow, error: settingsError },
    { data: clientRows, error: clientsError },
    { data: itemRows, error: itemsError },
    { data: invoiceRows, error: invoicesError },
    { data: estimateRows, error: estimatesError },
  ] = await Promise.all([
    supabase.from(TABLES.settings).select('*').eq('user_id', userId).maybeSingle(),
    supabase.from(TABLES.clients).select('*').eq('user_id', userId).order('name', { ascending: true }),
    supabase.from(TABLES.items).select('*').eq('user_id', userId).order('name', { ascending: true }),
    supabase.from(TABLES.invoices).select('*').eq('user_id', userId).order('invoice_date', { ascending: false }),
    supabase.from(TABLES.estimates).select('*').eq('user_id', userId).order('estimate_date', { ascending: false }),
  ]);

  if (settingsError) throw settingsError;
  if (clientsError) throw clientsError;
  if (itemsError) throw itemsError;
  if (invoicesError) throw invoicesError;
  if (estimatesError) throw estimatesError;

  const invoiceIds = (invoiceRows ?? []).map((row) => row.id);
  const estimateIds = (estimateRows ?? []).map((row) => row.id);

  const [
    { data: invoiceItemRows, error: invoiceItemsError },
    { data: estimateItemRows, error: estimateItemsError },
  ] = await Promise.all([
    invoiceIds.length
      ? supabase.from(TABLES.invoiceItems).select('*').eq('user_id', userId).in('invoice_id', invoiceIds).order('position', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    estimateIds.length
      ? supabase.from(TABLES.estimateItems).select('*').eq('user_id', userId).in('estimate_id', estimateIds).order('position', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (invoiceItemsError) throw invoiceItemsError;
  if (estimateItemsError) throw estimateItemsError;

  const hasRemoteData =
    Boolean(settingsRow) ||
    (clientRows?.length ?? 0) > 0 ||
    (itemRows?.length ?? 0) > 0 ||
    (invoiceRows?.length ?? 0) > 0 ||
    (estimateRows?.length ?? 0) > 0;

  if (!hasRemoteData) return null;

  const invoiceItemsByInvoiceId = new Map();
  for (const row of invoiceItemRows ?? []) {
    const list = invoiceItemsByInvoiceId.get(row.invoice_id) ?? [];
    list.push(mapLineItemRowToLocal(row));
    invoiceItemsByInvoiceId.set(row.invoice_id, list);
  }

  const estimateItemsByEstimateId = new Map();
  for (const row of estimateItemRows ?? []) {
    const list = estimateItemsByEstimateId.get(row.estimate_id) ?? [];
    list.push(mapLineItemRowToLocal(row));
    estimateItemsByEstimateId.set(row.estimate_id, list);
  }

  return {
    settings: mapSettingsRowToLocal(settingsRow),
    clients: (clientRows ?? []).map(mapClientRowToLocal),
    items: (itemRows ?? []).map(mapItemRowToLocal),
    invoices: (invoiceRows ?? []).map((row) => mapInvoiceRowToLocal(row, invoiceItemsByInvoiceId.get(row.id) ?? [])),
    estimates: (estimateRows ?? []).map((row) => mapEstimateRowToLocal(row, estimateItemsByEstimateId.get(row.id) ?? [])),
  };
}

async function pushRemoteState(userId, state) {
  if (!supabase || !userId) return;
  const settingsRow = mapSettingsLocalToRow(userId, state.settings ?? {});
  const clientRows = (state.clients ?? []).map((client) => mapClientLocalToRow(userId, client));
  const itemRows = (state.items ?? []).map((item) => mapItemLocalToRow(userId, item));
  const invoiceRows = (state.invoices ?? []).map((invoice) => mapInvoiceLocalToRow(userId, invoice));
  const estimateRows = (state.estimates ?? []).map((estimate) => mapEstimateLocalToRow(userId, estimate));
  const invoiceItemRows = (state.invoices ?? []).flatMap((invoice) =>
    (invoice.items ?? []).map((item, index) => ({ ...mapInvoiceLineItemLocalToRow(item, invoice.id, index), user_id: userId })),
  );
  const estimateItemRows = (state.estimates ?? []).flatMap((estimate) =>
    (estimate.items ?? []).map((item, index) => ({ ...mapEstimateLineItemLocalToRow(item, estimate.id, index), user_id: userId })),
  );

  const { error: settingsError } = await supabase.from(TABLES.settings).upsert(settingsRow, { onConflict: 'user_id' });
  if (settingsError) throw settingsError;

  await syncUserOwnedRows(TABLES.clients, userId, clientRows);
  await syncUserOwnedRows(TABLES.items, userId, itemRows);
  await syncUserOwnedRows(TABLES.invoices, userId, invoiceRows);
  await replaceChildRows(TABLES.invoiceItems, userId, 'invoice_id', invoiceRows.map((row) => row.id), invoiceItemRows);
  await syncUserOwnedRows(TABLES.estimates, userId, estimateRows);
  await replaceChildRows(TABLES.estimateItems, userId, 'estimate_id', estimateRows.map((row) => row.id), estimateItemRows);
}

function ConnectionBanner() {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
      <p className="font-semibold">Supabase keys not found</p>
      <p className="mt-1">
        Add <code>VITE_SUPABASE_URL</code> and either <code>VITE_SUPABASE_ANON_KEY</code> or <code>VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY</code> to your <code>.env</code> file, then refresh the app.
      </p>
    </div>
  );
}

function AuthCard({ mode, setMode, form, setForm, onSubmit, message, busy }) {
  const isSignUp = mode === 'signup';

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Record Productions Invoicing</h1>
      <p className="mt-2 text-sm text-slate-600">
        Sign in to sync your invoices, clients, items, and settings with Supabase.
      </p>

      <div className="mt-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
        <button
          onClick={() => setMode('signin')}
          className={`rounded-2xl px-4 py-2 text-sm font-medium ${!isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          Sign in
        </button>
        <button
          onClick={() => setMode('signup')}
          className={`rounded-2xl px-4 py-2 text-sm font-medium ${isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          Create account
        </button>
      </div>

      <div className="mt-5 space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-0 transition focus:border-slate-500"
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-0 transition focus:border-slate-500"
            placeholder="At least 6 characters"
          />
        </label>
      </div>

      <button
        onClick={onSubmit}
        disabled={busy}
        className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
      </button>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}

function CloudToolbar({ email, onSignOut, syncStatus, onPull, onPush }) {
  return (
    <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-2.5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Cloud sync</p>
          <p className="truncate text-sm text-slate-500">{email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-[11px] font-medium text-slate-500">{syncStatus}</span>
          <button onClick={onPull} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Pull cloud data
          </button>
          <button onClick={onPush} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Push local data
          </button>
          <button onClick={onSignOut} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState(blankForm);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Not synced yet');
  const debounceRef = useRef(null);
  const muteSyncRef = useRef(false);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user?.id) return;

    let cancelled = false;

    const bootstrap = async () => {
      try {
        setSyncStatus('Checking cloud data…');
        const remote = await pullRemoteState(session.user.id);
        if (cancelled) return;

        if (remote) {
          muteSyncRef.current = true;
          writeLocalState(remote);
          window.setTimeout(() => {
            muteSyncRef.current = false;
          }, 250);
          setSyncStatus('Cloud data loaded');
        } else {
          await pushRemoteState(session.user.id, getLocalState());
          setSyncStatus('Local data uploaded to cloud');
        }
      } catch (error) {
        setSyncStatus(`Sync error: ${error.message}`);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!supabase || !session?.user?.id) return;

    const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
    const originalRemoveItem = window.localStorage.removeItem.bind(window.localStorage);

    const scheduleSync = () => {
      if (muteSyncRef.current) return;
      window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(async () => {
        try {
          await pushRemoteState(session.user.id, getLocalState());
          setSyncStatus(`Auto-synced at ${new Date().toLocaleTimeString()}`);
        } catch (error) {
          setSyncStatus(`Sync error: ${error.message}`);
        }
      }, 900);
    };

    window.localStorage.setItem = (key, value) => {
      originalSetItem(key, value);
      if (STORAGE_KEYS.includes(key)) scheduleSync();
    };

    window.localStorage.removeItem = (key) => {
      originalRemoveItem(key);
      if (STORAGE_KEYS.includes(key)) scheduleSync();
    };

    const reloadListener = () => {
      scheduleSync();
    };

    window.addEventListener('invoiceapp:reload', reloadListener);

    return () => {
      window.clearTimeout(debounceRef.current);
      window.localStorage.setItem = originalSetItem;
      window.localStorage.removeItem = originalRemoveItem;
      window.removeEventListener('invoiceapp:reload', reloadListener);
    };
  }, [session?.user?.id]);

  const handleAuth = async () => {
    if (!supabase) return;
    setBusy(true);
    setMessage('');

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setMessage('Account created. Check your email if confirmation is enabled, then sign in.');
        setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) throw error;
        setMessage('');
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSyncStatus('Signed out');
  };

  const handlePull = async () => {
    if (!session?.user?.id) return;
    try {
      setSyncStatus('Pulling cloud data…');
      const remote = await pullRemoteState(session.user.id);
      if (remote) {
        muteSyncRef.current = true;
        writeLocalState(remote);
        window.setTimeout(() => {
          muteSyncRef.current = false;
        }, 250);
        setSyncStatus('Cloud data pulled');
      } else {
        setSyncStatus('No cloud data found');
      }
    } catch (error) {
      setSyncStatus(`Pull failed: ${error.message}`);
    }
  };

  const handlePush = async () => {
    if (!session?.user?.id) return;
    try {
      setSyncStatus('Uploading local data…');
      await pushRemoteState(session.user.id, getLocalState());
      setSyncStatus('Local data pushed to cloud');
    } catch (error) {
      setSyncStatus(`Push failed: ${error.message}`);
    }
  };

  const connected = useMemo(() => Boolean(supabase), []);

  return (
    <div className="min-h-screen bg-slate-100">
      {!connected ? (
        <div className="mx-auto max-w-5xl px-4 py-10">
          <ConnectionBanner />
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <InvoiceApp />
          </div>
        </div>
      ) : !session ? (
        <div className="flex min-h-screen items-center justify-center px-4 py-10">
          <AuthCard
            mode={mode}
            setMode={setMode}
            form={form}
            setForm={setForm}
            onSubmit={handleAuth}
            message={message}
            busy={busy}
          />
        </div>
      ) : (
        <InvoiceApp
          cloudToolbarProps={{
            email: session.user.email,
            onSignOut: handleSignOut,
            syncStatus,
            onPull: handlePull,
            onPush: handlePush,
          }}
          renderCloudToolbar={(props) => <CloudToolbar {...props} />}
        />
      )}
    </div>
  );
}
