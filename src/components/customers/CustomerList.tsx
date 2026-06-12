"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomerForm } from "./CustomerForm";
import { getCustomers, deleteCustomer } from "@/lib/db";
import { Customer } from "@/lib/types";
import { Search, Users, Edit, Trash2, RefreshCw, Wallet, Banknote } from "lucide-react";
import { format } from "date-fns";
import { maskPhoneForRole } from "@/lib/phone-mask";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/wallet/TierBadge";
import { formatINR } from "@/lib/currency";
import { WalletAdjustmentDialog } from "@/components/wallet/WalletAdjustmentDialog";
import { WalletTransactionHistory } from "@/components/wallet/WalletTransactionHistory";

export function CustomerList() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone ? c.phone.includes(searchTerm) : false),
  );

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete ${customer.name}?`)) {
      return;
    }

    try {
      await deleteCustomer(customer.id);
      await fetchCustomers(); // Refresh the list
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert("Failed to delete customer. Please try again.");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            Customers
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCustomers}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <CustomerForm
              onSuccess={fetchCustomers}
              editingCustomer={editingCustomer}
              setEditingCustomer={setEditingCustomer}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative mb-3 sm:mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            {searchTerm
              ? "No customers found"
              : "No customers yet. Add your first customer!"}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <div className="min-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm min-w-[120px]">
                      Name
                    </TableHead>
                    <TableHead className="text-xs sm:text-sm min-w-[100px]">
                      Tier
                    </TableHead>
                    <TableHead className="text-xs sm:text-sm min-w-[100px]">
                      Wallet
                    </TableHead>
                    <TableHead className="text-xs sm:text-sm min-w-[150px]">
                      Phone
                    </TableHead>
                    <TableHead className="text-xs sm:text-sm min-w-[120px]">
                      Date of Birth
                    </TableHead>
                    {user?.role === "admin" && (
                      <TableHead className="text-xs sm:text-sm min-w-[100px]">
                        Actions
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium text-xs sm:text-sm min-w-[120px]">
                        {customer.name}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm min-w-[100px]">
                        {customer.wallet ? (
                          <TierBadge
                            tier={customer.wallet.tier}
                            size="sm"
                            showName={false}
                          />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm min-w-[100px]">
                        {customer.wallet ? (
                          <div className="space-y-0.5">
                            <span className="flex items-center gap-1 text-orange-600 font-medium">
                              <Wallet className="h-3 w-3" />
                              {formatINR(customer.wallet.balance)}
                            </span>
                            {customer.wallet.depositBalance > 0 && (
                              <span className="flex items-center gap-1 text-green-700 font-medium">
                                <Banknote className="h-3 w-3" />
                                {formatINR(customer.wallet.depositBalance)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">₹0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm min-w-[150px]">
                        {maskPhoneForRole(customer.phone, user?.role) || "—"}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm min-w-[120px]">
                        {customer.dateOfBirth
                          ? format(
                              new Date(customer.dateOfBirth),
                              "dd MMM yyyy",
                            )
                          : "-"}
                      </TableCell>
                      {user?.role === "admin" && (
                        <TableCell className="text-xs sm:text-sm min-w-[100px]">
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingCustomer(customer)}
                              className="h-7 px-2"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <WalletAdjustmentDialog
                              customer={customer}
                              onSuccess={fetchCustomers}
                            />
                            <WalletTransactionHistory customer={customer} />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCustomer(customer)}
                              className="h-7 px-2 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
