// IMPORTANT: this must be the very first import.
// ES module imports are evaluated in listed order, and each imported module
// runs fully before the *next* import is loaded. customersRouter/productsRouter/etc
// (further below) transitively import src/db/index.ts, which reads
// process.env.SQL_HOST/SQL_USER/... at import time to create the Postgres pool.
// If dotenv.config() runs after those imports (as a normal statement later in this
// file), .env has not been loaded yet and the pool is created with undefined
// credentials -> every DB-backed route (customers/products/materials/production)
// fails with "Failed query" errors, even though .env looks correct.
import "dotenv/config";

import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";
import { createHash } from "crypto";
import https from "https";
import multer from "multer";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import os from "os";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import initSqlJs, { type Database } from "sql.js";
import { materialPriceUSD } from "../lib/materials.ts";
import { sypToUsd } from "../lib/currency.ts";

import customersRouter from "./routes/customers.ts";
import productsRouter from "./routes/products.ts";
import materialsRouter from "./routes/materials.ts";
import productionRouter from "./routes/production.ts";
import { db } from "../db/index.ts";
import { appState, customers as customersTable, products as productsTable, materials as materialsTable, inventory as inventoryTable, inventoryTransactions as inventoryTransactionsTable, remnants as remnantsTable, suppliers as suppliersTable, supplyOrders as supplyOrdersTable, supplierQuotes as supplierQuotesTable, machines as machinesTable } from "../db/schema.ts";
import { eq, desc } from "drizzle-orm";

// Initialize Gemini Client safely
export const apiKey = process.env.GEMINI_API_KEY || "dummy_key_for_startup";
export const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export const DB_MODE = process.env.DB_MODE || "auto";
export const USE_POSTGRES = DB_MODE === "postgres" || (DB_MODE === "auto" && Boolean(process.env.SQL_HOST && process.env.SQL_DB_NAME));
export const USE_SQLITE = DB_MODE === "sqlite";
export const APP_RUNTIME_ROOT = process.env.AXIS_APP_ROOT || process.cwd();
export const LOCAL_DATA_FILE = process.env.AXIS_DATA_FILE || path.join(os.homedir(), "AppData", "Roaming", "AXIS LAB OS", "axis-data.sqlite");
export const RESOURCE_FONT_PATH = process.env.AXIS_FONT_PATH || path.join(APP_RUNTIME_ROOT, "Amiri-Regular.ttf");
export const LOCAL_LEGACY_DATA_FILE = process.env.AXIS_LEGACY_DATA_FILE || path.join(os.homedir(), "AppData", "Roaming", "Electron", "axis-data.json");
export const LOCAL_SCHEMA_VERSION = 6;
import {
  nextActivityLogId,
  nextEntityId,
  recordBenchmark,
  benchmarkSnapshot,
  orderCreateBenchmarks,
  persistenceBenchmarks,
  persistQueueStats,
  type BenchmarkBucket,
} from "./runtime/metrics.ts";
export {
  activityLogSequence,
  entityIdSequence,
  nextActivityLogId,
  nextEntityId,
  recordBenchmark,
  benchmarkSnapshot,
  orderCreateBenchmarks,
  persistenceBenchmarks,
  persistQueueStats,
} from "./runtime/metrics.ts";
export type { BenchmarkBucket } from "./runtime/metrics.ts";

export const NORMALIZED_LOCAL_COLLECTIONS = ["CUSTOMERS", "PRODUCTS", "MATERIALS", "INVENTORY", "INVENTORY_TRANSACTIONS", "REMNANTS", "SUPPLIERS", "SUPPLY_ORDERS", "SUPPLIER_QUOTES", "MACHINES", "ORDERS", "ACTIVITY_LOGS", "NOTIFICATIONS", "PRODUCTION_JOBS"] as const;
export const NORMALIZED_FINANCIAL_COLLECTIONS = ["INVOICES", "EXPENSES"] as const;
export let localSqlite: Database | null = null;
export function setLocalSqlite(database: Database) {
  localSqlite = database;
  return localSqlite;
}

export async function initLocalSqlite() {
  if (localSqlite) return localSqlite;
  const SQL = await initSqlJs({
    locateFile: (file: string) => process.env.SQLITE_WASM_PATH || path.join(APP_RUNTIME_ROOT, "node_modules", "sql.js", "dist", file),
  });
  const openDatabase = (candidateBytes?: Uint8Array) => {
    let database: Database | null = null;
    try {
      database = candidateBytes ? new SQL.Database(candidateBytes) : new SQL.Database();
      database.run("PRAGMA foreign_keys = ON");
      database.run("CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL)");
      database.run("CREATE TABLE IF NOT EXISTS local_entities (collection TEXT NOT NULL, entity_id TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (collection, entity_id))");
      database.run("CREATE INDEX IF NOT EXISTS idx_local_entities_collection_updated ON local_entities (collection, updated_at)");
      database.run("CREATE INDEX IF NOT EXISTS idx_local_entities_entity ON local_entities (entity_id)");
      database.run("CREATE TABLE IF NOT EXISTS local_metadata (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL)");
      database.run("CREATE TABLE IF NOT EXISTS local_invoices (id TEXT PRIMARY KEY NOT NULL, invoice_number TEXT NOT NULL, order_id TEXT, customer_id TEXT NOT NULL, issue_date TEXT NOT NULL, due_date TEXT NOT NULL, total_price REAL NOT NULL, subtotal REAL, tax_percent REAL, discount REAL, paid_amount REAL NOT NULL, remaining REAL NOT NULL, status TEXT NOT NULL, notes TEXT, payload TEXT NOT NULL, updated_at TEXT NOT NULL)");
      database.run("CREATE TABLE IF NOT EXISTS local_invoice_items (id TEXT PRIMARY KEY NOT NULL, invoice_id TEXT NOT NULL, product_name TEXT NOT NULL, quantity REAL NOT NULL, unit_price REAL NOT NULL, discount REAL NOT NULL, tax REAL NOT NULL, total REAL NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL, FOREIGN KEY (invoice_id) REFERENCES local_invoices(id) ON DELETE CASCADE)");
      database.run("CREATE TABLE IF NOT EXISTS local_invoice_history (id TEXT PRIMARY KEY NOT NULL, invoice_id TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL, FOREIGN KEY (invoice_id) REFERENCES local_invoices(id) ON DELETE CASCADE)");
      database.run("CREATE TABLE IF NOT EXISTS local_payments (id TEXT PRIMARY KEY NOT NULL, order_id TEXT, invoice_id TEXT, amount REAL NOT NULL, method TEXT NOT NULL, reference TEXT, date TEXT NOT NULL, notes TEXT, payload TEXT NOT NULL, updated_at TEXT NOT NULL)");
      database.run("CREATE TABLE IF NOT EXISTS local_expenses (id TEXT PRIMARY KEY NOT NULL, category TEXT NOT NULL, amount REAL NOT NULL, date TEXT NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL)");
      database.run("INSERT OR IGNORE INTO local_metadata (key, value, updated_at) VALUES ('schema_version', ?, ?)", [String(LOCAL_SCHEMA_VERSION), new Date().toISOString()]);
      database.run("UPDATE local_metadata SET value = ?, updated_at = ? WHERE key = 'schema_version' AND CAST(value AS INTEGER) < ?", [String(LOCAL_SCHEMA_VERSION), new Date().toISOString(), LOCAL_SCHEMA_VERSION]);
      return database;