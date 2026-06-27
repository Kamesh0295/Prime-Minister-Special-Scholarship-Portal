import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import ChatbotWidget from '../ui/ChatbotWidget';

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((p) => !p);

  return (
    <div className="min-h-screen flex flex-col bg-surface-50">
      <Navbar onMenuToggle={toggleSidebar} sidebarOpen={sidebarOpen} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
      <ChatbotWidget />
    </div>
  );
};

export default DashboardLayout;
