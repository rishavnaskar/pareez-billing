"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ServiceItem } from "@/lib/types";

export interface ServiceFormValues {
  serviceName: string;
  price: number;
  discountAmount: number;
  staffName: string;
}

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingService: ServiceItem | null;
  onSave: (values: ServiceFormValues) => void;
}

export function ServiceDialog({
  open,
  onOpenChange,
  editingService,
  onSave,
}: ServiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-[95vw] rounded-lg border border-orange-100 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg text-gray-900">
            {editingService ? "Edit Service" : "Add Service"}
          </DialogTitle>
        </DialogHeader>
        {/* Content unmounts when the dialog closes, so the fields component
            mounts with fresh state on every open. */}
        <ServiceFormFields
          key={editingService?.id ?? "new"}
          editingService={editingService}
          onCancel={() => onOpenChange(false)}
          onSave={(values) => {
            onSave(values);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function ServiceFormFields({
  editingService,
  onCancel,
  onSave,
}: {
  editingService: ServiceItem | null;
  onCancel: () => void;
  onSave: (values: ServiceFormValues) => void;
}) {
  const [form, setForm] = useState(() =>
    editingService
      ? {
          serviceName: editingService.serviceName,
          price: String(editingService.price || ""),
          discountAmount: String(editingService.discountAmount || ""),
          staffName: editingService.staffName || "",
        }
      : { serviceName: "", price: "", discountAmount: "", staffName: "" },
  );

  const handleSave = () => {
    const price = parseFloat(form.price) || 0;
    const discountAmount = parseFloat(form.discountAmount) || 0;

    if (!form.serviceName.trim()) {
      alert("Please enter service name");
      return;
    }

    if (price <= 0) {
      alert("Please enter a valid price");
      return;
    }

    if (discountAmount > price) {
      alert("Discount cannot exceed the service price");
      return;
    }

    onSave({
      serviceName: form.serviceName.trim(),
      price,
      discountAmount,
      staffName: form.staffName.trim(),
    });
  };

  return (
    <>
      <div className="space-y-3 text-sm">
        <div className="space-y-1">
          <Label className="text-sm font-medium" htmlFor="service-name">
            Service Name
          </Label>
          <Input
            id="service-name"
            placeholder="e.g., Haircut"
            value={form.serviceName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, serviceName: e.target.value }))
            }
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-sm font-medium" htmlFor="service-price">
              Price (₹)
            </Label>
            <Input
              id="service-price"
              type="number"
              placeholder="0"
              min="0"
              value={form.price}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, price: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium" htmlFor="service-discount">
              Discount (₹)
            </Label>
            <Input
              id="service-discount"
              type="number"
              placeholder="0"
              min="0"
              value={form.discountAmount}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  discountAmount: e.target.value,
                }))
              }
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium" htmlFor="service-staff">
            Staff (Optional)
          </Label>
          <Input
            id="service-staff"
            placeholder="Staff"
            value={form.staffName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, staffName: e.target.value }))
            }
          />
        </div>
      </div>
      <DialogFooter className="mt-4 gap-2 flex-col sm:flex-row">
        <Button variant="outline" className="w-full sm:w-auto" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white shadow"
          onClick={handleSave}
        >
          {editingService ? "Update Service" : "Add Service"}
        </Button>
      </DialogFooter>
    </>
  );
}
