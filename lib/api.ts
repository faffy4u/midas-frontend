export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").trim().replace(/\/$/, "");

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("midas_token") : null;
  const headers = new Headers(init?.headers);

  // GET requests do not need Content-Type and adding it can trigger a CORS preflight.
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const url = `${API_BASE}${path}`;
  const r = await fetch(url, { ...init, headers, cache: "no-store" });

  if (!r.ok) {
    let detail = "";
    try {
      const body = await r.text();
      detail = body ? `: ${body.slice(0, 160)}` : "";
    } catch {}
    throw new Error(`API ${r.status}${detail}`);
  }

  return r.json() as Promise<T>;
}
