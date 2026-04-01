import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="auth-shell">
      <div className="auth-card branded-auth-card">
        <section className="auth-panel branded-auth-panel">
          <div className="login-brand-lockup">
            <img alt="Lavelec logo" className="login-brand-logo" src="/branding/lavelec-orb.png" />
            <div>
              <p className="eyebrow accent-eyebrow">Lavelec</p>
              <h1 style={{ marginTop: 10, fontSize: "2.2rem", lineHeight: 1.02 }}>Calm control for electrical and fire operations</h1>
            </div>
          </div>
          <p className="muted-on-dark login-intro" style={{ marginTop: 18 }}>
            Built around your brand: dark premium shell, clean workspace, clear workflow and site files that feel easy to use every day.
          </p>
          <div className="divider branded-divider" />
          <div className="item-list">
            <div className="soft-panel auth-feature-card">
              <strong>Branded for Lavelec</strong>
              <p className="muted-on-dark">Black shell, amber highlights and your circular identity carried through the whole app.</p>
            </div>
            <div className="soft-panel auth-feature-card">
              <strong>Site folders & jobsheets</strong>
              <p className="muted-on-dark">Structured site files for electrical, fire, DBs and jobsheets with room to grow.</p>
            </div>
            <div className="soft-panel auth-feature-card">
              <strong>Built for daily use</strong>
              <p className="muted-on-dark">Engineers, office staff and directors each get the right view without clutter.</p>
            </div>
          </div>
        </section>

        <section className="auth-form branded-auth-form">
          <p className="eyebrow accent-eyebrow">Sign in</p>
          <h2 style={{ marginTop: 10, fontSize: "1.8rem" }}>Welcome to Lavelec Ops</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            Use email and password first. The app is ready for Supabase roles and can be extended later with Microsoft login.
          </p>

          {params.message ? <div className="banner">{params.message}</div> : null}

          <form className="form-stack" style={{ marginTop: 20 }}>
            <label htmlFor="full_name">Full name</label>
            <input className="text-input" id="full_name" name="full_name" type="text" placeholder="Dale Laverick" />
            <label htmlFor="email">Email</label>
            <input className="text-input" id="email" name="email" type="email" required placeholder="you@company.com" />
            <label htmlFor="password">Password</label>
            <input className="text-input" id="password" name="password" type="password" required placeholder="At least 8 characters" />
            <div className="button-row" style={{ marginTop: 8 }}>
              <button type="submit" className="primary-button" formAction={login}>
                Log in
              </button>
              <button type="submit" className="secondary-button" formAction={signup}>
                Create account
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
