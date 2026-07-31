import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, FileText, Clock, PlusCircle, Search } from 'lucide-react';
import '../../style.css';
import '../LandAcquisition/case_management.css';
import './reports.css';

const STATES: Record<string, string[]> = {
  Johor: ['Batu Pahat', 'Johor Bahru', 'Kluang', 'Kota Tinggi', 'Kulai', 'Mersing', 'Muar', 'Pontian', 'Segamat', 'Tangkak'],
  Kedah: ['Baling', 'Bandar Baharu', 'Kota Setar', 'Kuala Muda', 'Kubang Pasu', 'Kulim', 'Langkawi', 'Padang Terap', 'Pendang', 'Pokok Sena', 'Sik', 'Yan'],
  Kelantan: ['Bachok', 'Gua Musang', 'Jeli', 'Kota Bharu', 'Kuala Krai', 'Machang', 'Pasir Mas', 'Pasir Puteh', 'Tanah Merah', 'Tumpat'],
  Melaka: ['Alor Gajah', 'Melaka Tengah', 'Jasin'],
  'Negeri Sembilan': ['Jelebu', 'Jempol', 'Kuala Pilah', 'Port Dickson', 'Rembau', 'Seremban', 'Tampin'],
  Pahang: ['Bentong', 'Bera', 'Cameron Highlands', 'Jerantut', 'Kuantan', 'Lipis', 'Maran', 'Pekan', 'Raub', 'Rompin', 'Temerloh'],
  Penang: ['Seberang Perai Utara', 'Seberang Perai Tengah', 'Seberang Perai Selatan', 'Timur Laut', 'Barat Daya'],
  Perak: ['Bagan Datuk', 'Batang Padang', 'Hilir Perak', 'Hulu Perak', 'Kampar', 'Kerian', 'Kinta', 'Kuala Kangsar', 'Larut, Matang dan Selama', 'Manjung', 'Muallim', 'Perak Tengah'],
  Perlis: ['Arau', 'Kangar', 'Padang Besar'],
  Sabah: ['Beaufort', 'Beluran', 'Kalabakan', 'Keningau', 'Kinabatangan', 'Kota Belud', 'Kota Kinabalu', 'Kota Marudu', 'Kuala Penyu', 'Kudat', 'Kunak', 'Lahad Datu', 'Membakut', 'Nabawan', 'Papar', 'Penampang', 'Pitas', 'Ranau', 'Sandakan', 'Semporna', 'Sipitang', 'Tambunan', 'Tawau', 'Telupid', 'Tenom', 'Tongod', 'Tuaran'],
  Sarawak: ['Asajaya', 'Bau', 'Belaga', 'Beluru', 'Betong', 'Bintulu', 'Dalit', 'Daro', 'Julau', 'Kanowit', 'Kapit', 'Kuching', 'Lawas', 'Limbang', 'Lubok Antu', 'Lundu', 'Marudi', 'Matu', 'Meradong', 'Miri', 'Mukah', 'Pakan', 'Pusa', 'Samarahan', 'Saratok', 'Sarikei', 'Selangau', 'Serian', 'Sibu', 'Simunjan', 'Song', 'Sri Aman', 'Tatau', 'Tebedu', 'Telang Usan'],
  Selangor: ['Gombak', 'Hulu Langat', 'Hulu Selangor', 'Klang', 'Kuala Langat', 'Kuala Selangor', 'Petaling', 'Sabak Bernam', 'Sepang'],
  Terengganu: ['Besut', 'Dungun', 'Hulu Terengganu', 'Kemaman', 'Kuala Nerus', 'Kuala Terengganu', 'Marang', 'Setiu'],
  'Kuala Lumpur': ['Kuala Lumpur'],
  Labuan: ['Labuan'],
  Putrajaya: ['Putrajaya']
};

const REPORT_TYPES = [
  'Compensation Summary Report',
  'Compensation Breakdown Report',
  'Asset Valuation Report',
  'Blockchain Audit Report',
  'Payment Report',
  'Case Status Report',
  'Performance Report',
  'Compliance Report'
];

