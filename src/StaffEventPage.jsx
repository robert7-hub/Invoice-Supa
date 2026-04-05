import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Plus, Trash2, Edit, ChevronLeft, X, Check, Search,
  Users, Calendar, Clock, MapPin, AlertTriangle, CheckCircle,
  DollarSign, Phone, ChevronDown, ChevronUp, ExternalLink,
  User, Music2, Wrench, Speaker, Lightbulb, Truck, MoreVertical,
} from 'lucide-react';

// ============================================================================
// CONSTANTS
// ============================================================================

const STAFF_EVENT_KEYS = {
  staff: 'invoiceapp_staff',
  events: 'invoiceapp_events',
  assignments: 'invoiceapp_event_assignments',
  payments: 'invoiceapp_staff_payments',
};

const ROLES = ['DJ', 'Setup', 'Sound Tech', 'Lighting', 'Assistant'];

const ROLE_ICONS = { DJ: Music2, Setup: Wrench, 'Sound Tech': Speaker, Lighting: Lightbulb, Assistant: User };

const EVENT_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

const AVAILABILITY = ['available', 'unavailable', 'on_leave'];

const PAYMENT_STATUSES = ['unpaid', 'paid'];

// ============================================================================
// HELPERS
// ============================================================================

const generateId = () => Math.random().toString(36).slice(2, 11);

const formatCurrency = (amount) =>
  `R${Number(amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const today = () => new Date().toISOString().split('T')[0];

const staffFullName = (s) => `${s?.firstName || ''} ${s?.surname || ''}`.trim() || 'Unknown';

const staffInitials = (s) => {
  const f = (s?.firstName || '')[0] || '';
  const l = (s?.surname || '')[0] || '';
  return (f + l).toUpperCase() || '?';
};

const loadStaffEventData = () => {
  const load = (key, fallback) => {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
  };
  return {
    staff: load(STAFF_EVENT_KEYS.staff, []),
    events: load(STAFF_EVENT_KEYS.events, []),
    assignments: load(STAFF_EVENT_KEYS.assignments, []),
    payments: load(STAFF_EVENT_KEYS.payments, []),
  };
};

const saveStaffEvent = (key, value) => {
  localStorage.setItem(STAFF_EVENT_KEYS[key], JSON.stringify(value));
};

// ============================================================================
// SHARED UI
// ============================================================================

const FormInput = ({ label, type = 'text', value, onChange, placeholder, multiline, rows = 3, theme }) => (
  <div className="space-y-2">
    <label className={`text-sm font-medium ${theme.textSecondary}`}>{label}</label>
    {multiline ? (
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className={`w-full px-4 py-3 border ${theme.inputBg} ${theme.inputBorder} rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-sm resize-none ${theme.textPrimary}`} />
    ) : (
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full px-4 py-3 border ${theme.inputBg} ${theme.inputBorder} rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-sm ${theme.textPrimary}`} />
    )}
  </div>
);

const StatusBadge = ({ status, statusList = EVENT_STATUSES }) => {
  const s = statusList.find(x => x.value === status) || { label: status, color: 'bg-gray-100 text-gray-800' };
  return <span className={`px-3 py-1 rounded-full text-sm font-semibold ${s.color}`}>{s.label}</span>;
};

const RoleIcon = ({ role, size = 18 }) => {
  const Icon = ROLE_ICONS[role] || User;
  return <Icon size={size} />;
};

// ============================================================================
// 3-DOT MENU COMPONENT
// ============================================================================

