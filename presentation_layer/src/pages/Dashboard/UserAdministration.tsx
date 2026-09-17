import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MD3Button, MD3Input } from '../MD3Components';
import { Select, type SelectOption } from '../../components/ui/Select';
import { IdentificationInput } from '../../components/ui/IdentificationInput';
import { Modal } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/SearchInput';
import { Pagination } from '../../components/ui/Pagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { Search, Shield, MoreVertical, CheckCircle, Users, UserCheck, UserX, UserCog, ChevronLeft, ChevronRight, ArrowUpDown, Sparkles, KeyRound, Info } from 'lucide-react';
import { resolveMalaysianIdentity, parseRawIc, type MalaysianIdentity } from '../../utils/malaysianIdentity';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import '../LandAcquisition/case_management.css';

export const UserAdministration: React.FC = () => {
  useDocumentTitle('User Administration');
  const navigate = useNavigate();

  const ROLE_OPTIONS: SelectOption[] = [
    { value: '', label: 'All Roles' },
    { value: 'SYSTEM_ADMINISTRATOR', label: 'System Administrator' },
    { value: 'GOVERNMENT_ADMINISTRATOR', label: 'Government Administrator' },
    { value: 'GOVERNMENT_OFFICER', label: 'Government Officer' },
    { value: 'LAND_VALUER', label: 'Land Valuer' },
    { value: 'DISPLACED_COMMUNITY_MEMBER', label: 'Displaced Community Member' },
  ];

  const STATUS_OPTIONS: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const roleFormatMap: Record<string, string> = {
    SYSTEM_ADMINISTRATOR: 'System Administrator',
    GOVERNMENT_ADMINISTRATOR: 'Government Administrator',
    GOVERNMENT_OFFICER: 'Government Officer',
    LAND_VALUER: 'Land Valuer',
    DISPLACED_COMMUNITY_MEMBER: 'Displaced Community Member',
  };

  const formatRole = (role: string) => roleFormatMap[role] || role;

  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pagination & Filtering & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const itemsPerPage = 10;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    identificationNumber: '',
    address: '',
    role: 'GOVERNMENT_OFFICER'
  });
  const [identityInfo, setIdentityInfo] = useState<MalaysianIdentity | null>(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Auto-resolve fixed name and state-accurate address when 12-digit Malaysian IC is entered
  useEffect(() => {
    const rawDigits = parseRawIc(formData.identificationNumber);
    if (rawDigits.length === 12) {
      const identity = resolveMalaysianIdentity(rawDigits);
      setIdentityInfo(identity);
      setFormData(prev => ({
        ...prev,
        name: identity.name,
        address: identity.address
      }));
    } else {
      setIdentityInfo(null);
    }
  }, [formData.identificationNumber]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:3030/api/users');
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch users', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    try {
      const res = await fetch('http://localhost:3030/api/users/admin-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      
      if (res.ok && json.success) {
        setFormSuccess('User created successfully with default password "Password$123"!');
        setFormData({ name: '', email: '', contactNumber: '', identificationNumber: '', address: '', role: 'GOVERNMENT_OFFICER' });
        setIdentityInfo(null);
        fetchUsers();
        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess('');
        }, 1500);
      } else {
        setFormError(json.error || 'Failed to create user');
      }
    } catch (e) {
      setFormError('Network error occurred while creating user');
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    let result = users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (u.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (u.identificationNumber || '').includes(searchQuery) ||
                            (u.address || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter ? u.role === roleFilter : true;
      const matchesStatus = statusFilter ? u.status === statusFilter : true;
      return matchesSearch && matchesRole && matchesStatus;
    });

    result.sort((a, b) => {
      const compareResult = a.name.localeCompare(b.name);
      return sortOrder === 'asc' ? compareResult : -compareResult;
    });

    return result;
  }, [users, searchQuery, roleFilter, statusFilter, sortOrder]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedUsers.slice(start, start + itemsPerPage);
  }, [filteredAndSortedUsers, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage) || 1;

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(u => u.status === 'Active').length,
      inactive: users.filter(u => u.status === 'Inactive').length,
      admins: users.filter(u => u.role === 'SYSTEM_ADMINISTRATOR').length,
    };
  }, [users]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter, sortOrder]);

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="main blur-shape-bg">
      <PageHeader
        title="User Administration"
        subtitle="Search, filter, and manage system user accounts."
      />

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <Users className="stat-icon text-md-primary" size={32} />
          <div className="stat-label">Total Users</div>
          <div className="stat-number">{users.length}</div>
        </div>

        <div className="stat-card">
          <UserCheck className="stat-icon text-green-700 dark:text-green-500" size={32} />
          <div className="stat-label">Active Users</div>
          <div className="stat-number">{users.filter(u => u.status === 'Active').length}</div>
        </div>

        <div className="stat-card">
          <UserX className="stat-icon text-md-error" size={32} />
          <div className="stat-label">Inactive Users</div>
          <div className="stat-number">{users.filter(u => u.status === 'Inactive').length}</div>
        </div>

        <div className="stat-card">
          <UserCog className="stat-icon text-md-secondary" size={32} />
          <div className="stat-label">System Admins</div>
          <div className="stat-number">{users.filter(u => u.role === 'SYSTEM_ADMINISTRATOR').length}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <SearchInput 
          placeholder="Search by name, email or IC..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="filter-group">
          <Select 
            label="Role Filter" 
            options={ROLE_OPTIONS} 
            value={roleFilter}
            onChange={(val) => setRoleFilter(val)}
            wrapLabels
          />
          <Select 
            label="Status Filter" 
            options={STATUS_OPTIONS} 
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
          />
          <MD3Button
            variant="outlined"
            className="h-10 px-4"
            onClick={() => {
              setRoleFilter('');
              setStatusFilter('');
              setSearchQuery('');
              setCurrentPage(1);
            }}
          >
            Clear
          </MD3Button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="action-bar">
        <div className="left">
          <span className="count">{filteredAndSortedUsers.length}</span> users found
          <span style={{ opacity: 0.4, margin: "0 4px" }}>·</span>
          <span style={{ fontSize: "13px" }}>
            Showing {filteredAndSortedUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–
            {Math.min(currentPage * itemsPerPage, filteredAndSortedUsers.length)} of {filteredAndSortedUsers.length}
          </span>
        </div>

        <div className="right">
          <MD3Button icon={<Shield size={18} />} onClick={() => setIsModalOpen(true)}>
            Add New User
          </MD3Button>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <div className="table-scroll md-scroll-thin">
          <table className="w-full table-fixed">
            <thead>
              <tr>
                <th 
                  style={{ width: "20%" }} 
                  className="cursor-pointer select-none"
                  onClick={toggleSort}
                >
                  <div className="flex items-center gap-1">
                    User Name
                    <ArrowUpDown size={14} className="opacity-50" />
                  </div>
                </th>
                <th style={{ width: "26%" }}>Role</th>
                <th style={{ width: "14%" }}>IC Number</th>
                <th style={{ width: "14%" }}>Contact No</th>
                <th style={{ width: "16%" }}>Email Address</th>
                <th style={{ width: "10%" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--md-on-surface-variant)" }}>
                    Loading...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "36px", color: "var(--md-on-surface-variant)", opacity: 0.7 }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className="case-row row-clickable"
                    onClick={() => navigate(`/admin/users/details/${user.id}`)}
                  >
                    <td className="truncate font-medium">
                      <div>{user.name}</div>
                      {user.id && (
                        <div className="text-[11px] font-mono text-md-primary font-semibold opacity-90">{user.id}</div>
                      )}
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-md-secondary-container text-md-on-secondary-container whitespace-nowrap">
                        {formatRole(user.role)}
                      </span>
                    </td>
                    <td className="truncate">
                      <div className="font-mono">{user.identificationNumber || '-'}</div>
                      {user.address && (
                        <div className="text-[11px] text-md-on-surface-variant/70 truncate max-w-[190px]" title={user.address}>
                          {user.address}
                        </div>
                      )}
                    </td>
                    <td className="truncate">
                      {user.contactNumber || '-'}
                    </td>
                    <td className="truncate min-w-0" title={user.email}>
                      {user.email}
                    </td>
                    <td>
                      <div className="flex items-center">
                        <span className={`status-badge ${user.status === 'Active' ? 'status-valuation-approved' : 'status-valuation-rejected'}`}>
                          <span className="dot"></span> {user.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div style={{ padding: '0 16px 16px' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={filteredAndSortedUsers.length}
            pageSize={itemsPerPage}
            onPageChange={setCurrentPage}
            itemLabel="entries"
          />
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setIdentityInfo(null);
        }}
        title="Add New User"
        footer={
          <div className="flex gap-3">
            <MD3Button variant="text" onClick={() => {
              setIsModalOpen(false);
              setIdentityInfo(null);
            }}>
              Cancel
            </MD3Button>
            <MD3Button form="addUserForm" type="submit">
              Create User
            </MD3Button>
          </div>
        }
      >
        <div className="pt-2">
          {formError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center">
              <Shield size={16} className="mr-2 flex-shrink-0" />
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="mb-4 p-3 bg-md-success/10 border border-md-success/20 text-md-success rounded-xl text-sm flex items-center">
              <CheckCircle size={16} className="mr-2 flex-shrink-0" />
              {formSuccess}
            </div>
          )}
          
          <form id="addUserForm" onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <IdentificationInput 
                label="Identification Number (IC) *" 
                value={formData.identificationNumber}
                onChange={(e) => setFormData({...formData, identificationNumber: e.target.value})}
                placeholder="900101-14-5532"
              />
              {identityInfo?.isValid ? (
                <div className="mt-2 p-2.5 rounded-xl bg-md-primary/10 border border-md-primary/20 text-md-primary text-xs flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={14} className="flex-shrink-0 text-md-primary" />
                    <span>Verified: <strong>{identityInfo.state}</strong> • <strong>{identityInfo.gender}</strong> • Born {identityInfo.dateOfBirth}</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-md-primary/20 text-md-primary px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Sparkles size={10} /> Auto-filled
                  </span>
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-md-on-surface-variant/70 pl-1">
                  Enter 12-digit IC to auto-resolve verified name and residential address.
                </div>
              )}
            </div>

            <MD3Input 
              label="Full Name (Locked to IC) *" 
              required 
              value={formData.name} 
              readOnly 
              placeholder="Auto-populated from IC"
            />
            <MD3Input 
              label="Residential Address (Locked to IC) *" 
              required 
              value={formData.address} 
              readOnly 
              placeholder="Auto-populated from IC"
            />
            <MD3Input 
              label="Email Address *" 
              type="email" 
              required 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />

            {/* Temporary password notice container placed below email input */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
              <KeyRound size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span>A secure temporary password will be auto-generated and emailed to this address. The user will be required to set a permanent password on first login.</span>
              </div>
            </div>

            <MD3Input 
              label="Contact Number *" 
              required 
              value={formData.contactNumber}
              onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
              placeholder="0123456789"
            />
            
            <div className="flex flex-col gap-1.5 mt-2 z-10 relative">
              <Select
                label="Assigned Role"
                value={formData.role}
                options={ROLE_OPTIONS.filter(o => o.value !== '' && o.value !== 'SYSTEM_ADMINISTRATOR')}
                onChange={(val) => setFormData({...formData, role: val})}
              />
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default UserAdministration;
