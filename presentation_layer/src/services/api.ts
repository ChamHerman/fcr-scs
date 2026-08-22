export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3030";
export const BLOCKCHAIN_BASE = BASE_URL;
export const PAYMENT_BASE = BASE_URL;

export async function fetchJSON(url: string, options?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
    });
  } catch (networkErr: any) {
    // Network failure (server not running, CORS, etc.)
    throw new Error(
      `Network Error: Cannot connect to ${url}. Is the backend service running?`
    );
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    // Response body is not JSON (e.g., plain HTML 404 page from Express)
    throw new Error(
      `Server Error (${res.status}): Unexpected non-JSON response from ${url}`
    );
  }

  if (!res.ok) {
    const message =
      data?.error || data?.message || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data;
}

export const blockchainFetch = (path: string, o?: RequestInit) => fetchJSON(BLOCKCHAIN_BASE + path, o);
export const paymentFetch = (path: string, o?: RequestInit) => fetchJSON(PAYMENT_BASE + path, o);
