"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthModal } from "@/components/home/auth-modal";
import { TopBar } from "@/components/home/topbar";
import { useAuth } from "@/components/home/auth-provider";

type Language = "javascript" | "python" | "curl";

const shortenSamples: Record<Language, string> = {
  javascript: `fetch("https://quickurl.app/shorten", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://example.com", custom_code: "myCode123" })
})
  .then((res) => res.json())
  .then(console.log);`,
  python: `import requests

response = requests.post(
    "https://quickurl.app/shorten",
    json={"url": "https://example.com", "custom_code": "myCode123"},
)
print(response.json())`,
  curl: `curl -X POST https://quickurl.app/shorten \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com","custom_code":"myCode123"}'`,
};

const resolveSamples: Record<Language, string> = {
  javascript: `fetch("https://quickurl.app/resolve/g8")
  .then((res) => res.json())
  .then(console.log);`,
  python: `import requests

response = requests.get("https://quickurl.app/resolve/g8")
print(response.json())`,
  curl: "curl https://quickurl.app/resolve/g8",
};

interface CodePanelProps {
  panelName: "shorten" | "resolve";
  value: Language;
  onChange: (next: Language) => void;
  snippets: Record<Language, string>;
  ariaLabel: string;
}

function CodePanel({ panelName, value, onChange, snippets, ariaLabel }: CodePanelProps) {
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(snippets[value]);
    } catch {
      // Intentionally ignored for parity with original lightweight behavior.
    }
  };

  return (
    <div className="code-panel">
      <div className="tab-bar" data-tabs={panelName}>
        <div className="tabs" role="tablist" aria-label={ariaLabel}>
          {(["javascript", "python", "curl"] as const).map((language) => (
            <button
              key={language}
              className={`tab${value === language ? " active" : ""}`}
              data-tab={language}
              type="button"
              role="tab"
              aria-selected={value === language}
              onClick={() => onChange(language)}
            >
              {language === "curl" ? "cURL" : language[0]!.toUpperCase() + language.slice(1)}
            </button>
          ))}
        </div>

        <label className="sr-only" htmlFor={`${panelName}-language`}>
          Language
        </label>
        <select
          className="code-select"
          id={`${panelName}-language`}
          data-select={panelName}
          value={value}
          onChange={(event) => onChange(event.target.value as Language)}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="curl">cURL</option>
        </select>

        <button className="copy-code" type="button" data-copy={panelName} onClick={copyCode}>
          Copy
        </button>
      </div>

      {(["javascript", "python", "curl"] as const).map((language) => (
        <pre
          key={language}
          className={`code-block${value === language ? "" : " hidden"}`}
          data-panel={panelName}
          data-content={language}
        >
          <code>{snippets[language]}</code>
        </pre>
      ))}
    </div>
  );
}

interface SectionMeta {
  id: string;
  title: string;
}

const SECTION_IDS: SectionMeta[] = [
  { id: "overview", title: "Overview" },
  { id: "quickstart", title: "Quickstart" },
  { id: "gui-guide", title: "GUI Guide" },
  { id: "api-reference", title: "API reference" },
  { id: "api-shorten", title: "/shorten" },
  { id: "api-resolve", title: "/resolve" },
  { id: "lifecycle", title: "LifeCycle" },
  { id: "support-faq", title: "Support and FAQ" },
];

const TOC_ITEMS: Array<SectionMeta & { indent?: boolean }> = [
  { id: "overview", title: "Overview" },
  { id: "quickstart", title: "Quickstart" },
  { id: "gui-guide", title: "GUI Guide" },
  { id: "api-reference", title: "API reference" },
  { id: "api-shorten", title: "/shorten", indent: true },
  { id: "api-resolve", title: "/resolve", indent: true },
  { id: "lifecycle", title: "LifeCycle" },
  { id: "support-faq", title: "Support and FAQ" },
];

