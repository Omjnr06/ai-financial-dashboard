// idle timeout ping
export async function pingSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/get-session", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}