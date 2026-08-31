import React, { useState, useEffect } from 'react';
import { MD3Card, MD3Button, MD3Input } from '../MD3Components';
import { Select, type SelectOption } from '../../components/ui/Select';
import { IdentificationInput } from '../../components/ui/IdentificationInput';
import { Search, Filter, Shield, Eye, EyeOff, MoreVertical, X, CheckCircle } from 'lucide-react';

export const UserAdministration: React.FC = () => {
  const ROLE_OPTIONS: SelectOption[] = [
    { value: 'GOVERNMENT_ADMINISTRATOR', label: 'Government Administrator' },
    { value: 'GOVERNMENT_OFFICER', label: 'Government Officer' },
    { value: 'LAND_VALUER', label: 'Land Valuer' },
    { value: 'DISPLACED_COMMUNITY_MEMBER', label: 'Displaced Community Member' },
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
  const [unmaskedId, setUnmaskedId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    identificationNumber: '',
    role: 'GOVERNMENT_OFFICER'
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

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
        setFormData({ name: '', email: '', contactNumber: '', identificationNumber: '', role: 'GOVERNMENT_OFFICER' });
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

  const toggleMask = (id: string) => {
    // Simulate privilege check (FR-UMD-026)
    if (unmaskedId === id) {
      setUnmaskedId(null);
    } else {
      const isAuthorized = window.confirm("Authorize unmasking of sensitive data?");
      if (isAuthorized) setUnmaskedId(id);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-medium text-md-on-surface mb-2">User Administration</h1>
          <p className="text-md-on-surface-variant">Search, filter, and manage system user accounts.</p>
        </div>
        <MD3Button icon={<Shield size={18} />} onClick={() => setIsModalOpen(true)}>
          Add New User
        </MD3Button>
      </div>

      <MD3Card elevation={1} className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <MD3Input label="Search users..." className="flex-1" />
          <MD3Input label="Role Filter" className="w-full md:w-64" />
          <MD3Input label="Status" className="w-full md:w-48" />
          <MD3Button variant="tonal" className="h-14" icon={<Search size={18} />}>
            Search
          </MD3Button>
        </div>
      </MD3Card>

      <MD3Card elevation={2} className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-md-outline/30 text-md-on-surface-variant text-sm font-medium">
                <th className="p-4 pl-6">User Name</th>
                <th className="p-4">Role</th>
                <th className="p-4">Sensitive Data (Email)</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-md-outline/10 hover:bg-md-surface-variant/10 transition-colors">
                  <td className="p-4 pl-6 font-medium text-md-on-surface">{user.name}</td>
                  <td className="p-4 text-md-on-surface-variant">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-md-secondary-container text-md-on-secondary-container whitespace-nowrap">
                      {formatRole(user.role)}
                    </span>
                  </td>
                  <td className="p-4 text-md-on-surface-variant flex items-center">
                    {unmaskedId === user.id ? user.sensitive : '••••••@••••.•••'}
                    <button 
                      onClick={() => toggleMask(user.id)}
                      className="ml-3 p-1.5 rounded-full hover:bg-md-surface-variant/20 text-md-primary transition-colors"
                      title="Toggle visibility"
                    >
                      {unmaskedId === user.id ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${user.status === 'Active' ? 'bg-md-success' : 'bg-md-error'}`}></div>
                      <span className="text-sm">{user.status}</span>
                    </div>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <MD3Button variant="text" icon={<MoreVertical size={18} />} className="w-10 h-10 px-0 rounded-full" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MD3Card>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <MD3Card elevation={3} className="w-full max-w-lg p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-md-outline/20">
              <h2 className="text-xl font-medium text-md-on-surface">Add New User</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-md-surface-variant/50 text-md-on-surface-variant transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
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
                <MD3Input 
                  label="Full Name" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
                <MD3Input 
                  label="Email Address" 
                  type="email" 
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
                <MD3Input 
                  label="Contact Number" 
                  required 
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                />
                <IdentificationInput 
                  label="Identification Number (IC) *" 
                  value={formData.identificationNumber}
                  onChange={(e) => setFormData({...formData, identificationNumber: e.target.value})}
                  placeholder="900101-14-5532"
                />
                
                <div className="flex flex-col gap-1.5 mt-2 z-10 relative">
                  <Select
                    label="Assigned Role"
                    value={formData.role}
                    options={ROLE_OPTIONS}
                    onChange={(val) => setFormData({...formData, role: val})}
                  />
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-md-outline/20 bg-md-surface-variant/5 flex justify-end gap-3">
              <MD3Button variant="outlined" onClick={() => setIsModalOpen(false)}>
                Cancel
              </MD3Button>
              <MD3Button form="addUserForm" type="submit">
                Create User
              </MD3Button>
            </div>
          </MD3Card>
        </div>
      )}
    </div>
  );
};

export default UserAdministration;
