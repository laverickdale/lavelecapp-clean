import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <section className="auth-panel">
          <p className="eyebrow">FieldOps Pro</p>
          <h1 style={{ marginTop: 12, fontSize: "2rem", lineHeight: 1.05 }}>A calm operating system for your electrical business</h1>
          <p className="muted-on-dark" style={{ marginTop: 16 }}>
            Built for directors, office staff and engineers who want clear workflow, clean site files, easy chat,
            and less overwhelm.
          </p>
          <div className="divider" />
          <div className="item-list">
            <div className="soft-panel" style={{ background: "rgba(255,255,255,0.08)", color: "white" }}>
              <strong>Easy diary</strong>
              <p className="muted-on-dark">A calmer calendar that highlights visits without turning into a spreadsheet.</p>
            </div>
            <div className="soft-panel" style={{ background: "rgba(255,255,255,0.08)", color: "white" }}>
              <strong>Site files</strong>
              <p className="muted-on-dark">Previous visits, jobsheets and site images stay attached to the site.</p>
            </div>
            <div className="soft-panel" style={{ background: "rgba(255,255,255,0.08)", color: "white" }}>
              <strong>Simple workflow</strong>
              <p className="muted-on-dark">Quote sent, accepted, PO received, materials ordered, booked, completed and invoiced.</p>
            </div>
          </div>
        </section>

        <section className="auth-form">
          <p className="eyebrow">Sign in</p>
          <h2 style={{ marginTop: 10, fontSize: "1.8rem" }}>Get your team into the app</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            Use email and password first. The package is ready for Supabase roles and can be extended later with Microsoft login.
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
              <button className="primary-button" formAction={login}>
                Log in
              </button>
              <button className="secondary-button" formAction={signup}>
                Create account
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
