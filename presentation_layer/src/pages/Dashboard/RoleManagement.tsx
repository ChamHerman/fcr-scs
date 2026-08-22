import React, { useState, useEffect } from 'react';
import { MD3Card, MD3Button } from '../MD3Components';
import { ADMIN_PAGES, type AdminPageInfo } from '../../constants/pages';
import { Check, Save } from 'lucide-react';

const ROLES = [
  'SYSTEM_ADMINISTRATOR',
  'GOVERNMENT_ADMINISTRATOR',
  'GOVERNMENT_OFFICER',
  'LAND_VALUER',
  'DISPLACED_COMMUNITY_MEMBER'
];

export const RoleManagement: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<string>(ROLES[1]); // Default to first non-sysadmin role
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchPermissions(selectedRole);
  }, [selectedRole]);

  const fetchPermissions = async (role: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3030/api/users/permissions/${role}`);
      if (res.ok) {
        const json = await res.json();
        const permMap: Record<string, boolean> = {};
        
        // Initialize all pages to false unless fetched otherwise
        ADMIN_PAGES.forEach(page => {
          permMap[page.path] = false;
        });

        if (json.success && json.data) {
          json.data.forEach((p: any) => {
            permMap[p.pagePath] = p.canAccess;
          });
        }
        setPermissions(permMap);
      }
    } catch (e) {
      console.error('Failed to fetch permissions', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (path: string) => {
    if (selectedRole === 'SYSTEM_ADMINISTRATOR') return; // Cannot modify system admin
    setPermissions(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleSave = async () => {
    if (selectedRole === 'SYSTEM_ADMINISTRATOR') return;
    
    setLoading(true);
    const payload = Object.keys(permissions).map(path => ({
      pagePath: path,
      canAccess: permissions[path]
    }));

    try {
      const res = await fetch(`http://localhost:3030/api/users/permissions/${selectedRole}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: payload })
      });
      if (res.ok) {
        alert('Permissions saved successfully');
      } else {
        alert('Failed to save permissions');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving permissions');
    } finally {
      setLoading(false);
    }
  };

  const groupedPages = ADMIN_PAGES.reduce((acc, page) => {
    if (!acc[page.category]) acc[page.category] = [];
    acc[page.category].push(page);
    return acc;
  }, {} as Record<string, AdminPageInfo[]>);

  const isSysAdmin = selectedRole === 'SYSTEM_ADMINISTRATOR';

  return (
    <MD3Card elevation={1} className="mt-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-xl font-medium text-md-on-surface">Role Permissions</h2>
          <p className="text-md-on-surface-variant text-sm mt-1">Manage page-level access for each system role.</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-4">
          <select 
            className="h-10 px-4 rounded-xl border border-md-outline/30 bg-md-surface focus:outline-none focus:border-md-primary"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            {ROLES.map(r => (
              <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <MD3Button 
            onClick={handleSave} 
            disabled={isSysAdmin || loading}
            icon={<Save size={18} />}
          >
            Save Changes
          </MD3Button>
        </div>
      </div>

      {isSysAdmin && (
        <div className="mb-6 p-4 bg-md-tertiary-container text-md-on-tertiary-container rounded-xl flex items-center gap-3">
          <Check size={20} />
          <span className="text-sm font-medium">System Administrators have implicit access to all pages. These permissions cannot be modified.</span>
        </div>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {Object.entries(groupedPages).map(([category, pages]) => (
          <div key={category} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-md-outline/10">
              <div className="w-2 h-6 bg-md-primary rounded-full"></div>
              <h3 className="font-semibold text-sm tracking-wide text-md-on-surface uppercase opacity-80">{category}</h3>
            </div>
            
            <div className="flex flex-col gap-3">
              {pages.map(page => {
                const checked = isSysAdmin ? true : !!permissions[page.path];
                return (
                  <label 
                    key={page.path} 
                    className={`group relative flex items-center justify-between p-4 rounded-2xl transition-all duration-300 border
                      ${checked 
                        ? 'bg-md-primary-container/20 border-md-primary/20 shadow-sm' 
                        : 'bg-md-surface hover:bg-md-surface-variant/10 border-md-outline/10'} 
                      ${!isSysAdmin ? 'cursor-pointer hover:shadow-md' : 'opacity-70 cursor-not-allowed'}`}
                  >
                    <div className="flex flex-col pr-4">
                      <span className={`text-sm font-semibold transition-colors ${checked ? 'text-md-on-surface' : 'text-md-on-surface-variant'}`}>
                        {page.name}
                      </span>
                      <span className="text-xs font-medium text-md-on-surface-variant/70 mt-1 truncate max-w-[200px]" title={page.path}>
                        {page.path}
                      </span>
                    </div>

                    <div className="flex-shrink-0">
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ease-in-out ${checked ? 'bg-md-primary' : 'bg-md-surface-variant/50'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 ease-in-out shadow-sm ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
                      </div>
                    </div>
                    
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={checked}
                      onChange={() => handleToggle(page.path)}
                      disabled={isSysAdmin}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </MD3Card>
  );
};
