import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
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
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-md-primary flex items-center justify-center text-md-on-primary font-bold text-lg">
            FCR
          </div>
          <Link to="/" className="font-bold text-xl text-md-on-surface">FCR-SCS</Link>
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