const ActionMenu = ({ items, theme }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({});

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
        zIndex: 9999,
      });
    }
  }, [open]);

  return (
    <div className="relative">
      <button ref={btnRef} onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`p-2 rounded-xl ${theme.buttonHover} transition-colors`}>
        <MoreVertical size={20} className={theme.textMuted} />
      </button>
      {open && (
        <div ref={menuRef} style={menuStyle}
          className={`w-52 ${theme.cardBg} border ${theme.border} rounded-xl shadow-xl py-1.5 overflow-hidden`}>
          {items.map((item, idx) => (
            <button key={idx} onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick(); }}
              className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-3 ${
                item.danger ? 'text-red-500 hover:bg-red-50' : `${theme.textPrimary} ${theme.buttonHover}`
              }`}>
              {item.icon && <item.icon size={16} />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ASSIGN STAFF MODAL
// ============================================================================

const AssignStaffModal = ({ event, seData, theme, onClose, onAssign }) => {
  const [staffId, setStaffId] = useState('');
  const [role, setRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [pay, setPay] = useState('');
  const [useCustomRole, setUseCustomRole] = useState(false);

  const availableStaff = seData.staff.filter(s => s.active && s.availability === 'available');

  const checkConflict = (sid) => {
    return seData.events
      .filter(e => e.id !== event.id && e.eventDate === event.eventDate && e.status !== 'cancelled')
      .filter(e => {
        const hasAssignment = seData.assignments.find(a => a.eventId === e.id && a.staffId === sid);
        if (!hasAssignment) return false;
        if (!event.startTime || !event.endTime || !e.startTime || !e.endTime) return true;
        return event.startTime < e.endTime && event.endTime > e.startTime;
      })
      .map(e => e.title);
  };

  const selectedStaff = seData.staff.find(s => s.id === staffId);
  const conflicts = staffId ? checkConflict(staffId) : [];
  const finalRole = useCustomRole ? customRole.trim() : role;

  const handleSubmit = () => {
    if (!staffId || !finalRole) return;
    onAssign({
      staffId,
      role: finalRole,
      pay: Number(pay) || 0,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className={`${theme.cardBg} rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden`} onClick={e => e.stopPropagation()}>
        <div className={`px-6 py-5 border-b ${theme.border} flex items-center justify-between`}>
          <div>
            <h3 className={`text-lg font-bold ${theme.textPrimary}`}>Assign Staff</h3>
            <p className={`text-sm ${theme.textMuted} mt-0.5`}>{event.title}</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl ${theme.buttonHover}`}><X size={20} className={theme.textMuted} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Staff */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${theme.textSecondary}`}>Staff Member</label>
            <select value={staffId} onChange={e => {
              const s = seData.staff.find(st => st.id === e.target.value);
              setStaffId(e.target.value);
              if (s?.rate) setPay(String(s.rate));
            }}
              className={`w-full px-4 py-3 border ${theme.inputBorder} ${theme.inputBg} rounded-xl text-base ${theme.textPrimary}`}>
              <option value="">Select staff member...</option>
              {availableStaff.map(s => (
                <option key={s.id} value={s.id}>{staffFullName(s)}</option>
              ))}
            </select>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${theme.textSecondary}`}>Role</label>
            {!useCustomRole ? (
              <div className="space-y-2">
                <select value={role} onChange={e => setRole(e.target.value)}
                  className={`w-full px-4 py-3 border ${theme.inputBorder} ${theme.inputBg} rounded-xl text-base ${theme.textPrimary}`}>
                  <option value="">Select role...</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button onClick={() => setUseCustomRole(true)}
                  className={`text-sm font-medium text-blue-600 hover:text-blue-700`}>+ Custom role</button>
              </div>
            ) : (
              <div className="space-y-2">
                <input type="text" value={customRole} onChange={e => setCustomRole(e.target.value)}
                  placeholder="Enter custom role..."
                  className={`w-full px-4 py-3 border ${theme.inputBorder} ${theme.inputBg} rounded-xl text-base ${theme.textPrimary}`} />
                <button onClick={() => { setUseCustomRole(false); setCustomRole(''); }}
                  className={`text-sm font-medium text-blue-600 hover:text-blue-700`}>← Back to preset roles</button>
              </div>
            )}
          </div>

          {/* Pay */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${theme.textSecondary}`}>Pay (R)</label>
            <input type="number" value={pay} onChange={e => setPay(e.target.value)} placeholder="0"
              className={`w-full px-4 py-3 border ${theme.inputBorder} ${theme.inputBg} rounded-xl text-base ${theme.textPrimary}`} />
          </div>

          {/* Conflict / availability warnings */}
          {selectedStaff && selectedStaff.availability !== 'available' && (
            <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle size={18} className="text-red-600" />
              <span className="text-sm text-red-700 font-medium">{staffFullName(selectedStaff)} is marked as {selectedStaff.availability === 'on_leave' ? 'on leave' : 'unavailable'}</span>
            </div>
          )}
          {conflicts.length > 0 && (
            <div className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle size={18} className="text-amber-600" />
              <span className="text-sm text-amber-700 font-medium">Conflict: already assigned to {conflicts.join(', ')} on this date</span>
            </div>
          )}
        </div>

        <div className={`px-6 py-4 border-t ${theme.border} flex gap-3`}>
          <button onClick={onClose}
            className={`flex-1 py-3 border ${theme.border} rounded-xl text-base font-medium ${theme.textPrimary} ${theme.buttonHover}`}>Cancel</button>
          <button onClick={handleSubmit} disabled={!staffId || !finalRole}
            className={`flex-1 py-3 ${theme.accent} rounded-xl text-base font-semibold ${theme.accentHover} disabled:opacity-40`}>Assign</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StaffEventPage({ data, save, theme }) {
  const [seData, setSeData] = useState(loadStaffEventData);
  const [subTab, setSubTab] = useState('dashboard');

  const reload = useCallback(() => setSeData(loadStaffEventData()), []);

  const saveStaff = useCallback((val) => { saveStaffEvent('staff', val); setSeData(p => ({ ...p, staff: val })); }, []);
  const saveEvents = useCallback((val) => { saveStaffEvent('events', val); setSeData(p => ({ ...p, events: val })); }, []);
  const saveAssignments = useCallback((val) => { saveStaffEvent('assignments', val); setSeData(p => ({ ...p, assignments: val })); }, []);
  const savePayments = useCallback((val) => { saveStaffEvent('payments', val); setSeData(p => ({ ...p, payments: val })); }, []);

  const clients = data.clients || [];
  const estimates = data.estimates || [];
  const getClient = (id) => clients.find(c => c.id === id);

  // Shared handlers
  const handleAssignStaff = useCallback((eventId, { staffId, role, pay }) => {
    const newAssignment = {
      id: generateId(),
      eventId,
      staffId,
      role,
      assignedPay: pay,
      calendarCreated: false,
      status: 'assigned',
    };
    saveAssignments([...seData.assignments, newAssignment]);

    if (pay > 0) {
      const newPayment = {
        id: generateId(),
        staffId,
        eventId,
        amount: pay,
        status: 'unpaid',
        paidDate: '',
      };
      savePayments([...seData.payments, newPayment]);
    }
  }, [seData.assignments, seData.payments, saveAssignments, savePayments]);

  const handleRemoveAssignment = useCallback((assignmentId) => {
    saveAssignments(seData.assignments.filter(a => a.id !== assignmentId));
  }, [seData.assignments, saveAssignments]);

  const openGoogleCalendarForEvent = useCallback((event, assignment) => {
    const staff = seData.staff.find(s => s.id === assignment.staffId);
    const title = encodeURIComponent(`${event.title} – ${assignment.role}`);
    const details = encodeURIComponent(
      `Role: ${assignment.role}\nStaff: ${staffFullName(staff)}\nVenue: ${event.venue || '—'}\nArrival: ${event.arrivalTime || '—'}\nNotes: ${event.notes || '—'}`
    );
    const location = encodeURIComponent(event.venue || '');
    const dateStr = event.eventDate.replace(/-/g, '');
    const startT = (event.startTime || '09:00').replace(':', '') + '00';
    const endT = (event.endTime || '17:00').replace(':', '') + '00';
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}T${startT}/${dateStr}T${endT}&details=${details}&location=${location}`;
    window.open(url, '_blank');

    const updated = seData.assignments.map(a => a.id === assignment.id ? { ...a, calendarCreated: true } : a);
    saveAssignments(updated);
  }, [seData.staff, seData.assignments, saveAssignments]);

  // ============================================================================
  // DASHBOARD
  // ============================================================================

  const DashboardTab = () => {
    const upcomingEvents = useMemo(() =>
      seData.events
        .filter(e => e.status !== 'cancelled' && e.status !== 'completed' && e.eventDate >= today())
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
        .slice(0, 8),
      []);

    const unassignedRoles = useMemo(() => {
      const issues = [];
      seData.events
        .filter(e => e.status !== 'cancelled' && e.status !== 'completed' && e.eventDate >= today())
        .forEach(evt => {
          const assigned = seData.assignments.filter(a => a.eventId === evt.id);
          (evt.requiredRoles || []).forEach(role => {
            if (!assigned.find(a => a.role === role)) {
              issues.push({ event: evt.title, role, eventId: evt.id });
            }
          });
        });
      return issues;
    }, []);

    const bookedThisWeek = useMemo(() => {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const startStr = startOfWeek.toISOString().split('T')[0];
      const endStr = endOfWeek.toISOString().split('T')[0];
      const staffIds = new Set();
      seData.events
        .filter(e => e.eventDate >= startStr && e.eventDate <= endStr && e.status !== 'cancelled')
        .forEach(e => {
          seData.assignments.filter(a => a.eventId === e.id).forEach(a => staffIds.add(a.staffId));
        });
      return staffIds.size;
    }, []);

    return (
      <div className="space-y-6">
        <h2 className={`text-xl font-bold ${theme.textPrimary}`}>Staff & Events Dashboard</h2>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Upcoming Events', value: upcomingEvents.length, icon: Calendar, color: 'text-blue-600' },
            { label: 'Unassigned Roles', value: unassignedRoles.length, icon: AlertTriangle, color: unassignedRoles.length > 0 ? 'text-amber-600' : 'text-emerald-600' },
            { label: 'Staff This Week', value: bookedThisWeek, icon: Users, color: 'text-indigo-600' },
          ].map(stat => (
            <div key={stat.label} className={`${theme.cardBg} border ${theme.border} rounded-2xl p-5 shadow-sm`}>
              <div className="flex items-center gap-2 mb-3">
                <stat.icon size={20} className={stat.color} />
                <p className={`text-sm font-semibold uppercase tracking-wide ${theme.textMuted}`}>{stat.label}</p>
              </div>
              <p className={`text-3xl font-bold ${theme.textPrimary}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Unassigned Roles warnings */}
        {unassignedRoles.length > 0 && (
          <div className={`${theme.cardBg} border ${theme.border} rounded-2xl shadow-sm overflow-hidden`}>
            <div className={`p-5 border-b ${theme.border}`}>
              <h3 className={`text-lg font-semibold ${theme.textPrimary}`}>Missing Staff Assignments</h3>
            </div>
            <div className={`divide-y ${theme.border}`}>
              {unassignedRoles.map((item, idx) => (
                <div key={idx} className="px-5 py-4 flex items-center gap-3">
                  <AlertTriangle size={18} className="text-amber-500" />
                  <span className={`text-base ${theme.textPrimary}`}><strong>{item.event}</strong> — Missing <strong>{item.role}</strong></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Events with calendar indicators */}
        <div className={`${theme.cardBg} border ${theme.border} rounded-2xl shadow-sm overflow-hidden`}>
          <div className={`p-5 border-b ${theme.border}`}>
            <h3 className={`text-lg font-semibold ${theme.textPrimary}`}>Upcoming Events</h3>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className={`p-8 text-center text-base ${theme.textMuted}`}>No upcoming events</p>
          ) : (
            <div className={`divide-y ${theme.border}`}>
              {upcomingEvents.map(evt => {
                const client = getClient(evt.clientId);
                const assigned = seData.assignments.filter(a => a.eventId === evt.id);
                const requiredRoles = evt.requiredRoles || [];
                const missingRoles = requiredRoles.filter(r => !assigned.find(a => a.role === r));
                const allCalendarBooked = assigned.length > 0 && assigned.every(a => a.calendarCreated);
                const someCalendarBooked = assigned.some(a => a.calendarCreated);
                return (
                  <div key={evt.id} className={`p-5 ${theme.cardHover}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`text-base font-semibold ${theme.textPrimary}`}>{evt.title}</p>
                        <p className={`text-sm ${theme.textMuted} mt-0.5`}>{client?.name || 'No client'} • {evt.venue || 'No venue'}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className={`text-sm ${theme.textMuted}`}><Calendar size={15} className="inline mr-1.5" />{evt.eventDate}</span>
                          <span className={`text-sm ${theme.textMuted}`}><Clock size={15} className="inline mr-1.5" />{evt.startTime || '—'} – {evt.endTime || '—'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Calendar indicator */}
                        {assigned.length > 0 && (
                          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            allCalendarBooked ? 'bg-emerald-100 text-emerald-700' :
                            someCalendarBooked ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <Calendar size={13} />
                            {allCalendarBooked ? 'All Booked' : someCalendarBooked ? 'Partial' : 'No Calendar'}
                          </span>
                        )}
                        {missingRoles.length === 0 && requiredRoles.length > 0 ? (
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600"><CheckCircle size={16} /> Fully Staffed</span>
                        ) : missingRoles.length > 0 ? (
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-600"><AlertTriangle size={16} /> {missingRoles.length} missing</span>
                        ) : null}
                        <StatusBadge status={evt.status} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // STAFF MANAGEMENT
  // ============================================================================

  const StaffTab = () => {
    const [view, setView] = useState('list');
    const [editingStaff, setEditingStaff] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [staffFilter, setStaffFilter] = useState('all');

    const [form, setForm] = useState({
      id: '', firstName: '', surname: '', email: '', phone: '', roles: [], availability: 'available',
      rate: '', notes: '', active: true,
    });

    const startNew = () => {
      setForm({ id: generateId(), firstName: '', surname: '', email: '', phone: '', roles: [], availability: 'available', rate: '', notes: '', active: true });
      setEditingStaff(null);
      setView('form');
    };

    const startEdit = (s) => {
      setForm({ ...s });
      setEditingStaff(s);
      setView('form');
    };

    const handleSave = () => {
      if (!form.firstName.trim()) return;
      const existing = seData.staff.find(s => s.id === form.id);
      const updated = existing
        ? seData.staff.map(s => s.id === form.id ? { ...form, rate: Number(form.rate) || 0 } : s)
        : [...seData.staff, { ...form, rate: Number(form.rate) || 0 }];
      saveStaff(updated);
      setView('list');
    };

    const handleDelete = (id) => {
      saveStaff(seData.staff.filter(s => s.id !== id));
    };

    const toggleRole = (role) => {
      setForm(f => ({
        ...f,
        roles: f.roles.includes(role) ? f.roles.filter(r => r !== role) : [...f.roles, role],
      }));
    };

    const todaysEventIds = useMemo(() => {
      const todayStr = today();
      return new Set(
        seData.events
          .filter(e => e.status !== 'cancelled' && e.status !== 'completed' && e.eventDate === todayStr)
          .map(e => e.id)
      );
    }, []);

    const staffAssignmentMap = useMemo(() => {
      const map = {};
      seData.staff.forEach(s => { map[s.id] = []; });
      seData.assignments.forEach(a => {
        if (todaysEventIds.has(a.eventId) && map[a.staffId]) {
          const evt = seData.events.find(e => e.id === a.eventId);
          if (evt) map[a.staffId].push({ ...a, event: evt });
        }
      });
      return map;
    }, [todaysEventIds]);

    const filtered = useMemo(() => {
      const term = searchTerm.toLowerCase();
      let list = seData.staff.filter(s => {
        const fullName = `${s.firstName || ''} ${s.surname || ''}`.toLowerCase();
        return fullName.includes(term) || (s.email || '').toLowerCase().includes(term) || s.roles.some(r => r.toLowerCase().includes(term));
      });
      if (staffFilter === 'on_job') {
        list = list.filter(s => (staffAssignmentMap[s.id] || []).length > 0);
      }
      return list;
    }, [searchTerm, staffFilter, staffAssignmentMap]);

    if (view === 'form') {
      return (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className={`p-2 ${theme.buttonHover} rounded-xl`}><ChevronLeft size={22} className={theme.textPrimary} /></button>
            <h2 className={`text-xl font-bold ${theme.textPrimary}`}>{editingStaff ? 'Edit Staff' : 'New Staff Member'}</h2>
          </div>
          <div className={`${theme.cardBg} border ${theme.border} rounded-2xl p-6 space-y-5`}>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="First Name" value={form.firstName} onChange={v => setForm({ ...form, firstName: v })} placeholder="e.g. John" theme={theme} />
              <FormInput label="Surname" value={form.surname} onChange={v => setForm({ ...form, surname: v })} placeholder="e.g. Doe" theme={theme} />
            </div>
            <FormInput label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="john@example.com" theme={theme} />
            <FormInput label="Phone Number" value={form.phone} onChange={v => setForm({ ...form, phone: v })} placeholder="+27..." theme={theme} />
            <FormInput label="Rate (R)" type="number" value={form.rate} onChange={v => setForm({ ...form, rate: v })} placeholder="Per event or hourly" theme={theme} />

            <div className="space-y-2">
              <label className={`text-sm font-medium ${theme.textSecondary}`}>Roles</label>
              <div className="flex flex-wrap gap-2.5">
                {ROLES.map(role => (
                  <button key={role} onClick={() => toggleRole(role)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                      form.roles.includes(role) ? 'bg-blue-500 text-white border-blue-500' : `${theme.border} ${theme.textSecondary} ${theme.buttonHover}`
                    }`}>
                    <RoleIcon role={role} size={16} /> {role}
                  </button>
                ))}
              </div>
            </div>

            <FormInput label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} multiline theme={theme} />

            <div className="flex items-center justify-between">
              <span className={`text-base font-medium ${theme.textPrimary}`}>Active</span>
              <button onClick={() => setForm({ ...form, active: !form.active })}
                className={`relative w-14 h-8 rounded-full ${form.active ? 'bg-emerald-500' : theme.toggleInactive}`}>
                <span className={`absolute top-1.5 w-5 h-5 bg-white rounded-full transition-all ${form.active ? 'left-7' : 'left-1.5'}`} />
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setView('list')} className={`flex-1 py-3 border ${theme.border} rounded-xl text-base font-medium ${theme.textPrimary} ${theme.buttonHover}`}>Cancel</button>
            <button onClick={handleSave} className={`flex-1 py-3 ${theme.accent} rounded-xl text-base font-semibold ${theme.accentHover}`}>Save</button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className={`text-xl font-bold ${theme.textPrimary}`}>Staff ({seData.staff.length})</h2>
          <button onClick={startNew} className={`flex items-center gap-2 px-5 py-2.5 ${theme.accent} rounded-xl text-sm font-semibold ${theme.accentHover}`}><Plus size={18} /> Add Staff</button>
        </div>

        <div className="relative">
          <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search staff..."
            className={`w-full pl-12 pr-4 py-3 border ${theme.inputBorder} ${theme.inputBg} rounded-xl text-base ${theme.textPrimary}`} />
        </div>

        {/* Staff Filters */}
        <div className="flex flex-wrap gap-2.5">
          {[
            { value: 'all', label: 'All' },
            { value: 'on_job', label: 'On a Job' },
          ].map(f => (
            <button key={f.value} onClick={() => setStaffFilter(f.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${staffFilter === f.value ? theme.accent : `border ${theme.border} ${theme.textSecondary} ${theme.buttonHover}`}`}>
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className={`text-center py-16 text-base ${theme.textMuted}`}>No staff members yet. Add your first team member.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(s => {
              const assignments = staffAssignmentMap[s.id] || [];
              return (
              <div key={s.id} className={`${theme.cardBg} border ${theme.border} rounded-2xl shadow-sm p-5 ${theme.cardHover} cursor-pointer`} onClick={() => startEdit(s)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold ${s.active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      {staffInitials(s)}
                    </div>
                    <div>
                      <p className={`text-base font-semibold ${theme.textPrimary}`}>{staffFullName(s)} {!s.active && <span className="text-sm text-gray-400">(Inactive)</span>}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {s.roles.map(r => (
                          <span key={r} className={`text-xs font-medium px-2 py-0.5 rounded ${theme.subtleBg} ${theme.textMuted}`}>{r}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {assignments.length > 0 && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">{assignments.length} job{assignments.length > 1 ? 's' : ''}</span>
                    )}
                    {s.rate > 0 && <span className={`text-base font-medium ${theme.textMuted}`}>{formatCurrency(s.rate)}</span>}
                    <button onClick={e => { e.stopPropagation(); handleDelete(s.id); }}
                      className="p-2 rounded-lg hover:bg-red-500/10"><Trash2 size={18} className="text-red-400" /></button>
                  </div>
                </div>
                {/* Show assigned events */}
                {assignments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-dashed" style={{ borderColor: 'rgba(128,128,128,0.2)' }}>
                    {assignments.map(a => (
                      <span key={a.id} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${theme.subtleBg} ${theme.textMuted} border ${theme.border}`}>
                        <Calendar size={12} className={a.calendarCreated ? 'text-emerald-500' : 'text-gray-400'} />
                        {a.event.title} <span className="opacity-60">({a.role})</span> • {a.event.eventDate}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // EVENTS – CARD GRID with 3-dot menus & inline assignments
  // ============================================================================

  const EventsTab = () => {
    const [view, setView] = useState('list');
    const [editingEvent, setEditingEvent] = useState(null);
    const [filter, setFilter] = useState('all');
    const [assignModalEvent, setAssignModalEvent] = useState(null);

    const emptyForm = {
      id: '', estimateId: '', clientId: '', title: '', venue: '',
      eventDate: today(), arrivalTime: '', startTime: '', endTime: '', packdownTime: '',
      status: 'pending', notes: '', requiredRoles: [],
    };
    const [form, setForm] = useState(emptyForm);

    const startNew = () => {
      setForm({ ...emptyForm, id: generateId() });
      setEditingEvent(null);
      setView('form');
    };

    const convertEstimate = (est) => {
      const client = getClient(est.clientId);
      setForm({
        ...emptyForm,
        id: generateId(),
        estimateId: est.id,
        clientId: est.clientId,
        title: client?.name ? `Event - ${client.name}` : `Event from ${est.number}`,
        status: 'confirmed',
        eventDate: est.date || today(),
      });
      setEditingEvent(null);
      setView('form');
    };

    const startEdit = (evt) => {
      setForm({ ...evt });
      setEditingEvent(evt);
      setView('form');
    };

    const handleSave = () => {
      if (!form.title.trim()) return;
      const existing = seData.events.find(e => e.id === form.id);
      const updated = existing
        ? seData.events.map(e => e.id === form.id ? form : e)
        : [...seData.events, form];
      saveEvents(updated);
      setView('list');
    };

    const handleDelete = (id) => {
      saveEvents(seData.events.filter(e => e.id !== id));
      saveAssignments(seData.assignments.filter(a => a.eventId !== id));
    };

    const toggleRequiredRole = (role) => {
      setForm(f => ({
        ...f,
        requiredRoles: f.requiredRoles.includes(role) ? f.requiredRoles.filter(r => r !== role) : [...f.requiredRoles, role],
      }));
    };

    const convertableEstimates = useMemo(() => {
      const linkedEstIds = new Set(seData.events.map(e => e.estimateId).filter(Boolean));
      return estimates.filter(est => est.status === 'accepted' && !linkedEstIds.has(est.id));
    }, [estimates]);

    const filtered = useMemo(() => {
      if (filter === 'all') return seData.events;
      return seData.events.filter(e => e.status === filter);
    }, [filter]);

    if (view === 'form') {
      return (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className={`p-2 ${theme.buttonHover} rounded-xl`}><ChevronLeft size={22} className={theme.textPrimary} /></button>
            <h2 className={`text-xl font-bold ${theme.textPrimary}`}>{editingEvent ? 'Edit Event' : 'New Event'}</h2>
          </div>
          <div className={`${theme.cardBg} border ${theme.border} rounded-2xl p-6 space-y-5`}>
            <FormInput label="Event Name" value={form.title} onChange={v => setForm({ ...form, title: v })} placeholder="e.g. Wedding DJ - Smith" theme={theme} />

            <div className="space-y-2">
              <label className={`text-sm font-medium ${theme.textSecondary}`}>Client</label>
              <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}
                className={`w-full px-4 py-3 border ${theme.inputBorder} ${theme.inputBg} rounded-xl text-base ${theme.textPrimary}`}>
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <FormInput label="Venue" value={form.venue} onChange={v => setForm({ ...form, venue: v })} placeholder="e.g. Grand Hotel, Potch" theme={theme} />
            <FormInput label="Event Date" type="date" value={form.eventDate} onChange={v => setForm({ ...form, eventDate: v })} theme={theme} />

            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Arrival Time" type="time" value={form.arrivalTime} onChange={v => setForm({ ...form, arrivalTime: v })} theme={theme} />
              <FormInput label="Start Time" type="time" value={form.startTime} onChange={v => setForm({ ...form, startTime: v })} theme={theme} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="End Time" type="time" value={form.endTime} onChange={v => setForm({ ...form, endTime: v })} theme={theme} />
              <FormInput label="Pack-down Time" type="time" value={form.packdownTime} onChange={v => setForm({ ...form, packdownTime: v })} theme={theme} />
            </div>

            <div className="space-y-2">
              <label className={`text-sm font-medium ${theme.textSecondary}`}>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className={`w-full px-4 py-3 border ${theme.inputBorder} ${theme.inputBg} rounded-xl text-base ${theme.textPrimary}`}>
                {EVENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className={`text-sm font-medium ${theme.textSecondary}`}>Required Roles</label>
              <div className="flex flex-wrap gap-2.5">
                {ROLES.map(role => (
                  <button key={role} onClick={() => toggleRequiredRole(role)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                      form.requiredRoles.includes(role) ? 'bg-blue-500 text-white border-blue-500' : `${theme.border} ${theme.textSecondary} ${theme.buttonHover}`
                    }`}>
                    <RoleIcon role={role} size={16} /> {role}
                  </button>
                ))}
              </div>
            </div>

            <FormInput label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} multiline theme={theme} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setView('list')} className={`flex-1 py-3 border ${theme.border} rounded-xl text-base font-medium ${theme.textPrimary} ${theme.buttonHover}`}>Cancel</button>
            <button onClick={handleSave} className={`flex-1 py-3 ${theme.accent} rounded-xl text-base font-semibold ${theme.accentHover}`}>Save Event</button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className={`text-xl font-bold ${theme.textPrimary}`}>Events ({seData.events.length})</h2>
          <button onClick={startNew} className={`flex items-center gap-2 px-5 py-2.5 ${theme.accent} rounded-xl text-sm font-semibold ${theme.accentHover}`}><Plus size={18} /> New Event</button>
        </div>

        {/* Convert accepted estimates */}
        {convertableEstimates.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <p className="text-base font-semibold text-blue-800 mb-3">Accepted Estimates Ready to Convert</p>
            <div className="space-y-2.5">
              {convertableEstimates.map(est => {
                const client = getClient(est.clientId);
                return (
                  <div key={est.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-blue-100">
                    <div>
                      <p className="text-base font-medium text-blue-900">{est.number} — {client?.name || 'No client'}</p>
                      <p className="text-sm text-blue-600">{est.date}</p>
                    </div>
                    <button onClick={() => convertEstimate(est)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
                      Convert to Event
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2.5">
          {[{ value: 'all', label: 'All' }, ...EVENT_STATUSES].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${filter === f.value ? theme.accent : `border ${theme.border} ${theme.textSecondary} ${theme.buttonHover}`}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* EVENT CARD GRID */}
        {filtered.length === 0 ? (
          <p className={`text-center py-16 text-base ${theme.textMuted}`}>No events yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.sort((a, b) => b.eventDate.localeCompare(a.eventDate)).map(evt => {
              const client = getClient(evt.clientId);
              const assigned = seData.assignments.filter(a => a.eventId === evt.id);
              const required = evt.requiredRoles || [];
              const missing = required.filter(r => !assigned.find(a => a.role === r));
              const allCalendarBooked = assigned.length > 0 && assigned.every(a => a.calendarCreated);
              const someCalendarBooked = assigned.some(a => a.calendarCreated);

              return (
                <div key={evt.id} className={`${theme.cardBg} border ${theme.border} rounded-2xl shadow-sm overflow-hidden flex flex-col`}>
                  {/* Card header */}
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-base font-bold ${theme.textPrimary} truncate`}>{evt.title}</p>
                          {evt.estimateId && <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium shrink-0">Estimate</span>}
                        </div>
                        <p className={`text-sm ${theme.textMuted} mt-1 truncate`}>
                          {client?.name || '—'} {evt.venue ? `• ${evt.venue}` : ''}
                        </p>
                      </div>
                      <ActionMenu theme={theme} items={[
                        { label: 'Edit Event', icon: Edit, onClick: () => startEdit(evt) },
                        { label: 'Remove Event', icon: Trash2, onClick: () => handleDelete(evt.id), danger: true },
                      ]} />
                    </div>

                    {/* Date / time */}
                    <div className="flex items-center gap-3 mt-3">
                      <span className={`flex items-center gap-1.5 text-sm ${theme.textMuted}`}><Calendar size={14} />{evt.eventDate}</span>
                      {evt.startTime && <span className={`flex items-center gap-1.5 text-sm ${theme.textMuted}`}><Clock size={14} />{evt.startTime}–{evt.endTime || '?'}</span>}
                    </div>

                    {/* Status + staffing + calendar badges */}
                    <div className="flex items-center gap-2 flex-wrap mt-3">
                      <StatusBadge status={evt.status} />
                      {required.length > 0 && (
                        missing.length === 0 ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full"><CheckCircle size={13} /> Fully Staffed</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full"><AlertTriangle size={13} /> {missing.join(', ')}</span>
                        )
                      )}
                      {assigned.length > 0 && (
                        <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                          allCalendarBooked ? 'bg-emerald-100 text-emerald-700' :
                          someCalendarBooked ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Calendar size={13} />
                          {allCalendarBooked ? 'Calendared' : someCalendarBooked ? 'Partial Cal' : 'No Cal'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Assigned staff chips */}
                  {assigned.length > 0 && (
                    <div className={`px-5 py-3 border-t ${theme.border}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${theme.textMuted} mb-2`}>Assigned Staff</p>
                      <div className="flex flex-wrap gap-2">
                        {assigned.map(a => {
                          const staffMember = seData.staff.find(s => s.id === a.staffId);
                          return (
                            <span key={a.id} className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full ${theme.subtleBg} ${theme.textPrimary} border ${theme.border}`}>
                              {a.calendarCreated && <Calendar size={12} className="text-emerald-500" />}
                              {staffFullName(staffMember)} <span className={`${theme.textMuted}`}>({a.role})</span>
                              <button onClick={(e) => { e.stopPropagation(); handleRemoveAssignment(a.id); }}
                                className="ml-0.5 p-0.5 rounded-full hover:bg-red-100">
                                <X size={13} className="text-red-400" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quick-action footer */}
                  <div className={`mt-auto px-5 py-3 border-t ${theme.border} flex items-center justify-between`}>
                    <button onClick={() => setAssignModalEvent(evt)}
                      className={`flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700`}>
                      <Plus size={15} /> Assign Staff
                    </button>
                    {assigned.length > 0 && (
                      <div className="flex items-center gap-1">
                        {assigned.filter(a => !a.calendarCreated).length > 0 && (
                          <button onClick={() => {
                            assigned.filter(a => !a.calendarCreated).forEach(a => openGoogleCalendarForEvent(evt, a));
                          }}
                            className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700">
                            <Calendar size={15} /> Book All
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Assign Staff Modal */}
        {assignModalEvent && (
          <AssignStaffModal
            event={assignModalEvent}
            seData={seData}
            theme={theme}
            onClose={() => setAssignModalEvent(null)}
            onAssign={(info) => handleAssignStaff(assignModalEvent.id, info)}
          />
        )}
      </div>
    );
  };

  // ============================================================================
  // PAYMENTS
  // ============================================================================

  const PaymentsTab = () => {
    const [filter, setFilter] = useState('all');

    const filtered = useMemo(() => {
      if (filter === 'all') return seData.payments;
      return seData.payments.filter(p => p.status === filter);
    }, [filter]);

    const totalUnpaid = useMemo(() =>
      seData.payments.filter(p => p.status === 'unpaid').reduce((s, p) => s + Number(p.amount || 0), 0),
      []);

    const totalPaid = useMemo(() =>
      seData.payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0),
      []);

    const markPaid = (paymentId) => {
      const updated = seData.payments.map(p =>
        p.id === paymentId ? { ...p, status: 'paid', paidDate: today() } : p
      );
      savePayments(updated);
    };

    const markUnpaid = (paymentId) => {
      const updated = seData.payments.map(p =>
        p.id === paymentId ? { ...p, status: 'unpaid', paidDate: '' } : p
      );
      savePayments(updated);
    };

    const deletePayment = (paymentId) => {
      savePayments(seData.payments.filter(p => p.id !== paymentId));
    };

    return (
      <div className="space-y-5">
        <h2 className={`text-xl font-bold ${theme.textPrimary}`}>Staff Payments</h2>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`${theme.cardBg} border ${theme.border} rounded-2xl p-5`}>
            <p className={`text-sm font-semibold uppercase tracking-wide text-red-500`}>Unpaid</p>
            <p className={`text-2xl font-bold text-red-600 mt-1`}>{formatCurrency(totalUnpaid)}</p>
          </div>
          <div className={`${theme.cardBg} border ${theme.border} rounded-2xl p-5`}>
            <p className={`text-sm font-semibold uppercase tracking-wide text-emerald-500`}>Paid</p>
            <p className={`text-2xl font-bold text-emerald-600 mt-1`}>{formatCurrency(totalPaid)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2.5">
          {['all', 'unpaid', 'paid'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize ${filter === f ? theme.accent : `border ${theme.border} ${theme.textSecondary} ${theme.buttonHover}`}`}>
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className={`text-center py-16 text-base ${theme.textMuted}`}>No payment records.</p>
        ) : (
          <div className={`${theme.cardBg} border ${theme.border} rounded-2xl shadow-sm overflow-hidden divide-y ${theme.border}`}>
            {filtered.map(pay => {
              const staff = seData.staff.find(s => s.id === pay.staffId);
              const evt = seData.events.find(e => e.id === pay.eventId);
              return (
                <div key={pay.id} className="p-5 flex items-center justify-between">
                  <div>
                    <p className={`text-base font-semibold ${theme.textPrimary}`}>{staffFullName(staff)}</p>
                    <p className={`text-sm ${theme.textMuted}`}>{evt?.title || 'Unknown event'} • {evt?.eventDate || '—'}</p>
                    {pay.paidDate && <p className="text-sm text-emerald-500">Paid on {pay.paidDate}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={`text-base font-bold ${pay.status === 'paid' ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(pay.amount)}</p>
                    {pay.status === 'unpaid' ? (
                      <button onClick={() => markPaid(pay.id)}
                        className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-semibold hover:bg-emerald-200">
                        Mark Paid
                      </button>
                    ) : (
                      <button onClick={() => markUnpaid(pay.id)}
                        className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200">
                        Undo
                      </button>
                    )}
                    <button onClick={() => deletePayment(pay.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10"><Trash2 size={18} className="text-red-400" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // SUB-TAB NAVIGATION (Assignments tab removed)
  // ============================================================================

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'staff', label: 'Staff' },
    { id: 'events', label: 'Events' },
    { id: 'payments', label: 'Payments' },
  ];

  const renderSubTab = () => {
    switch (subTab) {
      case 'dashboard': return <DashboardTab />;
      case 'staff': return <StaffTab />;
      case 'events': return <EventsTab />;
      case 'payments': return <PaymentsTab />;
      default: return <DashboardTab />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className={`px-5 py-4 border-b ${theme.border} flex gap-3 overflow-x-auto`}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`px-5 py-2.5 rounded-xl text-base font-medium whitespace-nowrap ${
              subTab === t.id ? theme.accent : `${theme.textSecondary} ${theme.buttonHover}`
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5 lg:p-6">
        {renderSubTab()}
      </div>
    </div>
  );
}
