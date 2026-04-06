import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  FileSignature,
  FileText,
  Menu,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from 'lucide-react';

const PHONE_LAYOUT_MAX_WIDTH = 767;
const TABLET_LAYOUT_MAX_WIDTH = 1180;
const PHONE_PANEL_CLASS = 'invoice-phone-panel w-full max-w-md mx-auto rounded-[30px]';

const getBusinessMonogram = (businessName = 'Invoice App') => {
  const initials = businessName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();

  return initials || 'IA';
};

export const getDeviceLayout = () => {
  if (typeof window === 'undefined') {
    return {
      kind: 'desktop',
      isPhone: false,
      isTablet: false,
      isDesktop: true,
      viewportWidth: 1440,
      hasTouch: false,
    };
  }

  const viewportWidth = window.innerWidth;
  const userAgent = navigator.userAgent || '';
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const finePointer = window.matchMedia?.('(pointer: fine)').matches ?? false;
  const hoverCapable = window.matchMedia?.('(hover: hover)').matches ?? false;
  const hasTouch = navigator.maxTouchPoints > 0 || coarsePointer;
  const isIpadOs = /Macintosh/i.test(userAgent) && hasTouch;
  const isPhoneUserAgent = /iPhone|Android.+Mobile|Windows Phone|webOS|BlackBerry|Opera Mini|Mobile/i.test(userAgent);
  const isTabletUserAgent = isIpadOs || /iPad|Tablet|Android(?!.*Mobile)|Silk|Kindle|PlayBook/i.test(userAgent);
  const isDesktopLikeDevice = !hasTouch || (finePointer && hoverCapable && !isPhoneUserAgent && !isTabletUserAgent);
  const isPhone = isPhoneUserAgent || (!isDesktopLikeDevice && viewportWidth <= PHONE_LAYOUT_MAX_WIDTH);
  const isTablet =
    !isPhone && (isTabletUserAgent || (!isDesktopLikeDevice && viewportWidth <= TABLET_LAYOUT_MAX_WIDTH));
  const kind = isPhone ? 'phone' : isTablet ? 'tablet' : 'desktop';

  return {
    kind,
    isPhone,
    isTablet,
    isDesktop: kind === 'desktop',
    viewportWidth,
    hasTouch,
  };
};

export const useDeviceLayout = () => {
  const [layout, setLayout] = useState(() => getDeviceLayout());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateLayout = () => {
      setLayout(getDeviceLayout());
    };
    const mediaQueries = ['(pointer: coarse)', '(pointer: fine)', '(hover: hover)'].map((query) =>
      window.matchMedia(query)
    );

    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);
    mediaQueries.forEach((mediaQuery) => {
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', updateLayout);
        return;
      }
      mediaQuery.addListener(updateLayout);
    });

    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
      mediaQueries.forEach((mediaQuery) => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', updateLayout);
          return;
        }
        mediaQuery.removeListener(updateLayout);
      });
    };
  }, []);

  return layout;
};

export const getInvoiceAppShellLayout = ({ activeTab, deviceLayout }) => {
  const usePhoneLayout = deviceLayout.isPhone;
  const useTabletLayout = deviceLayout.isTablet;

  return {
    usePhoneLayout,
    useTabletLayout,
    rootOverflowClass: usePhoneLayout ? 'overflow-hidden' : 'overflow-x-auto overflow-y-hidden',
    frameStyle: !usePhoneLayout ? { minWidth: useTabletLayout ? '980px' : '1180px' } : undefined,
    mainContentPaddingClass:
      activeTab === 'settings'
        ? usePhoneLayout
          ? 'px-0 pt-0 pb-32'
          : useTabletLayout
            ? 'p-4'
            : 'p-4 xl:p-6'
        : usePhoneLayout
          ? 'px-0 pt-0 pb-32'
          : useTabletLayout
            ? 'p-4'
            : 'p-2 md:p-6 xl:p-8',
    panelShellClass:
      activeTab === 'settings'
        ? usePhoneLayout
          ? PHONE_PANEL_CLASS
          : 'w-full rounded-2xl'
        : usePhoneLayout
          ? PHONE_PANEL_CLASS
          : 'w-full mx-auto rounded-2xl',
  };
};

