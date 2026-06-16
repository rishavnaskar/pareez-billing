'use client';

import { useState } from 'react';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/button';
import { CustomerList } from '@/components/customers/CustomerList';
import { BillForm } from '@/components/billing/BillForm';
import { BillHistory } from '@/components/billing/BillHistory';
import { NewBillFAB } from '@/components/billing/NewBillFAB';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Users, FileText, Receipt, LogOut } from 'lucide-react';

type Tab = 'billing' | 'customers' | 'history';

function AuthenticatedContent() {
  const [activeTab, setActiveTab] = useState<Tab>('billing');
  const { logout } = useAuth();

  // A full reload guarantees a clean slate for the next bill (fresh bill
  // number, no stale form state) and lands on the default billing tab.
  const handleNewBill = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 relative">
      {/* Header */}
      <header className="bg-black shadow-lg">
        <div className="mx-auto max-w-7xl px-2 py-3 sm:px-4 sm:py-4 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-center sm:justify-start">
              <Logo className="h-10 w-auto sm:h-12" />
            </div>
            <nav className="flex gap-1 sm:gap-2">
              <Button
                variant={activeTab === 'billing' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('billing')}
                className={`flex-1 sm:flex-none text-xs sm:text-sm font-semibold ${activeTab === 'billing'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200 border-2 border-orange-400'
                  : 'text-white hover:bg-gray-800 hover:shadow-md transform hover:scale-105 transition-all duration-200'}`}
              >
                <FileText className={`mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4 ${activeTab === 'billing' ? 'animate-pulse' : ''}`} />
                <span className="hidden sm:inline">New Bill</span>
                <span className="sm:hidden">Bill</span>
                {activeTab === 'billing' && (
                  <span className="ml-1 sm:ml-2 w-2 h-2 bg-white rounded-full animate-pulse"></span>
                )}
              </Button>
              <Button
                variant={activeTab === 'customers' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('customers')}
                className={`flex-1 sm:flex-none text-xs sm:text-sm ${activeTab === 'customers' ? 'bg-orange-500 hover:bg-orange-600' : 'text-white hover:bg-gray-800'}`}
              >
                <Users className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                Customers
              </Button>
              <Button
                variant={activeTab === 'history' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('history')}
                className={`flex-1 sm:flex-none text-xs sm:text-sm ${activeTab === 'history' ? 'bg-orange-500 hover:bg-orange-600' : 'text-white hover:bg-gray-800'}`}
              >
                <Receipt className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                History
              </Button>
              <Button
                variant="ghost"
                onClick={logout}
                className="text-white hover:bg-gray-800 text-xs sm:text-sm"
              >
                <LogOut className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Out</span>
              </Button>
              <div className="flex items-center justify-center">
                <ThemeToggle />
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {/* pb-28 keeps the floating New Bill button clear of the last content row */}
      <main className="mx-auto max-w-7xl px-2 pt-4 pb-28 sm:px-4 sm:pt-6 lg:px-8 lg:pt-8">
        {activeTab === 'billing' && <BillForm />}
        {activeTab === 'customers' && <CustomerList />}
        {activeTab === 'history' && <BillHistory />}
      </main>

      {/* Footer */}
      <footer
        className="absolute bottom-0 left-0 right-0 border-t bg-white dark:bg-gray-900 dark:border-gray-800 py-3 sm:py-4"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto max-w-7xl px-2 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} Pareez Salon
        </div>
      </footer>

      {/* Floating Action Button */}
      <NewBillFAB onNewBill={handleNewBill} />
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AuthenticatedContent />
      </ProtectedRoute>
    </AuthProvider>
  );
}
