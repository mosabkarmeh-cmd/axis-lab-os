// API - Get Users
  app.get("/api/users", (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "غير مصرح لك بالوصول لإدارة حسابات الموظفين" });
      return;
    }
    // Return users list securely
    res.json({ success: true, users: USERS.map(publicUser) });
  });

  // API - Create User
  app.post("/api/users", async (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "غير مصرح لك بإضافة موظفين جدد" });
      return;
    }
    const { email, password, fullName, role, isActive } = req.body;
    if (!email || !password || !fullName || !role) {
      res.status(400).json({ error: "جميع الحقول (اسم المستخدم، كلمة المرور، الاسم الكامل، الصلاحية) مطلوبة" });
      return;
    }
    if (!["admin", "employee", "accountant", "viewer"].includes(role)) {
      res.status(400).json({ error: "الصلاحية المحددة غير صالحة" });
      return;
    }
    const exists = USERS.find(u => u.email === email.toLowerCase());
    if (exists) {
      res.status(400).json({ error: "اسم المستخدم / البريد الإلكتروني مسجل بالفعل بالنظام لموظف آخر" });
      return;
    }

    const newUser = {
      id: nextEntityId("u"),
      email: email.toLowerCase(),
      fullName,
      role,
      isActive: isActive !== undefined ? isActive : true,
      passwordHash: await bcrypt.hash(password, 12)
    };

    USERS.push(newUser);

    // Append log
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: user.id,
      action: "CREATE_USER",
      entityType: "User",
      entityId: newUser.id,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, user: publicUser(newUser) });
  });

  // API - Update User
  app.put("/api/users/:id", async (req, res) => {
    const adminUser = getRequestUser(req);
    if (!adminUser || adminUser.role !== "admin") {
      res.status(403).json({ error: "غير مصرح لك بتعديل بيانات الموظفين" });
      return;
    }
    const targetUser = USERS.find(u => u.id === req.params.id);
    if (!targetUser) {
      res.status(404).json({ error: "الموظف غير موجود بالنظام" });
      return;
    }
    const { email, password, fullName, role, isActive } = req.body;

    if (role && !["admin", "employee", "accountant", "viewer"].includes(role)) {
      res.status(400).json({ error: "الصلاحية المحددة غير صالحة" });
      return;
    }

    if (email) {
      const exists = USERS.find(u => u.email === email.toLowerCase() && u.id !== req.params.id);
      if (exists) {
        res.status(400).json({ error: "اسم المستخدم / البريد الإلكتروني مستخدم بالفعل لموظف آخر" });
        return;
      }
      targetUser.email = email.toLowerCase();
    }
    if (fullName) targetUser.fullName = fullName;
    if (role) targetUser.role = role;
    if (isActive !== undefined) {
      if (adminUser.id === targetUser.id && !isActive) {
        res.status(400).json({ error: "لا يمكنك تعطيل حسابك الشخصي النشط حالياً" });
        return;
      }
      targetUser.isActive = isActive;
    }
    if (password) {
      targetUser.passwordHash = await bcrypt.hash(password, 12);
    }

    // Append log
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: adminUser.id,
      action: "UPDATE_USER",
      entityType: "User",
      entityId: targetUser.id,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, user: publicUser(targetUser) });
  });

  // API - Delete User
  app.delete("/api/users/:id", (req, res) => {
    const adminUser = getRequestUser(req);
    if (!adminUser || adminUser.role !== "admin") {
      res.status(403).json({ error: "غير مصرح لك بحذف الموظفين" });
      return;
    }
    if (adminUser.id === req.params.id) {
      res.status(400).json({ error: "لا يمكنك حذف حسابك الشخصي" });
      return;
    }
    const index = USERS.findIndex(u => u.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: "الموظف غير موجود بالنظام" });
      return;
    }
    const removed = USERS.splice(index, 1)[0];

    // Append log
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: adminUser.id,
      action: "DELETE_USER",
      entityType: "User",
      entityId: removed.id,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, user: publicUser(removed) });
  });

