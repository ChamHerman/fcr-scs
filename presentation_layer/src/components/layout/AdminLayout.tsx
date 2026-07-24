import React, { useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
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
  Settings
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [financeExpanded, setFinanceExpanded] = useState(true);

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
          background: #FFFBFE;
          color: #1c1b1f;
        }
        .admin-sidebar {
          width: ${isCollapsed ? '80px' : '260px'};
          background: #F3EDF7;
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
          display: flex;
          align-items: center;
          justify-content: ${isCollapsed ? 'center' : 'space-between'};
          padding: 4px 4px 28px 4px;
        }
        .admin-sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          font-size: 20px;
          letter-spacing: -0.3px;
          color: #1c1b1f;
          overflow: hidden;
          white-space: nowrap;
        }
        .admin-sidebar-brand .brand-icon {
          width: 40px;
          height: 40px;
          background: #6750a4;
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
          color: #49454f;
          padding: 6px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
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
          letter-spacing:0.5px; color: #49454f;
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
          color: #49454f; font-weight:500; font-size:14px;
          transition: background 0.2s cubic-bezier(0.2, 0, 0, 1), color 0.2s;
          white-space: nowrap;
          justify-content: ${isCollapsed ? 'center' : 'flex-start'};
        }
        .nav-item:hover { 
          background:rgba(103,80,164,0.08); 
          color: #1c1b1f; 
        }
        .nav-item.active { 
          background: #e8def8;
          color: #6750a4;
          font-weight:600; 
        }
        .nav-item .nav-icon { flex-shrink:0; opacity:0.7; }
        .nav-item.active .nav-icon { opacity:1; }
        
        .nav-item .nav-badge {
          display: ${isCollapsed ? 'none' : 'flex'};
          background: #6750a4;
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
        }
        
        .admin-content {
          padding: 24px 32px 40px 32px;
          max-width: 1440px;
          width: 100%;
          margin: 0 auto;
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
                width: 40, height: 40, background: '#6750a4', borderRadius: 12, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 
              }}>
                <Scale size={24} />
              </div>
            )}
            <button className="collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)} title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
          
          <nav className="admin-sidebar-nav">
            <div className="nav-section">
              {!isCollapsed && <span className="nav-label">Main</span>}
              <NavLink to="/admin" end className="nav-item" title={isCollapsed ? "Dashboard" : ""}>
                <LayoutDashboard size={22} className="nav-icon" />
                {!isCollapsed && <span>Dashboard</span>}
                <span className="nav-badge">24</span>
              </NavLink>
              <NavLink to="/admin/land-acquisition" className="nav-item" title={isCollapsed ? "Cases" : ""}>
                <Map size={22} className="nav-icon" />
                {!isCollapsed && <span>Cases</span>}
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
                <div className="nav-label" onClick={() => setFinanceExpanded(!financeExpanded)}>
                  <span>Finance & Ledger</span>
                  {financeExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              )}
              {isCollapsed && <div style={{ height: 16 }} />}
              {(financeExpanded || isCollapsed) && (
                <>
                  <NavLink to="/admin/payments" className="nav-item" title={isCollapsed ? "Payments" : ""}>
                    <CreditCard size={22} className="nav-icon" />
                    {!isCollapsed && <span>Payments</span>}
                  </NavLink>
                  <NavLink to="/admin/blockchain" className="nav-item" title={isCollapsed ? "Blockchain" : ""}>
                    <LinkIcon size={22} className="nav-icon" />
                    {!isCollapsed && <span>Blockchain</span>}
                  </NavLink>
                </>
              )}
            </div>

            <div className="nav-section">
              {!isCollapsed && <span className="nav-label">Compensation</span>}
              <NavLink to="/admin/compensation" className="nav-item" title={isCollapsed ? "Compensation" : ""}>
                <Map size={22} className="nav-icon" />
                {!isCollapsed && <span>Compensation</span>}
                <span className="nav-badge">12</span>
              </NavLink>
              <NavLink to="/admin/reports" className="nav-item" title={isCollapsed ? "Reports" : ""}>
                <PieChart size={22} className="nav-icon" />
                {!isCollapsed && <span>Reports</span>}
              </NavLink>
            </div>

            <div className="nav-section">
              {!isCollapsed && <span className="nav-label">System</span>}
              <NavLink to="/admin/settings" className="nav-item" title={isCollapsed ? "Settings" : ""}>
                <Settings size={22} className="nav-icon" />
                {!isCollapsed && <span>Settings</span>}
              </NavLink>
              <NavLink to="/admin/users" className="nav-item" title={isCollapsed ? "Users" : ""}>
                <Users size={22} className="nav-icon" />
                {!isCollapsed && <span>Users</span>}
              </NavLink>
            </div>
          </nav>
        </aside>

        <main className="admin-main">
          <div className="admin-content">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
};
