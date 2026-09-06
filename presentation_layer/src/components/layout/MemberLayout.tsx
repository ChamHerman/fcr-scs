import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { 
  LogOut, 
  Bell, 
  ChevronDown, 
  User, 
  Settings, 
  Landmark, 
  CircleDollarSign, 
  ScrollText, 
  FileCheck2 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../hooks/useRole';
import { Logo } from '../ui/Logo';

export const MemberLayout: React.FC = () => {
  const { logout } = useAuth();
  const { user, userName, identificationNumber, role } = useRole();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = userName || user?.name || 'Affected Landowner';
  const displayEmail = user?.email || '';
  const displayId = identificationNumber || user?.identificationNumber;
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'AL';

  const roleLabel = role === 'DISPLACED_COMMUNITY_MEMBER'
    ? 'Affected Landowner'
    : role ? role.replace(/_/g, ' ') : 'Affected Landowner';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <div className="min-h-screen bg-md-background text-md-on-surface flex flex-col font-sans antialiased">
      {/* Topbar: Member Portal on left, Notification & Profile Dropdown on right */}
      <header className="sticky top-0 z-40 bg-md-background border-b border-md-outline/15 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Member Portal */}
          <Link
            to="/member"
            className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary rounded-full px-1 py-1"
          >
            <div className="w-10 h-10 rounded-full bg-md-secondary-container flex items-center justify-center text-md-primary group-hover:scale-105 transition-transform duration-200">
              <Logo size={24} className="text-md-primary" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold tracking-tight text-md-on-surface block leading-tight">
                Member Portal
              </span>
              <span className="text-[11px] text-md-on-surface-variant block leading-tight">
                Land Acquisition Resettlement
              </span>
            </div>
          </Link>

          {/* Right: Notification & Profile Dropdown */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Notification Bell */}
            <button
              type="button"
              className="p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 relative shadow-sm transition cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            </button>

            {/* Affected Landowner Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-full hover:bg-md-surface-container-low border border-transparent hover:border-md-outline/20 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm ring-2 ring-violet-200 shrink-0">
                  {initials}
                </div>

                {/* Name & Subtitle */}
                <div className="hidden sm:block text-left">
                  <div className="text-[10px] text-slate-500 font-medium leading-none">
                    {roleLabel}
                  </div>
                  <div className="text-xs font-bold text-slate-900 leading-tight mt-0.5">
                    {displayName}
                  </div>
                </div>

                {/* Dropdown Chevron Icon */}
                <ChevronDown
                  size={16}
                  className={`text-slate-500 transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180 text-md-primary' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu Panel */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-md-outline/20 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-900">{displayName}</p>
                    {displayEmail && <p className="text-[11px] text-slate-500 truncate">{displayEmail}</p>}
                    {displayId && (
                      <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200/60">
                        ID: {displayId}
                      </span>
                    )}
                  </div>

                  {/* Menu Action Items */}
                  <div className="py-1">
                    <Link
                      to="/member"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition"
                    >
                      <User size={16} className="text-md-primary" />
                      <span>Profile & Case Overview</span>
                    </Link>

                    <Link
                      to="/member/offer-letter"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition"
                    >
                      <FileCheck2 size={16} className="text-violet-600" />
                      <span>Notice of Award (Form G)</span>
                    </Link>

                    <Link
                      to="/member/bank-details"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Landmark size={16} className="text-emerald-600" />
                      <span>Bank Payout Details</span>
                    </Link>

                    <Link
                      to="/member/payment-status"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition"
                    >
                      <CircleDollarSign size={16} className="text-amber-600" />
                      <span>Payment Status</span>
                    </Link>

                    <Link
                      to="/member/verify-audit"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition"
                    >
                      <ScrollText size={16} className="text-violet-600" />
                      <span>Verify Audit Trail</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        alert('Profile Settings: Claimant personal details, contact preferences, and notifications.');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <Settings size={16} className="text-slate-500" />
                      <span>Profile Settings</span>
                    </button>
                  </div>

                  {/* Divider & Red Logout Button */}
                  <div className="border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#ef4444] hover:bg-red-50 transition text-left font-semibold cursor-pointer"
                    >
                      <LogOut size={16} className="text-[#ef4444]" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
};
