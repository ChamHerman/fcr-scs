import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import { Bell, ChevronDown, LogOut, User, Settings, ScrollText, FileCheck2, CircleDollarSign } from 'lucide-react';
import { Button } from '../ui/Button';
import { BrandLogo } from '../ui/Logo';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../hooks/useRole';
import { alertService } from '../../services/alert.service';

function getNameInitials(name: string | undefined | null): string {
  if (!name) return 'AL';
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const second = words[1]?.[0] ?? '';
  return (first + second).toUpperCase() || 'AL';
}

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { isMember, userName, identificationNumber } = useRole();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Member dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Close member dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Unread notifications fetch (only when member dropdown could render)
  useEffect(() => {
    if (!isAuthenticated || !isMember) return;
    let cancelled = false;
    alertService
      .fetchAlerts({ page: 1, limit: 1, status: 'unacknowledged' })
      .then((res) => {
        if (!cancelled) setHasUnread((res.pagination?.totalCount ?? 0) > 0);
      })
      .catch(() => {
        /* silent — red dot stays hidden on error */
      });
    return () => { cancelled = true; };
  }, [isAuthenticated, isMember]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = userName || user?.name || 'Affected Landowner';
  const displayEmail = user?.email || '';
  const displayId = identificationNumber || user?.identificationNumber;
  const initials = getNameInitials(displayName);
  const roleLabel = 'Affected Landowner';

  return (
    <nav
      className={classNames(
        'fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-transform duration-300 ease-in-out bg-md-background/90 backdrop-blur-md border-b border-md-outline/10',
        isVisible ? 'translate-y-0' : '-translate-y-full',
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand — always present, identical for everyone */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <BrandLogo size={36} />
          <span className="font-bold text-xl text-md-on-surface tracking-tight">
            Smart Contract Resettlement
          </span>
        </Link>

        {/* Right side: branches on auth + role */}
        {isAuthenticated && isMember ? (
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/member/notifications"
              className="p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 relative shadow-sm transition"
              title="View Notifications"
            >
              <Bell className="w-4 h-4" />
              {hasUnread && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              )}
            </Link>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-full hover:bg-md-surface-container-low border border-transparent hover:border-md-outline/20 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm ring-2 ring-violet-200 shrink-0">
                  {initials}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-[10px] text-slate-500 font-medium leading-none">
                    {roleLabel}
                  </div>
                  <div className="text-xs font-bold text-slate-900 leading-tight mt-0.5">
                    {displayName}
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-500 transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180 text-md-primary' : ''
                  }`}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-md-outline/20 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-sm font-bold text-slate-900">{displayName}</p>
                    {displayEmail && <p className="text-xs text-slate-500 truncate">{displayEmail}</p>}
                    {displayId && (
                      <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200/60">
                        ID: {displayId}
                      </span>
                    )}
                  </div>

                  <div className="py-1">
                    <Link
                      to="/member"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      <User size={16} className="text-md-primary" />
                      <span>Profile &amp; Case Overview</span>
                    </Link>
                    <Link
                      to="/member/notifications"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Bell size={16} className="text-violet-600" />
                      <span>My Notifications</span>
                      {hasUnread && <span className="ml-auto w-2 h-2 rounded-full bg-rose-500" />}
                    </Link>
                    <Link
                      to="/member/offer-letter"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      <FileCheck2 size={16} className="text-violet-600" />
                      <span>Notice of Award (Form G)</span>
                    </Link>
                    <Link
                      to="/member/payment-status"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      <CircleDollarSign size={16} className="text-amber-600" />
                      <span>Payment Status</span>
                    </Link>
                    <Link
                      to="/member/verify-audit"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      <ScrollText size={16} className="text-violet-600" />
                      <span>Verify Audit Trail</span>
                    </Link>
                    <Link
                      to="/member/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Settings size={16} className="text-slate-500" />
                      <span>Settings &amp; Payout Account</span>
                    </Link>
                  </div>

                  <div className="border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#ef4444] hover:bg-red-50 transition text-left font-semibold cursor-pointer"
                    >
                      <LogOut size={16} className="text-[#ef4444]" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Anonymous (or admin) — login + register only
          <div className="flex items-center gap-3">
            <Button variant="outlined" size="sm" onClick={() => navigate('/login')}>
              Login
            </Button>
            <Button variant="filled" size="sm" onClick={() => navigate('/register')}>
              Register
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};
