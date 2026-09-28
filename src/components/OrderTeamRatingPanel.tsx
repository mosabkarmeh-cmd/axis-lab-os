import { useState } from "react";
import { Sparkles, Users } from "lucide-react";

type SelectedOrder = {
  id: string;
  designerId?: string;
  cutterId?: string;
  assemblerId?: string;
  designRating?: number;
  cuttingRating?: number;
  assemblyRating?: number;
  ratingNotes?: string;
  ratedAt?: string;
};
type AssignableUser = { id: string; fullName: string; role: string; isActive?: boolean };
type AssignPayload = Partial<Record<"designerId" | "cutterId" | "assemblerId", string | null>>;
type RatingPayload = Partial<Record<"designRating" | "cuttingRating" | "assemblyRating", number | null>> & { ratingNotes?: string };

export default function OrderTeamRatingPanel({
  selectedOrder,
  currentUserRole,
  users,
  onAssign,
  onRate,
}: {
  selectedOrder: SelectedOrder;
  currentUserRole?: string;
  users: AssignableUser[];
  onAssign: (orderId: string, payload: AssignPayload) => void | Promise<void>;
  onRate: (orderId: string, payload: RatingPayload) => void | Promise<void>;
}) {
  const [ratingNotesDraft, setRatingNotesDraft] = useState("");
  const assignableUsers = users.filter((u) => u.isActive !== false && (u.role === "admin" || u.role === "employee"));
  const isAdmin = currentUserRole === "admin";
  const stages = [
    { key: "designerId", label: "المصمم", ratingKey: "designRating" },
    { key: "cutterId", label: "عامل القص", ratingKey: "cuttingRating" },
    { key: "assemblerId", label: "عامل التجميع", ratingKey: "assemblyRating" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        <h4 className="text-sm font-bold text-zinc-200 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" /> تعيين فريق العمل على الطلب
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stages.map((stage) => (
            <div key={stage.key}>
              <label className="text-xs text-zinc-500 mb-1.5 block">{stage.label}</label>
              <select
                value={selectedOrder[stage.key] || ""}
                onChange={(e) => void onAssign(selectedOrder.id, { [stage.key]: e.target.value || null })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">بدون تعيين</option>
                {assignableUsers.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {isAdmin ? (
        <div className="bg-zinc-900/50 border border-amber-900/30 rounded-xl p-5">
          <h4 className="text-sm font-bold text-zinc-200 mb-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> تقييم المدير (خاص بالمدير فقط)
          </h4>
          <p className="text-xs text-zinc-500 mb-4">تقييم جودة الأداء بكل مرحلة، من 1 إلى 5 نجوم.</p>
          <div className="space-y-4">
            {stages.map((stage) => {
              const currentValue = Number(selectedOrder[stage.ratingKey] || 0);
              return (
                <div key={stage.ratingKey} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">{stage.label}</span>
                  <div className="flex items-center gap-1" dir="ltr">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => void onRate(selectedOrder.id, { [stage.ratingKey]: star === currentValue ? null : star, ratingNotes: ratingNotesDraft || selectedOrder.ratingNotes })}
                        className="p-0.5"
                        title={`${star} نجوم`}
                      >
                        <Sparkles className={`w-5 h-5 ${star <= currentValue ? "text-amber-400 fill-amber-400" : "text-zinc-700"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <label className="text-xs text-zinc-500 mb-1.5 block">ملاحظات التقييم</label>
            <textarea
              defaultValue={selectedOrder.ratingNotes || ""}
              onChange={(e) => setRatingNotesDraft(e.target.value)}
              onBlur={(e) => { if (e.target.value !== (selectedOrder.ratingNotes || "")) void onRate(selectedOrder.id, { ratingNotes: e.target.value }); }}
              rows={2}
              placeholder="ملاحظات حول جودة التصميم أو القص أو التجميع..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-600"
            />
          </div>
          {selectedOrder.ratedAt && <p className="text-[11px] text-zinc-600 mt-3">آخر تقييم: {new Date(selectedOrder.ratedAt).toLocaleString("ar-EG")}</p>}
        </div>
      ) : (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5 text-center text-xs text-zinc-500">
          تقييم أداء الطلب متاح للمدير فقط.
        </div>
      )}
    </div>
  );
}
