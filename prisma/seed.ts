import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient, InvestmentType, Geography, Currency, TransactionType } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  // Clear existing data
  await prisma.transaction.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.settings.deleteMany();

  // Settings
  await prisma.settings.create({ data: { id: "singleton", exchangeRate: 84 } });

  // 1. Reliance Industries
  await prisma.investment.create({
    data: {
      name: "Reliance Industries",
      ticker: "RELIANCE.NS",
      yahooTicker: "RELIANCE.NS",
      type: InvestmentType.INDIA_STOCK,
      geography: Geography.INDIA,
      currency: Currency.INR,
      sector: "Energy",
      currentPrice: 2890,
      previousClose: 2865,
      transactions: {
        create: [
          { date: daysAgo(480), type: TransactionType.BUY, quantity: 20, pricePerUnit: 2300, fees: 50 },
          { date: daysAgo(360), type: TransactionType.BUY, quantity: 15, pricePerUnit: 2500, fees: 40 },
          { date: daysAgo(200), type: TransactionType.BUY, quantity: 15, pricePerUnit: 2550, fees: 40 },
          { date: daysAgo(120), type: TransactionType.SELL, quantity: 10, pricePerUnit: 2750, fees: 30, notes: "Partial profit booking" },
          { date: daysAgo(30), type: TransactionType.DIVIDEND, quantity: 0, pricePerUnit: 1800, notes: "Annual dividend" },
        ],
      },
    },
  });

  // 2. Infosys
  await prisma.investment.create({
    data: {
      name: "Infosys",
      ticker: "INFY.NS",
      yahooTicker: "INFY.NS",
      type: InvestmentType.INDIA_STOCK,
      geography: Geography.INDIA,
      currency: Currency.INR,
      sector: "Technology",
      currentPrice: 1620,
      previousClose: 1598,
      transactions: {
        create: [
          { date: daysAgo(400), type: TransactionType.BUY, quantity: 40, pricePerUnit: 1400, fees: 35 },
          { date: daysAgo(300), type: TransactionType.BUY, quantity: 30, pricePerUnit: 1450, fees: 30 },
          { date: daysAgo(150), type: TransactionType.BUY, quantity: 30, pricePerUnit: 1480, fees: 30 },
          { date: daysAgo(60), type: TransactionType.DIVIDEND, quantity: 0, pricePerUnit: 2100, notes: "Interim dividend" },
        ],
      },
    },
  });

  // 3. Axis Bluechip Fund
  await prisma.investment.create({
    data: {
      name: "Axis Bluechip Fund",
      ticker: "0P0000XVSL.BO",
      yahooTicker: "0P0000XVSL.BO",
      type: InvestmentType.INDIA_MF,
      geography: Geography.INDIA,
      currency: Currency.INR,
      sector: "Large Cap",
      currentPrice: 55,
      previousClose: 54.5,
      transactions: {
        create: [
          { date: daysAgo(500), type: TransactionType.SIP, quantity: 500, pricePerUnit: 44, fees: 0 },
          { date: daysAgo(470), type: TransactionType.SIP, quantity: 480, pricePerUnit: 46, fees: 0 },
          { date: daysAgo(440), type: TransactionType.SIP, quantity: 460, pricePerUnit: 48, fees: 0 },
          { date: daysAgo(410), type: TransactionType.SIP, quantity: 430, pricePerUnit: 51, fees: 0 },
          { date: daysAgo(380), type: TransactionType.SIP, quantity: 380, pricePerUnit: 52.5, fees: 0 },
        ],
      },
    },
  });

  // 4. Parag Parikh Flexi Cap
  await prisma.investment.create({
    data: {
      name: "Parag Parikh Flexi Cap",
      ticker: "0P0001AMGJ.BO",
      yahooTicker: "0P0001AMGJ.BO",
      type: InvestmentType.INDIA_MF,
      geography: Geography.INDIA,
      currency: Currency.INR,
      sector: "Flexi Cap",
      currentPrice: 61,
      previousClose: 60.2,
      transactions: {
        create: [
          { date: daysAgo(520), type: TransactionType.SIP, quantity: 400, pricePerUnit: 50, fees: 0 },
          { date: daysAgo(490), type: TransactionType.SIP, quantity: 390, pricePerUnit: 51.5, fees: 0 },
          { date: daysAgo(460), type: TransactionType.SIP, quantity: 380, pricePerUnit: 52, fees: 0 },
          { date: daysAgo(430), type: TransactionType.SIP, quantity: 360, pricePerUnit: 53, fees: 0 },
          { date: daysAgo(400), type: TransactionType.SIP, quantity: 270, pricePerUnit: 55, fees: 0 },
        ],
      },
    },
  });

  // 5. Apple Inc
  await prisma.investment.create({
    data: {
      name: "Apple Inc",
      ticker: "AAPL",
      yahooTicker: "AAPL",
      type: InvestmentType.US_STOCK,
      geography: Geography.US,
      currency: Currency.USD,
      sector: "Technology",
      currentPrice: 195,
      previousClose: 192,
      transactions: {
        create: [
          { date: daysAgo(450), type: TransactionType.BUY, quantity: 5, pricePerUnit: 160, fees: 1 },
          { date: daysAgo(300), type: TransactionType.BUY, quantity: 3, pricePerUnit: 170, fees: 1 },
          { date: daysAgo(150), type: TransactionType.BUY, quantity: 2, pricePerUnit: 175, fees: 1 },
          { date: daysAgo(45), type: TransactionType.DIVIDEND, quantity: 0, pricePerUnit: 2.4, notes: "Q1 dividend" },
        ],
      },
    },
  });

  // 6. VOO
  await prisma.investment.create({
    data: {
      name: "Vanguard S&P 500 ETF",
      ticker: "VOO",
      yahooTicker: "VOO",
      type: InvestmentType.US_ETF,
      geography: Geography.US,
      currency: Currency.USD,
      sector: "Broad Market",
      currentPrice: 465,
      previousClose: 461,
      transactions: {
        create: [
          { date: daysAgo(500), type: TransactionType.BUY, quantity: 5, pricePerUnit: 390, fees: 0 },
          { date: daysAgo(350), type: TransactionType.BUY, quantity: 5, pricePerUnit: 420, fees: 0 },
          { date: daysAgo(200), type: TransactionType.BUY, quantity: 5, pricePerUnit: 435, fees: 0 },
        ],
      },
    },
  });

  // 7. Bitcoin
  await prisma.investment.create({
    data: {
      name: "Bitcoin",
      ticker: "BTC-USD",
      yahooTicker: "BTC-USD",
      type: InvestmentType.CRYPTO,
      geography: Geography.OTHER,
      currency: Currency.USD,
      currentPrice: 67500,
      previousClose: 66200,
      transactions: {
        create: [
          { date: daysAgo(480), type: TransactionType.BUY, quantity: 0.1, pricePerUnit: 38000, fees: 30 },
          { date: daysAgo(350), type: TransactionType.BUY, quantity: 0.1, pricePerUnit: 42000, fees: 30 },
          { date: daysAgo(200), type: TransactionType.BUY, quantity: 0.05, pricePerUnit: 52000, fees: 20 },
        ],
      },
    },
  });

  // 8. Private Startup
  await prisma.investment.create({
    data: {
      name: "Friend's Startup (Private)",
      type: InvestmentType.PRIVATE,
      geography: Geography.INDIA,
      currency: Currency.INR,
      currentPrice: 750000,
      previousClose: null,
      notes: "Angel investment — pre-series A",
      transactions: {
        create: [
          { date: daysAgo(540), type: TransactionType.BUY, quantity: 1, pricePerUnit: 500000, fees: 0, notes: "Initial investment" },
        ],
      },
    },
  });

  console.log("✅ Seed data created successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
