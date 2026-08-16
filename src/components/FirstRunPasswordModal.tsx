import React, { useState } from "react";

type FirstRunPasswordModalProps = {
  initialCurrentPassword?: string;
  onSubmit: (currentPassword: string, newPassword: string) => void;
  error?: string | null;
  loading?: boolean;
};

export default function FirstRunPasswordModal({ initialCurrentPassword = "", onSubmit, error, loading = false }: FirstRunPasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState(initialCurrentPassword);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const invalid = currentPassword.length === 0 || newPassword.length < 8 || mismatch || loading;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (invalid) return;
    onSubmit(currentPassword, newPassword);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4" role="dialog" aria-modal="true" aria-labelledby="first-run-password-title">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-amber-700/50 bg-zinc-950 p-6 shadow-2xl">
        <h2 id="first-run-password-title" className="mb-2 text-lg font-bold text-zinc-100">تغيير كلمة المرور المؤقتة</h2>
        <p className="mb-5 text-sm leading-6 text-zinc-400">يجب إنشاء كلمة مرور دائمة قبل استخدام النظام. يجب أن تتكون من 8 أحرف على الأقل.</p>
        <label className="mb-2 block text-xs font-bold text-zinc-300" htmlFor="first-run-current-password">كلمة المرور الحالية</label>
        <input id="first-run-current-password" autoFocus type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mb-4 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-amber-500" />
        <label className="mb-2 block text-xs font-bold text-zinc-300" htmlFor="first-run-new-password">كلمة المرور الجديدة</label>
        <input id="first-run-new-password" type="password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mb-4 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-amber-500" />
        <label className="mb-2 block text-xs font-bold text-zinc-300" htmlFor="first-run-confirm-password">تأكيد كلمة المرور</label>
        <input id="first-run-confirm-password" type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mb-3 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-amber-500" />
        {mismatch && <p className="mb-3 text-xs text-red-400">كلمتا المرور غير متطابقتين.</p>}
        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
        <button type="submit" disabled={invalid} className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور والمتابعة"}</button>
      </form>
    </div>
  );
}