export function DocsPage() {
  const { user, signOutUser } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [shortenLanguage, setShortenLanguage] = useState<Language>("javascript");
  const [resolveLanguage, setResolveLanguage] = useState<Language>("javascript");
  const [activeSectionId, setActiveSectionId] = useState<string>(SECTION_IDS[0]!.id);

  useEffect(() => {
    let ticking = false;

    const updateActiveSection = () => {
      const offset = 140;
      let current = SECTION_IDS[0]!.id;

      for (const section of SECTION_IDS) {
        const element = document.getElementById(section.id);
        if (!element) {
          continue;
        }

        if (element.getBoundingClientRect().top - offset <= 0) {
          current = section.id;
        } else {
          break;
        }
      }

      setActiveSectionId(current);
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const jumpTo = (id: string) => {
    const section = document.getElementById(id);
    if (!section) {
      return;
    }

    setActiveSectionId(id);
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <>
      <TopBar
        logoSuffix="Docs"
        actions={
          <>
            <Link className="nav-button ghost" href="/">
              Home
            </Link>
            {user ? (
              <Link className="nav-button ghost" href="/dashboard">
                Dashboard
              </Link>
            ) : null}
            <button
              className="nav-button primary"
              type="button"
              onClick={() => {
                if (user) {
                  void signOutUser();
                } else {
                  setAuthOpen(true);
                }
              }}
            >
              {user ? "Sign Out" : "Sign Up"}
            </button>
          </>
        }
        menuItems={
          user
            ? [
                { label: "Home", href: "/" },
                { label: "Docs", href: "/docs" },
                { label: "Dashboard", href: "/dashboard" },
                { label: "Sign Out", onClick: () => void signOutUser(), primary: true },
              ]
            : [
                { label: "Home", href: "/" },
                { label: "Docs", href: "/docs" },
                { label: "Sign Up", onClick: () => setAuthOpen(true), primary: true },
              ]
        }
      />

      <div className="page docs-page">
        <header className="hero docs-hero">
          <div>
            <p className="kicker">Docs</p>
            <h1>QuickURL Documentation</h1>
            <p className="subhead">
              Product and developer guidance for the public URL shortening flows on{" "}
              <span className="doc-inline-code">https://quickurl.app</span>.
            </p>
          </div>
          <div className="orb" aria-hidden="true" />
        </header>

        <div className="docs-mobile-jump">
          <label htmlFor="docs-mobile-nav" className="label">
            Jump to section
          </label>
          <select
            id="docs-mobile-nav"
            value={activeSectionId}
            onChange={(event) => jumpTo(event.target.value)}
          >
            {TOC_ITEMS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.indent ? `- ${item.title}` : item.title}
              </option>
            ))}
          </select>
        </div>

        <div className="docs-shell">
          <nav className="docs-toc" aria-label="Documentation sections">
            <p className="kicker">Contents</p>
            {TOC_ITEMS.map((item) => {
              const isActive = item.id === activeSectionId;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`toc-link${isActive ? " active" : ""}${item.indent ? " toc-link-indented" : ""}`}
                  onClick={(event) => {
                    jumpTo(item.id);
                    event.currentTarget.blur();
                  }}
                  aria-current={isActive ? "true" : undefined}
                >
                  {item.title}
                </button>
              );
            })}
          </nav>

          <main className="docs-main">
            <nav className="docs-toc-inline" aria-label="Documentation sections">
              {TOC_ITEMS.map((item) => {
                const isActive = item.id === activeSectionId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`toc-link${isActive ? " active" : ""}`}
                    onClick={(event) => {
                      jumpTo(item.id);
                      event.currentTarget.blur();
                    }}
                    aria-current={isActive ? "true" : undefined}
                  >
                    {item.title}
                  </button>
                );
              })}
            </nav>

            <section id="overview" className="docs-section">
              <header className="docs-section-header">
                <h2>Overview</h2>
                <span className="endpoint-chip">Start Here</span>
              </header>
              <div className="docs-card">
                <p>
                  QuickURL turns long URLs into compact short codes. This documentation covers the public experience:
                  web GUI usage, public API usage, redirect behavior, and operational notes needed for production use.
                </p>
                <p>
                  Public endpoints are available without authentication. If an ID token is included with shorten
                  requests, ownership can be attached for dashboard management.
                </p>
              </div>
            </section>

            <section id="quickstart" className="docs-section">
              <header className="docs-section-header">
                <h2>Quickstart</h2>
              </header>
              <div className="docs-card">
                <ol className="docs-list-numbered">
                  <li>
                    Open the app at <code className="doc-inline-code">https://quickurl.app</code>.
                  </li>
                  <li>Paste a destination URL and optionally supply a custom code.</li>
                  <li>
                    Use the generated short URL directly or call{" "}
                    <code className="doc-inline-code">GET /resolve/:code</code> before redirecting.
                  </li>
                  <li>For persistent ownership workflows, sign in and include bearer tokens in calls.</li>
                </ol>
              </div>
            </section>

            <section id="gui-guide" className="docs-section">
              <header className="docs-section-header">
                <h2>GUI Guide</h2>
              </header>
              <div className="docs-card">
                <h3>Shorten Flow</h3>
                <p>Enter a long URL, add an optional custom code, and click Generate to receive a short URL.</p>
                <h3>Resolve and Visit Flow</h3>
                <p>
                  Enter a code in the Go to a link card and click Visit. The app checks `/resolve/:code` first, then
                  navigates to `/:code`.
                </p>
                <h3>Optional Sign-In</h3>
                <p>
                  Sign-in is optional for public usage. Authenticated requests can bind ownership and support managed
                  lifecycle operations in dashboard views.
                </p>
              </div>
            </section>

            <section id="api-reference" className="docs-section">
              <header className="docs-section-header">
                <h2>API reference</h2>
              </header>
              <div className="docs-card">
                <p>
                  Public API includes <code className="doc-inline-code">POST /shorten</code> and{" "}
                  <code className="doc-inline-code">GET /resolve/:code</code>.
                </p>
                <p>
                  Redirect path behavior is user-facing at{" "}
                  <code className="doc-inline-code">https://quickurl.app/:code</code>.
                </p>
              </div>
            </section>

            <section id="api-shorten" className="docs-section">
              <header className="docs-section-header">
                <h2>/shorten</h2>
                <span className="endpoint-chip">Public</span>
              </header>
              <div className="docs-card">
                <p>Create a short code for a destination URL.</p>
                <div className="docs-kv">
                  <div>
                    <span className="label">Endpoint</span>
                    <code className="doc-inline-code">https://quickurl.app/shorten</code>
                  </div>
                  <div>
                    <span className="label">Body</span>
                    <span>
                      <code className="doc-inline-code">url</code> required,{" "}
                      <code className="doc-inline-code">custom_code</code> optional
                    </span>
                  </div>
                </div>
                <CodePanel
                  panelName="shorten"
                  value={shortenLanguage}
                  onChange={setShortenLanguage}
                  snippets={shortenSamples}
                  ariaLabel="Shorten example language"
                />
                <pre className="code-block docs-sub-block">
                  <code>{`{
  "short_code": "myCode123",
  "short_url": "https://quickurl.app/myCode123"
}`}</code>
                </pre>
              </div>
            </section>

            <section id="api-resolve" className="docs-section">
              <header className="docs-section-header">
                <h2>/resolve</h2>
                <span className="endpoint-chip">Public</span>
              </header>
              <div className="docs-card">
                <p>Resolve a short code to its destination URL without redirecting.</p>
                <div className="docs-kv">
                  <div>
                    <span className="label">Endpoint</span>
                    <code className="doc-inline-code">https://quickurl.app/resolve/&lt;code&gt;</code>
                  </div>
                  <div>
                    <span className="label">Response</span>
                    <code className="doc-inline-code">{`{ "url": "https://example.com" }`}</code>
                  </div>
                </div>
                <CodePanel
                  panelName="resolve"
                  value={resolveLanguage}
                  onChange={setResolveLanguage}
                  snippets={resolveSamples}
                  ariaLabel="Resolve example language"
                />
                <p>
                  Visiting <code className="doc-inline-code">https://quickurl.app/&lt;code&gt;</code> triggers
                  redirect handling with no-store headers.
                </p>
              </div>
            </section>

            <section id="lifecycle" className="docs-section">
              <header className="docs-section-header">
                <h2>LifeCycle</h2>
              </header>
              <div className="docs-card">
                <p>
                  Anonymous links are time-limited. Current policy is a six-hour TTL from creation for links without
                  an owner.
                </p>
                <div className="docs-note docs-warning">
                  After expiry, resolve and redirect lookups behave as not found.
                </div>
                <p>For persistent links and lifecycle control, create links while authenticated.</p>
              </div>
            </section>

            <section id="support-faq" className="docs-section">
              <header className="docs-section-header">
                <h2>Support and FAQ</h2>
              </header>
              <div className="docs-card">
                <h3>Error and status codes</h3>
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Where</th>
                      <th>Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>400</td>
                      <td>/shorten, /resolve/:code</td>
                      <td>Validation error or invalid stored URL.</td>
                    </tr>
                    <tr>
                      <td>404</td>
                      <td>/resolve/:code, /:code</td>
                      <td>Short code not found (or expired anonymous link).</td>
                    </tr>
                    <tr>
                      <td>409</td>
                      <td>/shorten</td>
                      <td>Requested custom code is already taken.</td>
                    </tr>
                    <tr>
                      <td>500</td>
                      <td>/shorten</td>
                      <td>Unexpected write or storage failure.</td>
                    </tr>
                  </tbody>
                </table>
                <div className="docs-note">
                  Input rules: URLs are normalized, non-localhost `http://` is rejected, and custom codes must be
                  2-64 alphanumeric characters and non-reserved.
                </div>
                <h3>FAQ</h3>
                <h3>Why do I get "Custom code is already taken"?</h3>
                <p>The code exists for a different URL. Use another code or omit custom_code for auto-generated IDs.</p>
                <h3>Why does a link work earlier and later return not found?</h3>
                <p>Anonymous links expire by TTL. Use authenticated ownership when you need persistence.</p>
                <h3>What causes invalid URL errors?</h3>
                <p>
                  Common causes are whitespace, missing scheme after normalization, or non-localhost{" "}
                  <code className="doc-inline-code">http://</code> URLs.
                </p>
                <h3>Do I need auth to use the public API?</h3>
                <p>No. Auth is optional and primarily used to bind ownership for management features.</p>
              </div>
            </section>
          </main>
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
