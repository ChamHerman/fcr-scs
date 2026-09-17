import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "./Button";
import { useAuth } from "../../context/AuthContext";
import { getRoleTitle, getNameInitials } from "../../utils/roleUtils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backPath?: string;
  onBack?: () => void;
  /** Extra action buttons rendered in the topbar-right area */
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, backPath, onBack, actions }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const initials = getNameInitials(user?.name);
  const roleTitle = getRoleTitle(user?.role);

  return (
    <div className="topbar flex flex-wrap items-center justify-between gap-4" style={{ marginBottom: "20px" }}>
      <div className="topbar-left">
        <h1 style={{ marginBottom: 0 }}>{title}</h1>
        {subtitle && <div className="sub">{subtitle}</div>}
      </div>
      <div className="topbar-right ml-auto flex items-center justify-end gap-3 flex-wrap">
        {(backPath || onBack) && (
          <Button variant="outlined" size="sm" onClick={onBack ? onBack : () => navigate(backPath!)} className="shrink-0">
            <ArrowLeft size={16} /> Back
          </Button>
        )}
        {actions}
        <span className="date-badge flex items-center gap-1.5 whitespace-nowrap">
          <Calendar size={16} className="inline mr-1" />
          {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
        <div 
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-all select-none"
          onClick={() => navigate('/admin/profile')}
          title={user ? `${user.name} (${roleTitle}) — Click to view Profile` : "User Profile"}
        >
          <div className="text-right flex flex-col items-end leading-tight">
            <span className="text-xs font-bold text-md-on-surface hidden md:block">
              {user?.name || 'Authorized User'}
            </span>
            <span className="text-[11px] font-semibold text-md-primary">
              {roleTitle}
            </span>
          </div>
          <div 
            className="avatar hover:scale-105 transition-all bg-md-primary text-white flex items-center justify-center font-bold text-xs rounded-full shadow-sm ring-2 ring-md-primary/20 shrink-0" 
            style={{ width: 38, height: 38, background: 'var(--md-primary)', color: 'white' }}
          >
            {initials}
          </div>
        </div>
      </div>
    </div>
  );
};
