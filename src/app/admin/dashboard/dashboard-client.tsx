"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ALL_SLOTS, PERIODS, formatSlotAr } from "@/lib/slots";

type Appt = {
  id: string;
  service: string;
  date: string;
  timeSlot: string;
  status: string;
  note: string | null;
  patient: { fullName: string; phone: string };
};

type Blocked = { id: string; date: string; timeSlot: string; reason: string | null };

const CLINIC_NAME = "عيادة د. أحمد الجعفري";

function dateOnly(value: string) {
  return value.slice(0, 10);
}

export default function DashboardClient({
  initialAppointments, role, name,
}: { initialAppointments: Appt[]; role: string; name: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"appointments" | "schedule">("appointments");
  const [appointments, setAppointments] = useState<Appt[]>(initialAppointments);

  // schedule tab state
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [scope, setScope] = useState<"slot" | "period" | "day">("slot");
  const [timeSlot, setTimeSlot] = useState(ALL_SLOTS[0]);
  const [period, setPeriod] = useState<string>(PERIODS[0].key);
  const [reason, setReason] = useState("");
  const [blocked, setBlocked] = useState<Blocked[]>([]);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadBlocked = useCallback(async (d: string) => {
    const res = await fetch(`/api/admin/blocked?date=${d}`);
    if (res.ok) {
      const data = await res.json();
      setBlocked(data.blocked ?? []);
    }
  }, []);

  useEffect(() => { if (tab === "schedule") loadBlocked(date); }, [tab, date, loadBlocked]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  async function setStatus(id: string, status: string) {
    const res = await fetch("/api/admin/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    }
  }

  function whatsappConfirm(a: Appt) {
    const msgText =
      `مرحباً ${a.patient.fullName}، معك ${CLINIC_NAME}.\n` +
      `تم تأكيد موعدك يوم ${dateOnly(a.date)} الساعة ${formatSlotAr(a.timeSlot)}.\n` +
      `الخدمة: ${a.service}\n` +
      `العنوان: عرجان - مقابل طوارئ مستشفى الرويال - بجانب صيدلية كارمينا`;
    const phone = a.patient.phone.replace(/^0/, "962").replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msgText)}`, "_blank");
    setStatus(a.id, "confirmed");
  }

  async function block() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/blocked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, scope, timeSlot, period, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error || "تعذّر الإقفال" });
      } else {
        setMsg({ kind: "ok", text: `تم إقفال ${data.added} وقت.` });
        setReason("");
        loadBlocked(date);
      }
    } catch {
      setMsg({ kind: "err", text: "ما قدرنا نوصل للخادم." });
    } finally {
      setBusy(false);
    }
  }

  async function unblock(id: string) {
    const res = await fetch("/api/admin/blocked", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) loadBlocked(date);
  }

  async function unblockAll() {
    const res = await fetch("/api/admin/blocked", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, scope: "day" }),
    });
    if (res.ok) { setMsg(null); loadBlocked(date); }
  }

  const statusLabel: Record<string, string> = {
    pending: "بانتظار التأكيد", confirmed: "مؤكد", cancelled: "ملغي",
  };

  return (
    <>
      <header className="admin-header">
        <div className="brand">{CLINIC_NAME} — لوحة التحكم</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#D9CBA6" }}>{name} ({role === "doctor" ? "طبيب" : "سكرتارية"})</span>
          <button className="btn btn-outline btn-sm" onClick={logout}>خروج</button>
        </div>
      </header>

      <main className="admin-main">
        <div className="tabs">
          <button className={`tab-btn${tab === "appointments" ? " active" : ""}`} onClick={() => setTab("appointments")}>
            المواعيد
          </button>
          <button className={`tab-btn${tab === "schedule" ? " active" : ""}`} onClick={() => setTab("schedule")}>
            إدارة الأوقات
          </button>
        </div>

        {tab === "appointments" && (
          <div className="appt-list">
            {appointments.length === 0 && <p className="empty">ما في مواعيد محجوزة لسا.</p>}
            {appointments.map((a) => (
              <div className="appt" key={a.id}>
                <div>
                  <div className="who">
                    {a.patient.fullName}{" "}
                    <span className={`pill pill-${a.status}`}>{statusLabel[a.status] ?? a.status}</span>
                  </div>
                  <div className="meta">
                    {dateOnly(a.date)} — {formatSlotAr(a.timeSlot)} · {a.service}
                  </div>
                  <div className="meta">{a.patient.phone}{a.note ? ` · ${a.note}` : ""}</div>
                </div>
                <div className="actions">
                  {a.status !== "confirmed" && (
                    <button className="btn btn-primary btn-sm" onClick={() => whatsappConfirm(a)}>
                      تأكيد وإرسال واتساب
                    </button>
                  )}
                  {a.status !== "cancelled" && (
                    <button className="btn btn-danger btn-sm" onClick={() => setStatus(a.id, "cancelled")}>
                      إلغاء
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "schedule" && (
          <div className="block-panel">
            <h3 style={{ marginBottom: 16 }}>إقفال أوقات</h3>

            <div className="field">
              <label htmlFor="bd">التاريخ</label>
              <input id="bd" type="date" value={date} onChange={(e) => { setDate(e.target.value); setMsg(null); }} />
            </div>

            <div className="field">
              <label>نطاق الإقفال</label>
              <div className="scope-row">
                <button type="button" className={`scope-btn${scope === "slot" ? " active" : ""}`} onClick={() => setScope("slot")}>ساعة محددة</button>
                <button type="button" className={`scope-btn${scope === "period" ? " active" : ""}`} onClick={() => setScope("period")}>فترة كاملة</button>
                <button type="button" className={`scope-btn${scope === "day" ? " active" : ""}`} onClick={() => setScope("day")}>اليوم كامل</button>
              </div>
            </div>

            {scope === "slot" && (
              <div className="field">
                <label>الوقت</label>
                <div className="slot-grid">
                  {ALL_SLOTS.map((s) => (
                    <button type="button" key={s}
                      className={`slot-btn${timeSlot === s ? " selected" : ""}`}
                      onClick={() => setTimeSlot(s)}>
                      {formatSlotAr(s)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {scope === "period" && (
              <div className="field">
                <label>الفترة</label>
                <div className="scope-row">
                  {PERIODS.map((p) => (
                    <button type="button" key={p.key}
                      className={`scope-btn${period === p.key ? " active" : ""}`}
                      onClick={() => setPeriod(p.key)}>
                      {p.ar} ({formatSlotAr(p.slots[0])} – {formatSlotAr(p.slots[p.slots.length - 1])})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="field">
              <label htmlFor="br">السبب (اختياري)</label>
              <input id="br" placeholder="مثلاً: ظرف شخصي" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>

            {msg && (
              <div className="form-error" style={msg.kind === "ok" ? { background: "#E3F0E6", color: "#3d7a4f", borderColor: "#BFDCC6" } : undefined}>
                {msg.text}
              </div>
            )}

            <button className="btn btn-primary" style={{ width: "100%", padding: 14 }} onClick={block} disabled={busy}>
              {busy ? "جاري الإقفال..." : scope === "day" ? "إقفال اليوم كامل" : scope === "period" ? "إقفال الفترة" : "إقفال هذا الوقت"}
            </button>

            <div style={{ marginTop: 26 }}>
              <h3 style={{ fontSize: 16, marginBottom: 8 }}>الأوقات المقفلة بهذا اليوم</h3>
              {blocked.length === 0 ? (
                <p className="empty">ما في أوقات مقفلة.</p>
              ) : (
                <>
                  <div className="blocked-list">
                    {blocked.map((b) => (
                      <span className="blocked-chip" key={b.id}>
                        {formatSlotAr(b.timeSlot)}
                        <button onClick={() => unblock(b.id)} title="فتح الوقت">×</button>
                      </span>
                    ))}
                  </div>
                  <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={unblockAll}>
                    فتح كل أوقات هذا اليوم
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
