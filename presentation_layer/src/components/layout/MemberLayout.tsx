import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ShieldCheck, Home, CreditCard, CircleDollarSign, ScrollText } from 'lucide-react';

export const MemberLayout: React.FC = () => {
  return (
    <>
      <style>{`
        .member-layout {
          display: flex;
          min-height: 100vh;
          background: #FFFBFE;
          color: #1c1b1f;
        }
        
        .member-sidebar {
          width: 240px;
          background: #F3EDF7;
          border-right: 1px solid rgba(121,116,126,0.12);
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          position: sticky;
          top: 0;
          height: 100vh;
        }

        .member-brand {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 32px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #6750a4;
        }

        .member-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .member-nav a {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          text-decoration: none;
          color: #49454f;
          font-weight: 500;
          transition: all 0.2s;
        }

        .member-nav a:hover { background: rgba(103,80,164,0.08); }
        .member-nav a.active {
          background: #e8def8;
          color: #6750a4;
          font-weight: 600;
        }

        .member-nav a .nav-icon { opacity: 0.7; }
        .member-nav a.active .nav-icon { opacity: 1; }

        .member-main {
          flex: 1;
          padding: 32px 40px;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
        }

        .bottom-nav { display: none; }

        @media (max-width: 768px) {
          .member-layout {
            flex-direction: column;
            padding-bottom: 80px; /* space for bottom nav */
          }
          .member-sidebar { display: none; }
          .member-main { padding: 20px 16px; }

          .bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #F3EDF7;
            border-top: 1px solid rgba(121,116,126,0.12);
            justify-content: space-around;
            padding: 12px 8px 24px 8px; /* Extra padding for modern phones */
            z-index: 50;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
          }
          .bottom-nav a {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            color: #49454f;
            text-decoration: none;
            font-weight: 500;
          }
          .bottom-nav a.active {
            color: #6750a4;
            font-weight: 600;
          }
          .bottom-nav-icon {
            padding: 4px 16px;
            border-radius: 16px;
            transition: background 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .bottom-nav a.active .bottom-nav-icon {
            background: #e8def8;
          }
        }
      `}</style>
      <div className="member-layout">
        {/* Desktop Sidebar */}
        <aside className="member-sidebar">
          <div className="member-brand">
            <ShieldCheck size={28} />
            <span>My Compensation</span>
          </div>
          <nav className="member-nav">
            <NavLink to="/member" end>
              <Home size={22} className="nav-icon" />
              <span>Overview</span>
            </NavLink>
            <NavLink to="/member/bank-details">
              <CreditCard size={22} className="nav-icon" />
              <span>Bank Details</span>
            </NavLink>
            <NavLink to="/member/payment-status">
              <CircleDollarSign size={22} className="nav-icon" />
              <span>Payment Status</span>
            </NavLink>
            <NavLink to="/member/verify-audit">
              <ScrollText size={22} className="nav-icon" />
              <span>Verify Audit Trail</span>
            </NavLink>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="member-main">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="bottom-nav">
          <NavLink to="/member" end>
            <span className="bottom-nav-icon"><Home size={22} /></span>
            <span>Home</span>
          </NavLink>
          <NavLink to="/member/bank-details">
            <span className="bottom-nav-icon"><CreditCard size={22} /></span>
            <span>Bank</span>
          </NavLink>
          <NavLink to="/member/payment-status">
            <span className="bottom-nav-icon"><CircleDollarSign size={22} /></span>
            <span>Status</span>
          </NavLink>
          <NavLink to="/member/verify-audit">
            <span className="bottom-nav-icon"><ScrollText size={22} /></span>
            <span>Verify</span>
          </NavLink>
        </nav>
      </div>
    </>
  );
};
