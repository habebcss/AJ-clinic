"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/admin/dashboard");
        router.refresh();
      } else {
        setError(data.error || "تعذّر تسجيل الدخول");
      }
    } catch {
      setError("ما قدرنا نوصل للخادم.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-card" onSubmit={submit}>
        <h1>لوحة تحكم العيادة</h1>
        <p className="sub">عيادة د. أحمد الجعفري</p>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label htmlFor="u">اسم المستخدم</label>
          <input id="u" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="p">كلمة المرور</label>
          <input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "جاري الدخول..." : "دخول"}
        </button>
      </form>
    </div>
  );
}
