"use client";

/**
 * Edit Investment Page (client component)
 *
 * Design tokens — same as add/page.tsx:
 *   Label          — text-sm font-medium text-foreground
 *   Optional hint  — text-xs text-muted-foreground font-normal (inline)
 *   Input / Select — h-10, rounded-lg, w-full
 *   Field gap      — gap-2
 *   Section card   — rounded-xl border bg-card, inline style padding 24px
 *   Section head   — text-xs font-semibold uppercase tracking-widest text-muted-foreground
 *   Section rows   — space-y-4
 *   Page sections  — space-y-6 (inline style gap 24px)
 *   Button         — h-12, full width
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InvestmentWithStats, SerializedTransaction, INVESTMENT_TYPE_LABELS } from "@/lib/types";
import { InvestmentType, Geography, Currency, TransactionType } from "@/lib/enums";
import {
  updateInvestment,
  updateTransaction,
  deleteTransaction,
  createTransaction,
} from "../../actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type InvForm = {
  name: string;
  ticker: string;
  yahooTicker: string;
  type: InvestmentType;
  currency: Currency;
  sector: string;
  currentPrice: string;
  notes: string;
};

type TxForm = {
  id: string | null; // null = new
  date: string;
  type: TransactionType;
  quantity: string;
  pricePerUnit: string;
  fees: string;
  notes: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTORS = [
  "Technology", "Finance", "Healthcare", "Energy",
  "Consumer", "Real Estate", "Metals", "Other",
];

const TX_TYPE_OPTIONS = [
  { value: TransactionType.BUY,      label: "Buy"      },
  { value: TransactionType.SELL,     label: "Sell"     },
  { value: TransactionType.SIP,      label: "SIP"      },
  { value: TransactionType.DIVIDEND, label: "Dividend" },
];

// ─── Small shared components ──────────────────────────────────────────────────

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <span className="text-sm font-medium text-foreground">
      {children}
      {optional && (
        <span className="text-xs text-muted-foreground font-normal ml-1">(optional)</span>
      )}
    </span>
  );
}

function Field({
  label,
  optional,
  error,
  children,
}: {
  label: string;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label optional={optional}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card" style={{ padding: "24px" }}>
      <p
        className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        style={{ marginBottom: "16px" }}
      >
        {title}
      </p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ─── Transaction row ─────────────────────────────────────────────────────────

function TxRow({
  tx,
  sym,
  onSave,
  onDelete,
  isSaving,
}: {
  tx: TxForm;
  sym: string;
  onSave: (updated: TxForm) => void;
  onDelete: () => void;
  isSaving: boolean;
}) {
  const [local, setLocal] = useState<TxForm>(tx);
  const [errors, setErrors] = useState<Partial<Record<keyof TxForm, string>>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isNew = tx.id === null;

  function set<K extends keyof TxForm>(key: K, value: TxForm[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof TxForm, string>> = {};
    if (!local.date) errs.date = "Required";
    if (!local.quantity || Number(local.quantity) <= 0) errs.quantity = "Must be > 0";
    if (!local.pricePerUnit || Number(local.pricePerUnit) <= 0) errs.pricePerUnit = "Must be > 0";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (validate()) onSave(local);
  }

  const isDirty = JSON.stringify(local) !== JSON.stringify(tx);
  const total =
    Number(local.quantity) > 0 && Number(local.pricePerUnit) > 0
      ? Number(local.quantity) * Number(local.pricePerUnit) + (Number(local.fees) || 0)
      : null;

  return (
    <>
      <div className="rounded-lg border bg-muted/20" style={{ padding: "16px" }}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={local.date}
                onChange={(e) => set("date", e.target.value)}
                className={`h-10 ${errors.date ? "border-destructive" : ""}`}
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select value={local.type} onValueChange={(v) => set("type", v as TransactionType)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TX_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={local.quantity}
                onChange={(e) => set("quantity", e.target.value)}
                placeholder="0"
                className={`h-10 font-mono ${errors.quantity ? "border-destructive" : ""}`}
              />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Price per Unit ({sym})</Label>
              <Input
                type="number"
                value={local.pricePerUnit}
                onChange={(e) => set("pricePerUnit", e.target.value)}
                placeholder="0.00"
                className={`h-10 font-mono ${errors.pricePerUnit ? "border-destructive" : ""}`}
              />
              {errors.pricePerUnit && <p className="text-xs text-destructive">{errors.pricePerUnit}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label optional>Fees ({sym})</Label>
              <Input
                type="number"
                value={local.fees}
                onChange={(e) => set("fees", e.target.value)}
                placeholder="0"
                className="h-10 font-mono"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label optional>Notes</Label>
              <Input
                value={local.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Optional"
                className="h-10"
              />
            </div>
          </div>

          {total !== null && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-mono text-sm font-semibold">
                {sym}{total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {(isDirty || isNew) && (
              <Button
                size="sm"
                className="h-9 text-sm flex-1"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving…" : isNew ? "Add Transaction" : "Save Changes"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteOpen(true)}
              disabled={isSaving}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this transaction. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setDeleteOpen(false); onDelete(); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toTxForm(t: SerializedTransaction): TxForm {
  return {
    id: t.id,
    date: t.date.split("T")[0],
    type: t.type as TransactionType,
    quantity: String(t.quantity),
    pricePerUnit: String(t.pricePerUnit),
    fees: String(t.fees),
    notes: t.notes ?? "",
  };
}

function emptyTxForm(): TxForm {
  return {
    id: null,
    date: new Date().toISOString().split("T")[0],
    type: TransactionType.BUY,
    quantity: "",
    pricePerUnit: "",
    fees: "0",
    notes: "",
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EditInvestmentClient({ investment }: { investment: InvestmentWithStats }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Investment form state
  const [inv, setInv] = useState<InvForm>({
    name: investment.name,
    ticker: investment.ticker ?? "",
    yahooTicker: investment.yahooTicker ?? "",
    type: investment.type as InvestmentType,
    currency: investment.currency as Currency,
    sector: investment.sector ?? "",
    currentPrice: String(investment.currentPrice),
    notes: investment.notes ?? "",
  });
  const [invErrors, setInvErrors] = useState<Partial<Record<keyof InvForm, string>>>({});

  // Transactions state
  const [txList, setTxList] = useState<TxForm[]>(
    investment.transactions.map(toTxForm)
  );
  const [savingTxId, setSavingTxId] = useState<string | null>(null); // "new" or tx.id

  function setInvField<K extends keyof InvForm>(key: K, value: InvForm[K]) {
    setInv((prev) => ({ ...prev, [key]: value }));
    setInvErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validateInv(): boolean {
    const errs: Partial<Record<keyof InvForm, string>> = {};
    if (!inv.name.trim()) errs.name = "Required";
    if (!inv.currentPrice || Number(inv.currentPrice) <= 0) errs.currentPrice = "Enter a positive price";
    setInvErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSaveInvestment() {
    if (!validateInv()) return;
    startTransition(async () => {
      try {
        await updateInvestment(investment.id, {
          name: inv.name.trim(),
          ticker: inv.ticker.trim() || undefined,
          yahooTicker: inv.yahooTicker.trim() || undefined,
          type: inv.type,
          currency: inv.currency,
          sector: inv.sector.trim() || undefined,
          currentPrice: Number(inv.currentPrice),
          notes: inv.notes.trim() || undefined,
        });
        toast.success("Investment updated");
      } catch (err) {
        toast.error("Failed to update investment");
        console.error(err);
      }
    });
  }

  async function handleSaveTx(txForm: TxForm) {
    const key = txForm.id ?? "new";
    setSavingTxId(key);
    try {
      if (txForm.id === null) {
        // create
        const created = await createTransaction({
          investmentId: investment.id,
          date: new Date(txForm.date),
          type: txForm.type,
          quantity: Number(txForm.quantity),
          pricePerUnit: Number(txForm.pricePerUnit),
          fees: Number(txForm.fees) || 0,
          notes: txForm.notes.trim() || undefined,
        });
        setTxList((prev) =>
          prev.map((t) => (t.id === null ? { ...txForm, id: created.id } : t))
        );
        toast.success("Transaction added");
      } else {
        await updateTransaction(txForm.id, {
          investmentId: investment.id,
          date: new Date(txForm.date),
          type: txForm.type,
          quantity: Number(txForm.quantity),
          pricePerUnit: Number(txForm.pricePerUnit),
          fees: Number(txForm.fees) || 0,
          notes: txForm.notes.trim() || undefined,
        });
        setTxList((prev) =>
          prev.map((t) => (t.id === txForm.id ? txForm : t))
        );
        toast.success("Transaction saved");
      }
    } catch (err) {
      toast.error("Failed to save transaction");
      console.error(err);
    } finally {
      setSavingTxId(null);
    }
  }

  async function handleDeleteTx(txForm: TxForm) {
    if (txForm.id === null) {
      // just remove the unsaved new row
      setTxList((prev) => prev.filter((t) => t.id !== null || t !== txForm));
      return;
    }
    setSavingTxId(txForm.id);
    try {
      await deleteTransaction(txForm.id);
      setTxList((prev) => prev.filter((t) => t.id !== txForm.id));
      toast.success("Transaction deleted");
    } catch (err) {
      toast.error("Failed to delete transaction");
      console.error(err);
    } finally {
      setSavingTxId(null);
    }
  }

  function addNewTxRow() {
    setTxList((prev) => [emptyTxForm(), ...prev]);
  }

  const sym = inv.currency === Currency.INR ? "₹" : "$";

  return (
    <div className="max-w-lg mx-auto pb-10" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 -ml-1"
          onClick={() => router.push("/investments")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back to investments</span>
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-snug truncate">{investment.name}</h1>
          <p className="text-xs text-muted-foreground">Edit investment &amp; transactions</p>
        </div>
      </div>

      {/* ── Investment Details ── */}
      <SectionCard title="Investment Details">
        <Field label="Name" error={invErrors.name}>
          <Input
            value={inv.name}
            onChange={(e) => setInvField("name", e.target.value)}
            placeholder="e.g. Reliance Industries"
            className={`h-10 ${invErrors.name ? "border-destructive" : ""}`}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Ticker" optional>
            <Input
              value={inv.ticker}
              onChange={(e) => setInvField("ticker", e.target.value)}
              placeholder="RELIANCE.NS"
              className="h-10 font-mono"
            />
          </Field>
          <Field label="Yahoo Ticker" optional>
            <Input
              value={inv.yahooTicker}
              onChange={(e) => setInvField("yahooTicker", e.target.value)}
              placeholder="RELIANCE.NS"
              className="h-10 font-mono"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Type">
            <Select value={inv.type} onValueChange={(v) => setInvField("type", v as InvestmentType)}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INVESTMENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Currency">
            <Select value={inv.currency} onValueChange={(v) => setInvField("currency", v as Currency)}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Currency.INR}>INR (₹)</SelectItem>
                <SelectItem value={Currency.USD}>USD ($)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Sector" optional>
            <Select
              value={inv.sector || "none"}
              onValueChange={(v) => setInvField("sector", !v || v === "none" ? "" : v)}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Select sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {SECTORS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={`Current Price (${sym})`} error={invErrors.currentPrice}>
            <Input
              type="number"
              value={inv.currentPrice}
              onChange={(e) => setInvField("currentPrice", e.target.value)}
              placeholder="0.00"
              className={`h-10 font-mono ${invErrors.currentPrice ? "border-destructive" : ""}`}
            />
          </Field>
        </div>

        <Field label="Notes" optional>
          <Input
            value={inv.notes}
            onChange={(e) => setInvField("notes", e.target.value)}
            placeholder="Any notes about this investment"
            className="h-10"
          />
        </Field>

        <div style={{ paddingTop: "4px" }}>
          <Button
            className="w-full"
            style={{ height: "44px", fontSize: "15px" }}
            onClick={handleSaveInvestment}
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save Investment Details"}
          </Button>
        </div>
      </SectionCard>

      {/* ── Transactions ── */}
      <SectionCard title="Transactions">
        <div className="flex items-center justify-between" style={{ marginBottom: "4px" }}>
          <span className="text-sm text-muted-foreground">
            {txList.filter((t) => t.id !== null).length} transaction
            {txList.filter((t) => t.id !== null).length !== 1 ? "s" : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-sm gap-1.5"
            onClick={addNewTxRow}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Transaction
          </Button>
        </div>

        {txList.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No transactions yet.
          </p>
        ) : (
          <div className="space-y-3">
            {txList.map((tx, i) => (
              <TxRow
                key={tx.id ?? `new-${i}`}
                tx={tx}
                sym={sym}
                onSave={handleSaveTx}
                onDelete={() => handleDeleteTx(tx)}
                isSaving={savingTxId === (tx.id ?? "new")}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Back button ── */}
      <div style={{ paddingTop: "4px" }}>
        <Button
          variant="outline"
          className="w-full"
          style={{ height: "48px", fontSize: "15px" }}
          onClick={() => router.push("/investments")}
        >
          Back to Portfolio
        </Button>
      </div>
    </div>
  );
}
