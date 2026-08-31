import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { Button } from "./Button";
import { useAuth } from "../../context/AuthContext";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backPath?: string;
  /** Extra action buttons rendered in the topbar-right area */
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, backPath, actions }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const initials = user?.name?.split(/\s+/).map((n: string) => n[0]).slice(0, 2).join("") || "";

  return (
    <div className="topbar" style={{ marginBottom: "20px" }}>
      <div className="topbar-left">
        <h1 style={{ marginBottom: 0 }}>{title}</h1>
        {subtitle && <div className="sub">{subtitle}</div>}
      </div>
      <div className="topbar-right flex items-center gap-3">
        {backPath && (
          <Button variant="outlined" size="sm" onClick={() => navigate(backPath)}>
            <ArrowLeft size={16} /> Back
          </Button>
        )}
        {actions}
        <span className="date-badge">
          <Calendar size={16} className="inline mr-1" />
          {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
        <div className="avatar" title={user ? `${user.name} (${user.role?.replace(/_/g, " ")})` : "User"}>
          {initials ? <span className="text-xs font-bold uppercase">{initials}</span> : <User size={16} />}
        </div>
      </div>
    </div>
  );
};
