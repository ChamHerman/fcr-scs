import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../ui/Logo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-md-surface-container border-t border-md-outline/15">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center md:items-center justify-between gap-4">
        {/* Brand block */}
        <Link to="/" className="flex items-center gap-2.5">
          <BrandLogo size={32} />
          <div className="leading-tight">
            <div className="text-sm font-bold text-md-on-surface">FCR-SCS</div>
            <div className="text-[11px] text-md-on-surface-variant">
              Smart Contract Resettlement
            </div>
          </div>
        </Link>

        {/* Copyright + legal links */}
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-sm text-md-on-surface-variant">
          <p>&copy; 2026 FCR-SCS. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/about" className="hover:text-md-primary transition-colors">About</Link>
            <Link to="/privacy" className="hover:text-md-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-md-primary transition-colors">Terms of Service</Link>
            <Link to="/contact" className="hover:text-md-primary transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
