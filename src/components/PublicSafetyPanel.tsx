export function PublicSafetyPanel() {
  return (
    <section id="cli" className="public-safe-panel">
      <div>
        <p className="eyebrow">Public-safe utility</p>
        <h2>No backend, no auth, no secrets, no real client data.</h2>
        <p>
          The live app is a static sample report viewer. The local CLI can be run against your own local or public URL and writes
          artifacts to a report folder you control.
        </p>
      </div>
      <div className="cli-card">
        <span>Run locally</span>
        <code>node bin/qa-runner.mjs &lt;url&gt; --out reports/example --viewports mobile,tablet,desktop</code>
      </div>
    </section>
  );
}
