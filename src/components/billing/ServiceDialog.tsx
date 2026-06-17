"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
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
import { getActiveEmployees, type StaffMember } from "@/lib/db/employees";

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
  // Emits one entry per service. In edit mode this is always a single entry;
  // in add mode the user can build several services in one go.
  onSave: (values: ServiceFormValues[]) => void;
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
        <DialogHeader className="sr-only">
          {/* Kept for accessibility (Radix requires a title) but hidden. */}
          <DialogTitle>
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

// Suggestion sections are shown in this order. Women's first (most common at
// the salon), then the rest. Matched case-insensitively by substring so
// "Women", "Women's", "women" all rank together. Order matters: "women"
// contains "men", so it must be checked before "men".
const SECTION_PRIORITY = ["women", "men", "unisex", "other"];

function sectionRank(section: string): number {
  const s = section.toLowerCase();
  const i = SECTION_PRIORITY.findIndex((p) => s.includes(p));
  return i === -1 ? SECTION_PRIORITY.length : i;
}

// Strip everything except letters and digits for fuzzy matching.
// "hair cut" → "haircut", "lo'real" → "loreal", "o3+" → "o3"
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function scoreMatch(p: CatalogueProduct, query: string): number {
  if (!query) return 1;

  const q = query.toLowerCase().trim();
  const qNorm = norm(q);
  const nameLow = p.name.toLowerCase();
  const nameNorm = norm(p.name);
  const catLow = p.category.toLowerCase();

  // Tier 1 — exact or strong prefix on full name
  if (nameLow === q) return 100;
  if (nameLow.startsWith(q)) return 90;

  // Tier 2 — verbatim substring in name
  if (nameLow.includes(q)) return 80;

  // Tier 3 — normalized match (ignores spaces / punctuation)
  // "haircut" matches "hair cut", "loreal" matches "lo'real"
  if (nameNorm.includes(qNorm)) return 70;
  if (qNorm.length >= 3 && nameNorm.startsWith(qNorm)) return 75;

  // Tier 4 — all query words appear somewhere in the name words
  const nameWords = nameLow.split(/\W+/).filter(Boolean);
  const qWords = q.split(/\W+/).filter(Boolean);
  if (qWords.length === 0) return 0;

  const matchedWords = qWords.filter((qw) =>
    nameWords.some((nw) => nw.startsWith(qw) || qw.startsWith(nw))
  );
  const ratio = matchedWords.length / qWords.length;
  if (ratio === 1) return 60;
  if (ratio >= 0.5) return Math.round(50 * ratio);

  // Tier 5 — category match
  if (catLow.includes(q) || norm(catLow).includes(qNorm)) return 20;

  return 0;
}

// Split a single group discount across services in proportion to their price,
// rounded to whole rupees with the leftover handed to the largest fractions so
// the per-line discounts always sum to exactly the entered amount.
function distributeDiscount(prices: number[], total: number): number[] {
  const sum = prices.reduce((a, b) => a + b, 0);
  if (sum <= 0 || total <= 0) return prices.map(() => 0);

  const capped = Math.min(total, sum);
  const raw = prices.map((p) => (capped * p) / sum);
  const result = raw.map((r) => Math.floor(r));
  let leftover = Math.round(capped) - result.reduce((a, b) => a + b, 0);

  const byFraction = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; k < byFraction.length && leftover > 0; k++) {
    const idx = byFraction[k].i;
    if (result[idx] < prices[idx]) {
      result[idx] += 1;
      leftover--;
    }
  }
  return result;
}

interface ServiceRow {
  id: string;
  serviceName: string;
  price: string;
}

