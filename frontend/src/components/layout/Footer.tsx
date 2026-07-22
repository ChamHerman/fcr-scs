import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-md-on-surface text-md-background py-20 px-6 text-center relative overflow-hidden">
      {/* Subtle, non-spinning ambient glow for footer */}
      <div className="absolute w-[800px] h-[800px] rounded-full bg-md-primary/20 blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="max-w-3xl mx-auto relative z-10">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">Ensure Fair Compensation Today</h2>
        <p className="text-md-outline mb-10 text-lg">
          Join the digital transformation of land acquisition management. Check your case status or register as a new administrator.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button size="lg" className="w-full sm:w-auto bg-md-primary-container text-md-on-primary hover:bg-white hover:text-md-on-surface transition-colors">
            Check Claim Status
          </Button>
          <Button variant="outlined" size="lg" className="w-full sm:w-auto border-md-outline text-white hover:bg-white/10">
            Admin Portal
          </Button>
        </div>
        <div className="mt-20 pt-8 border-t border-white/10 text-sm text-md-outline flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; 2026 FCR-SCS. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
