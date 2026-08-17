import React, { useRef, useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  LayoutDashboard,
  Map,
  CreditCard,
  Link as LinkIcon,
  Scale,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Users,
  FileText,
  PieChart,
  Settings,
  BarChart2,
  ClipboardList,
  Mail,
  FolderOpen,
  Moon,
  Sun,
  BrainCircuit,
  Sparkles,
  Send,
  PenLine,
  AlertTriangle,
  Upload,
  Ban
} from 'lucide-react';
import { IdentitySwitcher } from '../admin/IdentitySwitcher';

export const AdminLayout: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [financeExpanded, setFinanceExpanded] = useState(false);
  const [landAcquisitionExpanded, setLandAcquisitionExpanded] = useState(false);
  const [compensationExpanded, setCompensationExpanded] = useState(false);
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('admin_theme') === 'dark';
  });

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/admin/case') || path.startsWith('/admin/land-acquisition')) {
      setLandAcquisitionExpanded(true);
      setCompensationExpanded(false);
      setFinanceExpanded(false);
    } else if (path.startsWith('/admin/compensation')) {
      setLandAcquisitionExpanded(false);
      setCompensationExpanded(true);
      setFinanceExpanded(false);
    } else if (path.startsWith('/admin/payment') || path.startsWith('/admin/blockchain')) {
      setLandAcquisitionExpanded(false);
      setCompensationExpanded(false);
      setFinanceExpanded(true);
      setReportsExpanded(false);
    } else if (path.startsWith('/admin/reports')) {
      setLandAcquisitionExpanded(false);
      setCompensationExpanded(false);
      setFinanceExpanded(false);
      setReportsExpanded(true);
    }
  }, [location.pathname]);

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  const toggleTheme = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsDark(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('admin_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('admin_theme', 'light');
      }
      return next;
    });
  };


  useGSAP(() => {
    // Smooth entry animation for the main content area
    gsap.fromTo('.admin-content',
      { autoAlpha: 0, y: 15 },
      { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    );
  }, { scope: containerRef });

  return (
    <>
      <style>{`
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background: var(--md-background);
          color: var(--md-on-surface);
        }
        .admin-sidebar {
          width: ${isCollapsed ? '96px' : '280px'};
          background: var(--md-surface-container);
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(121,116,126,0.12);
          position: sticky;
          top: 0;
          height: 100vh;
          flex-shrink: 0;
          z-index: 10;
          transition: width 0.3s cubic-bezier(0.2, 0, 0, 1);
        }
        .admin-sidebar-header {
          position: relative;
          display: flex;
          flex-direction: ${isCollapsed ? 'column' : 'row'};
          align-items: center;
          justify-content: ${isCollapsed ? 'center' : 'space-between'};
          gap: ${isCollapsed ? '16px' : '0'};
          padding: 4px 4px 28px 4px;
        }
        .admin-sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          font-size: 20px;
          letter-spacing: -0.3px;
          color: var(--md-on-surface);
          overflow: hidden;
          white-space: nowrap;
        }
        .admin-sidebar-brand .brand-icon {
          width: 40px;
          height: 40px;
          background: var(--md-primary);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }
        .collapse-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--md-on-surface-variant);
          padding: 6px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          border: 1px solid rgba(121,116,126,0.12);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          background: var(--md-background, var(--md-background));
        }
        .collapse-btn:hover {
          background: rgba(103,80,164,0.08);
        }
        .admin-sidebar-nav { flex:1; display:flex; flex-direction:column; gap:4px; overflow-y: auto; overflow-x: hidden; }
        .admin-sidebar-nav::-webkit-scrollbar { width: 4px; }
        .admin-sidebar-nav::-webkit-scrollbar-thumb { background: rgba(121,116,126,0.3); border-radius: 4px; }
        
        .nav-section {
          margin-bottom: 8px;
        }
        .nav-label {
          font-size: 11px; font-weight:600; text-transform:uppercase;
          letter-spacing:0.5px; color: var(--md-on-surface-variant);
          padding:16px 12px 8px 12px; opacity:0.6;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          user-select: none;
        }
        .nav-label:hover {
          opacity: 1;
        }
        .nav-item {
          display:flex; align-items:center; gap:14px; padding:10px 14px;
          border-radius: 12px; text-decoration:none;
          color: var(--md-on-surface-variant); font-weight:500; font-size:14px;
          transition: background 0.2s cubic-bezier(0.2, 0, 0, 1), color 0.2s;
          white-space: nowrap;
          justify-content: ${isCollapsed ? 'center' : 'flex-start'};
        }
        .nav-item:hover { 
          background:rgba(103,80,164,0.08); 
          color: var(--md-on-surface); 
        }
        .nav-item.active { 
          background: var(--md-secondary-container);
          color: var(--md-primary);
          font-weight:600; 
        }
        .nav-item .nav-icon { flex-shrink:0; opacity:0.7; }
        .nav-item.active .nav-icon { opacity:1; }
        
        .nav-item .nav-badge {
          display: ${isCollapsed ? 'none' : 'flex'};
          background: var(--md-primary);
          color: white;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          margin-left: auto;
          align-items: center;
          justify-content: center;
        }

        .admin-main { 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
          overflow-x: hidden;
          position: relative;
        }
        
        .admin-main::before {
          content: "";
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: rgba(103, 80, 164, 0.06);
          filter: blur(80px);
          top: -200px;
          right: -200px;
          pointer-events: none;
          z-index: 0;
        }
        
        .admin-content {
          padding: 24px 32px 40px 32px;
          max-width: 1440px;
          width: 100%;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        @media (max-width: 768px) {
          .admin-layout { flex-direction: column; }
          .admin-sidebar {
            width: 100% !important; height: auto; position: relative; padding: 12px 16px;
            border-right: none; border-bottom: 1px solid rgba(121,116,126,0.12);
            flex-direction: row; flex-wrap: wrap; align-items: center; gap: 8px 16px;
          }
          .admin-sidebar-header { padding: 0; }
          .collapse-btn { display: none; }
          .admin-sidebar-brand span:not(.brand-icon) { display: inline; }
          .admin-sidebar-nav { flex-direction: row; flex-wrap: wrap; gap: 4px 8px; flex: 1; }
          .nav-section { margin: 0; display: flex; gap: 4px; flex-direction: row; }
          .nav-label { display: none; }
          .nav-item { padding: 6px 12px; font-size: 13px; gap: 8px; justify-content: center; }
          .admin-content { padding: 16px; }
        }
      `}</style>
      <div className="admin-layout" ref={containerRef}>
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <div className="admin-sidebar-brand" style={{ display: isCollapsed ? 'none' : 'flex' }}>
              <div className="brand-icon">
                <Scale size={24} />
              </div>
              <span>FCR·SCS Admin</span>
            </div>
            {isCollapsed && (
              <div className="brand-icon" style={{
                width: 40, height: 40, background: 'var(--md-primary)', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0
              }}>
                <Scale size={24} />
              </div>
            )}
            <button
              className="collapse-btn"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={20} />}
            </button>
          </div>

          <nav className="admin-sidebar-nav">
            <div className="nav-section">
              {!isCollapsed && <span className="nav-label">Main</span>}
              <NavLink to="/admin" end className="nav-item" title={isCollapsed ? "Dashboard" : ""}>
                <LayoutDashboard size={22} className="nav-icon" />
                {!isCollapsed && <span>Dashboard</span>}
              </NavLink>
              <NavLink to="/admin/valuers" className="nav-item" title={isCollapsed ? "Valuers" : ""}>
                <Users size={22} className="nav-icon" />
                {!isCollapsed && <span>Valuers</span>}
              </NavLink>
              <NavLink to="/admin/forms" className="nav-item" title={isCollapsed ? "Forms" : ""}>
                <FileText size={22} className="nav-icon" />
                {!isCollapsed && <span>Forms</span>}
              </NavLink>
            </div>

            <div className="nav-section">
              {!isCollapsed && (
                <div className="nav-label" onClick={() => setLandAcquisitionExpanded(!landAcquisitionExpanded)}>
                  <span>Land Acquisition</span>
                  {landAcquisitionExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              )}
              {isCollapsed && <div style={{ height: 16 }} />}
              {(landAcquisitionExpanded || isCollapsed) && (
                <>
                  <NavLink to="/admin/case" end className="nav-item" title={isCollapsed ? "Cases" : ""}>
                    <Map size={22} className="nav-icon" />
                    {!isCollapsed && <span>Cases Dashboard</span>}
                  </NavLink>
                  <NavLink to="/admin/case/valuation" className="nav-item" title={isCollapsed ? "Valuation" : ""}>
                    <BarChart2 size={22} className="nav-icon" />
                    {!isCollapsed && <span>Valuation</span>}
                  </NavLink>
                </>
              )}
            </div>

            <div className="nav-section">
              {!isCollapsed && (
                <div className="nav-label" onClick={() => setCompensationExpanded(!compensationExpanded)}>
                  <span>Compensation</span>
                  {compensationExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              )}
              {isCollapsed && <div style={{ height: 16 }} />}
              {(compensationExpanded || isCollapsed) && (
                <>
                  <NavLink to="/admin/compensation/report" className="nav-item" title={isCollapsed ? "Report" : ""}>
                    <ClipboardList size={22} className="nav-icon" />
                    {!isCollapsed && <span>Report</span>}
                  </NavLink>
                  <NavLink to="/admin/compensation/compare" className="nav-item" title={isCollapsed ? "Compare" : ""}>
                    <Scale size={22} className="nav-icon" />
                    {!isCollapsed && <span>Compare</span>}
                  </NavLink>
                  <NavLink to="/admin/compensation/offer" className="nav-item" title={isCollapsed ? "Offer" : ""}>
                    <Mail size={22} className="nav-icon" />
                    {!isCollapsed && <span>Offer</span>}
                  </NavLink>
                  <NavLink to="/admin/compensation/objection" className="nav-item" title={isCollapsed ? "Objection" : ""}>
                    <FolderOpen size={22} className="nav-icon" />
                    {!isCollapsed && <span>Objection</span>}
                  </NavLink>
                </>
              )}
            </div>

            <div className="nav-section">
              {!isCollapsed && (
                <div className="nav-label" onClick={() => setFinanceExpanded(!financeExpanded)}>
                  <span>Finance & Ledger</span>
                  {financeExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              )}
              {isCollapsed && <div style={{ height: 16 }} />}
              {(financeExpanded || isCollapsed) && (
                <>
                  <NavLink to="/admin/payment" end className="nav-item" title={isCollapsed ? "Payments Overview" : ""}>
                    <CreditCard size={22} className="nav-icon" />
                    {!isCollapsed && <span>Payments Overview</span>}
                  </NavLink>
                  <NavLink to="/admin/payment/initiate" className="nav-item" title={isCollapsed ? "Initiate" : ""}>
                    <Send size={18} className="nav-icon" style={{ marginLeft: isCollapsed ? 0 : '12px' }} />
                    {!isCollapsed && <span>Initiate</span>}
                  </NavLink>
                  <NavLink to="/admin/payment/pending" className="nav-item" title={isCollapsed ? "Pending Authorisations" : ""}>
                    <PenLine size={18} className="nav-icon" style={{ marginLeft: isCollapsed ? 0 : '12px' }} />
                    {!isCollapsed && <span>Pending Authorisations</span>}
                  </NavLink>
                  <NavLink to="/admin/payment/failed" className="nav-item" title={isCollapsed ? "Failed Transactions" : ""}>
                    <AlertTriangle size={18} className="nav-icon" style={{ marginLeft: isCollapsed ? 0 : '12px' }} />
                    {!isCollapsed && <span>Failed Transactions</span>}
                  </NavLink>
                  <NavLink to="/admin/blockchain" end className="nav-item" title={isCollapsed ? "Blockchain Overview" : ""}>
                    <LinkIcon size={22} className="nav-icon" />
                    {!isCollapsed && <span>Blockchain Overview</span>}
                  </NavLink>
                  <NavLink to="/admin/blockchain/publish" className="nav-item" title={isCollapsed ? "Publish" : ""}>
                    <Upload size={18} className="nav-icon" style={{ marginLeft: isCollapsed ? 0 : '12px' }} />
                    {!isCollapsed && <span>Publish</span>}
                  </NavLink>
                  <NavLink to="/admin/blockchain/void" className="nav-item" title={isCollapsed ? "Void" : ""}>
                    <Ban size={18} className="nav-icon" style={{ marginLeft: isCollapsed ? 0 : '12px' }} />
                    {!isCollapsed && <span>Void</span>}
                  </NavLink>
                </>
              )}
            </div>

            <div className="nav-section">
              {!isCollapsed && <span className="nav-label">AI Features</span>}
              <NavLink to="/admin/prediction" className="nav-item" title={isCollapsed ? "AI Valuation" : ""}>
                <BrainCircuit size={22} className="nav-icon" />
                {!isCollapsed && <span>AI Valuation</span>}
              </NavLink>
            </div>

            <div className="nav-section">
              {!isCollapsed && (
                <div className="nav-label" onClick={() => setReportsExpanded(!reportsExpanded)} style={{ cursor: 'pointer' }}>
                  <span>Reporting</span>
                  {reportsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              )}
              {isCollapsed && <div style={{ height: 16 }} />}
              {(reportsExpanded || isCollapsed) && (
                <>
                  <NavLink to="/admin/reports" end className="nav-item" title={isCollapsed ? "Overview" : ""}>
                    <PieChart size={22} className="nav-icon" />
                    {!isCollapsed && <span>Overview</span>}
                  </NavLink>
                  <NavLink to="/admin/reports/case-status" className="nav-item" title={isCollapsed ? "Case Status" : ""}>
                    <FileText size={18} className="nav-icon" style={{ marginLeft: isCollapsed ? 0 : '12px' }} />
                    {!isCollapsed && <span>Case Status</span>}
                  </NavLink>
                  <NavLink to="/admin/reports/payment" className="nav-item" title={isCollapsed ? "Payment" : ""}>
                    <FileText size={18} className="nav-icon" style={{ marginLeft: isCollapsed ? 0 : '12px' }} />
                    {!isCollapsed && <span>Payment</span>}
                  </NavLink>
                  <NavLink to="/admin/reports/blockchain-audit" className="nav-item" title={isCollapsed ? "Blockchain Audit" : ""}>
                    <FileText size={18} className="nav-icon" style={{ marginLeft: isCollapsed ? 0 : '12px' }} />
                    {!isCollapsed && <span>Blockchain Audit</span>}
                  </NavLink>
                </>
              )}
            </div>

            <div className="nav-section">
              {!isCollapsed && <span className="nav-label">System</span>}
              <NavLink to="/admin/profile" className="nav-item" title={isCollapsed ? "Profile" : ""}>
                <Users size={22} className="nav-icon" />
                {!isCollapsed && <span>My Profile</span>}
              </NavLink>
              <NavLink to="/admin/users" className="nav-item" title={isCollapsed ? "User Admin" : ""}>
                <Users size={22} className="nav-icon" />
                {!isCollapsed && <span>User Admin</span>}
              </NavLink>
              <NavLink to="/admin/audit-logs" className="nav-item" title={isCollapsed ? "Audit Logs" : ""}>
                <ClipboardList size={22} className="nav-icon" />
                {!isCollapsed && <span>Audit Logs</span>}
              </NavLink>
              <NavLink to="/admin/alerts" className="nav-item" title={isCollapsed ? "Alerts" : ""}>
                <Sparkles size={22} className="nav-icon" />
                {!isCollapsed && <span>Alerts</span>}
              </NavLink>
              <NavLink to="/admin/settings" className="nav-item" title={isCollapsed ? "Settings" : ""}>
                <Settings size={22} className="nav-icon" />
                {!isCollapsed && <span>Settings</span>}
              </NavLink>
            </div>

            <div style={{ flex: 1 }} />

            <div className="nav-section" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="nav-item"
                onClick={toggleTheme}
                style={{
                  cursor: 'pointer',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left'
                }}
              >
                {isDark ? <Sun size={22} className="nav-icon" /> : <Moon size={22} className="nav-icon" />}
                {!isCollapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
              </button>
            </div>
          </nav>
        </aside>

        <main className="admin-main">
          <div
            className="admin-identity-bar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '10px 32px',
              borderBottom: '1px solid rgba(121,116,126,0.1)',
              background: 'var(--md-surface-container)',
            }}
          >
            <span
              className="dev-tag"
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                color: 'var(--md-on-surface-variant)',
                opacity: 0.6,
                marginRight: '10px',
              }}
            >
              Dev Simulation
            </span>
            <IdentitySwitcher />
          </div>
          <div className="admin-content">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
};
