import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./LandAcquisition/case_management.css";

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const navItem = (
    icon: string,
    label: string,
    path: string,
    badge?: string
  ) => (
    <a
      href="#"
      className={isActive(path) ? "active" : ""}
      onClick={(e) => {
        e.preventDefault();
        navigate(path);
      }}
    >
      <span className="nav-icon">{icon}</span>
      {label}
      {badge && <span className="badge">{badge}</span>}
    </a>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">⚖️</span>
        <span>FCR·SCS</span>
      </div>
      <nav className="sidebar-nav">
        {/* ── Case ── */}
        <span className="nav-label">Case</span>
        {navItem("📊", "Dashboard", "/case")}
        {navItem("📄", "Valuation", "/case/valuation")}

        {/* ── Compensation ── */}
        <span className="nav-label">Compensation</span>
        {navItem("📋", "Report", "/compensation/report")}
        {navItem("⚖️", "Compare", "/compensation/compare")}
        {navItem("📩", "Offer", "/compensation/offer")}
        {navItem("🗂️", "Objection", "/compensation/objection")}

        {/* ── System ── */}
        <span className="nav-label">System</span>
        {navItem("⚙️", "Settings", "/settings")}
        {navItem("👥", "Users", "/users")}
      </nav>
    </aside>
  );
};
