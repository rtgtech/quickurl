"use client";

import Link from "next/link";
import { TopBar } from "@/components/home/topbar";

export function AppNotFoundPage({ path }: { path: string }) {
  return (
    <>
      <TopBar
        actions={
          <>
            <Link className="nav-button ghost" href="/docs">
              Docs
            </Link>
            <Link className="nav-button primary" href="/">
              Create
            </Link>
          </>
        }
        menuItems={[
          { label: "Docs", href: "/docs" },
          { label: "Create", href: "/", primary: true },
        ]}
      />

      <div className="page">
        <header className="hero">
          <div>
            <p className="kicker">QuickURL</p>
            <h1>Page not found.</h1>
            <p className="subhead">The address you entered does not match a page in this app.</p>
          </div>
          <div className="orb" aria-hidden="true" />
        </header>

        <main className="not-found">
          <section className="card">
            <h2>404</h2>
            <p className="muted">
              Requested path: <span className="code-pill">{path}</span>
            </p>
            <div className="not-found-actions">
              <Link className="primary button-link" href="/">
                Go home
              </Link>
              <Link className="ghost button-link" href="/docs">
                Open docs
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

export function CodeNotFoundPage({ code }: { code: string }) {
  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="kicker">QuickURL</p>
          <h1>We could not find that short code.</h1>
          <p className="subhead">Double-check the code or create a new short link.</p>
        </div>
        <div className="orb" aria-hidden="true" />
      </header>

      <main className="not-found">
        <section className="card">
          <h2>Code not found</h2>
          <p className="muted">
            The code <span className="code-pill">{code}</span> does not exist in the database.
          </p>
          <div className="not-found-actions">
            <Link className="primary button-link" href="/">
              Create a short link
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
