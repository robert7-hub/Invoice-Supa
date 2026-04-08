import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
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
const PHONE_PANEL_CLASS = 'invoice-phone-panel w-full';
const MOBILE_SCROLL_THUMB_HEIGHT = 28;

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
          ? 'px-0 pt-0 pb-0'
          : useTabletLayout
            ? 'p-4'
            : 'p-4 xl:p-6'
        : usePhoneLayout
          ? 'px-0 pt-0 pb-0'
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
  <div className="overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(34,34,37,0.96),rgba(23,23,26,0.98))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_28px_rgba(0,0,0,0.28)]">
    <div className="flex items-center gap-4">
      {logo ? (
        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-black">
          <img src={logo} alt="Business logo" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-white/10 bg-[radial-gradient(circle_at_30%_30%,rgba(239,68,68,0.92),rgba(168,85,247,0.8)_55%,rgba(15,23,42,0.92))] shadow-[0_14px_28px_rgba(0,0,0,0.32)]">
          <span className="text-[24px] font-black tracking-[0.08em] text-white">
            {getBusinessMonogram(businessName)}
          </span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-semibold uppercase tracking-[0.08em] text-white">
          {businessName || 'Invoice App'}
        </p>
        <p className="mt-1 truncate text-[13px] text-white/42">
          {businessEmail || subtitle}
        </p>
      </div>
    </div>
  </div>
);

export const MobileHeader = ({
  title,
  activeTheme,
  showSearch = false,
  searchTerm = '',
  onSearchChange,
  onMenu,
  onSettings,
  RightIcon = Settings,
  rightAriaLabel = 'Open settings',
}) => {
  const shellBg = activeTheme?.panelBg || 'bg-white';
  const shellBorder = activeTheme?.border || 'border-zinc-200';
  const shellText = activeTheme?.textPrimary || 'text-zinc-950';
  const shellMuted = activeTheme?.iconColor || 'text-zinc-400';
  const controlBg = activeTheme?.subtleBg || 'bg-zinc-50';
  const controlBorder = activeTheme?.inputBorder || 'border-zinc-200';
  const controlHover = activeTheme?.buttonHover || 'hover:bg-zinc-100';
  const inputBg = activeTheme?.inputBg || 'bg-white';

  return (
    <div className={`sticky top-0 z-40 border-b ${shellBorder} ${shellBg}/95 shadow-sm backdrop-blur-xl`}>
      <div className="px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onMenu}
            className={`flex h-9 w-9 items-center justify-center rounded-[18px] border ${controlBorder} ${controlBg} ${shellText} shadow-[0_6px_18px_rgba(15,23,42,0.07)] transition ${controlHover}`}
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <div className="min-w-0 text-center">
            <p className={`truncate text-[15px] font-bold tracking-tight ${shellText}`}>{title}</p>
          </div>
          <button
            type="button"
            onClick={onSettings}
            className={`flex h-9 w-9 items-center justify-center rounded-[18px] border ${controlBorder} ${controlBg} ${shellText} shadow-[0_6px_18px_rgba(15,23,42,0.07)] transition ${controlHover}`}
            aria-label={rightAriaLabel}
          >
            <RightIcon className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
      {showSearch ? (
        <div className="px-4 pt-1 pb-3.5">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${shellMuted}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              className={`h-10 w-full rounded-[18px] border ${controlBorder} ${inputBg} pl-9 pr-4 text-sm ${shellText} shadow-[0_6px_18px_rgba(15,23,42,0.05)] placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-200`}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

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
        className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-label="Close navigation menu"
      />
      <aside
        className={`absolute left-0 top-0 flex h-full w-[84%] max-w-[320px] flex-col border-r border-white/70 bg-black text-white shadow-[0_28px_80px_rgba(0,0,0,0.46)] transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-4 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <InvoiceAppMobileBrandBlock
            businessName={businessName}
            businessEmail={businessEmail}
            logo={logo}
            subtitle="Dashboard"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8">
          <div className="space-y-2.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`flex w-full items-center gap-4 rounded-[28px] px-4 py-3.5 text-left text-[18px] font-medium tracking-[-0.01em] transition-all ${
                  activeTab === item.id
                    ? 'border border-white/12 bg-[linear-gradient(180deg,rgba(45,45,48,0.98),rgba(34,34,36,0.98))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(0,0,0,0.2)]'
                    : 'border border-transparent bg-transparent text-white/74 hover:bg-white/[0.03]'
                }`}
              >
                <item.icon className={`h-7 w-7 shrink-0 ${activeTab === item.id ? 'text-white' : 'text-white/62'}`} strokeWidth={1.9} />
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            ))}
          </div>
          <div className="mx-2 mt-8 border-t border-white/20" />
        </div>
      </aside>
    </div>
  );
};

export const QuickCreateSheet = ({
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

export const MobileBottomDock = ({
  visible,
  navItems,
  activeTab,
  onSelectTab,
  onOpenQuickCreate,
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
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-2"
      style={{ paddingBottom: 'max(0.7rem, env(safe-area-inset-bottom))' }}
    >
      <div className="relative rounded-t-[26px] rounded-b-[22px] border border-zinc-200/90 bg-white/98 shadow-[0_-8px_26px_rgba(15,23,42,0.11),0_16px_34px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        <button
          type="button"
          onClick={onOpenQuickCreate}
          className="absolute left-1/2 top-0 z-10 flex h-[54px] w-[54px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.25)] transition-all duration-200 hover:scale-105 active:scale-[0.98]"
          aria-label="Open create menu"
        >
          <Plus className="h-5 w-5" />
        </button>

        <div className="mobile-nav-scroll overflow-x-auto px-1.5 pb-2.5 pt-4">
          <div className="grid min-w-full grid-flow-col auto-cols-[calc((100%-1.5rem)/4)] items-center gap-2 px-2">
            {dockItems.map((item) => {
              const isActive = activeTab === item.id;

              return (
                <React.Fragment key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className={`flex h-[66px] min-w-0 w-full flex-col items-center justify-center rounded-[18px] px-2 py-2 text-[11px] transition-all duration-200 active:scale-[0.98] ${
                      isActive
                        ? 'bg-zinc-50 text-zinc-950 shadow-[0_8px_18px_rgba(15,23,42,0.08)] ring-1 ring-zinc-200/80'
                        : 'text-zinc-500 hover:bg-zinc-100/80'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <div
                      className={`mb-1 flex h-9 w-9 items-center justify-center rounded-[14px] transition-all duration-200 ${
                        isActive
                          ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                          : 'bg-transparent text-zinc-500'
                      }`}
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                    </div>
                    <span
                      className={`max-w-full overflow-hidden text-ellipsis text-center leading-tight whitespace-nowrap ${
                        isActive ? 'font-semibold text-zinc-950' : 'font-medium text-zinc-500'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const getElementDepth = (element, root) => {
  let depth = 0;
  let current = element;

  while (current && current !== root) {
    depth += 1;
    current = current.parentElement;
  }

  return depth;
};

const canScrollElement = (element) => {
  if (!element || typeof window === 'undefined') {
    return false;
  }

  const computedStyle = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
    return false;
  }

  return rect.height > 0 && rect.width > 0 && element.scrollHeight - element.clientHeight > 24;
};

const findActiveMobileScrollTarget = (root) => {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return null;
  }

  const candidates = Array.from(
    root.querySelectorAll('.phone-dock-scroll-space, [data-mobile-scroll-target], .overflow-y-auto, .overflow-auto')
  ).filter(canScrollElement);

  if (!candidates.length) {
    return null;
  }

  return candidates.sort((left, right) => {
    const rightOverflow = right.scrollHeight - right.clientHeight;
    const leftOverflow = left.scrollHeight - left.clientHeight;

    if (rightOverflow !== leftOverflow) {
      return rightOverflow - leftOverflow;
    }

    return getElementDepth(right, root) - getElementDepth(left, root);
  })[0];
};

// ============================================================================
// MOBILE LAYOUT SHELL
// ============================================================================

export const MobileLayout = ({
  activeTab,
  onSelectTab,
  navItems,
  businessName,
  businessEmail,
  logo,
  activeTheme,
  view,
  searchTerm,
  onSearchChange,
  children,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const scrollRootRef = useRef(null);

  const mobileNavItems = useMemo(
    () => [...navItems, { id: 'settings', icon: Settings, label: 'Settings' }],
    [navItems]
  );

  const showShell = view === 'list';
  const isSettingsOnPhone = activeTab === 'settings';
  const mobileSearchTabs = ['invoices', 'estimates', 'clients', 'items'];
  const showSearch = showShell && mobileSearchTabs.includes(activeTab);
  const headerTitle =
    {
      invoices: 'Invoices',
      estimates: 'Estimates',
      clients: 'Clients',
      items: 'Items',
      finance: 'Finance',
      'staff-events': 'Staff & Events',
      reports: 'Reports',
      settings: 'Settings',
    }[activeTab] || 'Invoices';

  useEffect(() => {
    if (!showShell) {
      setDrawerOpen(false);
      setQuickCreateOpen(false);
    }
  }, [showShell]);

  const handleSelectTab = useCallback(
    (tab) => {
      setDrawerOpen(false);
      setQuickCreateOpen(false);
      onSelectTab(tab);
    },
    [onSelectTab]
  );

  return (
    <div
      className="h-[100dvh] overflow-hidden invoice-phone-stage"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      <div className="flex h-full invoice-phone-frame items-start">
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 px-0 pt-0 pb-0">
            <div
              ref={scrollRootRef}
              className={`${activeTheme.panelBg} shadow-sm ${activeTheme.border} h-full overflow-hidden ${PHONE_PANEL_CLASS}`}
              style={isSettingsOnPhone ? undefined : { maxWidth: '1600px' }}
            >
              <div className="flex h-full flex-col overflow-hidden">
                {showShell ? (
                  <MobileHeader
                    title={headerTitle}
                    activeTheme={activeTheme}
                    showSearch={showSearch}
                    searchTerm={searchTerm}
                    onSearchChange={onSearchChange}
                    onMenu={() => setDrawerOpen(true)}
                    onSettings={() =>
                      isSettingsOnPhone ? handleSelectTab('invoices') : handleSelectTab('settings')
                    }
                    RightIcon={isSettingsOnPhone ? X : Settings}
                    rightAriaLabel={isSettingsOnPhone ? 'Back to invoices' : 'Open settings'}
                  />
                ) : null}
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showShell ? (
        <InvoiceAppMobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          businessName={businessName}
          businessEmail={businessEmail}
          logo={logo}
          navItems={mobileNavItems}
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
        />
      ) : null}

      {showShell && !isSettingsOnPhone ? (
        <MobileBottomDock
          visible
          navItems={mobileNavItems}
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onOpenQuickCreate={() => setQuickCreateOpen(true)}
        />
      ) : null}

      {showShell && !isSettingsOnPhone ? (
        <QuickCreateSheet
          open={quickCreateOpen}
          onClose={() => setQuickCreateOpen(false)}
          onNavigate={handleSelectTab}
        />
      ) : null}
    </div>
  );
};

export const MobileScrollAssist = ({
  hasBottomDock = false,
  visible,
  scrollRootRef,
}) => {
  const scrollTargetRef = useRef(null);
  const detachScrollListenerRef = useRef(() => {});
  const [scrollState, setScrollState] = useState({
    atTop: true,
    atBottom: true,
    canScroll: false,
    progress: 0,
  });

  const updateScrollState = useCallback((target) => {
    if (!target) {
      setScrollState({
        atTop: true,
        atBottom: true,
        canScroll: false,
        progress: 0,
      });
      return;
    }

    const maxScrollTop = Math.max(target.scrollHeight - target.clientHeight, 0);
    const scrollTop = target.scrollTop;
    const progress = maxScrollTop > 0 ? scrollTop / maxScrollTop : 0;

    setScrollState({
      atTop: scrollTop <= 8,
      atBottom: maxScrollTop - scrollTop <= 8,
      canScroll: maxScrollTop > 24,
      progress,
    });
  }, []);

  const refreshScrollTarget = useCallback(() => {
    const root = scrollRootRef?.current;
    const nextTarget = findActiveMobileScrollTarget(root);

    if (scrollTargetRef.current !== nextTarget) {
      detachScrollListenerRef.current();
      scrollTargetRef.current = nextTarget;

      if (nextTarget) {
        const handleScroll = () => {
          updateScrollState(nextTarget);
        };

        nextTarget.addEventListener('scroll', handleScroll, { passive: true });
        detachScrollListenerRef.current = () => {
          nextTarget.removeEventListener('scroll', handleScroll);
        };
      } else {
        detachScrollListenerRef.current = () => {};
      }
    }

    updateScrollState(nextTarget);
    return nextTarget;
  }, [scrollRootRef, updateScrollState]);

  useEffect(() => {
    if (!visible || typeof window === 'undefined') {
      detachScrollListenerRef.current();
      scrollTargetRef.current = null;
      updateScrollState(null);
      return undefined;
    }

    let frameId = 0;
    const root = scrollRootRef?.current;

    const scheduleRefresh = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        refreshScrollTarget();
      });
    };

    scheduleRefresh();
    window.addEventListener('resize', scheduleRefresh);

    const mutationObserver =
      root && typeof MutationObserver !== 'undefined'
        ? new MutationObserver(scheduleRefresh)
        : null;
    mutationObserver?.observe(root, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class', 'style'],
    });

    const resizeObserver =
      root && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(scheduleRefresh)
        : null;
    resizeObserver?.observe(root);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', scheduleRefresh);
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
      detachScrollListenerRef.current();
      scrollTargetRef.current = null;
    };
  }, [refreshScrollTarget, scrollRootRef, updateScrollState, visible]);

  const getScrollTarget = useCallback(() => refreshScrollTarget() || scrollTargetRef.current, [refreshScrollTarget]);

  const scrollByAmount = useCallback(
    (direction) => {
      const target = getScrollTarget();

      if (!target) {
        return;
      }

      target.scrollBy({
        top: direction * Math.max(target.clientHeight * 0.72, 220),
        behavior: 'smooth',
      });
    },
    [getScrollTarget]
  );

  const scrollToEdge = useCallback(
    (edge) => {
      const target = getScrollTarget();

      if (!target) {
        return;
      }

      target.scrollTo({
        top: edge === 'bottom' ? target.scrollHeight : 0,
        behavior: 'smooth',
      });
    },
    [getScrollTarget]
  );

  const handleTrackClick = useCallback(
    (event) => {
      const target = getScrollTarget();

      if (!target) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
      const maxScrollTop = Math.max(target.scrollHeight - target.clientHeight, 0);

      target.scrollTo({
        top: maxScrollTop * ratio,
        behavior: 'smooth',
      });
    },
    [getScrollTarget]
  );

  const handleTrackWheel = useCallback(
    (event) => {
      const target = getScrollTarget();

      if (!target) {
        return;
      }

      event.preventDefault();
      target.scrollBy({
        top: event.deltaY,
        behavior: 'auto',
      });
    },
    [getScrollTarget]
  );

  if (!visible || !scrollState.canScroll) {
    return null;
  }

  const bottomOffsetClass = hasBottomDock ? 'bottom-[8.6rem]' : 'bottom-4';
  const thumbOffset = scrollState.progress * (88 - MOBILE_SCROLL_THUMB_HEIGHT);

  return (
    <div className={`pointer-events-none fixed ${bottomOffsetClass} left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-3`}>
      <div className="pointer-events-auto ml-auto flex w-[56px] flex-col items-center gap-2.5">
        <button
          type="button"
          onClick={() => scrollByAmount(-1)}
          onDoubleClick={() => scrollToEdge('top')}
          disabled={scrollState.atTop}
          className={`flex h-11 w-11 items-center justify-center rounded-full border border-zinc-300/90 bg-white text-zinc-800 shadow-[0_12px_28px_rgba(15,23,42,0.16)] backdrop-blur-xl transition ${
            scrollState.atTop ? 'cursor-not-allowed opacity-45' : 'hover:-translate-y-0.5 hover:bg-white'
          }`}
          aria-label="Scroll up"
          title="Scroll up"
        >
          <ChevronUp className="h-4.5 w-4.5" />
        </button>

        <button
          type="button"
          onClick={handleTrackClick}
          onWheel={handleTrackWheel}
          className="relative flex h-[96px] w-4 items-stretch rounded-full border border-zinc-300/80 bg-white/94 p-[2px] shadow-[0_12px_28px_rgba(15,23,42,0.14)] backdrop-blur-xl"
          aria-label="Scroll position"
          title="Scroll position"
        >
          <span className="absolute inset-[2px] rounded-full bg-zinc-100/90" />
          <span
            className="absolute left-[2px] right-[2px] rounded-full bg-zinc-900/80 shadow-[0_6px_12px_rgba(15,23,42,0.2)]"
            style={{ height: `${MOBILE_SCROLL_THUMB_HEIGHT}px`, top: `${thumbOffset + 2}px` }}
          />
        </button>

        <button
          type="button"
          onClick={() => scrollByAmount(1)}
          onDoubleClick={() => scrollToEdge('bottom')}
          disabled={scrollState.atBottom}
          className={`flex h-11 w-11 items-center justify-center rounded-full border border-zinc-300/90 bg-white text-zinc-800 shadow-[0_12px_28px_rgba(15,23,42,0.16)] backdrop-blur-xl transition ${
            scrollState.atBottom ? 'cursor-not-allowed opacity-45' : 'hover:translate-y-0.5 hover:bg-white'
          }`}
          aria-label="Scroll down"
          title="Scroll down"
        >
          <ChevronDown className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
};
