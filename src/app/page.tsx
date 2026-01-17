'use client';

import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { CustomerList } from '@/components/CustomerList';
import { BillForm } from '@/components/BillForm';
import { BillHistory } from '@/components/BillHistory';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Users, FileText, Receipt, LogOut } from 'lucide-react';

type Tab = 'billing' | 'customers' | 'history';

function AuthenticatedContent() {
  const [activeTab, setActiveTab] = useState<Tab>('billing');
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
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
                className={`flex-1 sm:flex-none text-xs sm:text-sm ${activeTab === 'billing' ? 'bg-orange-500 hover:bg-orange-600' : 'text-white hover:bg-gray-800'}`}
              >
                <FileText className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">New Bill</span>
                <span className="sm:hidden">Bill</span>
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
        {activeTab === 'billing' && <BillForm />}
        {activeTab === 'customers' && <CustomerList />}
        {activeTab === 'history' && <BillHistory />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-white py-3 sm:py-4">
        <div className="mx-auto max-w-7xl px-2 text-center text-xs sm:text-sm text-gray-500">
          © {new Date().getFullYear()} Pareez Salon
        </div>
      </footer>
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