const InvoiceAppMobileBrandBlock = ({ businessName, businessEmail, logo, subtitle = 'Dashboard' }) => (
  <div className="overflow-hidden rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] px-5 py-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
    <div className="flex flex-col items-center gap-4">
      {logo ? (
        <div className="flex w-full items-center justify-center rounded-[24px] bg-white/[0.04] px-4 py-4">
          <img src={logo} alt="Business logo" className="max-h-20 w-auto object-contain" />
        </div>
      ) : (
        <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[radial-gradient(circle_at_30%_30%,rgba(239,68,68,0.92),rgba(168,85,247,0.8)_55%,rgba(15,23,42,0.92))] shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
          <span className="text-[24px] font-black tracking-[0.1em] text-white">
            {getBusinessMonogram(businessName)}
          </span>
        </div>
      )}
      <div className="min-w-0 space-y-1">
        <p className="truncate text-lg font-bold uppercase tracking-[0.04em] text-white">
          {businessName || 'Invoice App'}
        </p>
        <p className="truncate text-sm text-zinc-400">{businessEmail || subtitle}</p>
        {businessEmail ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">{subtitle}</p>
        ) : null}
      </div>
    </div>
  </div>
);

export const MobileHeader = ({
  title,
  showSearch = false,
  searchTerm = '',
  onSearchChange,
  onMenu,
  onSettings,
}) => (
  <div className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl">
    <div className="px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onMenu}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-[0_6px_18px_rgba(15,23,42,0.07)] transition hover:bg-zinc-50"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-base font-bold tracking-tight text-zinc-950">{title}</p>
        </div>
        <button
          type="button"
          onClick={onSettings}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-[0_6px_18px_rgba(15,23,42,0.07)] transition hover:bg-zinc-50"
          aria-label="Open settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </div>
    {showSearch ? (
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={`Search ${title.toLowerCase()}...`}
            className="h-11 w-full rounded-2xl border border-zinc-200 bg-white pl-9 pr-4 text-sm text-zinc-950 shadow-[0_6px_18px_rgba(15,23,42,0.05)] placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          />
        </div>
      </div>
    ) : null}
  </div>
);

export const InvoiceAppMobileDrawer = ({
  open,
  onClose,
  businessName,
  businessEmail,
  logo,
  navItems,
  activeTab,
  onSelectTab,
}) => {
  return (
    <div className={`fixed inset-0 z-50 transition-all duration-300 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <button
        type="button"
        className={`absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-label="Close navigation menu"
      />
      <aside
        className={`absolute left-0 top-0 flex h-full w-[82%] max-w-[320px] flex-col border-r border-white/8 bg-[#050505] text-white shadow-[0_28px_80px_rgba(0,0,0,0.46)] transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/42">Menu</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/85 transition hover:bg-white/10"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pt-2">
          <InvoiceAppMobileBrandBlock
            businessName={businessName}
            businessEmail={businessEmail}
            logo={logo}
            subtitle="Dashboard"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 pt-6">
          <div className="space-y-2">
            {navItems
              .filter((item) => item.id !== 'settings')
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 rounded-[20px] px-4 py-3.5 text-left text-[15px] font-semibold transition-all ${
                    activeTab === item.id
                      ? 'bg-zinc-800 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_30px_rgba(0,0,0,0.22)]'
                      : 'text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${activeTab === item.id ? 'text-white' : 'text-zinc-400'}`} />
                  <span className="flex-1">{item.label}</span>
                </button>
              ))}
          </div>
        </div>

        <div className="border-t border-white/8 px-2 py-4">
          <button
            type="button"
            onClick={() => {
              onSelectTab('settings');
              onClose();
            }}
            className={`flex w-full items-center gap-3 rounded-[20px] px-4 py-3.5 text-left text-[15px] font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-zinc-800 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_30px_rgba(0,0,0,0.22)]'
                : 'text-zinc-300 hover:bg-white/5'
            }`}
          >
            <Settings className={`h-5 w-5 ${activeTab === 'settings' ? 'text-white' : 'text-zinc-400'}`} />
            <span className="flex-1">Settings</span>
          </button>
        </div>
      </aside>
    </div>
  );
};

