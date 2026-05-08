export default function Page() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>TOT API</h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>
        Proxy passthrough Tractive — endpoints sous <code>/api/*</code>.
      </p>
      <ul style={{ lineHeight: 1.9 }}>
        <li>
          <code>POST /api/auth/login</code>
        </li>
        <li>
          <code>GET /api/auth/verify</code>
        </li>
        <li>
          <code>GET /api/trackers</code>
        </li>
        <li>
          <code>POST /api/bulk</code>
        </li>
      </ul>
    </main>
  );
}
