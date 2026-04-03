"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { LiabilitySchema, PaymentEntrySchema } from "@/lib/validators";
import type { LiabilityWithPayments } from "@/lib/types";

// ─── Serialize ────────────────────────────────────────────────────────────────

type PrismaLiability = Awaited<ReturnType<typeof prisma.liability.findMany>>[0];
type PrismaPaymentEntry = Awaited<ReturnType<typeof prisma.paymentEntry.findMany>>[0];

function serializeLiability(
  liability: PrismaLiability & { payments: PrismaPaymentEntry[] },
): LiabilityWithPayments {
  const totalPaid = Math.max(0, liability.originalAmount - liability.outstandingBalance);
  const paidPercent =
    liability.originalAmount > 0 ? (totalPaid / liability.originalAmount) * 100 : 0;
  return {
    id: liability.id,
    name: liability.name,
    type: liability.type as LiabilityWithPayments["type"],
    currency: liability.currency as LiabilityWithPayments["currency"],
    lender: liability.lender,
    originalAmount: liability.originalAmount,
    outstandingBalance: liability.outstandingBalance,
    interestRate: liability.interestRate,
    monthlyEMI: liability.monthlyEMI,
    startDate: liability.startDate.toISOString(),
    endDate: liability.endDate ? liability.endDate.toISOString() : null,
    notes: liability.notes,
    createdAt: liability.createdAt.toISOString(),
    updatedAt: liability.updatedAt.toISOString(),
    payments: liability.payments.map((p) => ({
      id: p.id,
      liabilityId: p.liabilityId,
      date: p.date.toISOString(),
      amount: p.amount,
      balanceAfter: p.balanceAfter,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
    })),
    totalPaid,
    paidPercent,
  };
}

// ─── Getters ──────────────────────────────────────────────────────────────────

export async function getLiabilities(): Promise<LiabilityWithPayments[]> {
  const liabilities = await prisma.liability.findMany({
    include: { payments: { orderBy: { date: "desc" } } },
    orderBy: { createdAt: "desc" },
  });
  return liabilities.map(serializeLiability);
}

export async function getLiability(id: string): Promise<LiabilityWithPayments | null> {
  const liability = await prisma.liability.findUnique({
    where: { id },
    include: { payments: { orderBy: { date: "desc" } } },
  });
  if (!liability) return null;
  return serializeLiability(liability);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createLiability(data: unknown) {
  const parsed = LiabilitySchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const d = parsed.data;
  const liability = await prisma.liability.create({
    data: {
      name: d.name,
      type: d.type,
      currency: d.currency,
      lender: d.lender,
      originalAmount: d.originalAmount,
      outstandingBalance: d.outstandingBalance,
      interestRate: d.interestRate,
      monthlyEMI: d.monthlyEMI,
      startDate: d.startDate,
      endDate: d.endDate,
      notes: d.notes,
      payments: {
        create: {
          date: d.startDate,
          amount: 0,
          balanceAfter: d.outstandingBalance,
          notes: "Opening balance",
        },
      },
    },
    include: { payments: { orderBy: { date: "desc" } } },
  });
  revalidatePath("/liabilities");
  return { data: serializeLiability(liability) };
}

export async function deleteLiability(id: string) {
  await prisma.liability.delete({ where: { id } });
  revalidatePath("/liabilities");
  return { success: true };
}

export async function createPaymentEntry(data: unknown) {
  const parsed = PaymentEntrySchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const d = parsed.data;
  const [, liability] = await prisma.$transaction([
    prisma.paymentEntry.create({
      data: {
        liabilityId: d.liabilityId,
        date: d.date,
        amount: d.amount,
        balanceAfter: d.balanceAfter,
        notes: d.notes,
      },
    }),
    prisma.liability.update({
      where: { id: d.liabilityId },
      data: { outstandingBalance: d.balanceAfter },
      include: { payments: { orderBy: { date: "desc" } } },
    }),
  ]);
  revalidatePath("/liabilities");
  return { data: serializeLiability(liability) };
}

export async function deletePaymentEntry(id: string, liabilityId: string) {
  await prisma.paymentEntry.delete({ where: { id } });
  // Reset outstandingBalance to the most recent remaining entry's balanceAfter
  const [latest, original] = await Promise.all([
    prisma.paymentEntry.findFirst({
      where: { liabilityId },
      orderBy: { date: "desc" },
    }),
    prisma.liability.findUnique({ where: { id: liabilityId } }),
  ]);
  await prisma.liability.update({
    where: { id: liabilityId },
    data: { outstandingBalance: latest ? latest.balanceAfter : (original?.originalAmount ?? 0) },
  });
  revalidatePath("/liabilities");
  return { success: true };
}
