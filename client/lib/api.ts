const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export async function apiGet<T>(path: string, mock: T): Promise<T> {
  if (USE_MOCKS) return mock;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}