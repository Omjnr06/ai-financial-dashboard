// test of client hitting server
export default async function Home() {
  // no-store so we see the live response instead of a build time cache
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`, {
    cache: "no-store",
  });
  const data = await res.json();

  return (
    <main style={{ padding: 40, fontFamily: "monospace" }}>
      <h1>The Vault</h1>
      <p>API status: {data.status}</p>
    </main>
  );
}