function ServiceFormFields({
  editingService,
  onCancel,
  onSave,
}: {
  editingService: ServiceItem | null;
  onCancel: () => void;
  onSave: (values: ServiceFormValues[]) => void;
}) {
  const isEditing = !!editingService;
  const rowId = useRef(0);
  const nextRowId = () => `row-${rowId.current++}`;

  const [rows, setRows] = useState<ServiceRow[]>(() =>
    editingService
      ? [
          {
            id: nextRowId(),
            serviceName: editingService.serviceName,
            price: String(editingService.price || ""),
          },
        ]
      : [{ id: nextRowId(), serviceName: "", price: "" }],
  );
  const [discountAmount, setDiscountAmount] = useState(() =>
    editingService ? String(editingService.discountAmount || "") : "",
  );
  const [staffName, setStaffName] = useState(
    () => editingService?.staffName || "",
  );

  const [catalogue, setCatalogue] = useState<CatalogueProduct[]>([]);
  const [employees, setEmployees] = useState<StaffMember[]>([]);
  const [staffSuggestOpen, setStaffSuggestOpen] = useState(false);
  // Host the suggestion popovers inside the dialog so they sit within the
  // dialog's scroll-lock subtree and stay touch-scrollable on mobile.
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );

  useEffect(() => {
    getActiveProducts().then(setCatalogue).catch(() => {});
    getActiveEmployees().then(setEmployees).catch(() => {});
  }, []);

  const staffMatches = useMemo(() => {
    const q = staffName.trim().toLowerCase();
    if (!q) return employees.slice(0, 30);
    return employees
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.designation.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [staffName, employees]);

  const updateRow = (id: string, patch: Partial<ServiceRow>) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { id: nextRowId(), serviceName: "", price: "" },
    ]);

  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  // A row counts only once the user has typed something into it; the trailing
  // blank row (with the + button) is ignored rather than treated as invalid.
  const isBlankRow = (r: ServiceRow) =>
    !r.serviceName.trim() && !r.price.trim();
  const filledCount = rows.filter((r) => !isBlankRow(r)).length;

  const handleSave = () => {
    const parsed = rows
      .filter((r) => !isBlankRow(r))
      .map((r) => ({
        serviceName: r.serviceName.trim(),
        price: parseFloat(r.price) || 0,
      }));

    if (parsed.length === 0) {
      alert("Please add at least one service");
      return;
    }
    if (parsed.some((r) => !r.serviceName)) {
      alert("Please enter a name for every service");
      return;
    }
    if (parsed.some((r) => r.price <= 0)) {
      alert("Please enter a valid price for every service");
      return;
    }

    const totalDiscount = parseFloat(discountAmount) || 0;
    const totalPrice = parsed.reduce((a, r) => a + r.price, 0);
    if (totalDiscount > totalPrice) {
      alert("Discount cannot exceed the total service price");
      return;
    }

    const discounts = distributeDiscount(
      parsed.map((r) => r.price),
      totalDiscount,
    );
    const staff = staffName.trim();

    onSave(
      parsed.map((r, i) => ({
        serviceName: r.serviceName,
        price: r.price,
        discountAmount: discounts[i],
        staffName: staff,
      })),
    );
  };

  return (
    <>
      <div ref={setPortalContainer} />
      <div className="space-y-3 text-sm">
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {isEditing ? "Service" : "Services"}
          </Label>
          {rows.map((row, index) => (
            <ServiceNamePriceRow
              key={row.id}
              row={row}
              catalogue={catalogue}
              portalContainer={portalContainer}
              onChange={(patch) => updateRow(row.id, patch)}
              // Inline + on the last row to add another; × to drop extra rows.
              trailing={
                isEditing
                  ? "none"
                  : index === rows.length - 1
                    ? "add"
                    : "remove"
              }
              onAdd={addRow}
              onRemove={() => removeRow(row.id)}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-sm font-medium" htmlFor="service-discount">
              Discount (₹){!isEditing && filledCount > 1 ? " — total" : ""}
            </Label>
            <Input
              id="service-discount"
              type="number"
              placeholder="0"
              min="0"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
            />
            {!isEditing && filledCount > 1 && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Split across services by price
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium" htmlFor="service-staff">
              Staff (Optional)
            </Label>
            <Popover
              open={staffSuggestOpen && staffMatches.length > 0}
              onOpenChange={setStaffSuggestOpen}
            >
              <PopoverAnchor asChild>
                <Input
                  id="service-staff"
                  placeholder="Staff"
                  autoComplete="off"
                  value={staffName}
                  onChange={(e) => {
                    setStaffName(e.target.value);
                    setStaffSuggestOpen(true);
                  }}
                  onFocus={() => setStaffSuggestOpen(true)}
                />
              </PopoverAnchor>
              <PopoverContent
                container={portalContainer}
                className="p-0 w-[var(--radix-popover-trigger-width)] max-h-60 overflow-y-auto overscroll-contain rounded-lg border border-orange-100 bg-white dark:bg-gray-900 shadow-xl"
                onOpenAutoFocus={(e) => e.preventDefault()}
                // Keep the list open while the user keeps typing in the input —
                // Radix otherwise fires a focus-outside dismiss on each keystroke,
                // so suggestions would flicker/only appear intermittently. Real
                // outside clicks (pointer-down) and Escape still close it.
                onFocusOutside={(e) => e.preventDefault()}
                align="start"
                sideOffset={6}
              >
                {staffMatches.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-orange-50 dark:hover:bg-orange-500/10 active:bg-orange-100 dark:active:bg-orange-500/15 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setStaffName(emp.name);
                      setStaffSuggestOpen(false);
                    }}
                  >
                    <span className="flex-1 min-w-0 text-[13px] text-gray-800 dark:text-gray-100 leading-snug truncate">
                      {emp.name}
                    </span>
                    {emp.designation && (
                      <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
                        {emp.designation}
                      </span>
                    )}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
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
          {isEditing
            ? "Update Service"
            : filledCount > 1
              ? `Add ${filledCount} Services`
              : "Add Service"}
        </Button>
      </DialogFooter>
    </>
  );
}

function ServiceNamePriceRow({
  row,
  catalogue,
  portalContainer,
  onChange,
  trailing,
  onAdd,
  onRemove,
}: {
  row: ServiceRow;
  catalogue: CatalogueProduct[];
  portalContainer: HTMLDivElement | null;
  onChange: (patch: Partial<ServiceRow>) => void;
  trailing: "add" | "remove" | "none";
  onAdd: () => void;
  onRemove: () => void;
}) {
  const [suggestOpen, setSuggestOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = row.serviceName.trim();
    if (!q) return catalogue.slice(0, 30);
    return catalogue
      .map((p) => ({ p, score: scoreMatch(p, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ p }) => p);
  }, [row.serviceName, catalogue]);

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogueProduct[]>();
    for (const p of filtered) {
      const key = p.section || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    // Order sections by priority (Women's first), keeping the original
    // insertion order as the tie-break for anything outside the priority list.
    return new Map(
      Array.from(map.entries()).sort(
        ([a], [b]) => sectionRank(a) - sectionRank(b),
      ),
    );
  }, [filtered]);

  // As the query changes the ranking changes, so scroll the list back to the
  // top to keep the best matches in view (no-op if already at the top).
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [row.serviceName]);

  function selectSuggestion(p: CatalogueProduct) {
    onChange({ serviceName: p.name, price: String(p.price) });
    setSuggestOpen(false);
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <Popover
          open={suggestOpen && filtered.length > 0}
          onOpenChange={setSuggestOpen}
        >
          <PopoverAnchor asChild>
            <Input
              placeholder="e.g., Haircut"
              value={row.serviceName}
              autoComplete="off"
              onChange={(e) => {
                onChange({ serviceName: e.target.value });
                setSuggestOpen(true);
              }}
              onFocus={() => setSuggestOpen(true)}
            />
          </PopoverAnchor>
          <PopoverContent
            ref={listRef}
            container={portalContainer}
            // Wider than the name input: extends across the price field and the
            // +/× button (≈8rem of row to the right) so service names wrap less.
            className="p-0 w-[calc(var(--radix-popover-trigger-width)_+_8rem)] max-h-60 overflow-y-auto overscroll-contain rounded-lg border border-orange-100 bg-white dark:bg-gray-900 shadow-xl"
            onOpenAutoFocus={(e) => e.preventDefault()}
            // Keep suggestions open while typing (see staff field for rationale).
            onFocusOutside={(e) => e.preventDefault()}
            align="start"
            sideOffset={6}
          >
            {Array.from(grouped.entries()).map(([section, items], gi) => (
              <div key={section}>
                <div className={`sticky top-0 z-10 flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 ${gi > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""}`}>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
                    {section}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{items.length}</span>
                </div>
                {items.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-orange-50 dark:hover:bg-orange-500/10 active:bg-orange-100 dark:active:bg-orange-500/15 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSuggestion(p);
                    }}
                  >
                    <span className="flex-1 min-w-0 text-[13px] text-gray-800 dark:text-gray-100 leading-snug break-words">
                      {p.name}
                    </span>
                    <span className="shrink-0 text-[12px] font-semibold text-orange-500 bg-orange-50 dark:bg-orange-500/10 rounded px-1.5 py-0.5 whitespace-nowrap">
                      ₹{p.price.toLocaleString("en-IN")}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </PopoverContent>
        </Popover>
      </div>
      <Input
        type="number"
        placeholder="₹0"
        min="0"
        className="w-20 sm:w-24 shrink-0"
        value={row.price}
        onChange={(e) => onChange({ price: e.target.value })}
      />
      {trailing === "add" && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Add another service"
          className="shrink-0 h-9 w-9 border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-700 dark:hover:text-orange-300"
          onClick={onAdd}
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
      {trailing === "remove" && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Remove service"
          className="shrink-0 h-9 w-9 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {trailing === "none" && <div className="w-9 shrink-0" />}
    </div>
  );
}
