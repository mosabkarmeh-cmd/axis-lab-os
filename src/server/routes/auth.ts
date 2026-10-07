import express from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import * as core from "../server-core.ts";
import type { UserRecord } from "../server-core.ts";

const {
  nextActivityLogId,
  nextEntityId,
  schedulePersist,
  publicUser,
  generateJWT,
  getRequestUser,
  USERS,
  ACTIVITY_LOGS,
} = core;

export function registerAuthRoutes(app: express.Express) {
  // API - Auth Login
  const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "محاولات دخول كثيرة جداً. حاول مرة أخرى بعد 15 دقيقة" }
  });

  app.post("/api/auth/login", loginRateLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "الرجاء إدخال البريد الإلكتروني وكلمة المرور" });
      return;
    }

    const user = USERS.find(u => u.email === email.toLowerCase());
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

    // Generate real Base64 encoded simulated JWT Token
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

    res.cookie("axislab_token", token, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax"
    });

    res.json({
      user: publicUser(user)
    });
  });

  app.post("/api/auth/change-password", async (req, res) => {
    const user = getRequestUser(req);
    if (!user) {
      res.status(401).json({ error: "يجب تسجيل الدخول" });
      return;
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || typeof newPassword !== "string" || newPassword.length < 8) {
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
    res.json({ success: true, user: publicUser(user) });
  });

  // Test-only GUI session fixture. This route exists only when the desktop runner explicitly enables AXIS_GUI_TEST=1.
  app.post("/api/test/gui-session", (req, res) => {
    if (process.env.AXIS_GUI_TEST !== "1") { res.status(404).json({ error: "Not found" }); return; }
    const role = req.body?.role || "employee";
    if (!["admin", "employee", "accountant"].includes(role)) { res.status(400).json({ error: "Invalid GUI test role" }); return; }
    if (process.env.AXIS_GUI_TEST === "1" && role !== "admin") { const fixtureUser = USERS.find((candidate) => candidate.role === role); if (fixtureUser) { fixtureUser.isActive = true; fixtureUser.mustChangePassword = false; } }
    const user = USERS.find((candidate) => candidate.role === role && candidate.isActive);
    if (user && process.env.AXIS_GUI_TEST === "1") user.mustChangePassword = false;
    if (!user) { res.status(404).json({ error: "No active GUI test user for role" }); return; }
    const token = generateJWT(user);
    res.cookie("axislab_token", token, { maxAge: 10 * 60 * 1000, httpOnly: true, secure: false, path: "/", sameSite: "lax" });
    res.json({ success: true, user: publicUser(user) });
  });

  // API - Auth Register
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, fullName, role } = req.body;
        if (!email || !password || !fullName || !role) {
      res.status(400).json({ error: "جميع الحقول مطلوبة لإتمام التسجيل" });
      return;
    }
    if (process.env.ALLOW_PUBLIC_REGISTRATION !== "true") {
      res.status(403).json({ error: "التسجيل العام مغلق. يضيف مدير النظام المستخدمين من داخل الإعدادات." });
      return;
    }
    if (password.length < 8) {
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

    res.cookie("axislab_token", token, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax"
    });

    res.json({
      user: publicUser(newUser)
    });
  });

  // API - Auth Verify Token
  app.get("/api/auth/verify", (req, res) => {
    const user = getRequestUser(req);
    if (!user) {
      res.status(401).json({ error: "رمز المصادقة غير صالح أو منتهي الصلاحية" });
      return;
    }
    res.json({ user: publicUser(user) });
  });


}
