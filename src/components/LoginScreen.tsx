import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Cpu, DollarSign, Eye, EyeOff, Lock, Mail, Moon, RefreshCw, Scissors, Shield, ShieldCheck, Sun, User as UserIcon } from "lucide-react";
import { AxisLabLogoFull } from "./AxisLabLogo";

type AuthRole = "admin" | "employee" | "accountant";

export default function LoginScreen({
  theme,
  setTheme,
  companySettings,
  exchangeRate,
  isRegisterMode,
  setIsRegisterMode,
  authError,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authFullName,
  setAuthFullName,
  authRole,
  setAuthRole,
  rememberMe,
  setRememberMe,
  isAuthLoading,
  activePreset,
  setAuthPreset,
  setAuthError,
  handleLogin,
  handleRegister,
}: {
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  companySettings?: { logo?: string };
  exchangeRate: number;
  isRegisterMode: boolean;
  setIsRegisterMode: (value: boolean) => void;
  authError: string | null;
  authEmail: string;
  setAuthEmail: (value: string) => void;
  authPassword: string;
  setAuthPassword: (value: string) => void;
  authFullName: string;
  setAuthFullName: (value: string) => void;
  authRole: AuthRole;
  setAuthRole: (value: AuthRole) => void;
  rememberMe: boolean;
  setRememberMe: (value: boolean) => void;
  isAuthLoading: boolean;
  activePreset: string | null;
  setAuthPreset: (presetKey: string, email: string, password: string) => void;
  setAuthError: (value: string | null) => void;
  handleLogin: (event: FormEvent) => void | Promise<void>;
  handleRegister: (event: FormEvent) => void | Promise<void>;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const registrationEnabled = import.meta.env.VITE_ALLOW_PUBLIC_REGISTRATION === "true";
  const demoPresetsEnabled = import.meta.env.VITE_SHOW_DEMO_PRESETS === "true";

  return (

<div className={`flex min-h-screen bg-[#07070a] items-center justify-center p-4 md:p-8 ${theme === "light" ? "theme-light bg-slate-100" : ""}`}>
  <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch my-auto">
    
    {/* Left Column: AXIS LAB Brand Hero & Platform Overview */}
    <div className="lg:col-span-7 flex flex-col justify-between p-6 md:p-8 bg-zinc-950/90 border border-zinc-850/80 rounded-3xl relative overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Gradient Background Aesthetics */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="relative z-10 space-y-6">
        {/* Header Logo & Live Status */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-850/80 pb-6">
          <AxisLabLogoFull className="mb-1" logoSrc={companySettings?.logo} showSubtext={true} />
          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-full text-[11px] font-mono text-emerald-300 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>خادم الورشة والجلسات نشط</span>
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-zinc-100 tracking-tight leading-snug">
            نظام تشغيل ورش القص والنقش بالليزر <span className="text-[#c59257]">AXIS LAB OS</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans max-w-xl">
            منصة ERP هجينة متكاملة مخصصة لورش الليزر والـ CNC. تجمع بين إدارة العملاء، الفواتير بالعملتين (SYP/USD)، تتبع المخزون والقصاصات، ومترجم G-Code ذكي لجدولة الماكينات.
          </p>
        </div>

        {/* Feature Grid Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850/80 hover:border-amber-500/30 transition-all flex items-start gap-3 group">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-xs font-bold text-zinc-200">حماية الجلسات وصلاحيات JWT</h2>
              <p className="text-[11px] text-zinc-500 leading-normal">توزيع أدوار دقيقة (مدير، فني تشغيل، محاسب) مع توثيق سجل الأمان.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850/80 hover:border-indigo-500/30 transition-all flex items-start gap-3 group">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-xs font-bold text-zinc-200">مترجم وشبكة G-Code CNC</h2>
              <p className="text-[11px] text-zinc-500 leading-normal">تحويل التصاميم إلى مسارات حقيقية مع حساب زمن الليزر الفعلي.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850/80 hover:border-emerald-500/30 transition-all flex items-start gap-3 group">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-xs font-bold text-zinc-200">المخزون والقصاصات (Remnants)</h2>
              <p className="text-[11px] text-zinc-500 leading-normal">إدارة الأكريليك والخشب مع استغلال بقايا المواد وتجنب الهالك.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850/80 hover:border-amber-500/30 transition-all flex items-start gap-3 group">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[#c59257] group-hover:scale-105 transition-transform shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-xs font-bold text-zinc-200">محاسبة مزدوجة USD ⇌ SYP</h2>
              <p className="text-[11px] text-zinc-500 leading-normal">تحويل لحظي وسندات مقبوضات مع حماية بيانات العملاء الحساسة.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Credits & System Specs */}
      <div className="pt-6 mt-6 border-t border-zinc-850/80 flex flex-wrap items-center justify-between text-[10px] font-mono text-zinc-500 gap-2">
        <div className="flex items-center gap-3">
          <span className="text-zinc-400 font-bold">AXIS LAB v0.15.0</span>
          <span>•</span>
          <span>SQLite Local ERP Engine</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>1$ = {exchangeRate.toLocaleString()} ل.س</span>
        </div>
      </div>
    </div>

    {/* Right Column: Interactive Login / Register Auth Card */}
    <div className="lg:col-span-5 bg-[#0b0b0e] border border-zinc-800/90 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-2xl relative overflow-hidden">
      <div className="space-y-5">
        
        {/* Header Bar with Segment Control Tabs & Theme Switcher */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-850 pb-4">
          {/* Mode Selector Tabs */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-850 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setAuthError(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isRegisterMode
                  ? "bg-[#c59257] text-zinc-950 shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              تسجيل الدخول
            </button>
            {registrationEnabled && (
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setAuthError(null);
                if (authRole === "admin") setAuthRole("employee");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isRegisterMode
                  ? "bg-[#c59257] text-zinc-950 shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              حساب جديد
            </button>
            )}
          </div>

          {/* Theme Switcher Button */}
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 flex items-center justify-center transition-all text-zinc-400 hover:text-zinc-200"
            title="تغيير المظهر"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>

        {/* Title Header */}
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#c59257]" />
            <span>{isRegisterMode ? "إنشاء حساب فني في الورشة" : "بوابة التحكم والتشغيل المركزية"}</span>
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {isRegisterMode
              ? "أدخل البيانات المطلوبة لإصدار رمز الدخول وتحديد الدور الوظيفي"
              : "قم بتسجيل الدخول للوصول إلى الماكينات، الطلبات، والمحاسبة"}
          </p>
        </div>

        {/* Auth Error Banner */}
        {authError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/50 flex items-start gap-2.5 text-xs text-rose-300"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-snug">{authError}</span>
          </motion.div>
        )}

        {/* Authentication Form */}
        <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-3.5 font-sans">
          {/* Full Name Input (Register Mode) */}
          {isRegisterMode && (
            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">الاسم الكامل</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="مثال: م. أحمد الروابدة"
                  value={authFullName}
                  onChange={(e) => setAuthFullName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-9 pl-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#c59257] transition-all"
                />
                <UserIcon className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Email Input */}
          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1">البريد الإلكتروني</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="admin@axislab.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-9 pl-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#c59257] transition-all font-mono dir-ltr text-right"
              />
              <Mail className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Password Input with Show/Hide Eye Toggle */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-medium text-zinc-400 block">كلمة المرور</label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-9 pl-9 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#c59257] transition-all font-mono dir-ltr text-right"
              />
              <Lock className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-2.5 top-2 text-zinc-500 hover:text-zinc-300 transition-colors p-0.5 rounded-lg"
                title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Role Select (Register Mode - Operational roles only) */}
          {isRegisterMode && (
            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">الدور الوظيفي بالورشة</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAuthRole("employee")}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    authRole === "employee"
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-sm"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <Cpu className="w-4 h-4" />
                  <span className="text-[11px] font-bold">فني تشغيل ليزر</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthRole("accountant")}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    authRole === "accountant"
                      ? "bg-amber-500/10 border-amber-500 text-amber-400 shadow-sm"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="text-[11px] font-bold">محاسب مالي</span>
                </button>
              </div>

              <div className="mt-2.5 p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/30 text-[10px] text-amber-300/90 leading-relaxed flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-[#c59257] shrink-0 mt-0.5" />
                <span>
                  <strong>تنويه أمني:</strong> لا يمكن تسجيل حساب مدير (Admin) من النافذة الخارجية. يتم إنشاء وإضافة المدراء حصرياً من داخل لوحة التحكم بواسطة مدير النظام الحفاظ على الخصوصية والأمان.
                </span>
              </div>
            </div>
          )}

          {/* Extra Options: Remember Me & Encryption note */}
          {!isRegisterMode && (
            <div className="flex items-center justify-between text-[11px] pt-1">
              <label className="flex items-center gap-2 text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-zinc-800 bg-zinc-950 text-[#c59257] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span>تذكر بيانات الجلسة</span>
              </label>
              <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                <Lock className="w-3 h-3 text-zinc-600" />
                <span>جلسة HS256 محمية عبر HttpOnly</span>
              </span>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isAuthLoading}
            className="w-full py-2.5 bg-gradient-to-r from-[#c59257] to-amber-600 hover:from-amber-500 hover:to-amber-600 text-zinc-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {isAuthLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري التحقق وإصدار الجلسة...</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>{isRegisterMode ? "إتمام التسجيل وإصدار المفتاح" : "تسجيل الدخول الآمن"}</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Preset Accounts */}
        {!isRegisterMode && import.meta.env.DEV && demoPresetsEnabled && (
          <div className="pt-4 border-t border-zinc-850">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                حسابات التجربة السريعة (Demo Accounts)
              </span>
              <span className="text-[9px] text-[#c59257] font-mono">اختيار الحساب</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {/* Admin Preset */}
              <button
                type="button"
                onClick={() => setAuthPreset("admin", "admin@axislab.com", "")}
                className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-center justify-between group cursor-pointer ${
                  activePreset === "admin"
                    ? "bg-amber-950/40 border-[#c59257]/60 text-zinc-100"
                    : "bg-zinc-950 border-zinc-850 hover:border-zinc-700 text-zinc-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[#c59257] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>مدير النظام</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/50">Admin</span>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 dir-ltr text-right">admin@axislab.com</div>
                  </div>
                </div>
                {activePreset === "admin" && (
                  <CheckCircle2 className="w-4 h-4 text-[#c59257]" />
                )}
              </button>

              {/* Laser Tech Preset */}
              <button
                type="button"
                onClick={() => setAuthPreset("employee", "employee@axislab.com", "")}
                className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-center justify-between group cursor-pointer ${
                  activePreset === "employee"
                    ? "bg-emerald-950/40 border-emerald-500/60 text-zinc-100"
                    : "bg-zinc-950 border-zinc-850 hover:border-zinc-700 text-zinc-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <Cpu className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>فني تشغيل ليزر</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">Tech</span>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 dir-ltr text-right">employee@axislab.com</div>
                  </div>
                </div>
                {activePreset === "employee" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </button>

              {/* Finance Preset */}
              <button
                type="button"
                onClick={() => setAuthPreset("accountant", "accountant@axislab.com", "")}
                className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-center justify-between group cursor-pointer ${
                  activePreset === "accountant"
                    ? "bg-amber-950/40 border-amber-500/60 text-zinc-100"
                    : "bg-zinc-950 border-zinc-850 hover:border-zinc-700 text-zinc-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>محاسب مالي</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/50">Finance</span>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 dir-ltr text-right">accountant@axislab.com</div>
                  </div>
                </div>
                {activePreset === "accountant" && (
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security Notice Footer */}
      <div className="text-[10px] text-zinc-500 text-center font-mono mt-4 pt-3 border-t border-zinc-850/80 flex items-center justify-center gap-1.5">
        <Lock className="w-3 h-3 text-[#c59257]" />
        <span>نظام موثق ببروتوكولات التشفير القياسية AXIS LAB Security</span>
      </div>
    </div>

  </div>
</div>
  );
}
