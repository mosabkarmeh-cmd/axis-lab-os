import express from "express";
import * as core from "../../../server-core.ts";
import { getActorId, sanitizeMaterialForEmployee } from "./shared.ts";

const {
  MATERIALS,
  INVENTORY,
  DELETED_ITEMS,
  ACTIVITY_LOGS,
  nextEntityId,
  nextActivityLogId,
  getRequestUser,
  createNotification,
} = core;

export function registerMaterialMutationRoutes(app: express.Express) {
  app.post("/api/materials", (req, res) => {
    const { name, category, subCategory, thickness, color, width, height, unit, pricePerUnit, minimumStock, supplierId, notes, qualityStatus } = req.body;
    if (!name || !category) {
      res.status(400).json({ success: false, message: "Name and Category are required" });
      return;
    }

    const newMaterial = {
      id: nextEntityId("m"),
      name: name.trim(),
      category,
      subCategory: subCategory || "",
      thickness: thickness ? Number(thickness) : null,
      color: color || "",
      width: width ? Number(width) : null,
      height: height ? Number(height) : null,
      unit: unit || "sheet",
      pricePerUnit: pricePerUnit ? Number(pricePerUnit) : 0,
      minimumStock: minimumStock ? Number(minimumStock) : 0,
      supplierId: supplierId || null,
      notes: notes || "",
      status: "active",
      qualityStatus: qualityStatus || "inspected",
      createdAt: new Date().toISOString(),
    };

    MATERIALS.push(newMaterial);
    INVENTORY.push({
      id: nextEntityId("inv"),
      materialId: newMaterial.id,
      quantity: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
      location: "مستودع عام",
    });

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "CREATE_MATERIAL",
      entityType: "Material",
      entityId: newMaterial.id,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      material: sanitizeMaterialForEmployee(newMaterial, req),
    });
  });

  app.put("/api/materials/:id", (req, res) => {
    const material = MATERIALS.find(item => item.id === req.params.id);
    if (!material) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }

    const { name, category, subCategory, thickness, color, width, height, unit, pricePerUnit, minimumStock, supplierId, notes, location, qualityStatus } = req.body;

    if (name) material.name = name;
    if (category) material.category = category;
    if (subCategory !== undefined) material.subCategory = subCategory;
    if (thickness !== undefined) material.thickness = thickness ? Number(thickness) : null;
    if (color !== undefined) material.color = color;
    if (width !== undefined) material.width = width ? Number(width) : null;
    if (height !== undefined) material.height = height ? Number(height) : null;
    if (unit) material.unit = unit;
    if (pricePerUnit !== undefined) material.pricePerUnit = Number(pricePerUnit) || 0;
    if (minimumStock !== undefined) material.minimumStock = Number(minimumStock) || 0;
    if (supplierId !== undefined) material.supplierId = supplierId;
    if (notes !== undefined) material.notes = notes;
    if (qualityStatus !== undefined) material.qualityStatus = qualityStatus;

    if (location !== undefined) {
      const inventory = INVENTORY.find(item => item.materialId === material.id);
      if (inventory) inventory.location = location;
    }

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "UPDATE_MATERIAL",
      entityType: "Material",
      entityId: material.id,
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, material: sanitizeMaterialForEmployee(material, req) });
  });

  app.patch("/api/materials/:id/quality-status", (req, res) => {
    const material = MATERIALS.find(item => item.id === req.params.id);
    if (!material) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }

    const { qualityStatus } = req.body;
    if (qualityStatus) material.qualityStatus = qualityStatus;

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "UPDATE_MATERIAL_QUALITY_STATUS",
      entityType: "Material",
      entityId: material.id,
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, material: sanitizeMaterialForEmployee(material, req) });
  });

  app.delete("/api/materials/:id", (req, res) => {
    const user = getRequestUser(req);
    const index = MATERIALS.findIndex(item => item.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }

    const material = MATERIALS[index];
    material.status = "archived";

    DELETED_ITEMS.push({
      id: "del_" + Date.now() + "_" + Math.floor(Math.random() * 100),
      entityType: "Material",
      entityId: material.id,
      name: material.name,
      deletedAt: new Date().toISOString(),
      deletedBy: user ? user.fullName : "المدير العام",
      originalData: material,
    });

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "ARCHIVE_MATERIAL",
      entityType: "Material",
      entityId: material.id,
      createdAt: new Date().toISOString(),
    });

    createNotification(
      "أرشفة خامة",
      `تم نقل الخامة "${material.name}" إلى سلة المحذوفات وأرشفتها.`,
      "inventory",
    );

    res.json({ success: true, material: sanitizeMaterialForEmployee(material, req) });
  });

  app.post("/api/materials/:id/restore", (req, res) => {
    const material = MATERIALS.find(item => item.id === req.params.id);
    if (!material) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }

    material.status = "active";
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "RESTORE_MATERIAL",
      entityType: "Material",
      entityId: material.id,
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, material: sanitizeMaterialForEmployee(material, req) });
  });
}
