import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import classNames from 'classnames';

export const Navbar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <nav className={classNames(
      "fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-transform duration-300 ease-in-out bg-md-background/90 backdrop-blur-md border-b border-md-outline/10",
      isVisible ? "translate-y-0" : "-translate-y-full"
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="w-9 h-9 text-md-primary" />
            <span className="font-bold text-xl text-md-on-surface tracking-tight">
              Smart Contract Resettlement
            </span>
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <Link to="/submit-bank-details" className="text-md-on-surface hover:text-md-primary transition-colors text-sm">Submit Bank Details</Link>
          <Link to="/track-payment" className="text-md-on-surface hover:text-md-primary transition-colors text-sm">Track Payment</Link>
          <Link to="/verify-audit-trail" className="text-md-on-surface hover:text-md-primary transition-colors text-sm">Verify Certificate</Link>
          <Link to="/admin" className="text-md-on-surface hover:text-md-primary transition-colors font-medium text-sm">Admin Portal</Link>
          <Link to="/member" className="text-md-on-surface hover:text-md-primary transition-colors font-medium text-sm">Member Portal</Link>
          <Button variant="outlined" size="sm">Login</Button>
          <Button variant="filled" size="sm">Register</Button>
        </div>
      </div>
    </nav>
  );
};
