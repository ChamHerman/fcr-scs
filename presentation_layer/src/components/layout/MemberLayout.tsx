import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ShieldCheck, Home, CreditCard, CircleDollarSign, ScrollText, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MemberLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/member',
      end: true,
      label: 'Overview & Workflow',
      shortLabel: 'Overview',
      icon: Home,
    },
    {
      to: '/member/bank-details',
      end: false,
      label: 'Bank Details',
      shortLabel: 'Bank',
      icon: CreditCard,
    },
    {
      to: '/member/payment-status',
      end: false,
      label: 'Payment Status',
      shortLabel: 'Status',
      icon: CircleDollarSign,
    },
    {
      to: '/member/verify-audit',
      end: false,
      label: 'Audit Trail',
      shortLabel: 'Audit',
      icon: ScrollText,
    },
  ];

  // Mask NRIC helper e.g. 850712-14-5567 -> 850712-••-5567
  const maskNric = (nric?: string) => {
    if (!nric) return 'Verified Citizen';
    const clean = nric.replace(/[^0-9]/g, '');
    if (clean.length >= 12) {
      return `${clean.slice(0, 6)}-••-${clean.slice(10)}`;
    }
    return nric;
  };

  return (
    <div className="min-h-screen bg-md-background text-md-on-surface flex flex-col selection:bg-md-primary/20 selection:text-md-primary">
      {/* Header Top Bar */}
      <header className="sticky top-0 z-40 bg-md-surface-container/95 backdrop-blur-md border-b border-md-outline/15 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Left: Portal Identity */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-md-primary/10 flex items-center justify-center text-md-primary shrink-0">
                <ShieldCheck size={22} className="text-md-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tracking-wider uppercase text-md-primary">FCR-SCS</span>
                  <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-md-outline/40" />
                  <span className="hidden sm:inline text-xs text-md-on-surface-variant font-medium">Under LAA 1960</span>
                </div>
                <h1 className="text-sm sm:text-base font-bold text-md-on-surface truncate">
                  Displaced Member Portal
                </h1>
              </div>
            </div>

            {/* Right: Member Chip & Sign Out */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Member Profile Chip */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-md-surface-container-low border border-md-outline/15 max-w-[200px] sm:max-w-none">
                <div className="w-7 h-7 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <User size={14} />}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="text-xs font-semibold text-md-on-surface truncate max-w-[140px]">
                    {user?.name || 'Member'}
                  </span>
                  <span className="text-[10px] text-md-on-surface-variant font-mono">
                    {maskNric(user?.identificationNumber)}
                  </span>
                </div>
                <span className="hidden md:inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-md-secondary-container text-md-on-secondary-container">
                  Landowner
                </span>
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out"
                className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-full transition-all duration-200 ease-md-bouncy shrink-0 min-h-[44px]"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Desktop & Tablet Top Navigation Tabs */}
          <div className="hidden md:flex items-center gap-1.5 pt-1 pb-3 overflow-x-auto border-t border-md-outline/10">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ease-md-bouncy shrink-0 min-h-[44px] ${
                      isActive
                        ? 'bg-md-primary text-md-on-primary shadow-sm'
                        : 'text-md-on-surface-variant hover:bg-md-surface-container-low hover:text-md-on-surface'
                    }`
                  }
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 md:px-6 md:py-8 pb-28 md:pb-12 min-w-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar (Fixed on phones) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-md-surface-container/95 backdrop-blur-md border-t border-md-outline/20 px-2 py-2 flex justify-around items-center shadow-lg"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-[11px] font-medium transition-all duration-200 ease-md-bouncy min-h-[44px] ${
                  isActive
                    ? 'text-md-primary font-bold'
                    : 'text-md-on-surface-variant hover:text-md-on-surface'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1 rounded-full transition-all duration-200 ${
                      isActive ? 'bg-md-secondary-container text-md-on-secondary-container' : 'text-md-on-surface-variant'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <span className="mt-0.5 truncate">{item.shortLabel}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
