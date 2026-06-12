"use client";

import { useState, useEffect, useMemo } from "react";
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
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { ServiceItem } from "@/lib/types";
import {
  getActiveProducts,
  type CatalogueProduct,
} from "@/lib/db/products";

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

const SECTION_ORDER = ["Men's", "Women's", "Unisex", "Other"];

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

  const [catalogue, setCatalogue] = useState<CatalogueProduct[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);

  useEffect(() => {
    getActiveProducts().then(setCatalogue).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = form.serviceName.trim().toLowerCase();
    if (!q) return catalogue.slice(0, 30);
    return catalogue.filter((p) => p.name.toLowerCase().includes(q));
  }, [form.serviceName, catalogue]);

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogueProduct[]>();
    for (const p of filtered) {
      const key = p.section || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    const sorted = new Map<string, CatalogueProduct[]>();
    for (const section of SECTION_ORDER) {
      if (map.has(section)) sorted.set(section, map.get(section)!);
    }
    for (const [k, v] of map) {
      if (!sorted.has(k)) sorted.set(k, v);
    }
    return sorted;
  }, [filtered]);

  function selectSuggestion(p: CatalogueProduct) {
    setForm((prev) => ({
      ...prev,
      serviceName: p.name,
      price: String(p.price),
    }));
    setSuggestOpen(false);
  }

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
          <Popover
            open={suggestOpen && filtered.length > 0}
            onOpenChange={setSuggestOpen}
          >
            <PopoverAnchor asChild>
              <Input
                id="service-name"
                placeholder="e.g., Haircut"
                value={form.serviceName}
                autoComplete="off"
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    serviceName: e.target.value,
                  }));
                  setSuggestOpen(true);
                }}
                onFocus={() => setSuggestOpen(true)}
              />
            </PopoverAnchor>
            <PopoverContent
              className="p-0 w-[--radix-popover-trigger-width] max-h-56 overflow-y-auto rounded-md border border-gray-200 shadow-lg"
              onOpenAutoFocus={(e) => e.preventDefault()}
              align="start"
              sideOffset={4}
            >
              {Array.from(grouped.entries()).map(([section, items]) => (
                <div key={section}>
                  <div className="sticky top-0 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange-600 bg-orange-50 border-b border-orange-100">
                    {section}
                  </div>
                  {items.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-orange-50 transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectSuggestion(p);
                      }}
                    >
                      <span className="text-gray-800">{p.name}</span>
                      <span className="text-gray-400 ml-3 shrink-0">
                        ₹{p.price}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </PopoverContent>
          </Popover>
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
