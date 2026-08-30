const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

// mock wrapper for GET
export async function apiGet<T>(path: string, mock: T): Promise<T> {
  if (USE_MOCKS) return mock;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}
// mock wrapper for POST
export async function apiPost<T>( path: string, body: unknown,mock: T): Promise<T> {
  if (USE_MOCKS) return mock;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

// mock wrapper for PATCH
export async function apiPatch<T>(path: string, body: unknown, mock: T): Promise<T> {
  if (USE_MOCKS) return mock;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}