import SettingsAdvancedTabs from "./SettingsAdvancedTabs";
export default function SettingsContent({ ctx }: { ctx: Record<string, any> }) {
  const { Activity, AlertTriangle, AnimatePresence, Archive, ArrowDown, ArrowUp, Bell, Briefcase, Building, Check, CheckCircle, Clipboard, Clock, Copy, Cpu, Database, DollarSign, Edit3, ExternalLink, Eye, FileCheck, FileCode, FileSpreadsheet, FileText, Globe, Hash, ImageIcon, Inbox, Instagram, Lock, Mail, MapPin, MessageCircle, Package, Palette, Percent, Phone, Play, Plus, React, RefreshCcw, Save, Send, SettingsContent, SettingsFormTabs, Share2, Shield, ShieldCheck, Sparkles, TerminalIcon, Trash, Trash2, Upload, Users, Zap, activeTab, addLog, backupStatus, backups, clearTestLogs, copiedShortcodeTag, copyShortcodeToClipboard, currentUserRole, editingStatusColor, editingStatusId, editingStatusName, editingUserId, evaluateShortcodes, fetchNumberings, fetchRecycleItems, fetchStatuses, fetchUsers, handleAddStatus, handleCreateBackup, handleCreateUser, handleDeleteStatus, handleDeleteUser, handleExcelUpload, handleExecuteImport, handleParseImport, handlePermanentDelete, handleReorderStatuses, handleRestoreBackup, handleRestoreItem, handleSafeReset, handleSaveNumbering, handleSaveSettings, handleTestSmtp, handleUpdateStatus, handleUpdateUser, importPreview, importStatus, importText, importType, isExcelUploading, isLoading, isRunningTests, isSaving, loadNetworkInfo, loadSettingsAndBackups, loadingNetwork, loadingNumberings, loadingRecycle, loadingUsers, motion, networkInfo, newStatusColor, newStatusName, numberings, recycleItems, runConcurrencyTest, runCorruptedPayloadsTest, runFullDiagnosticSuite, runInventoryAlertTest, saveStatus, selectedFileId, selectedFileObj, setActiveTab, setBackupStatus, setBackups, setCopiedShortcodeTag, setEditingStatusColor, setEditingStatusId, setEditingStatusName, setEditingUserId, setImportPreview, setImportStatus, setImportText, setImportType, setIsExcelUploading, setIsLoading, setIsRunningTests, setIsSaving, setLoadingNetwork, setLoadingNumberings, setLoadingRecycle, setLoadingUsers, setNetworkInfo, setNewStatusColor, setNewStatusName, setNumberings, setRecycleItems, setSaveStatus, setSelectedFileId, setSettings, setShortcodeSampleText, setShowAddUserPanel, setShowJwtHud, setShowTerminalLogs, setStatuses, setSystemUsers, setTestLogs, setTestMetrics, setTestSmtpLoading, setTestSmtpStatus, setUserActionStatus, setUserFormEmail, setUserFormFullName, setUserFormIsActive, setUserFormPassword, setUserFormRole, settings, settingsViewContext, shortcodeSampleText, showAddUserPanel, showJwtHud, showTerminalLogs, statuses, systemUsers, testLogs, testMetrics, testSmtpLoading, testSmtpStatus, useEffect, useState, userActionStatus, userFormEmail, userFormFullName, userFormIsActive, userFormPassword, userFormRole, virtualFiles } = ctx;
  return (
<div className="lg:col-span-9">
          
          {/* Global Alert Notification */}
          <AnimatePresence>
            {saveStatus && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-3.5 mb-4 rounded-xl flex items-center gap-2.5 text-xs font-medium border ${
                  saveStatus.type === "success" 
                    ? "bg-emerald-950/40 border-emerald-900/40 text-emerald-400" 
                    : "bg-rose-950/40 border-rose-900/40 text-rose-400"
                }`}
              >
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{saveStatus.message}</span>
              </motion.div>
            )}

            {backupStatus && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-3.5 mb-4 rounded-xl flex items-center gap-2.5 text-xs font-medium border ${
                  backupStatus.type === "success" 
                    ? "bg-emerald-950/40 border-emerald-900/40 text-emerald-400" 
                    : "bg-rose-950/40 border-rose-900/40 text-rose-400"
                }`}
              >
                <Database className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{backupStatus.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <SettingsFormTabs ctx={settingsViewContext} />

          <SettingsAdvancedTabs ctx={ctx} /></div>
  );
}
