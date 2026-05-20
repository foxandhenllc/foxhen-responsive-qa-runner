export function PublicSafetyPanel() {
  return (
    <section id="cli" className="public-safe-panel">
      <div>
        <p className="eyebrow">Public-safe utility</p>
        <h2>No backend, no auth, no secrets, no real client data.</h2>
        <p>
          Run the CLI locally against a URL or file you control, then load the generated JSON in the static app above. Reports never
          leave your browser unless you download, copy, or share them yourself.
        </p>
      </div>
      <div className="cli-card">
        <span>Run locally</span>
        <code>npm install</code>
        <code>npx playwright install chromium</code>
        <code>node bin/qa-runner.mjs &lt;url&gt; --out reports/example --viewports mobile,tablet,desktop</code>
        <p>Open reports/example/report.json with the importer, or paste the file contents directly.</p>
      </div>
    </section>
  );
}
