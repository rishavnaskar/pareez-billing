'use client';

import { useState } from 'react';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/button';
import { CustomerList } from '@/components/customers/CustomerList';
import { BillForm } from '@/components/billing/BillForm';
import { BillHistory } from '@/components/billing/BillHistory';
import { NewBillFAB } from '@/components/billing/NewBillFAB';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Users, FileText, Receipt, LogOut } from 'lucide-react';

type Tab = 'billing' | 'customers' | 'history';

function AuthenticatedContent() {
  const [activeTab, setActiveTab] = useState<Tab>('billing');
  const [billFormResetSignal, setBillFormResetSignal] = useState(0);
  const { logout } = useAuth();

  const handleNewBill = () => {
    setActiveTab('billing');
    setBillFormResetSignal((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
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
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
        {activeTab === 'billing' && <BillForm resetSignal={billFormResetSignal} />}
        {activeTab === 'customers' && <CustomerList />}
        {activeTab === 'history' && <BillHistory />}
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 border-t bg-white py-3 sm:py-4">
        <div className="mx-auto max-w-7xl px-2 text-center text-xs sm:text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Pareez Salon
        </div>
      </footer>

      {/* Floating Action Button */}
      <NewBillFAB onNewBill={handleNewBill} isActive={activeTab === 'billing'} />
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
