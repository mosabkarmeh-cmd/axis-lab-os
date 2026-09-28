export default function SettingsAdvancedTabs({ ctx }: { ctx: Record<string, any> }) {
  const { Activity, AlertTriangle, AnimatePresence, Archive, ArrowDown, ArrowUp, Bell, Briefcase, Building, Check, CheckCircle, Clipboard, Clock, Copy, Cpu, Database, DollarSign, Edit3, ExternalLink, Eye, FileCheck, FileCode, FileSpreadsheet, FileText, Globe, Hash, ImageIcon, Inbox, Instagram, Lock, Mail, MapPin, MessageCircle, Package, Palette, Percent, Phone, Play, Plus, React, RefreshCcw, Save, Send, SettingsContent, SettingsFormTabs, Share2, Shield, ShieldCheck, Sparkles, TerminalIcon, Trash, Trash2, Upload, Users, Zap, activeTab, addLog, backupStatus, backups, clearTestLogs, copiedShortcodeTag, copyShortcodeToClipboard, currentUserRole, editingStatusColor, editingStatusId, editingStatusName, editingUserId, evaluateShortcodes, fetchNumberings, fetchRecycleItems, fetchStatuses, fetchUsers, handleAddStatus, handleCreateBackup, handleCreateUser, handleDeleteStatus, handleDeleteUser, handleExcelUpload, handleExecuteImport, handleParseImport, handlePermanentDelete, handleReorderStatuses, handleRestoreBackup, handleRestoreItem, handleSafeReset, handleSaveNumbering, handleSaveSettings, handleTestSmtp, handleUpdateStatus, handleUpdateUser, importPreview, importStatus, importText, importType, isExcelUploading, isLoading, isRunningTests, isSaving, loadNetworkInfo, loadSettingsAndBackups, loadingNetwork, loadingNumberings, loadingRecycle, loadingUsers, motion, networkInfo, newStatusColor, newStatusName, numberings, recycleItems, runConcurrencyTest, runCorruptedPayloadsTest, runFullDiagnosticSuite, runInventoryAlertTest, saveStatus, selectedFileId, selectedFileObj, setActiveTab, setBackupStatus, setBackups, setCopiedShortcodeTag, setEditingStatusColor, setEditingStatusId, setEditingStatusName, setEditingUserId, setImportPreview, setImportStatus, setImportText, setImportType, setIsExcelUploading, setIsLoading, setIsRunningTests, setIsSaving, setLoadingNetwork, setLoadingNumberings, setLoadingRecycle, setLoadingUsers, setNetworkInfo, setNewStatusColor, setNewStatusName, setNumberings, setRecycleItems, setSaveStatus, setSelectedFileId, setSettings, setShortcodeSampleText, setShowAddUserPanel, setShowJwtHud, setShowTerminalLogs, setStatuses, setSystemUsers, setTestLogs, setTestMetrics, setTestSmtpLoading, setTestSmtpStatus, setUserActionStatus, setUserFormEmail, setUserFormFullName, setUserFormIsActive, setUserFormPassword, setUserFormRole, settings, settingsViewContext, shortcodeSampleText, showAddUserPanel, showJwtHud, showTerminalLogs, statuses, systemUsers, testLogs, testMetrics, testSmtpLoading, testSmtpStatus, useEffect, useState, userActionStatus, userFormEmail, userFormFullName, userFormIsActive, userFormPassword, userFormRole, virtualFiles } = ctx;
  return (
    <>
{/* ==================== USERS & EMPLOYEES MANAGEMENT TAB ==================== */}

{activeTab === "users" && (
            <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#c59257]" />
                  إدارة حسابات الموظفين والصلاحيات والأمن
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    if (editingUserId) {
                      setEditingUserId(null);
                      setUserFormEmail("");
                      setUserFormPassword("");
                      setUserFormFullName("");
                      setUserFormRole("employee");
                      setUserFormIsActive(true);
                    }
                    setShowAddUserPanel(!showAddUserPanel);
                    setUserActionStatus(null);
                  }}
                  className="px-3 py-1.5 bg-[#c59257] hover:bg-[#a67438] text-black font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer animate-fade-in"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showAddUserPanel ? "إغلاق النموذج" : "إضافة موظف جديد"}
                </button>
              </div>

              {userActionStatus && (
                <div className={`p-4 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  userActionStatus.type === "success" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40" : "bg-rose-950/40 text-rose-400 border border-rose-900/40"
                }`}>
                  {userActionStatus.type === "success" ? "✓" : "⚠"}
                  {userActionStatus.message}
                </div>
              )}

              {/* Create / Edit Form panel */}
              {(showAddUserPanel || editingUserId) && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                    <div className="w-2 h-2 rounded-full bg-[#c59257]" />
                    <h4 className="text-xs font-bold text-zinc-300">
                      {editingUserId ? "تعديل بيانات حساب الموظف الحالي" : "إنشاء حساب موظف جديد وتحديد صلاحياته"}
                    </h4>
                  </div>

                  <form onSubmit={editingUserId ? handleUpdateUser : handleCreateUser} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="text-zinc-400 block mb-1">الاسم الكامل للموظف</label>
                        <input
                          type="text"
                          required
                          value={userFormFullName}
                          onChange={e => setUserFormFullName(e.target.value)}
                          placeholder="مثال: أحمد السوري"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-semibold focus:border-[#c59257] focus:outline-none transition-colors text-right"
                        />
                      </div>

                      <div>
                        <label className="text-zinc-400 block mb-1">اسم المستخدم / البريد الإلكتروني</label>
                        <input
                          type="text"
                          required
                          value={userFormEmail}
                          onChange={e => setUserFormEmail(e.target.value)}
                          placeholder="employee@axislab.com"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-mono focus:border-[#c59257] focus:outline-none transition-colors text-left"
                          dir="ltr"
                        />
                      </div>

                      <div>
                        <label className="text-zinc-400 block mb-1">
                          {editingUserId ? "كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)" : "كلمة مرور الحساب"}
                        </label>
                        <input
                          type="text"
                          required={!editingUserId}
                          value={userFormPassword}
                          onChange={e => setUserFormPassword(e.target.value)}
                          placeholder={editingUserId ? "اكتب كلمة مرور جديدة أو اترك الحقل فارغاً" : "أدخل كلمة مرور قوية للموظف"}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-mono focus:border-[#c59257] focus:outline-none transition-colors text-left"
                          dir="ltr"
                        />
                      </div>

                      <div>
                        <label className="text-zinc-400 block mb-1">دور الموظف وصلاحياته</label>
                        <select
                          value={userFormRole}
                          onChange={e => setUserFormRole(e.target.value as any)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-semibold focus:border-[#c59257] focus:outline-none transition-colors text-right"
                        >
                          <option value="admin">مدير النظام العام (Admin)</option>
                          <option value="employee">فني تشغيل آلات ليزر (Employee)</option>
                          <option value="accountant">محاسب مالي ورقابة (Accountant)</option>
                          <option value="viewer">مشاهدة فقط (Viewer)</option>
                        </select>
                      </div>

                      <div className="md:col-span-2 flex items-center justify-between bg-zinc-950 p-3 rounded-lg border border-zinc-850">
                        <div className="text-right">
                          <span className="text-zinc-300 font-semibold block">حالة الحساب وتصريح الدخول</span>
                          <span className="text-zinc-500 text-[10px]">الحسابات المعطلة لن تتمكن من تسجيل الدخول للنظام نهائياً.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={userFormIsActive}
                            onChange={e => setUserFormIsActive(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUserId(null);
                          setShowAddUserPanel(false);
                          setUserFormEmail("");
                          setUserFormPassword("");
                          setUserFormFullName("");
                          setUserFormRole("employee");
                          setUserFormIsActive(true);
                          setUserActionStatus(null);
                        }}
                        className="px-4 py-2 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-lg font-semibold transition-colors cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-[#c59257] hover:bg-[#a67438] text-black font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        {editingUserId ? "حفظ وتعديل بيانات الحساب" : "إنشاء وتفعيل الحساب"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Users List with Stripe layout */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[11px] font-bold text-zinc-500">
                  <span>جدول حسابات الموظفين المصرح لهم بالدخول</span>
                  <span>العدد الإجمالي: {systemUsers.length}</span>
                </div>

                {loadingUsers ? (
                  <div className="py-12 text-center text-zinc-500">
                    <RefreshCcw className="w-6 h-6 text-[#c59257] animate-spin mx-auto mb-2" />
                    <span>جاري مزامنة وجلب بيانات الحسابات من الخادم...</span>
                  </div>
                ) : (
                  <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-zinc-900/60 border-b border-zinc-900 text-zinc-400 font-semibold">
                          <th className="p-3">الاسم الكامل للموظف</th>
                          <th className="p-3 text-left">اسم المستخدم (البريد)</th>
                          <th className="p-3 text-center">الصلاحية / الدور</th>
                          <th className="p-3 text-center">حالة الحساب</th>
                          <th className="p-3 text-left">إجراءات التحكم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/50">
                        {systemUsers.map((u, idx) => (
                          <tr 
                            key={u.id} 
                            className={`hover:bg-zinc-900/30 transition-colors ${idx % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900/10"}`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center font-bold text-[#c59257]">
                                  {u.fullName.charAt(0)}
                                </div>
                                <div>
                                  <span className="font-semibold text-zinc-200 block text-right">{u.fullName}</span>
                                  <span className="text-[10px] text-zinc-500 font-mono block text-right">ID: {u.id}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-left font-mono text-zinc-400" dir="ltr">
                              {u.email}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                u.role === "admin" 
                                  ? "bg-amber-950/60 text-amber-400 border border-amber-900/30" 
                                  : u.role === "accountant"
                                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-900/30"
                                  : u.role === "viewer"
                                  ? "bg-violet-950/60 text-violet-400 border border-violet-900/30"
                                  : "bg-sky-950/60 text-sky-400 border border-sky-900/30"
                              }`}>
                                <Shield className="w-3 h-3" />
                                {u.role === "admin" ? "مدير عام" : u.role === "accountant" ? "محاسب مالي" : u.role === "viewer" ? "مشاهدة فقط" : "فني تشغيل ليزر"}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                u.isActive ? "text-emerald-500" : "text-rose-500"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                                {u.isActive ? "نشط ومصرح" : "معطل"}
                              </span>
                            </td>
                            <td className="p-3 text-left">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingUserId(u.id);
                                    setUserFormEmail(u.email);
                                    setUserFormFullName(u.fullName);
                                    setUserFormRole(u.role);
                                    setUserFormIsActive(u.isActive);
                                    setUserFormPassword("");
                                    setShowAddUserPanel(false);
                                    setUserActionStatus(null);
                                  }}
                                  className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-[#c59257] rounded border border-zinc-800 transition-all cursor-pointer"
                                  title="تعديل الحساب وكلمة المرور"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id, u.fullName)}
                                  className="p-1.5 bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 rounded border border-zinc-800 hover:border-rose-900 transition-all cursor-pointer"
                                  title="حذف الحساب نهائياً"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Secure info card */}
              <div className="bg-zinc-900/20 border border-zinc-900 rounded-lg p-3.5 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-right">
                  <span className="font-bold text-zinc-300 block mb-0.5">بروتوكول التحكم الأمني لورشة AXIS LAB</span>
                  <p className="text-zinc-500 leading-relaxed">
                    يتم حفظ كلمات المرور بشكل آمن بالكامل ومزامنتها لحظياً مع الخادم. بصفتك مديراً عاماً للنظام، يمكنك دوماً تعيين كلمة مرور جديدة للموظف في حال نسيانها، أو تعطيل صلاحيات دخوله على الفور في حالات الطوارئ دون الحاجة لطلب المساعدة الفنية.
                  </p>
                </div>
              </div>
            </div>
          )}

{/* 5. SYSTEM BACKUPS AND DISASTER RECOVERY TAB */}

{activeTab === "backup" && (
            <div className="space-y-6">
              
              {/* Auto Backup Configuration card */}
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono border-b border-zinc-900 pb-2 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-400" />
                  جدولة تكرار ومكان تخزين النسخ الاحتياطي التلقائي
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                  <div>
                    <label className="text-zinc-400 block mb-1">النسخ الاحتياطي التلقائي</label>
                    <select
                      value={settings.backup.autoBackup ? "true" : "false"}
                      onChange={e => setSettings({
                        ...settings,
                        backup: { ...settings.backup, autoBackup: e.target.value === "true" }
                      })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 focus:border-indigo-500 focus:outline-none transition-colors"
                    >
                      <option value="true">مفعّل (آمن للغاية)</option>
                      <option value="false">معطّل (غير موصى به)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">دورية التكرار التلقائي</label>
                    <select
                      value={settings.backup.backupFrequency}
                      onChange={e => setSettings({
                        ...settings,
                        backup: { ...settings.backup, backupFrequency: e.target.value as any }
                      })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 focus:border-indigo-500 focus:outline-none transition-colors"
                    >
                      <option value="daily">يومي (عند منتصف الليل)</option>
                      <option value="weekly">أسبوعي (كل يوم سبت)</option>
                      <option value="monthly">شهري (اليوم الأول من الشهر)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">الحد الأقصى للنسخ المحفوظة</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      value={settings.backup.retentionCount}
                      onChange={e => setSettings({
                        ...settings,
                        backup: { ...settings.backup, retentionCount: Number(e.target.value) }
                      })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-mono focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="text-zinc-400 block mb-1">مسار التخزين المادي للنسخ على خادم السحابة</label>
                    <input
                      type="text"
                      required
                      value={settings.backup.backupLocation}
                      onChange={e => setSettings({
                        ...settings,
                        backup: { ...settings.backup, backupLocation: e.target.value }
                      })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-mono focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-zinc-900 pt-3.5">
                  <span className="text-[10px] text-zinc-500">تم تحديث الإعدادات التلقائية؟ انقر الحفظ لتطبيق الجدول.</span>
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-900 hover:border-indigo-500 text-indigo-300 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    حفظ تهيئة التكرار
                  </button>
                </div>
              </div>

              {/* Manual Backup Trigger Board */}
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-400" />
                    النسخ الاحتياطي اليدوي ونقاط الاستعادة المسجلة
                  </h3>
                  <button
                    type="button"
                    onClick={handleCreateBackup}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 border border-emerald-500 transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    أخذ نسخة احتياطية فورية الآن
                  </button>
                </div>

                {/* Backups list table */}
                <div className="border border-zinc-900 rounded-lg overflow-hidden">
                  <table className="w-full text-right border-collapse font-sans text-xs">
                    <thead>
                      <tr className="bg-zinc-900/60 text-zinc-500 font-mono border-b border-zinc-850">
                        <th className="p-3 text-right">عنوان اللقطة والنسخة</th>
                        <th className="p-3">تاريخ ووقت الإنشاء</th>
                        <th className="p-3 text-center">حالة الحفظ</th>
                        <th className="p-3 text-left">التحكم بالاستعادة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 text-zinc-300">
                      {backups.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-zinc-600 font-light">
                            لا يوجد نسخ احتياطية مسجلة في السجل حالياً.
                          </td>
                        </tr>
                      ) : (
                        backups.map(bk => (
                          <tr key={bk.id} className="hover:bg-zinc-900/30 transition-colors">
                            <td className="p-3">
                              <div className="font-semibold text-zinc-200">{bk.name}</div>
                              <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{bk.id}</div>
                            </td>
                            <td className="p-3 font-mono text-zinc-400 text-xs">
                              {new Date(bk.createdAt).toLocaleString("ar-EG", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit"
                              })}
                            </td>
                            <td className="p-3 text-center">
                              <span className="bg-emerald-950 text-emerald-400 border border-emerald-900/40 text-[9.5px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {bk.status}
                              </span>
                            </td>
                            <td className="p-3 text-left">
                              <button
                                type="button"
                                onClick={() => handleRestoreBackup(bk.id)}
                                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                              >
                                استعادة هذه النسخة ↩
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {currentUserRole === "admin" && (
              <div className="bg-red-950/20 border border-red-900/60 rounded-xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <Trash2 className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-red-300">تصفير بيانات الأعمال</h3>
                    <p className="text-xs text-red-200/70 mt-1 leading-relaxed">يمسح المواد، المخزون، الموردين، العملاء، الطلبات، الفواتير، الدفعات، المصاريف، الإنتاج، الإشعارات والنسخ التجريبية. لا يمسح الإعدادات أو سعر الصرف أو حسابات المستخدمين أو إعدادات الترقيم.</p>
                  </div>
                </div>
                <button type="button" onClick={handleSafeReset} className="bg-red-700 hover:bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-lg border border-red-500 transition-colors cursor-pointer">تصفير كامل لبدء إدخال البيانات الحقيقية</button>
              </div>
              )}

              {/* Developer Monitoring Visibility Controls */}
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono border-b border-zinc-900 pb-2 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  خيارات المطور ومراقبة الاتصال المتقدمة
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  تتيح لك هذه الخيارات إظهار أو إخفاء السجلات الفنية للاتصال ولوحة JWT لتوفير مساحة رؤية أكبر داخل النظام.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans pt-2">
                  <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-200 block mb-0.5">محاكي الطرفية وسجل الأحداث الحية</span>
                      <span className="text-[10px] text-zinc-500">مراقبة الأكواد، اتصال قاعدة البيانات وحركات الليزر (AXIS LAB LOCAL LOGS ACTIVE).</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showTerminalLogs}
                        onChange={(e) => setShowTerminalLogs?.(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:rtl:translate-x-0 rtl:after:left-[auto] rtl:after:right-[2px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-200 block mb-0.5">لوحة فحص جلسة الـ JWT النشطة</span>
                      <span className="text-[10px] text-zinc-500">فحص ترويسة ومحتوى رمز الجلسة الفك والتحقق المباشر (Session active & decrypted).</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showJwtHud}
                        onChange={(e) => setShowJwtHud?.(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:rtl:translate-x-0 rtl:after:left-[auto] rtl:after:right-[2px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

{/* 5. LOCAL NETWORK & INTRANET MULTI-USER SETUP TAB */}

{activeTab === "network" && (
            <div className="space-y-6 text-right">
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-3">
                  <div className="order-last md:order-first">
                    <button
                      onClick={loadNetworkInfo}
                      disabled={loadingNetwork}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {loadingNetwork ? "جاري البحث..." : "إعادة فحص الشبكة 🔄"}
                    </button>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5 justify-end">
                      <Globe className="w-4 h-4 text-sky-400 animate-pulse" />
                      إعدادات الشبكة المحلية وتعدد المستخدمين (Intranet Setup)
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      تفاصيل ربط الأجهزة داخل الورشة وعناوين الاتصال المباشرة لتشغيل النظام كخادم مركزي وعملاء متعددين.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Card 1: Server Status */}
                  <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl space-y-2">
                    <span className="text-[10px] text-zinc-500 block">نوع خادم التشغيل</span>
                    <span className="text-sm font-bold text-zinc-200 block">AXIS LAB Core Server</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 text-[10px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      نشط ومستقر (Active)
                    </span>
                  </div>

                  {/* Card 2: Environment */}
                  <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl space-y-2">
                    <span className="text-[10px] text-zinc-500 block">منفذ الاتصال (Port)</span>
                    <span className="text-sm font-bold text-zinc-200 block font-mono">{networkInfo?.port || 3000}</span>
                    <span className="text-[10px] text-zinc-500 block">مفتوح للمنافذ الخارجية والمحلية</span>
                  </div>

                  {/* Card 3: Platform OS */}
                  <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl space-y-2">
                    <span className="text-[10px] text-zinc-500 block">نظام تشغيل الخادم والاسم</span>
                    <span className="text-sm font-bold text-zinc-200 block font-mono truncate">{networkInfo?.hostname || "AxisLab-Host"}</span>
                    <span className="text-[10px] text-zinc-500 block capitalize">{networkInfo?.platform || "Linux"} Server Node</span>
                  </div>
                </div>

                {/* Connection IPs list */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-zinc-300">عناوين IP المتاحة للاتصال بالشبكة المحلية:</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    استخدم أحد العناوين التالية للاتصال من أجهزة الكمبيوتر أو الهواتف أو الأجهزة اللوحية المتصلة بنفس شبكة الورشة الداخلية:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {loadingNetwork ? (
                      <div className="col-span-2 text-center p-6 bg-zinc-900/10 border border-zinc-900 border-dashed rounded-xl">
                        <span className="text-zinc-500 text-xs">جاري جرد كروت الشبكة والـ IPs المتصلة...</span>
                      </div>
                    ) : networkInfo?.ips && networkInfo.ips.filter((ip: any) => !ip.internal).length > 0 ? (
                      networkInfo.ips.map((ip: any) => (
                        <div key={ip.address} className="flex items-center justify-between bg-zinc-900/60 border border-zinc-850 p-3.5 rounded-xl transition-all hover:border-zinc-800">
                          <div className="text-left font-mono">
                            <span className="text-indigo-400 font-bold bg-indigo-950/20 border border-indigo-900/30 px-2 py-1 rounded-lg text-xs">
                              http://{ip.address}:{networkInfo.port || 3000}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-zinc-200 font-bold text-xs block">{ip.name}</span>
                            <span className="text-[10px] text-zinc-500">كارت شبكة محلي (IPv4)</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <>
                        {/* Simulation / fallback IP address display */}
                        <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl">
                          <div className="text-left font-mono">
                            <span className="text-indigo-400 font-bold bg-indigo-950/20 border border-indigo-900/30 px-2 py-1 rounded-lg text-xs">
                              http://192.168.1.150:3000
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-zinc-200 font-bold text-xs block">WLAN (شبكة لاسلكية افتراضية)</span>
                            <span className="text-[10px] text-[#c59257] font-semibold">عنوان مقترح للاتصال المحلي بالورشة</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-850 p-3.5 rounded-xl">
                          <div className="text-left font-mono">
                            <span className="text-indigo-400 font-bold bg-indigo-950/20 border border-indigo-900/30 px-2 py-1 rounded-lg text-xs">
                              http://localhost:3000
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-zinc-200 font-bold text-xs block">Loopback (الاتصال الذاتي على نفس الجهاز)</span>
                            <span className="text-[10px] text-zinc-500">عنوان التشغيل الداخلي الافتراضي</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Intranet Architecture Diagram using pure elegant SVG/CSS */}
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono border-b border-zinc-900 pb-2 flex items-center gap-1.5 justify-end">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  مخطط هيكلية الاتصال المتعدد في الورشة (AXIS LAB Intranet Flow)
                </h3>
                
                <div className="bg-[#030305] border border-zinc-900 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[220px]">
                  {/* Grid overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:15px_15px] opacity-40" />
                  
                  <div className="relative z-10 w-full max-w-lg flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
                    {/* Server node */}
                    <div className="flex-1 w-full max-w-[150px] bg-zinc-900 border-2 border-[#c59257] p-3.5 rounded-xl text-center space-y-2 shadow-lg shadow-amber-500/5">
                      <div className="w-9 h-9 mx-auto bg-amber-950/30 border border-amber-900/40 rounded-full flex items-center justify-center">
                        <Cpu className="w-4 h-4 text-[#c59257]" />
                      </div>
                      <span className="font-bold text-zinc-200 text-xs block">جهاز الخادم الرئيسي</span>
                      <span className="text-[9px] text-zinc-500 block font-mono bg-black/40 py-0.5 rounded">PORT 3000 (Host)</span>
                    </div>

                    {/* Central Router / Switch visual connection lines */}
                    <div className="hidden md:flex flex-col items-center justify-center px-4">
                      <div className="h-0.5 w-16 bg-gradient-to-r from-[#c59257] to-indigo-500 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-indigo-500 rounded-full animate-ping" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-zinc-100 rounded-full" />
                      </div>
                      <span className="text-[8px] font-mono text-zinc-600 mt-1 uppercase tracking-widest">Router Wi-Fi</span>
                    </div>

                    {/* Clients Stack */}
                    <div className="flex-1 w-full max-w-[200px] space-y-2">
                      <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-lg flex items-center justify-between text-[11px] hover:border-indigo-900/60 transition-all">
                        <span className="font-semibold text-zinc-300">جهاز المدير العام</span>
                        <span className="text-[9.5px] text-indigo-400 font-bold bg-indigo-950/20 border border-indigo-900/30 px-1.5 py-0.5 rounded">Admin Role</span>
                      </div>
                      <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-lg flex items-center justify-between text-[11px] hover:border-indigo-900/60 transition-all">
                        <span className="font-semibold text-zinc-300">أجهزة فنيين التشغيل</span>
                        <span className="text-[9.5px] text-emerald-400 font-bold bg-emerald-950/20 border border-emerald-900/30 px-1.5 py-0.5 rounded">Employee Role</span>
                      </div>
                      <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-lg flex items-center justify-between text-[11px] hover:border-indigo-900/60 transition-all">
                        <span className="font-semibold text-zinc-300">جهاز المكتب المحاسبي</span>
                        <span className="text-[9.5px] text-amber-500 font-bold bg-amber-950/20 border border-amber-900/30 px-1.5 py-0.5 rounded">Accountant Role</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Intranet Guide */}
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono border-b border-zinc-900 pb-2 flex items-center gap-1.5 justify-end">
                  <Building className="w-4 h-4 text-emerald-400" />
                  دليل بدء التشغيل السريع داخل شبكة الورشة (Quick Guide)
                </h3>

                <div className="space-y-3.5 text-xs text-zinc-400 leading-relaxed">
                  <div className="flex gap-3 justify-end items-start">
                    <div className="text-right">
                      <span className="font-bold text-zinc-200 block">الخطوة الأولى: تهيئة اتصال الخادم الرئيسي</span>
                      <span className="text-[11px] text-zinc-500 block">تأكد من تشغيل هذا الجهاز (الخادم) وتوصيله بالراوتر الرئيسي للورشة عبر كيبل شبكة (Ethernet) أو شبكة Wi-Fi لاسلكية مستقرة.</span>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-indigo-950/40 border border-indigo-900/60 flex items-center justify-center font-bold font-mono text-indigo-400 text-[10px] shrink-0 mt-0.5">1</div>
                  </div>

                  <div className="flex gap-3 justify-end items-start">
                    <div className="text-right">
                      <span className="font-bold text-zinc-200 block">الخطوة الثانية: الحصول على الـ IP والاتصال</span>
                      <span className="text-[11px] text-zinc-500 block">افتح المتصفح (Chrome, Edge أو Safari) من أي جهاز متصل بنفس الشبكة، ثم اكتب عنوان IP الخادم المعروض في الأعلى (مثلاً: <span className="font-mono text-indigo-400">http://192.168.1.150:3000</span>).</span>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-indigo-950/40 border border-indigo-900/60 flex items-center justify-center font-bold font-mono text-indigo-400 text-[10px] shrink-0 mt-0.5">2</div>
                  </div>

                  <div className="flex gap-3 justify-end items-start">
                    <div className="text-right">
                      <span className="font-bold text-zinc-200 block">الخطوة الثالثة: تسجيل الدخول متعدد الصلاحيات</span>
                      <span className="text-[11px] text-zinc-500 block">يمكن الآن لكل مستخدم (المدير، المحاسب، فني الليزر) تسجيل الدخول ببيانات حسابه الخاصة ليعمل الجميع على نفس قاعدة البيانات المركزية وفي نفس الوقت بكل مرونة وبدون تضارب بيانات!</span>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-indigo-950/40 border border-indigo-900/60 flex items-center justify-center font-bold font-mono text-indigo-400 text-[10px] shrink-0 mt-0.5">3</div>
                  </div>
                </div>
              </div>
            </div>
          )}

{/* RECYCLE BIN AND TEMPORARY DELETED ITEMS TAB */}

{activeTab === "recycle_bin" && (
            <div className="space-y-6">
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      سلة المهملات والمحذوفات المؤقتة
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-1 text-right">
                      هنا تُحفظ العناصر التي قمت بحذفها مؤخراً لتفادي الحذف العشوائي أو المبرم. يمكنك استعادة أي عنصر أو حذفه نهائياً.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchRecycleItems}
                    disabled={loadingRecycle}
                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-[11px] rounded border border-zinc-800 transition-colors cursor-pointer"
                  >
                    {loadingRecycle ? "جاري التحديث..." : "تحديث القائمة"}
                  </button>
                </div>

                {loadingRecycle ? (
                  <div className="flex justify-center items-center py-12">
                    <RefreshCcw className="w-6 h-6 text-rose-500 animate-spin" />
                  </div>
                ) : recycleItems.length === 0 ? (
                  <div className="text-center py-16 text-zinc-600 font-sans space-y-3">
                    <Trash2 className="w-12 h-12 text-zinc-800 mx-auto stroke-1" />
                    <div className="text-xs">سلة المحذوفات نظيفة تماماً! لا توجد عناصر محذوفة حالياً.</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-zinc-900">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-zinc-900/60 text-zinc-400 font-bold border-b border-zinc-900">
                          <th className="p-3">اسم العنصر / الوصف</th>
                          <th className="p-3">نوع الكيان</th>
                          <th className="p-3 text-center">تاريخ الحذف</th>
                          <th className="p-3 text-left">العمليات والإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/40">
                        {recycleItems.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-zinc-900/30 transition-all">
                            <td className="p-3">
                              <div className="font-semibold text-zinc-200">{item.name}</div>
                              <div className="text-[10px] text-zinc-500 font-mono">{item.entityId}</div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.entityType === "Customer" ? "bg-blue-950/40 text-blue-400 border border-blue-900/40" :
                                item.entityType === "Product" ? "bg-purple-950/40 text-purple-400 border border-purple-900/40" :
                                item.entityType === "Material" ? "bg-amber-950/40 text-[#c59257] border border-amber-900/40" :
                                "bg-rose-950/40 text-rose-400 border border-rose-900/40"
                              }`}>
                                {item.entityType === "Customer" ? "عميل" :
                                 item.entityType === "Product" ? "منتج / موديل" :
                                 item.entityType === "Material" ? "خامة مستودعية" : "مصروف مال"}
                              </span>
                            </td>
                            <td className="p-3 text-center text-zinc-500 font-mono">
                              {new Date(item.deletedAt).toLocaleString("ar-SY", { hour12: false })}
                            </td>
                            <td className="p-3 text-left space-x-2 space-x-reverse">
                              <button
                                type="button"
                                onClick={() => handleRestoreItem(item.id, item.name)}
                                className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 hover:text-emerald-300 rounded border border-emerald-900/40 transition-colors text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <RefreshCcw className="w-3 h-3" />
                                استعادة
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePermanentDelete(item.id, item.name)}
                                className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 rounded border border-rose-900/40 transition-colors text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                حذف نهائي
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

{/* CUSTOM ORDER STATUSES TAB */}

{activeTab === "custom_statuses" && (
            <div className="space-y-6">
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-4">
                <div className="border-b border-zinc-900 pb-3">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-pink-500" />
                    تخصيص حالات الطلبات ودورة العمل (Workflow Customization)
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-1 text-right">
                    قم بإضافة الحالات الخاصة بورشتك مثل (تصميم، جودة، تسليم، قيد القص) وضبط ترتيبها وألوانها. الحالات الافتراضية محصنة من الحذف لضمان سلامة العمليات الأساسية.
                  </p>
                </div>

                {/* Add Status Form */}
                <form onSubmit={handleAddStatus} className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl space-y-3">
                  <div className="text-[11px] font-bold text-zinc-300">إضافة حالة مخصصة جديدة</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="text-[10px] text-zinc-500 block mb-1">اسم الحالة (بالعربية)</label>
                      <input
                        type="text"
                        value={newStatusName}
                        onChange={e => setNewStatusName(e.target.value)}
                        placeholder="مثال: قيد التجميع واللصق"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 block mb-1">لون الحالة</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={newStatusColor}
                          onChange={e => setNewStatusColor(e.target.value)}
                          className="w-10 h-8 bg-transparent border-0 rounded p-0 cursor-pointer shrink-0"
                        />
                        <div className="grid grid-cols-6 gap-1 w-full">
                          {["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6"].map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setNewStatusColor(c)}
                              className="w-4 h-4 rounded-full border border-zinc-900 hover:scale-110 transition-all shrink-0"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 border border-indigo-500 transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة الحالة
                    </button>
                  </div>
                </form>

                {/* Statuses Grid */}
                <div className="space-y-2.5">
                  <div className="text-[11px] font-bold text-zinc-400">قائمة حالات الطلبات النشطة</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {statuses.map((item, idx) => {
                      const isEditing = editingStatusId === item.id;
                      return (
                        <div
                          key={item.id || idx}
                          className="bg-zinc-900/60 border border-zinc-850 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-zinc-800 transition-all text-right"
                        >
                          {isEditing ? (
                            <div className="flex-1 flex gap-2 items-center text-xs">
                              <input
                                type="text"
                                value={editingStatusName}
                                onChange={e => setEditingStatusName(e.target.value)}
                                className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-1 text-xs text-zinc-200"
                              />
                              <input
                                type="color"
                                value={editingStatusColor}
                                onChange={e => setEditingStatusColor(e.target.value)}
                                className="w-8 h-7 bg-transparent border-0 p-0 cursor-pointer shrink-0"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(item.id)}
                                className="p-1.5 bg-emerald-950 text-emerald-400 rounded hover:bg-emerald-900 transition-all cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingStatusId(null)}
                                className="p-1.5 bg-zinc-855 text-zinc-400 rounded hover:bg-zinc-800 transition-all cursor-pointer text-[10px]"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="w-3.5 h-3.5 rounded-full shadow-inner border border-zinc-950 shrink-0"
                                  style={{ backgroundColor: item.color }}
                                />
                                <div>
                                  <div className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                                    {item.name}
                                    {item.isDefault && (
                                      <span className="text-[9px] px-1 bg-indigo-950/50 text-indigo-400 border border-indigo-900/30 rounded flex items-center gap-0.5 font-bold">
                                        <Lock className="w-2.5 h-2.5" />
                                        أساسي
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-zinc-500 font-mono">الترتيب: {item.order}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleReorderStatuses(item.id, "up")}
                                  className="p-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded transition-all cursor-pointer disabled:opacity-30"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === statuses.length - 1}
                                  onClick={() => handleReorderStatuses(item.id, "down")}
                                  className="p-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded transition-all cursor-pointer disabled:opacity-30"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                {!item.isDefault && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingStatusId(item.id);
                                        setEditingStatusName(item.name);
                                        setEditingStatusColor(item.color);
                                      }}
                                      className="px-2 py-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-[10px] rounded transition-all cursor-pointer font-bold"
                                    >
                                      تعديل
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteStatus(item.id, item.name)}
                                      className="p-1 bg-rose-950/40 text-rose-400 hover:bg-rose-900/20 rounded transition-all cursor-pointer"
                                    >
                                      <Trash className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

{/* NUMBERING SETTINGS TAB */}

{activeTab === "numbering" && (
            <div className="space-y-6">
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-4">
                <div className="border-b border-zinc-900 pb-3">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-[#c59257]" />
                    إعدادات ونماذج الترقيم التلقائي (Serial Numbering Patterns)
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-1 text-right">
                    اضبط السلاسل والقوالب لترقيم الفواتير والطلبات وعقود التشغيل تلقائياً. يمكنك تخصيص البادئة، اللاحقة، الفواصل، وطول الأرقام مع معاينة فورية للرمز التسلسلي الناتج.
                  </p>
                </div>

                {loadingNumberings ? (
                  <div className="flex justify-center items-center py-12">
                    <RefreshCcw className="w-6 h-6 text-[#c59257] animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {numberings.map((item, idx) => {
                      // Generate interactive preview
                      const digitsStr = String(item.nextNumber).padStart(item.digits || 4, "0");
                      const generatedPreview = `${item.prefix || ""}${item.separator || ""}${digitsStr}${item.suffix || ""}`;

                      return (
                        <div
                          key={item.id || idx}
                          className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl space-y-4 hover:border-zinc-800 transition-all text-right"
                        >
                          <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                            <span className="text-xs font-bold text-zinc-200">
                              {item.id === "invoice" ? "سلسلة ترقيم الفواتير المالية" :
                               item.id === "order" ? "سلسلة ترقيم طلبات العملاء" : "سلسلة ترقيم مهام الإنتاج (Jobs)"}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-500">شكل الرمز التالي المعاين:</span>
                              <span className="bg-zinc-950 border border-zinc-800 text-[#c59257] font-mono text-xs px-2.5 py-0.5 rounded font-bold">
                                {generatedPreview}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-sans">
                            <div>
                              <label className="text-[10px] text-zinc-500 block mb-1">البادئة (Prefix)</label>
                              <input
                                type="text"
                                value={item.prefix || ""}
                                onChange={e => {
                                  const updated = [...numberings];
                                  updated[idx].prefix = e.target.value;
                                  setNumberings(updated);
                                }}
                                placeholder="مثال: INV"
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-100 font-mono focus:border-indigo-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-500 block mb-1">الفاصل (Separator)</label>
                              <input
                                type="text"
                                value={item.separator || ""}
                                onChange={e => {
                                  const updated = [...numberings];
                                  updated[idx].separator = e.target.value;
                                  setNumberings(updated);
                                }}
                                placeholder="مثال: -"
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-100 font-mono focus:border-indigo-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-500 block mb-1">طول الأرقام (Digits)</label>
                              <input
                                type="number"
                                min="2"
                                max="10"
                                value={item.digits || 4}
                                onChange={e => {
                                  const updated = [...numberings];
                                  updated[idx].digits = Number(e.target.value);
                                  setNumberings(updated);
                                }}
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-100 font-mono focus:border-indigo-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-500 block mb-1">اللاحقة (Suffix)</label>
                              <input
                                type="text"
                                value={item.suffix || ""}
                                onChange={e => {
                                  const updated = [...numberings];
                                  updated[idx].suffix = e.target.value;
                                  setNumberings(updated);
                                }}
                                placeholder="مثال: /2026"
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-xs text-zinc-100 font-mono focus:border-indigo-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-500 block mb-1">الرقم القادم (Next No.)</label>
                              <input
                                type="number"
                                min="1"
                                value={item.nextNumber || 1}
                                onChange={e => {
                                  const updated = [...numberings];
                                  updated[idx].nextNumber = Number(e.target.value);
                                  setNumberings(updated);
                                }}
                                className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-xs text-[#c59257] font-mono font-bold focus:border-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              onClick={() => handleSaveNumbering(item.id, item)}
                              className="px-4 py-1.5 bg-[#c59257] hover:bg-[#b0804c] text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              حفظ السلسلة وتطبيق الترقيم
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

{/* BULK IMPORT TAB */}

{activeTab === "bulk_import" && (
            <div className="space-y-6">
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-4">
                <div className="border-b border-zinc-900 pb-3">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-sky-500" />
                    محرك الاستيراد الجماعي الذكي (Bulk Fast Importer)
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-1 text-right">
                    أسرع طريقة لتهيئة حسابك ونقل بياناتك السابقة. قم باختيار فئة البيانات، واللصق المباشر من Excel أو الملفات، ومراجعة التقرير للتحقق من الأخطاء قبل الاعتماد النهائي.
                  </p>
                </div>

                {/* Sub-tabs for import type */}
                <div className="flex bg-zinc-900/40 p-1 rounded-lg border border-zinc-850 w-fit gap-1 mr-auto" dir="rtl">
                  {[
                    { id: "suppliers", label: "الموردون" },
                    { id: "materials", label: "خامات ومواد المستودع" },
                    { id: "inventory", label: "المخزون الافتتاحي" },
                    { id: "customers", label: "دفتر حسابات العملاء" },
                    { id: "products", label: "مكتبة المنتجات والتصاميم" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setImportType(tab.id as any);
                        setImportText("");
                        setImportPreview([]);
                        setImportStatus(null);
                      }}
                      className={`px-4 py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${
                        importType === tab.id 
                          ? "bg-indigo-600 text-white" 
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Data Format Guide & Template Paste */}
                <div className="bg-zinc-900/20 border border-zinc-850 rounded-xl p-4 space-y-3 text-right">
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                    <div className="text-[11px] font-bold text-zinc-300">طريقة لصق البيانات وإرشادات التنسيق</div>
                    <button
                      type="button"
                      onClick={() => {
                        let sample = "";
                        if (importType === "materials") {
                          sample = "name\tpricePerUnit\tcategory\tthickness\tcolor\tstock\nأكريليك شفاف 3مم\t6075\tacrylic\t3\ttransparent\t20\nMDF حفر خشب 5مم\t4320\twood\t5\tbrown\t15";
                        } else if (importType === "customers") {
                          sample = "name\tphone\tcompany\taddress\nأبو أحمد الدمشقي\t0933112233\tمطابخ الشام\tباب توما، دمشق\nشركة البقاعي للقص\t011445566\tالبقاعي\tمنطقة الميدان";
                        } else {
                          sample = "name\tprice\tcategory\tdescription\nصحن نقوش فاخر مفرغ\t10125\tطبق خشبي\tطبق حفر ليزر دائري مفرغ\nعلبة مناديل هندسية\t6750\tعلب\tعلبة خشبية للمناديل مع غطاء زلق";
                        }
                        setImportText(sample);
                        setImportStatus({ type: "success", message: "تم ملء صندوق البيانات بنموذج افتراضي كدليل لك ✓" });
                      }}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Clipboard className="w-3 h-3" />
                      إدراج نموذج تجريبي
                    </button>
                  </div>

                  <div className="text-[10px] text-zinc-500 leading-relaxed space-y-1">
                    <div>• يمكنك اللصق مباشرة من جدول Excel (افتح جدولك، ظلل الأعمدة، انسخها Ctrl+C والصقها هنا).</div>
                    <div>• السطر الأول يجب أن يحتوي على أسماء الأعمدة بدقة.</div>
                    {importType === "suppliers" && (
                      <div className="text-amber-400 font-semibold">• الأعمدة المطلوبة: كود المورد، اسم المورد. اختياري: الهاتف، البريد، العنوان، الملاحظات.</div>
                    )}
                    {importType === "materials" && (
                      <div className="text-[#c59257] font-semibold">• الأعمدة المطلوبة: كود المادة، اسم المادة، التصنيف، الوحدة، سعر الشراء (ل.س). اختياري: السماكة، الحد الأدنى، كود المورد.</div>
                    )}
                    {importType === "inventory" && (
                      <div className="text-emerald-400 font-semibold">• الأعمدة المطلوبة: كود المادة، المستودع، الكمية الافتتاحية. اختياري: الموقع/الرف، حالة الجودة، رقم الدفعة.</div>
                    )}
                    {importType === "customers" && (
                      <div className="text-blue-400 font-semibold">• الأعمدة المطلوبة: name (الاسم الثنائي/الشركة). اختياري: phone, company, address, notes.</div>
                    )}
                    {importType === "products" && (
                      <div className="text-purple-400 font-semibold">• الأعمدة المطلوبة: name (الاسم)، price (سعر البيع). اختياري: code, category, description, stock.</div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 border border-dashed border-indigo-700/50 bg-indigo-950/20 rounded-lg p-3">
                    <div className="text-[10px] text-zinc-400">اختر القالب الرسمي بصيغة XLSX لقراءة الورقة ومعاينتها قبل الحفظ.</div>
                    <label className="px-4 py-2 bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs rounded-lg cursor-pointer inline-flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      {isExcelUploading ? "جارٍ قراءة الملف..." : "اختيار ملف Excel"}
                      <input type="file" accept=".xlsx,.xls" className="hidden" disabled={isExcelUploading} onChange={event => { const file = event.target.files?.[0]; if (file) void handleExcelUpload(file); event.currentTarget.value = ""; }} />
                    </label>
                  </div>

                  {/* Input Text Area */}
                  <div className="space-y-1">
                    <textarea
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                      placeholder="الصق بياناتك من Excel أو اكتب قائمة بصيغة JSON هنا..."
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs font-mono text-zinc-100 h-48 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Feedback line */}
                  {importStatus && (
                    <div className={`p-3 rounded-lg text-xs font-medium border ${
                      importStatus.type === "success" 
                        ? "bg-emerald-950/30 border-emerald-900/40 text-emerald-400" 
                        : "bg-rose-950/30 border-rose-900/40 text-rose-400"
                    }`}>
                      {importStatus.message}
                    </div>
                  )}

                  {/* Analyze action button */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleParseImport}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg border border-indigo-500 transition-colors cursor-pointer"
                    >
                      تحليل البيانات ومعاينتها
                    </button>
                    {importPreview.length > 0 && (
                      <button
                        type="button"
                        onClick={handleExecuteImport}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg border border-emerald-500 transition-colors cursor-pointer animate-pulse"
                      >
                        تأكيد وحفظ الاستيراد في قاعدة البيانات ({importPreview.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Preview Grid */}
                {importPreview.length > 0 && (
                  <div className="space-y-2 text-right">
                    <div className="text-[11px] font-bold text-zinc-400">معاينة البيانات قبل الحفظ ({importPreview.length} أسطر جاهزة)</div>
                    <div className="max-h-60 overflow-y-auto rounded-lg border border-zinc-900">
                      <table className="w-full text-right text-[11px]">
                        <thead>
                          <tr className="bg-zinc-900 text-zinc-400 font-bold border-b border-zinc-900 sticky top-0">
                            {Object.keys(importPreview[0]).map(key => (
                              <th key={key} className="p-2.5">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/50">
                          {importPreview.map((row, idx) => (
                            <tr key={idx} className="hover:bg-zinc-900/20">
                              {Object.values(row).map((val: any, colIdx) => (
                                <td key={colIdx} className="p-2.5 text-zinc-300 font-sans">{val}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

{/* 6. SYSTEM STRESS TEST AND RELIABILITY DIAGNOSTICS TAB */}

{activeTab === "stress_test" && (
            <div className="space-y-6">
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-rose-500 animate-spin" />
                      مركز محاكاة ضغط النظام وفحص مرونة الأداء
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      أداة متطورة لاختبار مرونة واجهة برمجة التطبيقات (APIs) ومعالجة البيانات التالفة وحسابات عتبات الخامات تحت أقصى تتابع للأحمال.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={runFullDiagnosticSuite}
                      disabled={isRunningTests}
                      className="bg-rose-600 hover:bg-rose-500 disabled:bg-rose-950 disabled:text-rose-400 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 border border-rose-500 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {isRunningTests ? "جاري الفحص المجهري للضغط..." : "تشغيل حزمة الفحوصات الشاملة"}
                    </button>
                    <button
                      type="button"
                      onClick={clearTestLogs}
                      className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs px-3 py-2 rounded-lg border border-zinc-800 transition-colors cursor-pointer"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Simulated Terminal and Real-time Metric dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono text-center">
                  <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-850">
                    <div className="text-zinc-500 text-[10px] uppercase">إجمالي طلبات الفحص</div>
                    <div className="text-lg font-bold text-zinc-200 mt-1">{testMetrics.totalRequests}</div>
                  </div>
                  <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-850">
                    <div className="text-zinc-500 text-[10px] uppercase">عمليات ناجحة ✓</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">{testMetrics.successes}</div>
                  </div>
                  <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-850">
                    <div className="text-zinc-500 text-[10px] uppercase">فشل محكوم وعزل آمن ⚠️</div>
                    <div className="text-lg font-bold text-amber-500 mt-1">{testMetrics.failures}</div>
                  </div>
                  <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-850">
                    <div className="text-zinc-500 text-[10px] uppercase">متوسط استجابة الخادم</div>
                    <div className="text-lg font-bold text-indigo-400 mt-1">{testMetrics.avgLatency}ms</div>
                  </div>
                </div>

                {/* Simulated Interactive Testing Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={runConcurrencyTest}
                    disabled={isRunningTests}
                    className="p-3 bg-zinc-900/30 hover:bg-zinc-900 border border-zinc-850 rounded-lg text-right hover:border-zinc-700 transition-all cursor-pointer text-xs"
                  >
                    <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                      1. محاكاة وابل طلبات متزامنة
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1 font-sans">
                      يرسل 20 طلباً متوازياً لقياس الاستقرار ومعدل النقل للخادم تحت الضغط المفاجئ.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={runCorruptedPayloadsTest}
                    disabled={isRunningTests}
                    className="p-3 bg-zinc-900/30 hover:bg-zinc-900 border border-zinc-850 rounded-lg text-right hover:border-zinc-700 transition-all cursor-pointer text-xs"
                  >
                    <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      2. حقن بيانات فاسدة وملغومة
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1 font-sans">
                      يختبر مرونة حواجز التحقق من صحة المدخلات في الخادم لمنع حدوث أي انهيار برمجي.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={runInventoryAlertTest}
                    disabled={isRunningTests}
                    className="p-3 bg-zinc-900/30 hover:bg-zinc-900 border border-zinc-850 rounded-lg text-right hover:border-zinc-700 transition-all cursor-pointer text-xs"
                  >
                    <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      3. فحص معايير نقص المخزون
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1 font-sans">
                      يتحقق من جاهزية وحساسية عتبات تنبيهات نفاد المواد وأنظمة الاستشعار التلقائية.
                    </div>
                  </button>
                </div>

                {/* Console Log Screen */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <TerminalIcon className="w-3.5 h-3.5 text-zinc-400" />
                      شاشة المراقبة المباشرة وسجلات تدفق الاختبار
                    </span>
                    <span>الترميز: UTF-8 | ثبات الخادم: آمن</span>
                  </div>
                  <div className="bg-black/95 border border-zinc-900 rounded-lg p-4 font-mono text-[11.5px] leading-relaxed text-zinc-300 h-64 overflow-y-auto space-y-1.5 shadow-inner">
                    {testLogs.length === 0 ? (
                      <div className="text-zinc-600 h-full flex flex-col items-center justify-center font-sans">
                        <span>قيد الانتظار - انقر على أحد أزرار الفحص أعلاه لبدء المحاكاة التلقائية.</span>
                        <span className="text-[10px] text-zinc-700 mt-1">يتم إجراء جميع الاختبارات محلياً وبالتواصل الفعلي مع الـ API لضمان مطابقة الواقع.</span>
                      </div>
                    ) : (
                      testLogs.map((log, idx) => {
                        let colorClass = "text-zinc-400";
                        if (log.includes("✓") || log.includes("🏆")) colorClass = "text-emerald-400 font-semibold";
                        else if (log.includes("⚠️")) colorClass = "text-amber-400 font-medium";
                        else if (log.includes("❌")) colorClass = "text-rose-400 font-bold";
                        else if (log.includes("⚡") || log.includes("🚀")) colorClass = "text-indigo-400 font-semibold";
                        
                        return (
                          <div key={idx} className={`${colorClass} whitespace-pre-wrap transition-all`}>
                            {log}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

{/* 7. PROJECT FILES EXPLORER TAB */}

{activeTab === "explorer" && (
            <div className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden flex flex-col md:flex-row h-[600px]">
              {/* Left directory column */}
              <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-900 bg-zinc-950 flex flex-col shrink-0">
                <div className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-900 text-right">
                  مستكشف ملفات ومخططات الـ DXF/SVG
                </div>
                <div className="flex-1 py-2 overflow-y-auto space-y-0.5">
                  {virtualFiles?.map(f => {
                    const isSel = selectedFileId === f.id;
                    return (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFileId && setSelectedFileId(f.id)}
                        className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer border-r-2 ${
                          isSel 
                            ? "bg-[#c59257]/10 text-white border-[#c59257] font-semibold" 
                            : "hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 border-transparent"
                        }`}
                      >
                        <span className="truncate flex items-center gap-2">
                          <span>📄</span>
                          {f.name}
                        </span>
                        <span className="text-[9px] text-zinc-600 font-mono shrink-0">{f.size}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Code editor view column */}
              <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0c]">
                <div className="px-4 py-2 bg-zinc-900/60 border-b border-zinc-900 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 text-xs text-zinc-200 font-mono">
                    <FileCode className="w-3.5 h-3.5 text-[#c59257]" />
                    <span>{selectedFileObj?.name}</span>
                  </div>
                  <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase">
                    {selectedFileObj?.language}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-5 text-zinc-300">
                  <pre className="whitespace-pre-wrap text-left" dir="ltr">{selectedFileObj?.code}</pre>
                </div>
              </div>
            </div>
          )}

    </>
  );
}
