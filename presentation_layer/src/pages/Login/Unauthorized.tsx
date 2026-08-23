import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MD3Card, MD3BlurBackground, MD3Button } from '../MD3Components';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleGoBack = () => {
    if (user) {
      if (user.role === 'ADMIN' || user.role === 'SYSTEM_ADMINISTRATOR') {
        navigate('/admin');
      } else {
        // Displaced community member or other roles with no access
        logout();
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-0">
      <MD3BlurBackground />
      
      <MD3Card elevation={2} className="w-full max-w-md z-10 text-center py-10 px-6">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-sm">
            <ShieldAlert size={40} />
          </div>
          
          <h1 className="text-3xl font-medium text-md-on-surface mb-3">
            Access Denied
          </h1>
          
          <p className="text-md-on-surface-variant mb-8 leading-relaxed">
            You don't have the required permissions to view this page. If you believe this is a mistake, please contact the system administrator.
          </p>

          <MD3Button onClick={handleGoBack} className="w-full max-w-xs flex items-center justify-center">
            <ArrowLeft size={20} className="mr-2" />
            {user && (user.role === 'ADMIN' || user.role === 'SYSTEM_ADMINISTRATOR') ? 'Go to Dashboard' : 'Sign Out'}
          </MD3Button>
        </div>
      </MD3Card>
    </div>
  );
};

export default Unauthorized;
