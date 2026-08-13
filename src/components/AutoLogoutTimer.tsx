import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, LogOut, Clock, Activity } from "lucide-react";

interface AutoLogoutTimerProps {
  token: string | null;
  onLogout: () => void;
}

export default function AutoLogoutTimer({ token, onLogout }: AutoLogoutTimerProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds warning
  const lastActiveTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes in ms
  const WARNING_LIMIT = 29 * 60 * 1000; // Warning starts after 29 minutes

  // Handle user activity
  const handleActivity = () => {
    lastActiveTimeRef.current = Date.now();
    // If warning is showing, moving/clicking will not automatically dismiss it, 
    // to prevent accidental dismissals. The user has to click "Extend".
    // Alternatively, we can let any activity reset it, but explicit "Extend" click is safer and standard.
    if (!showWarning) {
      lastActiveTimeRef.current = Date.now();
    }
  };

  useEffect(() => {
    if (!token) {
      setShowWarning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Reset clock on mount or login
    lastActiveTimeRef.current = Date.now();
    setShowWarning(false);

    // Register event listeners for user activity
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start timer interval to check inactivity
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActiveTimeRef.current;

      if (elapsed >= INACTIVITY_LIMIT) {
        // Log out immediately
        setShowWarning(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        onLogout();
      } else if (elapsed >= WARNING_LIMIT) {
        // Show warning and calculate remaining seconds
        setShowWarning(true);
        const remainingSeconds = Math.max(0, Math.ceil((INACTIVITY_LIMIT - elapsed) / 1000));
        setTimeLeft(remainingSeconds);
      } else {
        // Reset warning if active time is updated somehow (e.g. session extended)
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      // Cleanup on unmount or token change
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [token]);

  // Extend the session manually
  const handleExtendSession = () => {
    lastActiveTimeRef.current = Date.now();
    setShowWarning(false);
  };

  return (
    <AnimatePresence>
      {showWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop Blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={handleExtendSession} // Allow extending by clicking outside
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-2xl max-w-md w-full text-right overflow-hidden border-t-4 border-t-[#c59257]"
          >
            {/* Visual background ambient accent */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#c59257]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header / Pulsing Alert Icon */}
            <div className="flex flex-col items-center text-center space-y-3 mb-5">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/10 rounded-full animate-ping scale-150 duration-1000" />
                <div className="bg-amber-950/40 border border-amber-900/60 p-3 rounded-2xl relative">
                  <ShieldAlert className="w-8 h-8 text-[#c59257]" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-100 font-sans">
                  تنبيه أمني: انتهاء جلسة العمل قريباً
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm">
                  تم اكتشاف فترة خمول طويلة في لوحة التحكم. لحماية خصوصية بيانات ورشة <span className="text-[#c59257] font-bold">AXIS LAB</span>، سيتم تسجيل خروجك تلقائياً.
                </p>
              </div>
            </div>

            {/* Countdown / Visual progress */}
            <div className="bg-zinc-900/50 border border-zinc-900 rounded-xl p-4 mb-6 flex flex-col items-center justify-center space-y-2">
              <span className="text-[10px] text-zinc-500 font-sans">الوقت المتبقي لاتخاذ إجراء</span>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-black text-[#c59257]">{timeLeft}</span>
                <span className="text-xs text-zinc-500">ثانية</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-800/60 h-1.5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: `${(timeLeft / 60) * 100}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                  className="bg-[#c59257] h-full rounded-full shadow-lg shadow-amber-500/20"
                />
              </div>
            </div>

            {/* Warning Message Box */}
            <div className="bg-amber-950/20 border border-amber-950/40 rounded-xl p-3 text-xs text-amber-300 flex items-start gap-2.5 mb-6 justify-end">
              <div className="text-right">
                <p className="font-semibold mb-0.5 flex items-center justify-end gap-1.5">
                  <span>يرجى الملاحظة</span>
                  <Clock className="w-3.5 h-3.5" />
                </p>
                <p className="text-[10.5px] text-amber-400/80 leading-relaxed">
                  سيتم حفظ تقدم العمل الحالي تلقائياً وحماية الجلسة عند انتهاء المؤقت. اضغط على تمديد للبقاء متصلاً بالماكينات والملفات.
                </p>
              </div>
            </div>

            {/* Buttons Row */}
            <div className="flex flex-row-reverse gap-3">
              <button
                id="btn-extend-session"
                onClick={handleExtendSession}
                className="flex-1 bg-[#c59257] hover:bg-[#b07e46] active:scale-[0.98] text-zinc-950 font-bold py-3 px-4 rounded-xl text-xs transition-all duration-150 shadow-lg shadow-amber-600/10 cursor-pointer flex items-center justify-center gap-2"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>تمديد الجلسة (متابعة العمل)</span>
              </button>

              <button
                id="btn-logout-immediate"
                onClick={onLogout}
                className="flex-1 bg-zinc-900 hover:bg-zinc-850 active:scale-[0.98] border border-zinc-800 text-zinc-300 hover:text-white font-bold py-3 px-4 rounded-xl text-xs transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>تسجيل الخروج الآن</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
