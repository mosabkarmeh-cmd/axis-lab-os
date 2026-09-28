// Generated decomposition boundary: SettingsFormTabs

export default function SettingsFormTabs({ ctx }: { ctx: Record<string, any> }) {
  const { Activity, AlertTriangle, AnimatePresence, Archive, ArrowDown, ArrowUp, Bell, Briefcase, Building, Check, CheckCircle, Clipboard, Clock, Copy, Cpu, Database, DollarSign, Edit3, ExternalLink, Eye, FileCheck, FileCode, FileSpreadsheet, FileText, Globe, Hash, ImageIcon, Inbox, Instagram, Lock, Mail, MapPin, MessageCircle, Package, Palette, Percent, Phone, Play, Plus, React, RefreshCcw, Save, Send, SettingsView, Share2, Shield, ShieldCheck, Sparkles, TerminalIcon, Trash, Trash2, Upload, Users, Zap, activeTab, addLog, backupStatus, backups, clearTestLogs, copiedShortcodeTag, copyShortcodeToClipboard, currentUserRole, editingStatusColor, editingStatusId, editingStatusName, editingUserId, evaluateShortcodes, fetchNumberings, fetchRecycleItems, fetchStatuses, fetchUsers, handleAddStatus, handleCreateBackup, handleCreateUser, handleDeleteStatus, handleDeleteUser, handleExcelUpload, handleExecuteImport, handleParseImport, handlePermanentDelete, handleReorderStatuses, handleRestoreBackup, handleRestoreItem, handleSafeReset, handleSaveNumbering, handleSaveSettings, handleTestSmtp, handleUpdateStatus, handleUpdateUser, importPreview, importStatus, importText, importType, isExcelUploading, isLoading, isRunningTests, isSaving, loadNetworkInfo, loadSettingsAndBackups, loadingNetwork, loadingNumberings, loadingRecycle, loadingUsers, motion, networkInfo, newStatusColor, newStatusName, numberings, recycleItems, runConcurrencyTest, runCorruptedPayloadsTest, runFullDiagnosticSuite, runInventoryAlertTest, saveStatus, selectedFileId, selectedFileObj, setActiveTab, setBackupStatus, setBackups, setCopiedShortcodeTag, setEditingStatusColor, setEditingStatusId, setEditingStatusName, setEditingUserId, setImportPreview, setImportStatus, setImportText, setImportType, setIsExcelUploading, setIsLoading, setIsRunningTests, setIsSaving, setLoadingNetwork, setLoadingNumberings, setLoadingRecycle, setLoadingUsers, setNetworkInfo, setNewStatusColor, setNewStatusName, setNumberings, setRecycleItems, setSaveStatus, setSelectedFileId, setSettings, setShortcodeSampleText, setShowAddUserPanel, setShowJwtHud, setShowTerminalLogs, setStatuses, setSystemUsers, setTestLogs, setTestMetrics, setTestSmtpLoading, setTestSmtpStatus, setUserActionStatus, setUserFormEmail, setUserFormFullName, setUserFormIsActive, setUserFormPassword, setUserFormRole, settings, shortcodeSampleText, showAddUserPanel, showJwtHud, showTerminalLogs, statuses, systemUsers, testLogs, testMetrics, testSmtpLoading, testSmtpStatus, useEffect, useState, userActionStatus, userFormEmail, userFormFullName, userFormIsActive, userFormPassword, userFormRole, virtualFiles } = ctx;
  return (
<form onSubmit={handleSaveSettings} className="space-y-4">
            
            {/* 1. COMPANY SETTINGS TAB */}
            {activeTab === "company" && (
              <div className="space-y-6">
                
                {/* Form Fields Card */}
                <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-5 shadow-xl">
                  <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-2">
                      <Building className="w-4 h-4 text-[#c59257]" />
                      <span>إعدادات معلومات الشركة، الهوية الرسمية وترويسة الفواتير</span>
                    </h3>
                    <span className="text-[10px] bg-[#c59257]/10 text-[#c59257] border border-[#c59257]/30 px-2 py-0.5 rounded font-mono">
                      تنعكس فورياً على الفواتير والمراسلات
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                    {/* Company Name */}
                    <div>
                      <label className="text-zinc-400 font-semibold block mb-1 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-indigo-400" />
                        <span>اسم المؤسسة والورشة التجاري</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={settings.company.name || ""}
                        onChange={e => setSettings({
                          ...settings,
                          company: { ...settings.company, name: e.target.value }
                        })}
                        placeholder="مثال: مجمع المحور والورش الذكية - AXIS LAB"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-bold focus:border-[#c59257] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Official Email */}
                    <div>
                      <label className="text-zinc-400 font-semibold block mb-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        <span>البريد الإلكتروني الرسمي للمراسلات والمالية</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={settings.company.email || ""}
                        onChange={e => setSettings({
                          ...settings,
                          company: { ...settings.company, email: e.target.value }
                        })}
                        placeholder="contact@axislab.com"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-mono focus:border-[#c59257] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Primary Phone */}
                    <div>
                      <label className="text-zinc-400 font-semibold block mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>رقم الهاتف الأساسي للورشة</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={settings.company.phone || ""}
                        onChange={e => setSettings({
                          ...settings,
                          company: { ...settings.company, phone: e.target.value }
                        })}
                        placeholder="+962790000000"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-mono focus:border-[#c59257] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Sales WhatsApp */}
                    <div>
                      <label className="text-zinc-400 font-semibold block mb-1 flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span>رقم واتساب المبيعات والمحادثات السريعة</span>
                      </label>
                      <input
                        type="text"
                        value={settings.company.whatsapp || ""}
                        onChange={e => setSettings({
                          ...settings,
                          company: { ...settings.company, whatsapp: e.target.value }
                        })}
                        placeholder="+962790000000"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-emerald-300 font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Instagram Account */}
                    <div>
                      <label className="text-zinc-400 font-semibold block mb-1 flex items-center gap-1.5">
                        <Instagram className="w-3.5 h-3.5 text-pink-400" />
                        <span>حساب أو رابط إنستغرام الورشة</span>
                      </label>
                      <input
                        type="text"
                        value={settings.company.instagram || ""}
                        onChange={e => setSettings({
                          ...settings,
                          company: { ...settings.company, instagram: e.target.value }
                        })}
                        placeholder="https://instagram.com/axislab_laser أو @axislab_laser"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-pink-300 font-mono focus:border-pink-500 focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Tax ID / Commercial Registration */}
                    <div>
                      <label className="text-zinc-400 font-semibold block mb-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span>الرقم الضريبي / السجل التجاري</span>
                      </label>
                      <input
                        type="text"
                        value={settings.company.taxNumber || ""}
                        onChange={e => setSettings({
                          ...settings,
                          company: { ...settings.company, taxNumber: e.target.value }
                        })}
                        placeholder="مثال: TAX-9988223"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-amber-300 font-mono focus:border-amber-500 focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Address */}
                    <div className="md:col-span-2">
                      <label className="text-zinc-400 font-semibold block mb-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>العنوان والموقع الجغرافي للمصنع أو الورشة</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={settings.company.address || ""}
                        onChange={e => setSettings({
                          ...settings,
                          company: { ...settings.company, address: e.target.value }
                        })}
                        placeholder="عمان، الأردن - شارع مكة - المجمع الصناعي"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 focus:border-[#c59257] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Workshop Logo Customization & Management Section */}
                    <div className="md:col-span-2 bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                        <label className="text-zinc-200 font-bold text-xs flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-[#c59257]" />
                          <span>شعار الورشة وأيقونة البرنامج (Workshop Logo & Icon)</span>
                        </label>
                        <span className="text-[10px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                          قابل للتغيير والتخصيص فورياً
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                        {/* Logo Preview */}
                        <div className="relative group shrink-0">
                          <div className="w-20 h-20 bg-zinc-950 border-2 border-[#c59257]/40 rounded-xl overflow-hidden flex items-center justify-center p-1 shadow-lg shadow-black/50">
                            {settings.company.logo ? (
                              <img
                                src={settings.company.logo}
                                alt="شعار الورشة"
                                className="w-full h-full object-contain rounded-lg"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="text-center p-2">
                                <ImageIcon className="w-6 h-6 text-zinc-600 mx-auto" />
                                <span className="text-[9px] text-zinc-500 block mt-1">لا يوجد شعار</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Controls & Upload */}
                        <div className="flex-1 space-y-2.5 w-full">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Native File Upload */}
                            <label className="cursor-pointer bg-[#c59257] hover:bg-[#a67438] text-black text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-md">
                              <Upload className="w-3.5 h-3.5" />
                              <span>رفع شعار جديد من الجهاز</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      if (reader.result) {
                                        setSettings({
                                          ...settings,
                                          company: { ...settings.company, logo: reader.result as string }
                                        });
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>

                            {/* Preset Buttons */}
                            <button
                              type="button"
                              onClick={() => setSettings({
                                ...settings,
                                company: { ...settings.company, logo: "/logo.jpg" }
                              })}
                              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3 text-[#c59257]" />
                              <span>الشعار الذهبي المرفق (Default)</span>
                            </button>

                            {settings.company.logo && (
                              <button
                                type="button"
                                onClick={() => setSettings({
                                  ...settings,
                                  company: { ...settings.company, logo: "" }
                                })}
                                className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900/40 text-xs px-2 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>حذف</span>
                              </button>
                            )}
                          </div>

                          {/* Direct URL input */}
                          <div>
                            <span className="text-[10px] text-zinc-500 block mb-1">أو أدخل رابط الشعار مباشرة (URL / Base64):</span>
                            <input
                              type="text"
                              placeholder="/logo.jpg أو https://example.com/logo.png"
                              value={settings.company.logo || ""}
                              onChange={e => setSettings({
                                ...settings,
                                company: { ...settings.company, logo: e.target.value }
                              })}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-cyan-300 font-mono text-xs focus:border-[#c59257] focus:outline-none transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Social Contact Buttons & Testing Card */}
                <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-4 shadow-xl">
                  <div className="border-b border-zinc-900 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-emerald-400" />
                        <span>أزرار وسائط التواصل الاجتماعي والاتصال السريع للشركة (Company Quick Social Contact Buttons)</span>
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        أزرار تفاعلية جليّة ومباشرة للاتصال بواتساب الورشة، إنستغرام، البريد الإلكتروني، والهاتف الرسمي لتسهيل التواصل واختبار الروابط.
                      </p>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded font-mono font-bold shrink-0 self-start sm:self-auto">
                      أزرار تفاعلية مباشرة 🔗
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-sans">
                    {/* 🟢 WhatsApp Action Button */}
                    <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3.5 flex flex-col justify-between gap-3 hover:border-emerald-500/50 transition-all group">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                            <MessageCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                            <span>واتساب المبيعات</span>
                          </span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded">WhatsApp</span>
                        </div>
                        <p className="font-mono text-xs text-zinc-200 truncate dir-ltr text-right">
                          {settings.company.whatsapp || settings.company.phone || "غير محدد"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1 border-t border-emerald-900/40">
                        <a
                          href={`https://wa.me/${(settings.company.whatsapp || settings.company.phone || "").replace(/[^0-9+]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors shadow"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>مراسلة فورية</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const link = `https://wa.me/${(settings.company.whatsapp || settings.company.phone || "").replace(/[^0-9+]/g, '')}`;
                            navigator.clipboard.writeText(link);
                            setCopiedShortcodeTag("wa_link");
                            setTimeout(() => setCopiedShortcodeTag(null), 2000);
                          }}
                          className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg transition-colors cursor-pointer"
                          title="نسخ رابط الواتساب"
                        >
                          {copiedShortcodeTag === "wa_link" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* 📸 Instagram Action Button */}
                    <div className="bg-pink-950/20 border border-pink-800/40 rounded-xl p-3.5 flex flex-col justify-between gap-3 hover:border-pink-500/50 transition-all group">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-pink-400 font-bold text-xs flex items-center gap-1.5">
                            <Instagram className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
                            <span>إنستغرام الورشة</span>
                          </span>
                          <span className="text-[9px] bg-pink-500/20 text-pink-300 font-mono px-1.5 py-0.5 rounded">Instagram</span>
                        </div>
                        <p className="font-mono text-xs text-zinc-200 truncate dir-ltr text-right">
                          {settings.company.instagram || "غير محدد"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1 border-t border-pink-900/40">
                        <a
                          href={settings.company.instagram ? (settings.company.instagram.startsWith("http") ? settings.company.instagram : `https://instagram.com/${settings.company.instagram.replace('@', '')}`) : "https://instagram.com"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all shadow"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>زيارة الحساب</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const link = settings.company.instagram ? (settings.company.instagram.startsWith("http") ? settings.company.instagram : `https://instagram.com/${settings.company.instagram.replace('@', '')}`) : "";
                            navigator.clipboard.writeText(link);
                            setCopiedShortcodeTag("ig_link");
                            setTimeout(() => setCopiedShortcodeTag(null), 2000);
                          }}
                          className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg transition-colors cursor-pointer"
                          title="نسخ رابط إنستغرام"
                        >
                          {copiedShortcodeTag === "ig_link" ? <Check className="w-3.5 h-3.5 text-pink-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* ✉️ Official Email Action Button */}
                    <div className="bg-blue-950/20 border border-blue-800/40 rounded-xl p-3.5 flex flex-col justify-between gap-3 hover:border-blue-500/50 transition-all group">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-blue-400 font-bold text-xs flex items-center gap-1.5">
                            <Mail className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                            <span>البريد الإلكتروني</span>
                          </span>
                          <span className="text-[9px] bg-blue-500/20 text-blue-300 font-mono px-1.5 py-0.5 rounded">Email</span>
                        </div>
                        <p className="font-mono text-xs text-zinc-200 truncate dir-ltr text-right">
                          {settings.company.email || "غير محدد"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1 border-t border-blue-900/40">
                        <a
                          href={`mailto:${settings.company.email || "contact@axislab.com"}`}
                          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors shadow"
                        >
                          <Send className="w-3 h-3" />
                          <span>إرسال بريد</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(settings.company.email || "");
                            setCopiedShortcodeTag("email_link");
                            setTimeout(() => setCopiedShortcodeTag(null), 2000);
                          }}
                          className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg transition-colors cursor-pointer"
                          title="نسخ البريد الإلكتروني"
                        >
                          {copiedShortcodeTag === "email_link" ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* 📞 Phone Action Button */}
                    <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3.5 flex flex-col justify-between gap-3 hover:border-amber-500/50 transition-all group">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
                            <Phone className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                            <span>الهاتف الرسمي</span>
                          </span>
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 font-mono px-1.5 py-0.5 rounded">Phone</span>
                        </div>
                        <p className="font-mono text-xs text-zinc-200 truncate dir-ltr text-right">
                          {settings.company.phone || "غير محدد"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1 border-t border-amber-900/40">
                        <a
                          href={`tel:${settings.company.phone || ""}`}
                          className="flex-1 bg-amber-600 hover:bg-amber-500 text-black font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors shadow"
                        >
                          <Phone className="w-3 h-3" />
                          <span>اتصال مباشر</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(settings.company.phone || "");
                            setCopiedShortcodeTag("phone_link");
                            setTimeout(() => setCopiedShortcodeTag(null), 2000);
                          }}
                          className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg transition-colors cursor-pointer"
                          title="نسخ رقم الهاتف"
                        >
                          {copiedShortcodeTag === "phone_link" ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Invoice Header Preview */}
                <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                    <h4 className="text-xs font-bold text-[#c59257] flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>معاينة حية لترويسة المستندات والفواتير المطبوعة</span>
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-mono">Live Invoice Header Preview</span>
                  </div>

                  <div className="bg-black/90 border border-zinc-850 rounded-lg p-4 space-y-3 relative overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-[#c59257] via-amber-400 to-[#c59257] absolute top-0 left-0 right-0" />
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="space-y-1">
                        <h2 className="text-base font-black text-[#c59257]">
                          {settings.company.name || "اسم الورشة التجاري"}
                        </h2>
                        <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-zinc-500" />
                          <span>{settings.company.address || "العنوان غير محدد"}</span>
                        </p>
                      </div>

                      {settings.company.logo && (
                        <img src={settings.company.logo} alt="Logo" className="h-10 object-contain max-w-[120px] rounded" />
                      )}
                    </div>

                    <div className="pt-2 border-t border-zinc-900/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        <span className="font-mono text-[10px]">{settings.company.email || "غير محدد"}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="font-mono text-[10px]">{settings.company.whatsapp || settings.company.phone || "غير محدد"}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-pink-400">
                        <Instagram className="w-3.5 h-3.5" />
                        <span className="font-mono text-[10px]">{settings.company.instagram || "غير محدد"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Correspondence Shortcodes & Messaging Templates Engine */}
                <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-4">
                  <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-emerald-400" />
                        <span>رموز المراسلات والرسائل التلقائية (Shortcodes & Variables)</span>
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        استخدم هذه الرموز المختصرة في نماذج المراسلات عبر واتساب، البريد، وقوالب المشاركة ليتم استبدالها تلقائياً ببيانات ورشتك.
                      </p>
                    </div>
                  </div>

                  {/* Shortcode Tags Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {[
                      { tag: "{companyName}", arTag: "{اسم_الورشة}", label: "اسم الورشة التجاري", val: settings.company.name, icon: Building, color: "text-indigo-400 bg-indigo-950/40 border-indigo-900/40" },
                      { tag: "{companyEmail}", arTag: "{البريد_الرسمي}", label: "البريد الإلكتروني الرسمي", val: settings.company.email, icon: Mail, color: "text-blue-400 bg-blue-950/40 border-blue-900/40" },
                      { tag: "{whatsapp}", arTag: "{واتساب_المبيعات}", label: "واتساب المبيعات", val: settings.company.whatsapp || settings.company.phone, icon: MessageCircle, color: "text-emerald-400 bg-emerald-950/40 border-emerald-900/40" },
                      { tag: "{instagram}", arTag: "{إنستغرام_الورشة}", label: "حساب إنستغرام", val: settings.company.instagram, icon: Instagram, color: "text-pink-400 bg-pink-950/40 border-pink-900/40" },
                      { tag: "{address}", arTag: "{العنوان}", label: "العنوان والموقع", val: settings.company.address, icon: MapPin, color: "text-rose-400 bg-rose-950/40 border-rose-900/40" },
                      { tag: "{phone}", arTag: "{الهاتف}", label: "الهاتف الرئيسي", val: settings.company.phone, icon: Phone, color: "text-amber-400 bg-amber-950/40 border-amber-900/40" },
                    ].map((item, idx) => {
                      const IconComp = item.icon;
                      const isCopied = copiedShortcodeTag === item.tag;
                      return (
                        <div key={idx} className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-3 space-y-2 relative group hover:border-zinc-700 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-zinc-400 font-bold flex items-center gap-1.5">
                              <IconComp className="w-3.5 h-3.5 text-zinc-400" />
                              <span>{item.label}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => copyShortcodeToClipboard(item.tag)}
                              className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2 py-0.5 rounded flex items-center gap-1 border border-zinc-700 cursor-pointer transition-all"
                            >
                              {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                              <span>{isCopied ? "تم النسخ" : "نسخ الرمز"}</span>
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-1.5 font-mono text-[11px] overflow-x-auto pb-1">
                            <span className={`px-2 py-0.5 rounded border ${item.color} font-bold`}>{item.tag}</span>
                            <span className="text-zinc-600">أو</span>
                            <span className="bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">{item.arTag}</span>
                          </div>

                          <div className="text-[10px] text-zinc-500 truncate font-mono pt-1 border-t border-zinc-900">
                            القيمة الحالية: <span className="text-zinc-300 font-semibold">{item.val || "غير محددة"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Interactive Shortcode Sandbox / Tester */}
                  <div className="bg-zinc-900/40 border border-zinc-850 rounded-lg p-4 space-y-3">
                    <h5 className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>اختبار استبدال الرموز في نموذج مراسلة (Live Template Sandbox)</span>
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">صيغة النص مع الرموز المختصرة:</label>
                        <textarea
                          rows={4}
                          value={shortcodeSampleText}
                          onChange={(e) => setShortcodeSampleText(e.target.value)}
                          className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-zinc-200 text-xs font-sans leading-relaxed focus:border-[#c59257] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-emerald-400 block mb-1 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>النتيجة النهائية التي سيستلمها العميل:</span>
                        </label>
                        <div className="w-full bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-3 text-emerald-200 text-xs leading-relaxed min-h-[95px] whitespace-pre-wrap font-sans">
                          {evaluateShortcodes(shortcodeSampleText, settings.company)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* 2. PRICING SETTINGS TAB */}
            {activeTab === "pricing" && (
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono border-b border-zinc-900 pb-2 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  معايير التكلفة والربحية لحساب الأسعار ذكياً
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                  <div>
                    <label className="text-zinc-400 block mb-1">هامش الربح الافتراضي للمواد (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="200"
                        required
                        value={settings.pricing.defaultProfitMargin}
                        onChange={e => setSettings({
                          ...settings,
                          pricing: { ...settings.pricing, defaultProfitMargin: Number(e.target.value) }
                        })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 pr-8 text-zinc-100 font-mono focus:border-indigo-500 focus:outline-none transition-colors"
                      />
                      <Percent className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3.5" />
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1 block">يطبق الهامش تلقائياً على خامات المنتجات المستهلكة.</span>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">تكلفة ساعة التصميم والتجهيز ($)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        required
                        value={settings.pricing.designCostPerHour}
                        onChange={e => setSettings({
                          ...settings,
                          pricing: { ...settings.pricing, designCostPerHour: Number(e.target.value) }
                        })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 pr-8 text-zinc-100 font-mono focus:border-indigo-500 focus:outline-none transition-colors"
                      />
                      <DollarSign className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3.5" />
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1 block">تحديد سعر تحضير وتعديل ملفات الأوتوكاد للعميل.</span>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">تكلفة ساعة تجميع وتركيب المنتجات ($)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        required
                        value={settings.pricing.assemblyCostPerHour}
                        onChange={e => setSettings({
                          ...settings,
                          pricing: { ...settings.pricing, assemblyCostPerHour: Number(e.target.value) }
                        })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 pr-8 text-zinc-100 font-mono focus:border-indigo-500 focus:outline-none transition-colors"
                      />
                      <DollarSign className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3.5" />
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1 block">أعمال التجميع اليدوي وساعات عمل الفني اليدوية.</span>
                  </div>
                </div>
                <div className="mt-4 border-t border-zinc-900 pt-4">
                  <label className="text-zinc-400 block mb-1 text-xs">نسبة الشريك من صافي الربح (%)</label>
                  <div className="relative max-w-xs">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      required
                      value={settings.partnerSharePercent ?? 0}
                      onChange={e => setSettings({ ...settings, partnerSharePercent: Math.min(100, Math.max(0, Number(e.target.value))) })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 pr-8 text-zinc-100 font-mono focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                    <Percent className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3.5" />
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1 block">تُحسب حصة الشريك تلقائيًا من صافي الربح، وتُحفظ نسبة كل تغيير كسجل تاريخي.</span>
                </div>
              </div>
            )}

            {/* 3. PRODUCTION SETTINGS TAB */}
            {activeTab === "production" && (
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono border-b border-zinc-900 pb-2 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  المعلمات الافتراضية لآلات قص الليزر والراوتر
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <label className="text-zinc-400 block mb-1">السرعة الافتراضية للقص (ملم/ثانية)</label>
                    <input
                      type="number"
                      required
                      value={settings.production.defaultLaserSpeed}
                      onChange={e => setSettings({
                        ...settings,
                        production: { ...settings.production, defaultLaserSpeed: Number(e.target.value) }
                      })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-mono focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                    <span className="text-[10px] text-zinc-500 mt-1 block">السرعة الافتراضية المرجعية المعتمدة لتقدير زمن القص ليزر.</span>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">قوة شعاع الليزر الافتراضية (%)</label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      required
                      value={settings.production.defaultLaserPower}
                      onChange={e => setSettings({
                        ...settings,
                        production: { ...settings.production, defaultLaserPower: Number(e.target.value) }
                      })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-mono focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                    <span className="text-[10px] text-zinc-500 mt-1 block">القوة الافتراضية لشعاع CO2 لضمان عدم تلف المواد الحساسة.</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. INVENTORY SETTINGS TAB */}
            {activeTab === "inventory" && (
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono border-b border-zinc-900 pb-2 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-indigo-400" />
                  إدارة حد الأمان بالخامات وبقايا المواد القابلة لإعادة الاستخدام
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <label className="text-zinc-400 block mb-1">الحد الأدنى لمساحة بقايا الخامات (ملم²)</label>
                    <input
                      type="number"
                      required
                      value={settings.inventory.minimumRemnantSize}
                      onChange={e => setSettings({
                        ...settings,
                        inventory: { ...settings.inventory, minimumRemnantSize: Number(e.target.value) }
                      })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-mono focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                    <span className="text-[10px] text-zinc-500 mt-1 block">تحديد أصغر مساحة لوحة بقايا ليتم تسجيلها في دليل البقايا بشكل آلي.</span>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">عتبة تنبيه المواد منخفضة المخزون (عدد الألواح)</label>
                    <input
                      type="number"
                      required
                      value={settings.inventory.lowStockThreshold}
                      onChange={e => setSettings({
                        ...settings,
                        inventory: { ...settings.inventory, lowStockThreshold: Number(e.target.value) }
                      })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-mono focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                    <span className="text-[10px] text-zinc-500 mt-1 block">عند انخفاض كمية أي مادة في المستودع عن هذه العتبة، يُعرض تحذير.</span>
                  </div>
                </div>
              </div>
            )}

            {/* AUTO ARCHIVE SETTINGS TAB */}
            {activeTab === "auto_archive" && (
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Archive className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100 font-mono">
                        إعدادات الأرشفة التلقائية للطلبات (Auto-Archiving Engine)
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        ضبط المدة الزمنية بالأيام وتفعيل أو تعطيل نقل الطلبات المكتملة القديمة للأرشيف بشكل كامل
                      </p>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border shrink-0 ${
                    (settings?.autoArchive?.enabled ?? true)
                      ? "bg-emerald-950/80 text-emerald-300 border-emerald-800"
                      : "bg-rose-950/80 text-rose-300 border-rose-800"
                  }`}>
                    {(settings?.autoArchive?.enabled ?? true) ? "الميزة مفعّلة ✓" : "الميزة معطّلة ✕"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-sans">
                  {/* Enable / Disable Switch */}
                  <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-zinc-200 font-bold text-xs flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span>تفعيل ميزة الأرشفة التلقائية</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => setSettings({
                            ...settings,
                            autoArchive: {
                              ...settings?.autoArchive,
                              enabled: !(settings?.autoArchive?.enabled ?? true),
                              thresholdDays: settings?.autoArchive?.thresholdDays ?? 30
                            }
                          })}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            (settings?.autoArchive?.enabled ?? true) ? "bg-amber-600" : "bg-zinc-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              (settings?.autoArchive?.enabled ?? true) ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        عند تفعيل هذا الخيار، سيتم تطبيق معيار الأرشفة التلقائية على الطلبات المكتملة والمستلمة بالورشة عند تجنيب اللوحة الرئيسية.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">حالة التحكم:</span>
                      <span className={(settings?.autoArchive?.enabled ?? true) ? "text-amber-400 font-bold" : "text-rose-400 font-bold"}>
                        {(settings?.autoArchive?.enabled ?? true) ? "تغلق القوائم تلقائياً للطلبات القديمة" : "متوقفة - تبقى كل الطلبات في القائمة الرئيسية"}
                      </span>
                    </div>
                  </div>

                  {/* Threshold Days Input */}
                  <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-3">
                    <label className="text-zinc-200 font-bold text-xs flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      <span>مهلة الأرشفة التلقائية (بالأيام)</span>
                    </label>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        max={365}
                        required
                        value={settings?.autoArchive?.thresholdDays ?? 30}
                        onChange={e => setSettings({
                          ...settings,
                          autoArchive: {
                            ...settings?.autoArchive,
                            enabled: settings?.autoArchive?.enabled ?? true,
                            thresholdDays: Math.max(1, Number(e.target.value))
                          }
                        })}
                        className="w-full bg-zinc-950 border border-zinc-750 rounded-lg p-2.5 text-zinc-100 font-mono font-bold text-sm focus:border-amber-500 focus:outline-none transition-colors"
                      />
                      <span className="text-zinc-400 font-bold whitespace-nowrap">يوم</span>
                    </div>

                    {/* Quick selection chips */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] text-zinc-500 block">اختيارات زمنية سريعة:</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {[7, 15, 30, 45, 60, 90].map(days => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setSettings({
                              ...settings,
                              autoArchive: {
                                ...settings?.autoArchive,
                                enabled: settings?.autoArchive?.enabled ?? true,
                                thresholdDays: days
                              }
                            })}
                            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                              (settings?.autoArchive?.thresholdDays ?? 30) === days
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/60"
                                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                            }`}
                          >
                            {days} يوم
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pre-Archive Notification Card */}
                <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <label className="text-zinc-100 font-bold text-xs flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-400" />
                        <span>التنبيه قبل الأرشفة (Pre-Archiving Alert)</span>
                      </label>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        إرسال إشعار تلقائي للمسؤولين في لوحة التنبيهات قبل موعد نقل الطلب المكتمل إلى الأرشيف
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSettings({
                          ...settings,
                          autoArchive: {
                            ...settings?.autoArchive,
                            notifyBeforeArchive: !(settings?.autoArchive?.notifyBeforeArchive ?? true)
                          }
                        })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          (settings?.autoArchive?.notifyBeforeArchive ?? true) ? "bg-amber-600" : "bg-zinc-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            (settings?.autoArchive?.notifyBeforeArchive ?? true) ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {(settings?.autoArchive?.notifyBeforeArchive ?? true) && (
                    <div className="pt-3 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-zinc-200 block">مهلة التنبيه المسبق (بالأيام)</span>
                        <p className="text-[10px] text-zinc-400">كم يوماً قبل موعد الأرشفة يجب إرسال التنبيه؟</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={settings?.autoArchive?.notifyDaysBefore ?? 3}
                          onChange={e => setSettings({
                            ...settings,
                            autoArchive: {
                              ...settings?.autoArchive,
                              notifyDaysBefore: Math.max(1, Number(e.target.value))
                            }
                          })}
                          className="w-full bg-zinc-950 border border-zinc-750 rounded-lg p-2 text-amber-300 font-mono font-bold text-xs focus:border-amber-500 focus:outline-none"
                        />
                        <span className="text-zinc-400 text-xs font-bold whitespace-nowrap">أيام قبل الأرشفة</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Trigger & Explanation Card */}
                <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4 text-xs text-amber-200/90 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-amber-300">طريقة عمل وأمان نظام الأرشفة التلقائية</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      يتم فحص الطلبات وتحديد أي طلب مضى على إنشائه أو تسليمه أكثر من المدة المحددة أعلاه. لا يتم حذف أي بيانات على الإطلاق، بل تُنقل الطلبات إلى "أرشيف الطلبات" مع إمكانية استعادتها بكامل تفاصيلها وماليتها إلى قائمة الطلبات النشطة بضغطة زر في أي وقت من شاشة السجل.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SMTP SETTINGS TAB */}
            {activeTab === "smtp" && (
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
                      <Mail className="w-4 h-4 text-emerald-400" />
                      تكوين خادم البريد (SMTP) والإشعارات التلقائية للفنيين
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      إرسال رسائل بريدية فورية للفنيين والإدارة عند انتهاء قص المهمة أو تغير حالتها بالورشة.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                    <span className="text-xs font-medium text-zinc-300">تفعيل الإشعارات البريدية:</span>
                    <input
                      type="checkbox"
                      checked={settings.smtp?.enabled ?? true}
                      onChange={e => setSettings({
                        ...settings,
                        smtp: { ...settings.smtp, enabled: e.target.checked }
                      })}
                      className="w-4 h-4 rounded text-[#c59257] focus:ring-[#c59257] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <label className="text-zinc-400 block mb-1">مضيف خادم البريد (SMTP Host)</label>
                    <input
                      type="text"
                      required
                      value={settings.smtp?.host || ""}
                      onChange={e => setSettings({
                        ...settings,
                        smtp: { ...settings.smtp, host: e.target.value }
                      })}
                      placeholder="smtp.axislab-laser.com أو smtp.gmail.com"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-mono focus:border-[#c59257] focus:outline-none transition-colors"
                    />
                    <span className="text-[10px] text-zinc-500 mt-1 block">عنوان سيرفر SMTP المستخدم لنقل البريد.</span>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">منفذ الخادم (SMTP Port)</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        required
                        value={settings.smtp?.port || 587}
                        onChange={e => setSettings({
                          ...settings,
                          smtp: { ...settings.smtp, port: Number(e.target.value) }
                        })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-mono focus:border-[#c59257] focus:outline-none transition-colors"
                      />
                      <label className="flex items-center gap-1.5 whitespace-nowrap bg-zinc-900 px-3 py-2.5 rounded-lg border border-zinc-800 text-[11px] text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.smtp?.secure || false}
                          onChange={e => setSettings({
                            ...settings,
                            smtp: { ...settings.smtp, secure: e.target.checked }
                          })}
                          className="w-3.5 h-3.5"
                        />
                        <span>تشفير SSL (Port 465)</span>
                      </label>
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1 block">المنفذ الشائع: 587 لـ TLS أو 465 لـ SSL.</span>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">اسم المستخدم (SMTP Username)</label>
                    <input
                      type="text"
                      value={settings.smtp?.user || ""}
                      onChange={e => setSettings({
                        ...settings,
                        smtp: { ...settings.smtp, user: e.target.value }
                      })}
                      placeholder="notifications@axislab.com"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-mono focus:border-[#c59257] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">كلمة المرور (SMTP Password)</label>
                    <input
                      type="password"
                      value={settings.smtp?.pass || ""}
                      onChange={e => setSettings({
                        ...settings,
                        smtp: { ...settings.smtp, pass: e.target.value }
                      })}
                      placeholder="••••••••••••"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-mono focus:border-[#c59257] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">اسم البريد المرسل (From Name)</label>
                    <input
                      type="text"
                      value={settings.smtp?.fromName || ""}
                      onChange={e => setSettings({
                        ...settings,
                        smtp: { ...settings.smtp, fromName: e.target.value }
                      })}
                      placeholder="نظام إنتاج ليزر - AXIS LAB"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 focus:border-[#c59257] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">بريد المرسل (From Email Address)</label>
                    <input
                      type="email"
                      value={settings.smtp?.fromEmail || ""}
                      onChange={e => setSettings({
                        ...settings,
                        smtp: { ...settings.smtp, fromEmail: e.target.value }
                      })}
                      placeholder="notifications@axislab.com"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-mono focus:border-[#c59257] focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-zinc-400 block mb-1">عناوين بريد المستلمين للفنيين والإدارة (Recipient Emails - تفصل بينها فاصلة)</label>
                    <input
                      type="text"
                      value={settings.smtp?.recipientEmails || ""}
                      onChange={e => setSettings({
                        ...settings,
                        smtp: { ...settings.smtp, recipientEmails: e.target.value }
                      })}
                      placeholder="techs@axislab.com, operator@axislab.com, admin@axislab.com"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 font-mono focus:border-[#c59257] focus:outline-none transition-colors"
                    />
                    <span className="text-[10px] text-zinc-500 mt-1 block">
                      تستقبل هذه العناوين الإشعارات التلقائية فوراً عند بدء أو تغيير أو (انتهاء قص المهمة بالكامل).
                    </span>
                  </div>
                </div>

                {/* Test SMTP Action & Alert */}
                <div className="pt-3 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleTestSmtp}
                    disabled={testSmtpLoading}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-bold text-emerald-400 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {testSmtpLoading ? "جاري إرسال بريد تجريبي..." : "اختبار إرسال بريد تجريبي الآن"}
                  </button>

                  {testSmtpStatus && (
                    <div className={`text-xs px-3 py-1.5 rounded-md border flex items-center gap-2 ${
                      testSmtpStatus.type === "success"
                        ? "bg-emerald-950/80 border-emerald-800/80 text-emerald-300"
                        : "bg-rose-950/80 border-rose-800/80 text-rose-300"
                    }`}>
                      <span>{testSmtpStatus.message}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save Button for Forms (except Backups and Stress Tests which run actions directly) */}
            {activeTab !== "backup" && activeTab !== "stress_test" && activeTab !== "users" && (
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 border border-indigo-500 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "جاري ترحيل التعديلات..." : "حفظ وحفظ دائم للإعدادات"}
                </button>
              </div>
            )}
          </form>
  );
}