const REPORT_ROWS = [
  {
    id: 'RPT-1042',
    title: 'Compensation Summary Report',
    location: 'Selangor / Petaling',
    generated: '24 Jul 2026',
    status: 'Completed',
  },
  {
    id: 'RPT-1041',
    title: 'Asset Valuation Report',
    location: 'Johor / Johor Bahru',
    generated: '20 Jul 2026',
    status: 'Pending',
  },
  {
    id: 'RPT-1039',
    title: 'Blockchain Audit Report',
    location: 'Kuala Lumpur / Setiawangsa',
    generated: '18 Jul 2026',
    status: 'Completed',
  },
  {
    id: 'RPT-1038',
    title: 'Payment Report',
    location: 'Penang / Bayan Lepas',
    generated: '15 Jul 2026',
    status: 'Pending',
  },
];

export const ReportsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedState, setSelectedState] = useState('All states');
  const [selectedLocation, setSelectedLocation] = useState('All locations');
  const [reportType, setReportType] = useState('All');

  const locationOptions = selectedState === 'All states' ? ['All locations'] : ['All locations', ...STATES[selectedState]];

  const filteredReports = REPORT_ROWS.filter((report) => {
    const matchesType = reportType === 'All' || report.title === reportType;
    const matchesState = selectedState === 'All states' || report.location.includes(selectedState);
    const matchesLocation = selectedLocation === 'All locations' || report.location === selectedLocation;
    return matchesType && matchesState && matchesLocation;
  });

  return (
    <div className="main">
      <div className="topbar">
        <div className="topbar-left">
          <h1>Reports Dashboard</h1>
          <div className="sub">Quick reporting actions and recent report activity for the compensation workflow.</div>
        </div>
        <div className="topbar-right">
          <div className="date-badge">
            <Clock size={16} className="inline mr-1" style={{ display: 'inline-block', verticalAlign: 'text-bottom' }} /> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <div className="avatar">
            <FileText size={20} />
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Reports</div>
          <div className="stat-number">124</div>
          <div className="stat-change">+18 this month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Schedules</div>
          <div className="stat-number">6</div>
          <div className="stat-change">Needs follow-up</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Last Generated</div>
          <div className="stat-number">28 Jul</div>
          <div className="stat-change">Updated today</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Templates</div>
          <div className="stat-number">9</div>
          <div className="stat-change">Ready for use</div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input placeholder="Search report type or report ID" />
        </div>
        <div className="filter-group">
          <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <option value="All">All report types</option>
            {REPORT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select value={selectedState} onChange={(e) => {
            const nextState = e.target.value;
            setSelectedState(nextState);
            setSelectedLocation('All locations');
          }}>
            <option value="All states">All states</option>
            {Object.keys(STATES).map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
            {locationOptions.map((location) => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
          <button className="btn-filter">Apply Filters</button>
          <button className="btn-clear" onClick={() => {
            setSelectedState('Selangor');
            setSelectedLocation(STATES.Selangor[0]);
            setReportType(REPORT_TYPES[0]);
          }}>Clear</button>
        </div>
      </div>

      <div className="action-bar">
        <div className="left">
          <span className="count">Generated reports</span>
        </div>
        <div className="right">
          <button className="btn-outline" onClick={() => navigate('/admin/reports/schedule')}>Schedule Reports</button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Report type</th>
                <th>State / location</th>
                <th>Generated</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {REPORT_ROWS.map((report) => (
                <tr key={report.id}>
                  <td><span className="case-title">{report.title}</span></td>
                  <td>{report.location}</td>
                  <td>{report.generated}</td>
                  <td><span className={`status-badge ${report.status === 'Completed' ? 'approved' : 'pending'}`}><span className="dot" />{report.status}</span></td>
                  <td>
                    <button className="btn-outline" onClick={() => navigate(`/admin/reports/view/${report.id}`)}>
                      <Eye size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> View report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;
