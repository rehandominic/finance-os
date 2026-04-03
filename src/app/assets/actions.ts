"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AssetSchema, ValuationEntrySchema } from "@/lib/validators";
import { AssetType, ValuationSource } from "@/generated/prisma/client";
import type { AssetWithValuations } from "@/lib/types";

// ─── Auto-calculation helpers ─────────────────────────────────────────────────

function calcDepreciatedValue(purchasePrice: number, depreciationRate: number, purchaseDate: Date): number {
  const yearsElapsed = (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return purchasePrice * Math.pow(1 - depreciationRate / 100, yearsElapsed);
}

function calcAccruedFDValue(principal: number, interestRate: number, purchaseDate: Date, maturityDate?: Date | null): number {
  const endDate = maturityDate && maturityDate > new Date() ? new Date() : (maturityDate ?? new Date());
  const yearsElapsed = (endDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return principal * Math.pow(1 + interestRate / 100, Math.max(0, yearsElapsed));
}

// ─── Serialize ────────────────────────────────────────────────────────────────

function serializeAsset(asset: Awaited<ReturnType<typeof prisma.asset.findMany>>[0] & {
  valuations: Awaited<ReturnType<typeof prisma.valuationEntry.findMany>>;
}): AssetWithValuations {
  const appreciation = asset.currentValue - asset.purchasePrice;
  const appreciationPercent = asset.purchasePrice > 0 ? (appreciation / asset.purchasePrice) * 100 : 0;
  return {
    id: asset.id,
    name: asset.name,
    description: asset.description,
    type: asset.type as AssetWithValuations["type"],
    currency: asset.currency as AssetWithValuations["currency"],
    purchaseDate: asset.purchaseDate.toISOString(),
    purchasePrice: asset.purchasePrice,
    currentValue: asset.currentValue,
    notes: asset.notes,
    location: asset.location,
    areaQty: asset.areaQty,
    areaUnit: asset.areaUnit,
    depreciationRate: asset.depreciationRate,
    interestRate: asset.interestRate,
    maturityDate: asset.maturityDate ? asset.maturityDate.toISOString() : null,
    principal: asset.principal,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
    valuations: asset.valuations.map((v) => ({
      id: v.id,
      assetId: v.assetId,
      date: v.date.toISOString(),
      value: v.value,
      source: v.source as AssetWithValuations["valuations"][0]["source"],
      notes: v.notes,
      createdAt: v.createdAt.toISOString(),
    })),
    appreciation,
    appreciationPercent,
  };
}

// ─── Getters ──────────────────────────────────────────────────────────────────

export async function getAssets(): Promise<AssetWithValuations[]> {
  const assets = await prisma.asset.findMany({
    include: { valuations: { orderBy: { date: "desc" } } },
    orderBy: { createdAt: "desc" },
  });
  return assets.map(serializeAsset);
}

export async function getAsset(id: string): Promise<AssetWithValuations | null> {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: { valuations: { orderBy: { date: "desc" } } },
  });
  if (!asset) return null;
  return serializeAsset(asset);
}

// ─── Auto-update valuations ───────────────────────────────────────────────────

export async function runAutoCalculations() {
  const assets = await prisma.asset.findMany({ include: { valuations: true } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const asset of assets) {
    let newValue: number | null = null;
    let source: ValuationSource | null = null;

    if (asset.type === AssetType.VEHICLE && asset.depreciationRate) {
      newValue = Math.max(0, calcDepreciatedValue(asset.purchasePrice, asset.depreciationRate, asset.purchaseDate));
      source = ValuationSource.AUTO_DEPRECIATION;
    } else if (asset.type === AssetType.CASH_FD && asset.interestRate && asset.principal) {
      newValue = calcAccruedFDValue(asset.principal, asset.interestRate, asset.purchaseDate, asset.maturityDate);
      source = ValuationSource.AUTO_INTEREST;
    }

    if (newValue !== null && source !== null) {
      const alreadyToday = asset.valuations.some((v) => {
        const d = new Date(v.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime() && v.source === source;
      });
      if (!alreadyToday) {
        await prisma.asset.update({
          where: { id: asset.id },
          data: {
            currentValue: newValue,
            valuations: {
              create: { date: new Date(), value: newValue, source },
            },
          },
        });
      }
    }
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createAsset(data: unknown) {
  const parsed = AssetSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const d = parsed.data;
  const asset = await prisma.asset.create({
    data: {
      name: d.name,
      description: d.description,
      type: d.type,
      currency: d.currency,
      purchaseDate: d.purchaseDate,
      purchasePrice: d.purchasePrice,
      currentValue: d.currentValue,
      notes: d.notes,
      location: d.location,
      areaQty: d.areaQty,
      areaUnit: d.areaUnit,
      depreciationRate: d.depreciationRate,
      interestRate: d.interestRate,
      maturityDate: d.maturityDate,
      principal: d.principal,
      valuations: {
        create: {
          date: d.purchaseDate,
          value: d.purchasePrice,
          source: ValuationSource.PURCHASE,
        },
      },
    },
    include: { valuations: { orderBy: { date: "desc" } } },
  });
  revalidatePath("/assets");
  return { data: serializeAsset(asset) };
}

export async function updateAsset(id: string, data: unknown) {
  const parsed = AssetSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const asset = await prisma.asset.update({
    where: { id },
    data: parsed.data,
    include: { valuations: { orderBy: { date: "desc" } } },
  });
  revalidatePath("/assets");
  return { data: serializeAsset(asset) };
}

export async function deleteAsset(id: string) {
  await prisma.asset.delete({ where: { id } });
  revalidatePath("/assets");
  return { success: true };
}

export async function createValuationEntry(data: unknown) {
  const parsed = ValuationEntrySchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const d = parsed.data;
  const [entry] = await prisma.$transaction([
    prisma.valuationEntry.create({
      data: { assetId: d.assetId, date: d.date, value: d.value, source: d.source, notes: d.notes },
    }),
    prisma.asset.update({
      where: { id: d.assetId },
      data: { currentValue: d.value },
    }),
  ]);
  revalidatePath("/assets");
  return { data: entry };
}

export async function deleteValuationEntry(id: string, assetId: string) {
  await prisma.valuationEntry.delete({ where: { id } });
  // Set currentValue to the most recent remaining valuation
  const latest = await prisma.valuationEntry.findFirst({
    where: { assetId },
    orderBy: { date: "desc" },
  });
  if (latest) {
    await prisma.asset.update({
      where: { id: assetId },
      data: { currentValue: latest.value },
    });
  }
  revalidatePath("/assets");
  return { success: true };
}
