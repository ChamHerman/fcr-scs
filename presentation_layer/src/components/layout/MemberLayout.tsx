import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ShieldCheck, Home, CreditCard, CircleDollarSign, ScrollText, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MemberLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <style>{`
        .member-layout {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
          color: #0f172a;
        }
        
        .member-sidebar {
          width: 260px;
          background: #ffffff;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          position: sticky;
          top: 0;
          height: 100vh;
          z-index: 30;
        }

        .member-brand {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 28px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #6d28d9;
          padding: 0 8px;
        }

        .member-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .member-nav a {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 12px;
          text-decoration: none;
          color: #64748b;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .member-nav a:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .member-nav a.active {
          background: #f5f3ff;
          color: #6d28d9;
          font-weight: 600;
        }

        .member-nav a .nav-icon { opacity: 0.75; }
        .member-nav a.active .nav-icon { opacity: 1; color: #6d28d9; }

        .member-main {
          flex: 1;
          width: 100%;
          min-width: 0;
          background: #f8fafc;
        }

        .bottom-nav { display: none; }

        @media (max-width: 1024px) {
          .member-sidebar {
            width: 220px;
          }
        }

        @media (max-width: 768px) {
          .member-layout {
            flex-direction: column;
            padding-bottom: 88px; /* space for bottom nav and floating action bar */
          }
          .member-sidebar { display: none; }
          .member-main { padding: 0; }

          .bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.94);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-top: 1px solid #e2e8f0;
            justify-content: space-around;
            padding: 8px 4px 12px 4px;
            z-index: 50;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.06);
          }
          .bottom-nav a {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            font-size: 10px;
            color: #64748b;
            text-decoration: none;
            font-weight: 500;
            flex: 1;
            padding: 4px 0;
          }
          .bottom-nav a.active {
            color: #6d28d9;
            font-weight: 600;
          }
          .bottom-nav-icon {
            padding: 4px 12px;
            border-radius: 14px;
            transition: background 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .bottom-nav a.active .bottom-nav-icon {
            background: #f5f3ff;
          }
        }
      `}</style>
      <div className="member-layout">
        {/* Desktop & Tablet Sidebar */}
        <aside className="member-sidebar">
          <div className="member-brand">
            <div className="p-1.5 rounded-lg bg-violet-100 text-violet-700">
              <ShieldCheck size={22} />
            </div>
            <span>Member Portal</span>
          </div>

          <nav className="member-nav">
            <NavLink to="/member" end>
              <Home size={18} className="nav-icon" />
              <span>Workflow & Case</span>
            </NavLink>
            <NavLink to="/member/bank-details">
              <CreditCard size={18} className="nav-icon" />
              <span>Bank Details</span>
            </NavLink>
            <NavLink to="/member/payment-status">
              <CircleDollarSign size={18} className="nav-icon" />
              <span>Payment Status</span>
            </NavLink>
            <NavLink to="/member/verify-audit">
              <ScrollText size={18} className="nav-icon" />
              <span>Audit Trail</span>
            </NavLink>
          </nav>

          <div className="pt-4 border-t border-slate-200 mt-auto">
            <div className="px-2 py-2 mb-2 bg-slate-50 rounded-xl">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.name || 'Ahmad bin Abdullah'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email || 'ahmad.abdullah@example.com'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="member-main">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="bottom-nav">
          <NavLink to="/member" end>
            <span className="bottom-nav-icon"><Home size={18} /></span>
            <span>Case</span>
          </NavLink>
          <NavLink to="/member/bank-details">
            <span className="bottom-nav-icon"><CreditCard size={18} /></span>
            <span>Bank</span>
          </NavLink>
          <NavLink to="/member/payment-status">
            <span className="bottom-nav-icon"><CircleDollarSign size={18} /></span>
            <span>Payment</span>
          </NavLink>
          <NavLink to="/member/verify-audit">
            <span className="bottom-nav-icon"><ScrollText size={18} /></span>
            <span>Verify</span>
          </NavLink>
        </nav>
      </div>
    </>
  );
};

