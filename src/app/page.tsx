"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { dict, type Lang } from "@/lib/i18n";
import { formatSlotAr, formatSlotEn } from "@/lib/slots";

const CLINIC_PHONE = "962787755722"; // 0787755722 بصيغة دولية
const INSTAGRAM = "https://www.instagram.com/dr_ahmad_aljaafari/";
const MAPS_QUERY = encodeURIComponent("عرجان مقابل طوارئ مستشفى الرويال");

/* ---------- before/after comparison slider ---------- */
function Compare({ before, after, caption, beforeLabel, afterLabel }: {
  before: string; after: string; caption: string; beforeLabel: string; afterLabel: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);

  const move = useCallback((clientX: number) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  }, []);

  return (
    <div className="compare-card">
      <div
        className="compare"
        ref={boxRef}
        onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); move(e.clientX); }}
        onPointerMove={(e) => { if (dragging.current) move(e.clientX); }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
      >
        <img className="after-img" src={after} alt={afterLabel} />
        <img className="before-img" src={before} alt={beforeLabel} style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
        <span className="tag tag-before">{beforeLabel}</span>
        <span className="tag tag-after">{afterLabel}</span>
        <div className="divider" style={{ left: `${pos}%` }}>
          <div className="handle" style={{ insetInlineEnd: "50%" }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path d="M8 7 4 12l4 5M16 7l4 5-4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      <p className="compare-caption">{caption}</p>
    </div>
  );
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("ar");
  const t = dict[lang];
  const isAr = lang === "ar";
  const fmt = isAr ? formatSlotAr : formatSlotEn;

  const [menuOpen, setMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  // booking form state
  const [form, setForm] = useState({ fullName: "", phone: "", service: "", date: "", note: "" });
  const [slots, setSlots] = useState<string[]>([]);
  const [slotState, setSlotState] = useState<"idle" | "loading" | "ready">("idle");
  const [picked, setPicked] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir;
  }, [lang, t.dir]);

  // load real availability whenever the date changes
  useEffect(() => {
    if (!form.date) { setSlots([]); setSlotState("idle"); return; }
    let cancelled = false;
    setSlotState("loading");
    setPicked("");
    fetch(`/api/slots?date=${form.date}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) { setSlots(d.available ?? []); setSlotState("ready"); } })
      .catch(() => { if (!cancelled) { setSlots([]); setSlotState("ready"); } });
    return () => { cancelled = true; };
  }, [form.date]);

  function toggleSound() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (v.paused) v.play().catch(() => {});
  }

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!picked) { setError(t.fPickSlot); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, service: form.service || t.services[0], timeSlot: picked }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.fErrGeneric);
        // refresh availability — the slot may have just been taken
        if (res.status === 409 && form.date) {
          const r = await fetch(`/api/slots?date=${form.date}`);
          const d = await r.json();
          setSlots(d.available ?? []);
          setPicked("");
        }
      } else {
        setDone(true);
      }
    } catch {
      setError(t.fErrNetwork);
    } finally {
      setSubmitting(false);
    }
  }

  const waLink = (msg: string) => `https://wa.me/${CLINIC_PHONE}?text=${encodeURIComponent(msg)}`;
  const navItems = [
    ["#hero", t.navHome], ["#about", t.navAbout], ["#services", t.navServices],
    ["#results", t.navResults], ["#booking", t.navBooking], ["#location", t.navLocation],
  ] as const;

  const services = [
    [t.svc1, t.svc1d], [t.svc2, t.svc2d], [t.svc3, t.svc3d], [t.svc4, t.svc4d],
    [t.svc5, t.svc5d], [t.svc6, t.svc6d], [t.svc7, t.svc7d], [t.svc8, t.svc8d],
  ];

  const serviceIcons = [
    <path key="i1" d="M12 3c-4 0-6 2.7-6 6.3 0 3.5 1.5 4.7 1.5 6.8 0 1 .7 1.5 1.3 1.5s1.2-1 1.2-2.5.4-2.2 2-2.2 2 1 2 2.5.4 2.2 1.2 2.2 1.3-.5 1.3-1.5c0-2.1 1.5-3.3 1.5-6.8C18 5.7 16 3 12 3Z" stroke="currentColor" strokeWidth="1.7" />,
    <g key="i2"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="2.5" fill="currentColor" /></g>,
    <path key="i3" d="M12 3v18M7 8h10M7 16h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
    <g key="i4"><path d="M6 12h9m0 0-3-3m3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><rect x="16" y="7" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.7" /></g>,
    <path key="i5" d="M12 3v6m0 0-2.5 2m2.5-2 2.5 2M9 21h6l-1-8H10l-1 8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
    <path key="i6" d="M4 9l3-4h10l3 4-8 11-8-11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
    <g key="i7"><path d="M4 14c2-6 14-6 16 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M6 14v3m12-3v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></g>,
    <g key="i8"><path d="M12 2 3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M12 9v6M9 12h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></g>,
  ];

  return (
    <>
      <header className="site">
        <div className="wrap nav">
          <a href="#hero" className="brand">
            <svg viewBox="0 0 48 48" fill="none">
              <defs>
                <linearGradient id="bg1" x1="0" y1="0" x2="48" y2="48">
                  <stop offset="0" stopColor="#E4CB8E" /><stop offset="1" stopColor="#8B6B34" />
                </linearGradient>
              </defs>
              <path d="M24 7c-8 0-12 5.5-12 12.6 0 7 3 9.4 3 14.4 0 2.4 1.6 3.4 3.1 3.4s2.7-2 2.7-5.4c0-2.8 1-4.4 3.2-4.4s3.2 1.6 3.2 4.4c0 3.4 1.2 5.4 2.7 5.4s3.1-1 3.1-3.4c0-5 3-7.4 3-14.4C36 12.5 32 7 24 7Z" fill="url(#bg1)" />
            </svg>
            {t.brand}
          </a>
          <nav className="nav-links">
            {navItems.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
          </nav>
          <div className="nav-cta">
            <button className="lang-btn" onClick={() => setLang(isAr ? "en" : "ar")} title={t.switchTo}>
              {t.langLabel}
            </button>
            <a href="#booking" className="btn btn-primary">{t.navBook}</a>
            <button className="menu-toggle" aria-label={t.menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
              <span />
            </button>
          </div>
        </div>
        <div className={`wrap mobile-panel${menuOpen ? " open" : ""}`}>
          {navItems.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>
          ))}
        </div>
      </header>

      {/* hero */}
      <section className="hero" id="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">{t.heroEyebrow}</span>
            <h1>{t.heroTitle1}<span className="accent">{t.heroTitleAccent}</span>{t.heroTitle2}</h1>
            <p className="lead">{t.heroText}</p>
            <div className="hero-actions">
              <a href="#booking" className="btn btn-primary">{t.heroBookNow}</a>
              <a href={waLink(t.heroWaMsg)} target="_blank" rel="noopener" className="btn btn-whatsapp">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 0 1 6.9 12.6l-.2.4.9 3.3-3.4-.9-.4.2A8.2 8.2 0 1 1 12 3.8Zm-3.4 4.3c-.2 0-.5 0-.7.3-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.9 4.4 4 .6.3 1.1.4 1.5.6.6.2 1.2.1 1.6-.1.5-.2 1.4-.9 1.6-1.7.2-.8.2-1.5.1-1.7-.1-.1-.3-.2-.6-.4-.3-.1-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.4-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.6-1.6-.9-2.1-.2-.5-.4-.4-.6-.4Z" />
                </svg>
                {t.whatsapp}
              </a>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><b>{t.stat1b}</b><span>{t.stat1s}</span></div>
              <div className="hero-stat"><b>{t.stat2b}</b><span>{t.stat2s}</span></div>
              <div className="hero-stat"><b>{t.stat3b}</b><span>{t.stat3s}</span></div>
            </div>
          </div>
          <div className="hero-media">
            <div className="frame">
              <video ref={videoRef} autoPlay muted loop playsInline preload="metadata">
                <source src="/media/clinic.mp4" type="video/mp4" />
              </video>
              <button type="button" className="sound-toggle" onClick={toggleSound} aria-label={t.soundToggle}>
                {muted ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                    <path d="M5 9v6h4l5 4V5L9 9H5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M17 9l4 6M21 9l-4 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                    <path d="M5 9v6h4l5 4V5L9 9H5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M16 8.5c1.2 1 1.2 6 0 7M18.5 6.5c2.2 2 2.2 9.5 0 11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                )}
              </button>
              <div className="caption">{t.videoCaption}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="fluted-divider" />

      {/* about + certificates */}
      <section className="about" id="about">
        <div className="wrap about-grid">
          <div className="doctor-card">
            <div className="photo"><img src="/media/doctor.jpg" alt={t.doctorName} /></div>
            <div className="info"><h3>{t.doctorName}</h3></div>
          </div>
          <div className="about-copy">
            <span className="eyebrow">{t.aboutEyebrow}</span>
            <h2 className="section-title" style={{ marginTop: 14 }}>{t.aboutTitle}</h2>
            <p>{t.aboutP1}</p>
            <p>{t.aboutP2}</p>

            <div className="certs">
              <h3>{t.certsTitle}</h3>
              <div className="cert-list">
                {t.certs.map((c) => (
                  <div className="cert-item" key={c.name}>
                    <div className="cert-icon">
                      <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M8.5 13.5 7 21l5-2.5L17 21l-1.5-7.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <div className="cert-name">{c.name}</div>
                      <div className="cert-body">{c.body}</div>
                    </div>
                    <span className="cert-year">{c.year}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* services */}
      <section className="services" id="services">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">{t.servicesEyebrow}</span>
            <h2 className="section-title">{t.servicesTitle}</h2>
            <p className="section-sub">{t.servicesSub}</p>
          </div>
          <div className="services-grid">
            {services.map(([name, desc], i) => (
              <div className="service-card" key={name}>
                <div className="service-icon"><svg viewBox="0 0 24 24" fill="none">{serviceIcons[i]}</svg></div>
                <h3>{name}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* before / after */}
      <section className="results" id="results">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">{t.resultsEyebrow}</span>
            <h2 className="section-title">{t.resultsTitle}</h2>
            <p className="section-sub">{t.resultsSub}</p>
          </div>
          <div className="results-grid">
            <Compare before="/media/case1-before.jpg" after="/media/case1-after.jpg" caption={t.case1} beforeLabel={t.before} afterLabel={t.after} />
            <Compare before="/media/case2-before.jpg" after="/media/case2-after.jpg" caption={t.case2} beforeLabel={t.before} afterLabel={t.after} />
            <Compare before="/media/case3-before.jpg" after="/media/case3-after.jpg" caption={t.case3} beforeLabel={t.before} afterLabel={t.after} />
          </div>
        </div>
      </section>

      {/* booking */}
      <section className="booking" id="booking">
        <div className="wrap booking-grid">
          <div>
            <span className="eyebrow">{t.bookEyebrow}</span>
            <h2 className="section-title" style={{ marginTop: 14 }}>{t.bookTitle}</h2>
            <p className="section-sub">{t.bookSub}</p>
            <div className="steps">
              {[[t.step1t, t.step1d], [t.step2t, t.step2d], [t.step3t, t.step3d]].map(([h, p], i) => (
                <div className="step" key={h}>
                  <div className="step-num">{isAr ? ["١", "٢", "٣"][i] : i + 1}</div>
                  <div><h4>{h}</h4><p>{p}</p></div>
                </div>
              ))}
            </div>
          </div>

          <div className="booking-form">
            {done ? (
              <div className="booking-done">
                <div className="check">
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
                    <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3>{t.doneTitle}</h3>
                <p>{t.doneBody1}</p>
                <p>{t.doneBody2} {form.phone} {t.doneBody3}</p>
                <button
                  className="btn btn-outline"
                  style={{ marginTop: 14 }}
                  onClick={() => {
                    setDone(false);
                    setForm({ fullName: "", phone: "", service: "", date: "", note: "" });
                    setPicked(""); setSlots([]); setSlotState("idle");
                  }}
                >
                  {t.doneAgain}
                </button>
              </div>
            ) : (
              <form onSubmit={submitBooking}>
                {error && <div className="form-error">{error}</div>}
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="fname">{t.fName}</label>
                    <input id="fname" required placeholder={t.fNamePh}
                      value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                  </div>
                  <div className="field">
                    <label htmlFor="fphone">{t.fPhone}</label>
                    <input id="fphone" type="tel" required placeholder={t.fPhonePh}
                      value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="fservice">{t.fService}</label>
                  <select id="fservice" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                    {t.services.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="fdate">{t.fDate}</label>
                  <input id="fdate" type="date" required min={new Date().toISOString().slice(0, 10)}
                    value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="field">
                  <label>{t.fSlot}</label>
                  {slotState === "idle" && <p className="slot-hint">{t.fSlotPickDate}</p>}
                  {slotState === "loading" && <p className="slot-hint">{t.fSlotLoading}</p>}
                  {slotState === "ready" && slots.length === 0 && <p className="slot-hint">{t.fSlotNone}</p>}
                  {slotState === "ready" && slots.length > 0 && (
                    <div className="slot-grid">
                      {slots.map((s) => (
                        <button type="button" key={s}
                          className={`slot-btn${picked === s ? " selected" : ""}`}
                          onClick={() => setPicked(s)}>
                          {fmt(s)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="fnote">{t.fNote}</label>
                  <textarea id="fnote" placeholder={t.fNotePh}
                    value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary form-submit" disabled={submitting}>
                  {submitting ? t.fSubmitting : t.fSubmit}
                </button>
                <p className="form-note">{t.fFootnote}</p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* location */}
      <section className="location" id="location">
        <div className="wrap location-grid">
          <div>
            <span className="eyebrow">{t.locEyebrow}</span>
            <h2 className="section-title" style={{ marginTop: 14 }}>{t.locTitle}</h2>
            <div className="loc-list">
              <div className="loc-item">
                <div className="ic"><svg viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-4.5-9.5-9C.5 8 2 4 6 4c2.3 0 3.7 1.2 4.5 2.4C11.3 5.2 12.7 4 15 4c4 0 5.5 4 3.5 8-2.5 4.5-9.5 9-9.5 9Z" stroke="currentColor" strokeWidth="1.7" /></svg></div>
                <div><h4>{t.locAddressLabel}</h4><p>{t.locAddress}</p></div>
              </div>
              <div className="loc-item">
                <div className="ic"><svg viewBox="0 0 24 24" fill="none"><path d="M4 5c0-1 1-2 2-2h2l2 5-2 1c1 3 3 5 6 6l1-2 5 2v2c0 1-1 2-2 2-8 0-14-6-14-14Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg></div>
                <div><h4>{t.locPhoneLabel}</h4><a href="tel:+962787755722">0787755722</a></div>
              </div>
              <div className="loc-item">
                <div className="ic"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></div>
                <div><h4>{t.locHoursLabel}</h4><p>{t.locHours}</p></div>
              </div>
              <div className="loc-item">
                <div className="ic"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" /></svg></div>
                <div><h4>{t.locInstagram}</h4><a href={INSTAGRAM} target="_blank" rel="noopener">@dr_ahmad_aljaafari</a></div>
              </div>
            </div>
            <div className="loc-actions">
              <a href={`https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`} target="_blank" rel="noopener" className="btn btn-light">{t.locMaps}</a>
              <a href={waLink(t.locWaMsg)} target="_blank" rel="noopener" className="btn btn-whatsapp">{t.locWa}</a>
            </div>
          </div>
          <div className="map-frame">
            <iframe src={`https://www.google.com/maps?q=${MAPS_QUERY}&output=embed`} loading="lazy" title={t.mapTitle} />
          </div>
        </div>
      </section>

      <footer className="site">
        <div className="wrap footer-row">
          <div className="brand" style={{ fontSize: 16 }}>{t.brand}</div>
          <div className="footer-links">
            <a href="#about">{t.navAbout}</a>
            <a href="#services">{t.navServices}</a>
            <a href="#booking">{t.navBooking}</a>
            <a href="tel:+962787755722">0787755722</a>
          </div>
          <div>{t.footer}</div>
        </div>
      </footer>

      <a href={waLink(t.heroWaMsg)} target="_blank" rel="noopener" className="float-wa" aria-label={t.whatsapp}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 0 1 6.9 12.6l-.2.4.9 3.3-3.4-.9-.4.2A8.2 8.2 0 1 1 12 3.8Zm-3.4 4.3c-.2 0-.5 0-.7.3-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.9 4.4 4 .6.3 1.1.4 1.5.6.6.2 1.2.1 1.6-.1.5-.2 1.4-.9 1.6-1.7.2-.8.2-1.5.1-1.7-.1-.1-.3-.2-.6-.4-.3-.1-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.4-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.6-1.6-.9-2.1-.2-.5-.4-.4-.6-.4Z" />
        </svg>
      </a>
    </>
  );
}
