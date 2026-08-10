import React, { useState } from 'react';
import { MD3Card, MD3Button, MD3Input } from '../MD3Components';
import { Search, Filter, Shield, Eye, EyeOff, MoreVertical } from 'lucide-react';

export const UserAdministration: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);

  const [unmaskedId, setUnmaskedId] = useState<number | null>(null);

  const toggleMask = (id: number) => {
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
        <MD3Button icon={<Shield size={18} />}>
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
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-md-secondary-container text-md-on-secondary-container">
                      {user.role}
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
    </div>
  );
};

export default UserAdministration;
