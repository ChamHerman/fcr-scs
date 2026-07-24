import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  CircleDollarSign,
  Search,
  Download,
  FileText,
  Plus,
  Calendar
} from 'lucide-react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export const CaseManagement: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Static data – replace with your own state later
  const stats = [
    { label: 'Total Cases', value: '347', change: '↑ 12% from last month', icon: <Briefcase size={28} />, trend: 'up' },
    { label: 'Active', value: '184', change: '↓ 3% from last month', icon: <Clock size={28} />, trend: 'down' },
    { label: 'Completed', value: '128', change: '↑ 8% from last month', icon: <CheckCircle2 size={28} />, trend: 'up' },
    { label: 'Pending Action', value: '35', change: '↑ 5% from last month', icon: <AlertCircle size={28} />, trend: 'down' },
    { label: 'Total Compensation', value: 'RM 42.6M', change: '↑ 6% from last month', icon: <CircleDollarSign size={28} />, trend: 'up' },
  ];

  const cases = [
    { id: 'LAC-2026-07-0024', title: 'Kampung Baru Land Acquisition', status: 'Case Registered', statusClass: 'registered', date: '24 Jul 2026', project: 'KL Sentral Redevelopment', landTitle: 'PN 12345', valuer: '—' },
    { id: 'LAC-2026-07-0023', title: 'Taman Mewah Phase 2', status: 'Valuer Assigned', statusClass: 'valuation', date: '23 Jul 2026', project: 'Transportation Development', landTitle: 'PN 12344', valuer: 'Azmi & Co.' },
    { id: 'LAC-2026-07-0022', title: 'Kampung Sungai Pinang', status: 'Pending Compensation Approval', statusClass: 'pending', date: '22 Jul 2026', project: 'Public Amenities', landTitle: 'PN 12343', valuer: 'Valuer Rina' },
    { id: 'LAC-2026-07-0021', title: 'Desa Harmoni Relocation', status: 'Compensation Approved', statusClass: 'approved', date: '21 Jul 2026', project: 'Urban Redevelopment', landTitle: 'PN 12342', valuer: 'Valuer Rina' },
    { id: 'LAC-2026-07-0020', title: 'Taman Mutiara Extension', status: 'Offer Issued', statusClass: 'offer', date: '20 Jul 2026', project: 'Tourism Development', landTitle: 'PN 12341', valuer: 'Azmi & Co.' },
    { id: 'LAC-2026-07-0019', title: 'Kampung Melayu Acquisition', status: 'Payment In Progress', statusClass: 'payment', date: '19 Jul 2026', project: 'Transportation Development', landTitle: 'PN 12340', valuer: 'Valuer Rina' },
    { id: 'LAC-2026-07-0018', title: 'Bukit Indah Land Parcel', status: 'Valuation Rejected', statusClass: 'rejected', date: '18 Jul 2026', project: 'Urban Redevelopment', landTitle: 'PN 12339', valuer: 'Azmi & Co.' },
    { id: 'LAC-2026-07-0017', title: 'Kampung Tengah Relocation', status: 'Case Closed', statusClass: 'closed', date: '17 Jul 2026', project: 'Public Amenities', landTitle: 'PN 12338', valuer: 'Valuer Rina' },
    { id: 'LAC-2026-07-0016', title: 'Taman Sari Acquisition', status: 'Valuation In Progress', statusClass: 'valuation', date: '16 Jul 2026', project: 'Tourism Development', landTitle: 'PN 12337', valuer: 'Azmi & Co.' },
    { id: 'LAC-2026-07-0015', title: 'Kampung Seri Damai', status: 'Pending Valuation Approval', statusClass: 'pending', date: '15 Jul 2026', project: 'Transportation Development', landTitle: 'PN 12336', valuer: 'Valuer Rina' },
  ];

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add(
      {
        reduceMotion: "(prefers-reduced-motion: reduce)",
        all: "(min-width: 0px)"
      },
      (context) => {
        const { reduceMotion } = context.conditions as { reduceMotion: boolean };
        if (reduceMotion) return;

        // Animate stats cards with stagger
        gsap.fromTo(
          '.stat-card',
          { y: 30, autoAlpha: 0 },
          {
            scrollTrigger: {
              trigger: '.stats-grid',
              start: 'top 90%',
            },
            y: 0,
            autoAlpha: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power3.out',
          }
        );

        // Animate table rows with stagger
        gsap.fromTo(
          '.case-row',
          { x: -20, autoAlpha: 0 },
          {
            scrollTrigger: {
              trigger: '.table-wrap',
              start: 'top 85%',
            },
            x: 0,
            autoAlpha: 1,
            duration: 0.5,
            stagger: 0.08,
            ease: 'power3.out',
          }
        );
      }
    );
  }, { scope: containerRef });

  return (
    <>
      <style>{`
        /* Removed .sidebar styles */
        .main { flex:1; padding:24px 32px 40px 32px; max-width:1440px; overflow-y:auto; }

        .topbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:28px; flex-wrap:wrap; gap:12px; }
        .topbar-left h1 { font-size:26px; font-weight:700; letter-spacing:-0.4px; }
        .topbar-left .sub { font-size:14px; color:var(--md-on-surface-variant); margin-top:2px; }
        .topbar-right { display:flex; align-items:center; gap:16px; }
        .topbar-right .date-badge {
          background:var(--md-surface-container); padding:8px 16px;
          border-radius:var(--radius-full); font-size:13px; font-weight:500;
          color:var(--md-on-surface-variant); display:flex; align-items:center; gap:6px;
        }
        .topbar-right .avatar {
          width:40px; height:40px; border-radius:var(--radius-full);
          background:var(--md-primary); color:white; display:flex; align-items:center;
          justify-content:center; font-weight:600; font-size:16px;
        }

        .stats-grid {
          display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr));
          gap:16px; margin-bottom:28px;
        }
        .stat-card {
          background:var(--md-surface-container); border-radius:var(--radius-lg);
          padding:18px 20px 20px 20px; box-shadow:var(--shadow-sm);
          transition: box-shadow 0.3s var(--ease-emphasized), transform 0.2s var(--ease-bouncy);
        }
        .stat-card:hover { box-shadow:var(--shadow-md); transform:scale(1.01); }
        .stat-card .stat-label { font-size:13px; font-weight:500; color:var(--md-on-surface-variant); letter-spacing:0.2px; }
        .stat-card .stat-number { font-size:30px; font-weight:700; margin-top:4px; letter-spacing:-0.5px; }
        .stat-card .stat-change {
          font-size:12px; font-weight:600; margin-top:6px; display:inline-flex;
          align-items:center; gap:4px; padding:2px 10px 2px 6px; border-radius:var(--radius-full);
          background:var(--md-success); color:var(--md-success-text);
        }
        .stat-card .stat-change.negative { background:var(--md-error); color:var(--md-error-text); }
        .stat-card .stat-icon { float:right; opacity:0.2; color: inherit; }

        .filter-bar {
          background:var(--md-surface-container); border-radius:var(--radius-lg);
          padding:16px 20px; display:flex; flex-wrap:wrap; align-items:center;
          gap:12px 16px; margin-bottom:24px; box-shadow:var(--shadow-sm);
        }
        .filter-bar .search-wrap { flex:1; min-width:200px; position:relative; }
        .filter-bar .search-wrap input {
          width:100%; padding:10px 16px 10px 42px; border-radius:var(--radius-full);
          border:1.5px solid rgba(121,116,126,0.25); background:var(--md-surface-container-low);
          font-size:14px; font-family:inherit; transition: border 0.2s, box-shadow 0.2s; outline:none;
        }
        .filter-bar .search-wrap input:focus { border-color:var(--md-primary); box-shadow:0 0 0 3px rgba(103,80,164,0.15); }
        .filter-bar .search-wrap .search-icon {
          position:absolute; left:14px; top:50%; transform:translateY(-50%);
          opacity:0.5; display:flex; align-items:center; justify-content:center;
        }
        .filter-bar .filter-group { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
        .filter-bar .filter-group select {
          padding:9px 32px 9px 16px; border-radius:var(--radius-full);
          border:1.5px solid rgba(121,116,126,0.25); background:var(--md-surface-container-low) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2349454f' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 14px center;
          background-size:12px 8px; font-size:13px; font-family:inherit; color:var(--md-on-surface);
          appearance:none; cursor:pointer; transition:border 0.2s; outline:none; min-width:130px;
        }
        .filter-bar .filter-group select:focus { border-color:var(--md-primary); box-shadow:0 0 0 3px rgba(103,80,164,0.12); }
        .filter-bar .filter-group .btn-filter {
          padding:9px 20px; border-radius:var(--radius-full); border:none;
          background:var(--md-primary); color:white; font-weight:600; font-size:13px;
          font-family:inherit; cursor:pointer; transition: transform 0.15s var(--ease-bouncy), box-shadow 0.2s;
          box-shadow:var(--shadow-sm);
        }
        .filter-bar .filter-group .btn-filter:hover { transform:scale(1.03); box-shadow:var(--shadow-md); }
        .filter-bar .filter-group .btn-filter:active { transform:scale(0.95); }
        .filter-bar .filter-group .btn-clear {
          padding:9px 16px; border-radius:var(--radius-full);
          border:1.5px solid rgba(121,116,126,0.25); background:transparent;
          color:var(--md-on-surface-variant); font-weight:500; font-size:13px;
          font-family:inherit; cursor:pointer; transition: background 0.2s, transform 0.15s var(--ease-bouncy);
        }
        .filter-bar .filter-group .btn-clear:hover { background:rgba(0,0,0,0.04); transform:scale(1.02); }

        .action-bar { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px; }
        .action-bar .left { display:flex; align-items:center; gap:12px; font-size:14px; color:var(--md-on-surface-variant); }
        .action-bar .left .count { font-weight:600; color:var(--md-on-surface); }
        .action-bar .right { display:flex; align-items:center; gap:10px; }
        .action-bar .right .btn-outline {
          padding:8px 18px; border-radius:var(--radius-full); border:1.5px solid rgba(121,116,126,0.25);
          background:transparent; font-size:13px; font-weight:500; font-family:inherit;
          color:var(--md-on-surface-variant); cursor:pointer;
          transition: background 0.2s, transform 0.15s var(--ease-bouncy);
          display:flex; align-items:center; gap:6px;
        }
        .action-bar .right .btn-outline:hover { background:rgba(0,0,0,0.04); transform:scale(1.02); }
        .action-bar .right .btn-primary {
          padding:8px 22px; border-radius:var(--radius-full); border:none;
          background:var(--md-primary); color:white; font-weight:600; font-size:13px;
          font-family:inherit; cursor:pointer; transition: transform 0.15s var(--ease-bouncy), box-shadow 0.2s;
          box-shadow:var(--shadow-sm); display:flex; align-items:center; gap:6px;
        }
        .action-bar .right .btn-primary:hover { transform:scale(1.03); box-shadow:var(--shadow-md); }
        .action-bar .right .btn-primary:active { transform:scale(0.95); }

        .table-wrap {
          background:var(--md-surface-container); border-radius:var(--radius-lg);
          overflow:hidden; box-shadow:var(--shadow-sm);
          transition: box-shadow 0.3s var(--ease-emphasized);
        }
        .table-wrap:hover { box-shadow:var(--shadow-md); }
        .table-scroll { overflow-x:auto; padding:4px 0; }
        table { width:100%; border-collapse:collapse; font-size:14px; }
        table thead { background:rgba(103,80,164,0.04); border-bottom:1px solid rgba(121,116,126,0.12); }
        table th {
          text-align:left; padding:14px 18px; font-weight:600; font-size:12px;
          text-transform:uppercase; letter-spacing:0.4px; color:var(--md-on-surface-variant);
          white-space:nowrap;
        }
        table td { padding:14px 18px; border-bottom:1px solid rgba(121,116,126,0.06); vertical-align:middle; }
        table tbody tr { transition:background 0.15s; }
        table tbody tr:hover { background:rgba(103,80,164,0.04); }
        table tbody tr:last-child td { border-bottom:none; }

        .case-id { font-weight:600; color:var(--md-primary); font-size:13px; letter-spacing:-0.2px; cursor:pointer; }
        .case-id:hover { text-decoration:underline; }
        .case-title { font-weight:500; max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        .status-badge {
          display:inline-flex; align-items:center; gap:6px; padding:4px 14px 4px 10px;
          border-radius:var(--radius-full); font-size:12px; font-weight:600; white-space:nowrap;
        }
        .status-badge .dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .status-badge.registered { background:#e3f2fd; color:#0b5b8c; }
        .status-badge.registered .dot { background:#0b5b8c; }
        .status-badge.valuation { background:#fff3e0; color:#a8600b; }
        .status-badge.valuation .dot { background:#a8600b; }
        .status-badge.approved { background:#e6f4ea; color:#1e7b4a; }
        .status-badge.approved .dot { background:#1e7b4a; }
        .status-badge.rejected { background:#fce8e6; color:#b3261e; }
        .status-badge.rejected .dot { background:#b3261e; }
        .status-badge.pending { background:#fef7e0; color:#8d6e00; }
        .status-badge.pending .dot { background:#8d6e00; }
        .status-badge.closed { background:#e8e0ec; color:#49454f; }
        .status-badge.closed .dot { background:#49454f; }
        .status-badge.offer { background:#e8def8; color:#4d3a7a; }
        .status-badge.offer .dot { background:#4d3a7a; }
        .status-badge.payment { background:#d9f0fc; color:#0b5b8c; }
        .status-badge.payment .dot { background:#0b5b8c; }

        .meta-text { font-size:13px; color:var(--md-on-surface-variant); }
        .meta-text .highlight { font-weight:500; color:var(--md-on-surface); }

        .pagination {
          display:flex; justify-content:space-between; align-items:center;
          padding:16px 20px 18px 20px; border-top:1px solid rgba(121,116,126,0.10);
          flex-wrap:wrap; gap:12px;
        }
        .pagination .info { font-size:13px; color:var(--md-on-surface-variant); }
        .pagination .pages { display:flex; gap:4px; }
        .pagination .pages button {
          width:36px; height:36px; border-radius:var(--radius-full); border:none;
          background:transparent; font-weight:500; font-size:14px; font-family:inherit;
          color:var(--md-on-surface-variant); cursor:pointer;
          transition: background 0.15s, transform 0.15s var(--ease-bouncy);
        }
        .pagination .pages button:hover { background:rgba(0,0,0,0.05); transform:scale(1.05); }
        .pagination .pages button.active { background:var(--md-primary); color:white; box-shadow:var(--shadow-sm); }
        .pagination .pages button:active { transform:scale(0.92); }

        .blur-shape-bg { position:relative; overflow:hidden; min-height: 100vh; }
        .blur-shape-bg::before {
          content:''; position:absolute; width:500px; height:500px; border-radius:50%;
          background:rgba(103,80,164,0.06); filter:blur(80px); top:-200px; right:-200px;
          pointer-events:none; z-index:0;
        }
        .blur-shape-bg > * { position:relative; z-index:1; }

        @media (max-width:1024px) {
          .main { padding:20px 20px 32px 20px; }
        }
        @media (max-width:768px) {
          .main { padding:16px; }
          .topbar-left h1 { font-size:22px; }
          .stats-grid { grid-template-columns:repeat(2,1fr); }
          .filter-bar { padding:14px 16px; flex-direction:column; align-items:stretch; }
          .filter-bar .filter-group { flex-wrap:wrap; }
          .filter-bar .filter-group select { flex:1; min-width:100px; }
          .action-bar { flex-direction:column; align-items:stretch; }
          .action-bar .right { flex-wrap:wrap; }
          table { font-size:13px; }
          table th, table td { padding:10px 12px; }
        }
        @media (max-width:480px) {
          .stats-grid { grid-template-columns:1fr 1fr; gap:10px; }
          .stat-card .stat-number { font-size:24px; }
          .topbar { flex-direction:column; align-items:flex-start; }
          .topbar-right { width:100%; justify-content:space-between; }
        }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(121,116,126,0.3); border-radius:10px; }
        ::-webkit-scrollbar-thumb:hover { background:rgba(121,116,126,0.5); }
      `}</style>

      <div ref={containerRef} className="main blur-shape-bg">
        {/* Top Bar */}
        <div className="topbar">
          <div className="topbar-left">
            <h1>Case Management</h1>
            <div className="sub">Monitor and manage all land acquisition cases</div>
          </div>
          <div className="topbar-right">
            <span className="date-badge"><Calendar size={16} /> 24 Jul 2026</span>
            <div className="avatar">AO</div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          {stats.map((stat, idx) => (
            <div className="stat-card" key={idx}>
              <span className="stat-icon">{stat.icon}</span>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-number">{stat.value}</div>
              <span className={`stat-change ${stat.trend === 'down' ? 'negative' : ''}`}>
                {stat.change}
              </span>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="search-wrap">
            <span className="search-icon"><Search size={18} /></span>
            <input type="text" placeholder="Search by case ID, title, owner, project…" defaultValue="LAC-2026" />
          </div>
          <div className="filter-group">
            <select>
              <option value="">All Status</option>
              <option>Case Registered</option>
              <option>Valuer Assigned</option>
              <option>Valuation In Progress</option>
              <option>Pending Valuation Approval</option>
              <option>Valuation Approved</option>
              <option>Valuation Rejected</option>
              <option>Pending Compensation Approval</option>
              <option>Compensation Approved</option>
              <option>Compensation Rejected</option>
              <option>Offer Issued</option>
              <option>Offer Rejected</option>
              <option>Payment In Progress</option>
              <option>Payment Completed</option>
              <option>Case Closed</option>
            </select>
            <select>
              <option value="">All Project Types</option>
              <option>Public Amenities</option>
              <option>Transportation Development</option>
              <option>Urban Redevelopment</option>
              <option>Tourism Development</option>
              <option>Others</option>
            </select>
            <select>
              <option value="">Date Range</option>
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>Last 3 Months</option>
              <option>Custom</option>
            </select>
            <button className="btn-filter">Apply Filters</button>
            <button className="btn-clear">Clear</button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="action-bar">
          <div className="left">
            <span className="count">24</span> cases found
            <span style={{ opacity: 0.4, margin: '0 4px' }}>·</span>
            <span style={{ fontSize: '13px' }}>Showing 1–10 of 24</span>
          </div>
          <div className="right">
            <button className="btn-outline"><Download size={16} /> Export CSV</button>
            <button className="btn-outline"><FileText size={16} /> Export PDF</button>
            <button className="btn-primary"><Plus size={16} /> New Case</button>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Case Title</th>
                  <th>Status</th>
                  <th>Registration Date</th>
                  <th>Project Name</th>
                  <th>Land Title No.</th>
                  <th>Assigned Valuer</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c, idx) => (
                  <tr key={idx} className="case-row">
                    <td><span className="case-id">{c.id}</span></td>
                    <td className="case-title">{c.title}</td>
                    <td><span className={`status-badge ${c.statusClass}`}><span className="dot"></span> {c.status}</span></td>
                    <td><span className="meta-text">{c.date}</span></td>
                    <td><span className="meta-text">{c.project}</span></td>
                    <td><span className="meta-text">{c.landTitle}</span></td>
                    <td><span className="meta-text"><strong>{c.valuer}</strong></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <div className="info">Showing <strong>1–10</strong> of <strong>24</strong> cases</div>
            <div className="pages">
              <button>‹</button>
              <button className="active">1</button>
              <button>2</button>
              <button>3</button>
              <button>›</button>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--md-on-surface-variant)', opacity: 0.6, textAlign: 'center', borderTop: '1px solid rgba(121,116,126,0.08)', paddingTop: '18px' }}>
          FCR-SCS · Case Management Module · All data is for demonstration purposes.
        </div>
      </div>
    </>
  );
};