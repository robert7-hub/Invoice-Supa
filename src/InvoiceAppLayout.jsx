import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Menu, Settings, X } from 'lucide-react';

const PHONE_LAYOUT_MAX_WIDTH = 767;
const TABLET_LAYOUT_MAX_WIDTH = 1180;

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
          ? 'p-0'
          : useTabletLayout
            ? 'p-4'
            : 'p-4 xl:p-6'
        : usePhoneLayout
          ? 'p-2 pb-28'
          : useTabletLayout
            ? 'p-4'
            : 'p-2 md:p-6 xl:p-8',
    panelShellClass:
      activeTab === 'settings'
        ? usePhoneLayout
          ? 'w-full rounded-none'
          : 'w-full rounded-2xl'
        : usePhoneLayout
          ? 'w-full mx-auto rounded-[28px] shadow-[0_20px_50px_rgba(15,23,42,0.16)]'
          : 'w-full mx-auto rounded-2xl',
  };
};

const InvoiceAppMobileBrandBlock = ({ activeTheme, businessName, logo }) => (
  <div className="rounded-[28px] border border-white/10 bg-black/10 p-4 text-center backdrop-blur-sm">
    {logo ? (
      <div className="flex flex-col items-center gap-3">
        <div className="w-full overflow-hidden rounded-2xl bg-white/5 p-3">
          <img src={logo} alt="Logo" className="mx-auto max-h-24 w-auto object-contain" />
        </div>
        <div className="min-w-0">
          <p className={`text-base font-semibold ${activeTheme.sidebarText}`}>{businessName || 'Invoice App'}</p>
          <p className={`text-xs uppercase tracking-[0.22em] ${activeTheme.sidebarTextMuted}`}>Dashboard</p>
        </div>
      </div>
    ) : (
      <div className="flex flex-col items-center gap-3">
        <div className={`flex h-20 w-20 items-center justify-center rounded-[24px] ${activeTheme.accent} shadow-lg`}>
          <FileText className="h-9 w-9 text-white" />
        </div>
        <div className="min-w-0">
          <p className={`text-base font-semibold ${activeTheme.sidebarText}`}>{businessName || 'Invoice App'}</p>
          <p className={`text-xs uppercase tracking-[0.22em] ${activeTheme.sidebarTextMuted}`}>Dashboard</p>
        </div>
      </div>
    )}
  </div>
);

const InvoiceAppMobileDrawer = ({
  open,
  onClose,
  activeTheme,
  businessName,
  logo,
  navItems,
  activeTab,
  onSelectTab,
}) => {
  const activeItem = navItems.find((item) => item.id === activeTab);

  return (
    <div className={`fixed inset-0 z-50 transition-all duration-300 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-slate-950/55 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute left-0 top-0 flex h-full w-[86%] max-w-[340px] flex-col border-r ${activeTheme.border} ${activeTheme.sidebarBg} shadow-[0_24px_70px_rgba(15,23,42,0.32)] transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-5">
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${activeTheme.sidebarTextMuted}`}>Navigation</p>
            <p className={`mt-1 text-sm font-semibold ${activeTheme.sidebarText}`}>Quick access</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-2xl border px-3 py-2 ${activeTheme.border} ${activeTheme.buttonHover} ${activeTheme.sidebarText}`}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pt-4">
          <InvoiceAppMobileBrandBlock activeTheme={activeTheme} businessName={businessName} logo={logo} />
        </div>

        <div className="px-4 pt-4">
          <div className={`rounded-[24px] border p-4 ${activeTheme.border} ${activeTheme.subtleBg}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${activeTheme.textMuted}`}>Current section</p>
            <p className={`mt-2 text-base font-semibold ${activeTheme.textPrimary}`}>{activeItem?.label || 'Dashboard'}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4 pt-4">
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
                  className={`flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left text-sm font-medium transition-all ${
                    activeTab === item.id ? activeTheme.sidebarActive : activeTheme.sidebarInactive
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              ))}
          </div>
        </div>

        <div className={`border-t px-4 py-4 ${activeTheme.border}`}>
          <button
            type="button"
            onClick={() => {
              onSelectTab('settings');
              onClose();
            }}
            className={`flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left text-sm font-medium transition-all ${
              activeTab === 'settings' ? activeTheme.sidebarActive : activeTheme.sidebarInactive
            }`}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </button>
        </div>
      </aside>
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
  activeTheme,
  businessName,
  logo,
  navItems,
  activeTab,
  onSelectTab,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeItem = useMemo(
    () => navItems.find((item) => item.id === activeTab),
    [activeTab, navItems]
  );
  const dockItems = useMemo(
    () => navItems.filter((item) => item.id !== 'settings'),
    [navItems]
  );

  if (!visible) {
    return null;
  }

  return (
    <>
      <InvoiceAppMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTheme={activeTheme}
        businessName={businessName}
        logo={logo}
        navItems={navItems}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-40 px-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={`absolute left-5 top-0 flex h-12 items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-lg backdrop-blur-xl transition-transform active:scale-[0.98] ${activeTheme.border} ${activeTheme.cardBg} ${activeTheme.textPrimary}`}
          style={{ transform: 'translateY(-38%)' }}
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
          <span>Menu</span>
        </button>

        <div
          className={`rounded-[30px] border ${activeTheme.border} ${activeTheme.cardBg} shadow-[0_22px_60px_rgba(15,23,42,0.22)] backdrop-blur-xl`}
        >
          <div className="flex items-center justify-between px-4 pb-1 pt-4">
            <div className="min-w-0">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${activeTheme.textMuted}`}>Quick nav</p>
              <p className={`truncate text-sm font-semibold ${activeTheme.textPrimary}`}>{activeItem?.label || 'Dashboard'}</p>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('settings')}
              className={`rounded-2xl border p-3 transition-all ${
                activeTab === 'settings'
                  ? `${activeTheme.mobileNavActive} ${activeTheme.border}`
                  : `${activeTheme.border} ${activeTheme.buttonHover} ${activeTheme.textPrimary}`
              }`}
              aria-label="Open settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>

          <div className="mobile-nav-scroll overflow-x-auto px-2 pb-3 pt-2">
            <div className="flex min-w-max items-center gap-2">
              {dockItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`flex min-w-[88px] flex-none flex-col items-center gap-1.5 rounded-[22px] px-4 py-3 text-[11px] font-semibold transition-all ${
                    activeTab === item.id
                      ? `${activeTheme.mobileNavActive} shadow-sm`
                      : `${activeTheme.mobileNavInactive} ${activeTheme.buttonHover}`
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="whitespace-nowrap leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
