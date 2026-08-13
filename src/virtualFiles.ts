import { CodeFile } from "./types";

export const VIRTUAL_FILES: CodeFile[] = [
  {
    id: "v-prisma",
    name: "database/schema.prisma",
    language: "prisma",
    size: "4.2 KB",
    lastEdited: "Just now",
    code: `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  fullName     String
  role         String   // admin, employee, accountant
  isActive     Boolean  @default(true)
  lastLogin    DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime?

  // relationships
  orders       Order[]  @relation("OrderCreator")
  activityLogs ActivityLog[]
}

model Customer {
  id        String   @id @default(uuid())
  name      String
  phone     String   @unique
  whatsapp  String?
  email     String?
  address   String?
  company   String?
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  orders    Order[]
}

model Order {
  id          String   @id @default(uuid())
  orderNumber String   @unique
  customerId  String
  status      String   @default("new")
  priority    String   @default("normal")
  totalPrice  Float    @default(0)
  paidAmount  Float    @default(0)
  remaining   Float    @default(0)
  deliveryDateExpected DateTime?
  deliveryDateActual   DateTime?
  notes       String?
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  customer   Customer @relation(fields: [customerId], references: [id])
  createdBy  User     @relation(fields: [createdById], references: [id], name: "OrderCreator")
  items      OrderItem[]
  statusHistory OrderStatusHistory[]
}

model OrderItem {
  id          String   @id @default(uuid())
  orderId     String
  productId   String?
  productName String
  quantity    Int
  unitPrice   Float
  totalPrice  Float
  notes       String?
  createdAt   DateTime @default(now())

  order Order @relation(fields: [orderId], references: [id])
}

model OrderStatusHistory {
  id         String   @id @default(uuid())
  orderId    String
  oldStatus  String?
  newStatus  String
  changedById String
  notes      String?
  changedAt  DateTime @default(now())

  order   Order @relation(fields: [orderId], references: [id])
  changedBy User @relation(fields: [changedById], references: [id])
}

model ActivityLog {
  id         String   @id @default(uuid())
  userId     String
  action     String
  entityType String
  entityId   String
  oldValue   Json?
  newValue   Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}

model Product {
  id          String   @id @default(uuid())
  name        String
  code        String   @unique
  category    String?
  description String?
  imageUrl    String?
  status      String   @default("active") // active, inactive, archived
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  // relationships
  versions    ProductVersion[]
  components  ProductComponent[]
}

model ProductVersion {
  id          String   @id @default(uuid())
  productId   String
  version     String   // v1, v2, v3
  description String?
  fileId      String?  // Link to design file
  createdAt   DateTime @default(now())
  createdBy   String?

  product     Product  @relation(fields: [productId], references: [id])
}

model ProductComponent {
  id          String   @id @default(uuid())
  productId   String
  name        String
  quantity    Int      @default(1)
  materialId  String?
  width       Float?   // mm
  height      Float?   // mm
  fileId      String?  // Link to component file
  notes       String?
  createdAt   DateTime @default(now())

  product     Product  @relation(fields: [productId], references: [id])
}

// ==================== المواد والمخزون ====================

model Material {
  id              String   @id @default(uuid())
  name            String
  category        String   // sheet, assembly, consumable
  subCategory     String?  // mdf, acrylic, wood, leather, ...
  thickness       Float?   // mm
  color           String?
  width           Float?   // mm (للألواح)
  height          Float?   // mm (للألواح)
  unit            String   @default("sheet") // sheet, piece, meter, kg, liter
  pricePerUnit    Float    @default(0)
  minimumStock    Float    @default(0)
  supplierId      String?
  notes           String?
  status          String   @default("active") // active, inactive, archived
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  // علاقات
  supplier        Supplier? @relation(fields: [supplierId], references: [id])
  inventory       Inventory?
  transactions    InventoryTransaction[]
  remnants        Remnant[]
}

model Inventory {
  id                String   @id @default(uuid())
  materialId        String   @unique
  quantity          Float    @default(0)
  reservedQuantity  Float    @default(0)
  availableQuantity Float    @default(0) // quantity - reservedQuantity
  location          String?
  updatedAt         DateTime @updatedAt

  material          Material @relation(fields: [materialId], references: [id])
}

model InventoryTransaction {
  id            String   @id @default(uuid())
  materialId    String
  type          String   // purchase, consumption, adjustment, waste, return
  quantity      Float
  beforeQty     Float
  afterQty      Float
  referenceType String?  // order, adjustment, purchase_order
  referenceId   String?
  reason        String?
  createdById   String
  createdAt     DateTime @default(now())

  material      Material @relation(fields: [materialId], references: [id])
}

model Remnant {
  id          String   @id @default(uuid())
  materialId  String
  width       Float
  height      Float
  area        Float    @default(0) // width * height
  quantity    Int      @default(1)
  status      String   @default("available") // available, reserved, consumed, waste
  location    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  material    Material @relation(fields: [materialId], references: [id])
}

model Supplier {
  id          String   @id @default(uuid())
  name        String
  phone       String?
  email       String?
  address     String?
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  materials   Material[]
}`
  },
  {
    id: "v-product-service",
    name: "src/main/services/product.service.ts",
    language: "typescript",
    size: "3.5 KB",
    lastEdited: "Just now",
    code: `import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const productService = {
  async list({ page = 1, limit = 20, search, category }: { page?: number; limit?: number; search?: string; category?: string }) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          versions: { orderBy: { createdAt: 'desc' }, take: 1 },
          components: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    return { products, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    return prisma.product.findUnique({
      where: { id, deletedAt: null },
      include: {
        versions: { orderBy: { createdAt: 'desc' } },
        components: true,
      },
    });
  },

  async create(data: { name: string; code?: string; category?: string; description?: string; imageUrl?: string }) {
    return prisma.product.create({
      data: {
        name: data.name.trim(),
        code: data.code || \`PRD-\${Date.now().toString().slice(-6)}\`,
        category: data.category?.trim(),
        description: data.description?.trim(),
        imageUrl: data.imageUrl?.trim(),
        status: 'active',
      },
    });
  },

  async update(id: string, data: any) {
    return prisma.product.update({ where: { id }, data });
  },

  async archive(id: string) {
    return prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'archived' },
    });
  },

  async addVersion(productId: string, data: { version: string; description?: string; fileId?: string; createdBy?: string }) {
    return prisma.productVersion.create({
      data: {
        productId,
        version: data.version,
        description: data.description?.trim(),
        fileId: data.fileId,
        createdBy: data.createdBy,
      },
    });
  },

  async addComponent(productId: string, data: { name: string; quantity?: number; materialId?: string; width?: number; height?: number; fileId?: string; notes?: string }) {
    return prisma.productComponent.create({
      data: {
        productId,
        name: data.name.trim(),
        quantity: data.quantity || 1,
        materialId: data.materialId,
        width: data.width,
        height: data.height,
        fileId: data.fileId,
        notes: data.notes?.trim(),
      },
    });
  }
};`
  },
  {
    id: "v-product-controller",
    name: "src/main/controllers/product.controller.ts",
    language: "typescript",
    size: "2.1 KB",
    lastEdited: "Just now",
    code: `import { Request, Response } from 'express';
import { productService } from '../services/product.service';

export const productController = {
  async list(req: Request, res: Response) {
    try {
      const { page, limit, search, category } = req.query;
      const result = await productService.list({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search: search as string,
        category: category as string,
      });
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getOne(req: Request, res: Response) {
    try {
      const product = await productService.getById(req.params.id);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
      res.json({ success: true, product });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const product = await productService.create(req.body);
      res.status(201).json({ success: true, product });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
};`
  },
  {
    id: "v-product-store",
    name: "src/renderer/src/store/productStore.ts",
    language: "typescript",
    size: "2.5 KB",
    lastEdited: "Just now",
    code: `import { create } from 'zustand';
import { api } from '../services/api';

export interface Product {
  id: string;
  name: string;
  code: string;
  category?: string;
  description?: string;
  status: string;
}

interface ProductState {
  products: Product[];
  isLoading: boolean;
  fetchProducts: () => Promise<void>;
  createProduct: (data: any) => Promise<Product>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,
  fetchProducts: async () => {
    set({ isLoading: true });
    const res = await api.get('/products');
    set({ products: res.data.products, isLoading: false });
  },
  createProduct: async (data) => {
    const res = await api.post('/products', data);
    return res.data.product;
  }
}));`
  },
  {
    id: "v-package",
    name: "package.json",
    language: "json",
    size: "1.2 KB",
    lastEdited: "Just now",
    code: `{
  "name": "axis-lab",
  "version": "0.0.1",
  "description": "Laser Workshop Operating System",
  "main": "electron/main/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "electron": "electron .",
    "start": "npm run build && npm run electron",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write .",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@prisma/client": "^5.14.0",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.4.5",
    "electron": "^30.0.0",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^3.22.4",
    "zustand": "^4.5.2"
  }
}`
  },
  {
    id: "v-electron-main",
    name: "electron/main/main.ts",
    language: "typescript",
    size: "1.1 KB",
    lastEdited: "Just now",
    code: `import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  const isDev = process.env.NODE_ENV === 'development';
  const url = isDev
    ? 'http://localhost:3000'
    : \`file://\${path.join(__dirname, '../../dist/renderer/index.html')}\`;

  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);`
  },
  {
    id: "v-electron-preload",
    name: "electron/preload/preload.ts",
    language: "typescript",
    size: "240 B",
    lastEdited: "Just now",
    code: `import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => 'pong',
  getOrders: () => ipcRenderer.invoke('get-orders'),
  createOrder: (order) => ipcRenderer.invoke('create-order', order),
});`
  },
  {
    id: "v-app-tsx",
    name: "electron/renderer/src/App.tsx",
    language: "typescript",
    size: "450 B",
    lastEdited: "Just now",
    code: `import React from 'react';

function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>🚀 AXIS LAB</h1>
      <p>نظام تشغيل ورش الليزر</p>
      <p>Electron + React + TypeScript يعمل بنجاح!</p>
    </div>
  );
}

export default App;`
  },
  {
    id: "v-material-service",
    name: "src/main/services/material.service.ts",
    language: "typescript",
    size: "4.1 KB",
    lastEdited: "Just now",
    code: `import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const materialService = {
  async list({ search, category }: { search?: string; category?: string }) {
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subCategory: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (category) where.category = category;

    return prisma.material.findMany({
      where,
      include: {
        inventory: true,
        supplier: true
      },
      orderBy: { name: 'asc' }
    });
  },

  async create(data: any) {
    return prisma.$transaction(async (tx) => {
      const material = await tx.material.create({
        data: {
          name: data.name.trim(),
          category: data.category,
          subCategory: data.subCategory,
          thickness: data.thickness ? parseFloat(data.thickness) : null,
          color: data.color,
          width: data.width ? parseFloat(data.width) : null,
          height: data.height ? parseFloat(data.height) : null,
          unit: data.unit || 'sheet',
          pricePerUnit: parseFloat(data.pricePerUnit) || 0,
          minimumStock: parseFloat(data.minimumStock) || 0,
          supplierId: data.supplierId,
          notes: data.notes
        }
      });

      await tx.inventory.create({
        data: {
          materialId: material.id,
          quantity: 0,
          reservedQuantity: 0,
          availableQuantity: 0,
          location: data.location || 'مستودع عام'
        }
      });

      return material;
    });
  }
};`
  },
  {
    id: "v-inventory-service",
    name: "src/main/services/inventory.service.ts",
    language: "typescript",
    size: "3.8 KB",
    lastEdited: "Just now",
    code: `import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const inventoryService = {
  async updateStock(materialId: string, quantity: number, type: string, referenceId?: string, reason?: string, userId?: string) {
    return prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findUnique({ where: { materialId } });
      if (!inv) throw new Error('Inventory record not found');

      const beforeQty = inv.quantity;
      const afterQty = beforeQty + quantity;

      if (afterQty < 0) throw new Error('الكمية المطلوبة تتجاوز المخزون المتوفر!');

      const updatedInv = await tx.inventory.update({
        where: { materialId },
        data: {
          quantity: afterQty,
          availableQuantity: afterQty - inv.reservedQuantity
        }
      });

      await tx.inventoryTransaction.create({
        data: {
          materialId,
          type,
          quantity,
          beforeQty,
          afterQty,
          referenceId,
          reason,
          createdById: userId || 'system'
        }
      });

      return updatedInv;
    });
  }
};`
  }
];
