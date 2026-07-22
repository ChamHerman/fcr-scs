import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const Layout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-md-background">
      <Navbar />
      <main className="flex-grow pt-[72px]">
        {/* pt-[72px] offsets the fixed navbar */}
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
