"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { IncomeSourceSchema, BudgetBucketSchema } from "@/lib/validators";
import type { SerializedIncomeSource, SerializedBudgetBucket } from "@/lib/types";

// ─── Serialize ────────────────────────────────────────────────────────────────

type PrismaIncomeSource = Awaited<ReturnType<typeof prisma.incomeSource.findMany>>[0];
type PrismaBudgetBucket = Awaited<ReturnType<typeof prisma.budgetBucket.findMany>>[0];

function serializeIncomeSource(s: PrismaIncomeSource): SerializedIncomeSource {
  return {
    id: s.id,
    name: s.name,
    amount: s.amount,
    currency: s.currency as SerializedIncomeSource["currency"],
    notes: s.notes,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function serializeBudgetBucket(b: PrismaBudgetBucket): SerializedBudgetBucket {
  return {
    id: b.id,
    name: b.name,
    type: b.type as SerializedBudgetBucket["type"],
    amount: b.amount,
    currency: b.currency as SerializedBudgetBucket["currency"],
    color: b.color,
    order: b.order,
    notes: b.notes,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

// ─── Getters ──────────────────────────────────────────────────────────────────

export async function getIncomeSources(): Promise<SerializedIncomeSource[]> {
  const sources = await prisma.incomeSource.findMany({ orderBy: { createdAt: "asc" } });
  return sources.map(serializeIncomeSource);
}

export async function getIncomeSource(id: string): Promise<SerializedIncomeSource | null> {
  const s = await prisma.incomeSource.findUnique({ where: { id } });
  if (!s) return null;
  return serializeIncomeSource(s);
}

export async function getBudgetBuckets(): Promise<SerializedBudgetBucket[]> {
  const buckets = await prisma.budgetBucket.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return buckets.map(serializeBudgetBucket);
}

export async function getBudgetBucket(id: string): Promise<SerializedBudgetBucket | null> {
  const b = await prisma.budgetBucket.findUnique({ where: { id } });
  if (!b) return null;
  return serializeBudgetBucket(b);
}

// ─── Income source mutations ──────────────────────────────────────────────────

export async function createIncomeSource(data: unknown) {
  const parsed = IncomeSourceSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const s = await prisma.incomeSource.create({ data: parsed.data });
  revalidatePath("/cashflow");
  return { data: serializeIncomeSource(s) };
}

export async function updateIncomeSource(id: string, data: unknown) {
  const parsed = IncomeSourceSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const s = await prisma.incomeSource.update({ where: { id }, data: parsed.data });
  revalidatePath("/cashflow");
  return { data: serializeIncomeSource(s) };
}

export async function deleteIncomeSource(id: string) {
  await prisma.incomeSource.delete({ where: { id } });
  revalidatePath("/cashflow");
  return { success: true };
}

// ─── Budget bucket mutations ──────────────────────────────────────────────────

export async function createBudgetBucket(data: unknown) {
  const parsed = BudgetBucketSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const b = await prisma.budgetBucket.create({ data: parsed.data });
  revalidatePath("/cashflow");
  return { data: serializeBudgetBucket(b) };
}

export async function updateBudgetBucket(id: string, data: unknown) {
  const parsed = BudgetBucketSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const b = await prisma.budgetBucket.update({ where: { id }, data: parsed.data });
  revalidatePath("/cashflow");
  return { data: serializeBudgetBucket(b) };
}

export async function deleteBudgetBucket(id: string) {
  await prisma.budgetBucket.delete({ where: { id } });
  revalidatePath("/cashflow");
  return { success: true };
}

// ─── Import EMIs from Liabilities ────────────────────────────────────────────

export async function importEMIsFromLiabilities() {
  const [liabilities, existingBuckets] = await Promise.all([
    prisma.liability.findMany({
      where: { outstandingBalance: { gt: 0 }, monthlyEMI: { not: null } },
    }),
    prisma.budgetBucket.findMany({ where: { type: "EMI" }, select: { name: true } }),
  ]);

  const existingNames = new Set(existingBuckets.map((b) => b.name.toLowerCase()));

  const toCreate = liabilities.filter(
    (l) => l.monthlyEMI != null && !existingNames.has(l.name.toLowerCase())
  );

  if (toCreate.length === 0) return { count: 0 };

  await prisma.budgetBucket.createMany({
    data: toCreate.map((l, i) => ({
      name: l.name,
      type: "EMI" as const,
      amount: l.monthlyEMI!,
      currency: l.currency,
      order: 1000 + i,
    })),
  });

  revalidatePath("/cashflow");
  return { count: toCreate.length };
}
