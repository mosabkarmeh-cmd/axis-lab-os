import fs from "node:fs";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import type { UserRecord } from "../types.ts";
import type { ActivityLog } from "../../types.ts";
import { Router } from "express";
import type { HttpRequest } from "../http-types.ts";
import type { PublicUser } from "../types.ts";

export function createAuthRouter(deps: {
  users: UserRecord[];
  activityLogs: ActivityLog[];
  nextActivityLogId: () => string;
  nextEntityId: (prefix: string) => string;
  schedulePersist: () => void;
  publicUser: (user: UserRecord) => PublicUser;
  getRequestUser: (req: HttpRequest) => UserRecord | null;
  generateJWT: (user: UserRecord) => string;
}) {
  const router = Router();
  const { users: USERS, activityLogs: ACTIVITY_LOGS, nextActivityLogId, nextEntityId, schedulePersist, publicUser, getRequestUser, generateJWT } = deps;
  const cookieOptions = (req: HttpRequest, rememberMe = true) => ({
    ...(rememberMe ? { maxAge: 24 * 60 * 60 * 1000 } : {}),
    httpOnly: true,
    secure: req.secure === true || req.headers['x-forwarded-proto'] === 'https',
    path: '/',
    sameSite: 'lax' as const,
  });
  const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false,
    message: { error: "محاولات دخول كثيرة جداً. حاول مرة أخرى بعد 15 دقيقة" }
  });


  router.post("/login", loginRateLimiter, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password) {
      res.status(400).json({ error: "الرجاء إدخال البريد الإلكتروني وكلمة المرور" });
      return;
    }
    if (email.length > 254 || password.length > 128) {
      res.status(400).json({ error: "بيانات الاعتماد تتجاوز الحد المسموح" });
      return;
    }

    const user = USERS.find(u => u.email === email);
    if (!user) {
      res.status(401).json({ error: "بيانات الاعتماد المدخلة غير صحيحة" });
      return;
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      res.status(401).json({ error: "كلمة المرور المدخلة غير صحيحة" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "هذا الحساب معطل حالياً من قبل مدير النظام. يرجى مراجعة الإدارة" });
      return;
    }

    // Generate a signed JWT token
    const token = generateJWT(user);

    // Append log
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: user.id,
      action: "LOGIN",
      entityType: "User",
      entityId: user.id,
      createdAt: new Date().toISOString()
    });

    res.cookie("axislab_token", token, cookieOptions(req, req.body?.rememberMe !== false));

    res.json({
      user: publicUser(user)
    });
  });

  router.post("/change-password", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const user = getRequestUser(req);
    if (!user) {
      res.status(401).json({ error: "يجب تسجيل الدخول" });
      return;
    }
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== "string" || currentPassword.length > 128 || typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 128) {
      res.status(400).json({ error: "أدخل كلمة المرور الحالية وكلمة مرور جديدة من 8 أحرف على الأقل" });
      return;
    }
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
      return;
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    schedulePersist();
    const bootstrapPath = process.env.AXIS_BOOTSTRAP_PASSWORD_FILE;
    if (bootstrapPath) {
      try { fs.rmSync(bootstrapPath, { force: true }); } catch {}
    }
    res.json({ success: true, user: publicUser(user) });
  });

  // API - Auth Register
  router.post("/register", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const fullName = typeof req.body?.fullName === "string" ? req.body.fullName.trim() : "";
    const role = req.body?.role;
    if (!email || !password || !fullName || !role) {
      res.status(400).json({ error: "جميع الحقول مطلوبة لإتمام التسجيل" });
      return;
    }
    if (process.env.ALLOW_PUBLIC_REGISTRATION !== "true") {
      res.status(403).json({ error: "التسجيل العام مغلق. يضيف مدير النظام المستخدمين من داخل الإعدادات." });
      return;
    }
    if (email.length > 254 || fullName.length > 120 || password.length > 128) {
      res.status(400).json({ error: "أحد الحقول يتجاوز الحد المسموح" });
      return;
    }
    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل" });
      return;
    }
    if (!["employee", "accountant", "viewer"].includes(role)) {
      res.status(400).json({ error: "الدور المطلوب غير صالح" });
      return;
    }
    if (role === "admin") {
      res.status(403).json({ error: "غير مسموح بإنشاء حساب مدير (Admin) من النافذة الخارجية لدواعي أمان النظام. يتم إضافة المدراء فقط من داخل لوحة التحكم." });
      return;
    }

    const exists = USERS.find(u => u.email === email.toLowerCase());
    if (exists) {
      res.status(400).json({ error: "البريد الإلكتروني مسجل بالفعل بالنظام" });
      return;
    }

    const newUser: UserRecord = {
      id: nextEntityId("u"),
      email: email.toLowerCase(),
      fullName,
      role,
      isActive: true,
      passwordHash: await bcrypt.hash(password, 12)
    };

    USERS.push(newUser);

    const token = generateJWT(newUser);

    // Append log
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: newUser.id,
      action: "REGISTER",
      entityType: "User",
      entityId: newUser.id,
      createdAt: new Date().toISOString()
    });
    schedulePersist();

    res.cookie("axislab_token", token, cookieOptions(req, req.body?.rememberMe !== false));

    res.json({
      user: publicUser(newUser)
    });
  });


  router.post("/logout", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.clearCookie("axislab_token", { ...cookieOptions(req), maxAge: undefined });
    res.json({ success: true });
  });

  // API - Auth Verify Token
  router.get("/verify", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const user = getRequestUser(req);
    if (!user) {
      res.status(401).json({ error: "رمز المصادقة غير صالح أو منتهي الصلاحية" });
      return;
    }
    res.json({ user: publicUser(user) });
  });


  return router;
}
