export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3030";
export const BLOCKCHAIN_BASE = BASE_URL;
export const PAYMENT_BASE = import.meta.env.VITE_PAYMENT_API_URL ?? BASE_URL;

export async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json", ...options?.headers }, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "HTTP " + res.status);
  return data;
}

export const blockchainFetch = (path: string, o?: RequestInit) => fetchJSON(BLOCKCHAIN_BASE + path, o);
export const paymentFetch = (path: string, o?: RequestInit) => fetchJSON(PAYMENT_BASE + path, o);
