import React, { useState, useEffect } from 'react';
import { MD3Card, MD3Button } from '../MD3Components';
import { ADMIN_PAGES, type AdminPageInfo } from '../../constants/pages';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import '../LandAcquisition/case_management.css';
import { Check, Save } from 'lucide-react';

const ROLES = [
  'SYSTEM_ADMINISTRATOR',
  'GOVERNMENT_ADMINISTRATOR',
  'GOVERNMENT_OFFICER',
  'LAND_VALUER',
  'DISPLACED_COMMUNITY_MEMBER'
];

const getDefaultPermissions = (role: string): string[] => {
  switch (role) {
    case 'SYSTEM_ADMINISTRATOR':
      return ADMIN_PAGES.map(p => p.path);
    case 'GOVERNMENT_ADMINISTRATOR':
      return ADMIN_PAGES.filter(p => !p.path.startsWith('/member') && p.category !== 'User Management').map(p => p.path);
    case 'GOVERNMENT_OFFICER':
      return ADMIN_PAGES.filter(p => ['Main', 'Land Acquisition', 'Compensation', 'Reporting'].includes(p.category) && !p.path.startsWith('/member')).map(p => p.path);
    case 'LAND_VALUER':
      return ADMIN_PAGES.filter(p => ['Main', 'Land Acquisition', 'AI Valuation'].includes(p.category)).map(p => p.path);
    case 'DISPLACED_COMMUNITY_MEMBER':
      return ADMIN_PAGES.filter(p => p.path.startsWith('/member')).map(p => p.path);
    default:
      return [];
  }
};

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

        if (json.success && json.data && json.data.length > 0) {
          json.data.forEach((p: any) => {
            permMap[p.pagePath] = p.canAccess;
          });
        } else {
          // Initialize with default permissions if no saved permissions exist
          const defaultPaths = getDefaultPermissions(role);
          defaultPaths.forEach(path => {
            if (permMap[path] !== undefined) {
              permMap[path] = true;
            }
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

  const handleToggleCategory = (categoryPages: AdminPageInfo[]) => {
    if (selectedRole === 'SYSTEM_ADMINISTRATOR') return;
    const allEnabled = categoryPages.every(page => !!permissions[page.path]);
    setPermissions(prev => {
      const updated = { ...prev };
      categoryPages.forEach(page => {
        updated[page.path] = !allEnabled;
      });
      return updated;
    });
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Role Management"
        subtitle="Configure access control for different system roles."
      />

      <MD3Card elevation={1}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-xl font-medium text-md-on-surface">Role Permissions</h2>
          <p className="text-md-on-surface-variant text-sm mt-1">Manage page-level access for each system role.</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-4 items-center">
          <div className="w-64">
            <Select 
              label="Role"
              options={ROLES.map(r => ({ value: r, label: r.replace(/_/g, ' ') }))}
              value={selectedRole}
              onChange={setSelectedRole}
              placeholder="Select Role"
            />
          </div>
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
        {Object.entries(groupedPages).map(([category, pages]) => {
          const allChecked = isSysAdmin ? true : pages.every(p => !!permissions[p.path]);

          return (
            <div key={category} className="flex flex-col gap-3">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-md-outline/10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-6 bg-md-primary rounded-full"></div>
                  <h3 className="font-semibold text-sm tracking-wide text-md-on-surface uppercase opacity-80">{category}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCategory(pages)}
                  disabled={isSysAdmin}
                  title={allChecked ? `Deselect all in ${category}` : `Select all in ${category}`}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-all duration-200 border flex items-center gap-1.5 ${
                    isSysAdmin
                      ? 'opacity-40 cursor-not-allowed border-transparent text-md-on-surface-variant'
                      : allChecked
                      ? 'bg-md-primary/10 text-md-primary border-md-primary/30 hover:bg-md-primary/20'
                      : 'bg-md-surface-variant/40 text-md-on-surface-variant border-md-outline/20 hover:bg-md-surface-variant hover:text-md-on-surface active:scale-95'
                  }`}
                >
                  <Check size={13} className={allChecked ? "opacity-100 text-md-primary" : "opacity-40"} />
                  <span>{allChecked ? 'Deselect All' : 'Select All'}</span>
                </button>
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
                        <div className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors duration-200 ease-in-out ${checked ? 'bg-md-primary border-md-primary' : 'bg-transparent border-md-outline/50 group-hover:border-md-outline'}`}>
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full transition duration-200 ease-in-out shadow-sm ${checked ? 'translate-x-[22px] bg-white' : 'translate-x-0.5 bg-md-outline/60 group-hover:bg-md-outline'}`} />
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
          );
        })}
      </div>
      </MD3Card>
    </div>
  );
};