export const CreateSheet = ({
  open,
  onClose,
  onNavigate,
}) => {
  const createActions = [
    { id: 'invoices', label: 'New Invoice', subtitle: 'Start a fresh invoice', icon: FileText },
    { id: 'estimates', label: 'New Estimate', subtitle: 'Create a quote quickly', icon: FileSignature },
    { id: 'clients', label: 'New Client', subtitle: 'Add a new client profile', icon: Users },
  ];

  return (
    <div className={`fixed inset-0 z-50 transition-all duration-300 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 mx-auto w-full max-w-md rounded-t-[32px] border border-zinc-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[0_-20px_48px_rgba(15,23,42,0.22)] transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-zinc-300" />
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-zinc-950">Create New</h3>
            <p className="text-sm text-zinc-500">Choose what you want to create.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-700 transition hover:bg-zinc-100"
            aria-label="Close create sheet"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-3">
          {createActions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                onNavigate(action.id);
                onClose();
              }}
              className="flex items-center justify-between rounded-[24px] border border-zinc-200 bg-white/90 px-4 py-4 text-left shadow-[0_8px_20px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:bg-white"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#f4f4f5,#e4e4e7)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <action.icon className="h-5 w-5 text-zinc-700" />
                </div>
                <div>
                  <p className="font-medium text-zinc-950">{action.label}</p>
                  <p className="text-sm text-zinc-500">{action.subtitle}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const InvoiceAppDesktopSidebar = ({
  visible,
  isTablet,
  activeTheme,
  businessName,
  logo,
  navItems,
  activeTab,
  onSelectTab,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <aside
      className={`flex shrink-0 flex-col ${isTablet ? 'w-60' : 'w-72'} ${activeTheme.sidebarBg} border-r ${activeTheme.border} h-screen sticky top-0`}
    >
      <div className={isTablet ? 'px-3 pt-4 pb-3' : 'px-4 pt-5 pb-4'}>
        {logo ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-full rounded-2xl overflow-hidden flex-shrink-0">
              <img src={logo} alt="Logo" className="w-full h-auto object-contain" />
            </div>
            <div className="min-w-0 w-full">
              <h1 className={`font-bold ${activeTheme.sidebarText} text-sm leading-tight truncate`}>
                {businessName || 'Invoice App'}
              </h1>
              <p className={`text-xs mt-0.5 ${activeTheme.sidebarTextMuted}`}>Dashboard</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={`w-28 h-28 ${activeTheme.accent} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
              <FileText className="w-12 h-12 text-white" />
            </div>
            <div className="min-w-0 w-full">
              <h1 className={`font-bold ${activeTheme.sidebarText} text-sm leading-tight truncate`}>
                {businessName || 'Invoice App'}
              </h1>
              <p className={`text-xs mt-0.5 ${activeTheme.sidebarTextMuted}`}>Dashboard</p>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === item.id ? activeTheme.sidebarActive : activeTheme.sidebarInactive
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className={`p-4 border-t ${activeTheme.border}`}>
        <button
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
            activeTab === 'settings' ? activeTheme.sidebarActive : activeTheme.sidebarInactive
          }`}
        >
          <Settings className="w-5 h-5" />
          Settings
        </button>
      </div>
    </aside>
  );
};

export const InvoiceAppMobileBottomNav = ({
  visible,
  navItems,
  activeTab,
  onSelectTab,
  onOpenCreate,
}) => {
  const dockItems = useMemo(
    () => navItems.filter((item) => item.id !== 'settings'),
    [navItems]
  );

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-3"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="relative rounded-[30px] border border-zinc-200/80 bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
        <button
          type="button"
          onClick={onOpenCreate}
          className="absolute left-1/2 top-0 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[6px] border-slate-100 bg-gradient-to-br from-violet-600 via-violet-600 to-indigo-600 text-white shadow-[0_16px_30px_rgba(109,40,217,0.34)] transition-transform hover:scale-105 active:scale-95"
          aria-label="Open create menu"
        >
          <Plus className="h-6 w-6" />
        </button>

        <div className="mobile-nav-scroll overflow-x-auto px-2 pb-3 pt-4">
          <div className="flex min-w-max items-end gap-2 px-1">
            {dockItems.map((item) => {
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`flex min-w-[82px] flex-none flex-col items-center justify-center rounded-[22px] px-3 py-2 text-[12px] transition-all ${
                    isActive ? 'text-zinc-950' : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                  style={item.id === 'clients' ? { marginRight: '64px' } : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div
                    className={`mb-1 rounded-2xl p-2 transition-all ${
                      isActive
                        ? 'bg-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_18px_rgba(15,23,42,0.08)]'
                        : 'bg-transparent'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className={`whitespace-nowrap text-center leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
