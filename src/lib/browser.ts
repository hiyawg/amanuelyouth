// Small browser helpers: confetti, file saves, badge images, local storage.
import QRCode from "qrcode";
import { GROUPS, type Student } from "./shared";

export function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = document.createElement("canvas");
  Object.assign(c.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "60" });
  c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c);
  const x = c.getContext("2d")!, cs = getComputedStyle(document.documentElement);
  const cols = ["--sun", "--elem", "--mid", "--high", "--accent"].map(v => cs.getPropertyValue(v).trim());
  const P = Array.from({ length: 140 }, () => ({ x: c.width / 2, y: c.height * .45, vx: (Math.random() - .5) * 14, vy: -Math.random() * 13 - 4, r: Math.random() * 6 + 4, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6 }));
  let f = 0;
  (function step() {
    x.clearRect(0, 0, c.width, c.height);
    for (const p of P) { p.x += p.vx; p.y += p.vy; p.vy += .35; p.a += .2; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); }
    if (++f < 110) requestAnimationFrame(step); else c.remove();
  })();
}

export function saveFile(filename: string, data: Blob | string, type = "text/plain") {
  const blob = typeof data === "string" ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export const safeName = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");

export function badgePng(s: Pick<Student, "name" | "grp" | "badge"> & { note?: string }): Promise<Blob> {
  const W = 600, H = 840, c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d")!, g = GROUPS[s.grp];
  x.fillStyle = "#FFFFFF"; x.fillRect(0, 0, W, H);
  x.fillStyle = g.print; x.fillRect(0, 0, W, 150);
  x.fillStyle = "#FFFFFF"; x.beginPath(); x.roundRect(W / 2 - 45, 30, 90, 16, 8); x.fill();
  x.textAlign = "center";
  x.font = "700 26px sans-serif"; x.fillText(`${g.label} · ${g.grades}`.toUpperCase(), W / 2, 112);
  x.fillStyle = "#17203B"; let fs = 58;
  do { x.font = `800 ${fs}px sans-serif`; fs -= 2; } while (x.measureText(s.name).width > W - 60 && fs > 24);
  x.fillText(s.name, W / 2, 240);
  const q = QRCode.create(s.badge, { errorCorrectionLevel: "M" }).modules;
  const n = q.size, cell = Math.floor(380 / n), off = (W - cell * n) / 2, top = 285;
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.get(r, k)) x.fillRect(off + k * cell, top + r * cell, cell, cell);
  x.fillStyle = "#5A6583"; x.font = "600 30px monospace"; x.fillText(s.badge, W / 2, top + cell * n + 55);
  if (s.note) { x.fillStyle = "#C23B3B"; x.font = "600 24px sans-serif"; x.fillText("⚠ " + s.note.slice(0, 40), W / 2, H - 40); }
  return new Promise(res => c.toBlob(b => res(b!), "image/png"));
}

export function store(k: string, v?: string) { try { if (v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} }
export function recall(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }

/** How far this device's clock is from the server's, in ms. Add it to Date.now(). */
export async function clockOffset(): Promise<number> {
  const t0 = Date.now(), { now } = await api<{ now: number }>("/api/time"), t1 = Date.now();
  return now - (t0 + t1) / 2;
}

export async function api<T = any>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, body === undefined ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong. Try again.");
  return d as T;
}
