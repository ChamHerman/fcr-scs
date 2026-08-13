import React, { useState } from 'react';
import { MD3Card, MD3Button, MD3Input } from '../MD3Components';
import { User, Lock, Edit3 } from 'lucide-react';

export const UserProfile: React.FC = () => {
  const [view, setView] = useState<'profile' | 'password'>('profile');
  
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    contactNumber: '',
  });

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Profile updated successfully!');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Password updated successfully!');
    setView('profile');
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-medium text-md-on-surface">Manage Profile</h1>
        <div className="bg-md-surface-container-low rounded-full p-1 inline-flex">
          <button 
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${view === 'profile' ? 'bg-md-secondary-container text-md-on-secondary-container' : 'text-md-on-surface-variant hover:bg-md-on-surface/5'}`}
            onClick={() => setView('profile')}
          >
            Personal Info
          </button>
          <button 
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${view === 'password' ? 'bg-md-secondary-container text-md-on-secondary-container' : 'text-md-on-surface-variant hover:bg-md-on-surface/5'}`}
            onClick={() => setView('password')}
          >
            Security
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Sidebar Info */}
        <div className="md:col-span-1">
          <MD3Card elevation={1} className="text-center">
            <div className="w-24 h-24 bg-md-primary/10 text-md-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={48} />
            </div>
            <h2 className="text-xl font-medium">{profileData.fullName}</h2>
            <p className="text-md-on-surface-variant text-sm mb-4">System Administrator</p>
            <MD3Button variant="text" icon={<Edit3 size={16} />} className="w-full">
              Change Avatar
            </MD3Button>
          </MD3Card>
        </div>

        {/* Main Form */}
        <div className="md:col-span-2">
          <MD3Card elevation={2}>
            {view === 'profile' ? (
              <form onSubmit={handleProfileSave} className="space-y-6">
                <h3 className="text-xl font-medium mb-6">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <MD3Input 
                    label="Full Name" 
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                    className="md:col-span-2"
                  />
                  <MD3Input 
                    label="Email Address" 
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  />
                  <MD3Input 
                    label="Contact Number" 
                    type="tel"
                    value={profileData.contactNumber}
                    onChange={(e) => setProfileData({...profileData, contactNumber: e.target.value})}
                  />
                </div>
                <div className="flex justify-end mt-8">
                  <MD3Button type="submit">Save Changes</MD3Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div className="flex items-center mb-6">
                  <Lock className="text-md-primary mr-3" size={24} />
                  <h3 className="text-xl font-medium">Change Password</h3>
                </div>
                
                <MD3Input label="Current Password" type="password" required />
                <MD3Input label="New Password" type="password" required />
                <MD3Input label="Confirm New Password" type="password" required />
                
                <div className="flex justify-end mt-8 space-x-4">
                  <MD3Button variant="text" type="button" onClick={() => setView('profile')}>
                    Cancel
                  </MD3Button>
                  <MD3Button type="submit">
                    Update Password
                  </MD3Button>
                </div>
              </form>
            )}
          </MD3Card>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
