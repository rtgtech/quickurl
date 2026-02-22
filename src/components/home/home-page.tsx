"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AuthModal } from "@/components/home/auth-modal";
import { TopBar } from "@/components/home/topbar";
import { useAuth } from "@/components/home/auth-provider";

const HTTPS_URL_PATTERN = /^https:\/\/[^/\s]+\.[A-Za-z]{2,}(?:[/?#].*)?$/;
const CUSTOM_CODE_PATTERN = /^[0-9A-Za-z]{2,64}$/;
const RESERVED_CODES = new Set(["docs", "shorten", "resolve", "static"]);

export function HomePage() {
  const { user, signOutUser } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");

  const [longUrl, setLongUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [shortUrlMessage, setShortUrlMessage] = useState("Paste a link above");
  const [shortUrlError, setShortUrlError] = useState(false);
  const [shortUrlReady, setShortUrlReady] = useState(false);

  const [resolveCode, setResolveCode] = useState("");
  const [resolveMessage, setResolveMessage] = useState("Paste a code above");
  const [resolveError, setResolveError] = useState(false);

  const authButtonLabel = useMemo(() => (user ? "Dashboard" : "Sign In"), [user]);

  const setShortResult = (message: string, ok = true) => {
    setShortUrlMessage(message);
    setShortUrlError(!ok);
  };

  const setResolveResult = (message: string, ok = true) => {
    setResolveMessage(message);
    setResolveError(!ok);
  };

  const onShorten = async () => {
    const url = longUrl.trim();
    const normalizedCustomCode = customCode.trim();

    if (!url) {
      setShortResult("Please enter a URL.", false);
      setShortUrlReady(false);
      return;
    }

    if (!HTTPS_URL_PATTERN.test(url)) {
      setShortResult("Enter a valid URL like https://example.com", false);
      setShortUrlReady(false);
      return;
    }

    if (normalizedCustomCode) {
      if (RESERVED_CODES.has(normalizedCustomCode.toLowerCase())) {
        setShortResult("That custom code is reserved.", false);
        setShortUrlReady(false);
        return;
      }

      if (!CUSTOM_CODE_PATTERN.test(normalizedCustomCode)) {
        setShortResult("Custom code must be 2-64 characters: letters and digits only.", false);
        setShortUrlReady(false);
        return;
      }
    }

    setShortResult("Working...");
    setShortUrlReady(false);

    try {
      const payload: Record<string, string> = { url };
      if (normalizedCustomCode) {
        payload.custom_code = normalizedCustomCode;
      }

      const authToken = await user?.getIdToken();
      const response = await fetch("/shorten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setShortResult(body.error ?? "Failed to shorten", false);
        setShortUrlReady(false);
        return;
      }

      const body = (await response.json()) as { short_url: string };
      setShortResult(body.short_url);
      setShortUrlReady(true);
    } catch {
      setShortResult("Network error", false);
      setShortUrlReady(false);
    }
  };

  const onVisit = async () => {
    const code = resolveCode.trim();
    if (!code) {
      setResolveResult("Please enter a code.", false);
      return;
    }

    setResolveResult("Checking...");

    try {
      const response = await fetch(`/resolve/${encodeURIComponent(code)}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setResolveResult(body.error ?? "Code not found", false);
        return;
      }

      const body = (await response.json()) as { url: string };
      setResolveResult(`Redirecting to ${body.url}`);
      window.location.href = `/${encodeURIComponent(code)}`;
    } catch {
      setResolveResult("Network error", false);
    }
  };

  const onCopy = async () => {
    const text = shortUrlMessage.trim();
    if (!text || !shortUrlReady) {
      setShortResult("No link", false);
      window.setTimeout(() => {
        setShortResult(shortUrlMessage, !shortUrlError);
      }, 1200);
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setShortResult("Copied");
      window.setTimeout(() => {
        setShortResult(text);
      }, 1200);
    } catch {
      setShortResult("Failed", false);
      window.setTimeout(() => {
        setShortResult(text);
      }, 1200);
    }
  };

  return (
    <>
      <TopBar
        actions={
          <>
            <Link className="nav-button ghost" href="/docs">
              Docs
            </Link>
            <button
              className="nav-button primary"
              type="button"
              onClick={async () => {
                if (user) {
                  window.location.href = "/dashboard";
                } else {
                  setAuthMode("signin");
                  setAuthOpen(true);
                }
              }}
            >
              {authButtonLabel}
            </button>
            {user ? (
              <button
                className="nav-button ghost"
                type="button"
                onClick={async () => {
                  await signOutUser();
                }}
              >
                Sign Out
              </button>
            ) : null}
          </>
        }
        menuItems={
          user
            ? [
                { label: "Docs", href: "/docs" },
                { label: "Dashboard", href: "/dashboard" },
                {
                  label: "Sign Out",
                  onClick: () => {
                    void signOutUser();
                  },
                },
              ]
            : [
                { label: "Docs", href: "/docs" },
                {
                  label: "Sign Up",
                  onClick: () => {
                    setAuthMode("signin");
                    setAuthOpen(true);
                  },
                  primary: true,
                },
              ]
        }
      />

      <div className="page">
        <div className="hero">
          <div>
            <p className="kicker">QuickURL</p>
            <h1>Turn long links into short, sharp codes.</h1>
            <p className="subhead">Generate a short URL or jump to a destination using a code.</p>
          </div>
          <div className="orb" aria-hidden="true" />
        </div>

        <main className="cards">
          <section className="card">
            <h2>Make a short link</h2>
            <p className="muted">Paste a long URL and get a compact code.</p>
            <label className="field">
              <span>Long URL</span>
              <input
                id="longUrl"
                type="url"
                placeholder="https://example.com/some/long/path"
                autoComplete="off"
                pattern="https://[^/\s]+\.[A-Za-z]{2,}.*"
                title="Enter a valid URL like https://example.com"
                value={longUrl}
                onChange={(event) => setLongUrl(event.target.value)}
              />
            </label>
            <label className="field">
              <span>
                Custom code <span className="muted">(optional)</span>
              </span>
              <input
                id="customCode"
                type="text"
                placeholder="e.g. myLink123"
                autoComplete="off"
                maxLength={64}
                pattern="[0-9A-Za-z]{2,64}"
                title="2-64 characters, letters and digits only"
                value={customCode}
                onChange={(event) => setCustomCode(event.target.value)}
              />
            </label>
            <button id="shortenBtn" className="primary" type="button" onClick={onShorten}>
              Generate
            </button>
            <div className="result" id="shortResult" aria-live="polite">
              <div className="result-header">
                <span className="label">Short URL</span>
                <button id="copyBtn" className="ghost" type="button" onClick={onCopy}>
                  Copy
                </button>
              </div>
              <div id="shortUrlValue" className="value" style={{ color: shortUrlError ? "#b42318" : undefined }}>
                {shortUrlMessage}
              </div>
            </div>
          </section>

          <section className="card">
            <h2>Go to a link</h2>
            <p className="muted">Enter a code, we will take you there.</p>
            <label className="field">
              <span>Short code</span>
              <input
                id="codeInput"
                type="text"
                placeholder="e.g. g8"
                autoComplete="off"
                value={resolveCode}
                onChange={(event) => setResolveCode(event.target.value)}
              />
            </label>
            <button id="goBtn" className="secondary" type="button" onClick={onVisit}>
              Visit
            </button>
            <div className="result" id="resolveResult" aria-live="polite">
              <span className="label">Status</span>
              <div id="resolveValue" className="value" style={{ color: resolveError ? "#b42318" : undefined }}>
                {resolveMessage}
              </div>
            </div>
          </section>
        </main>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultMode={authMode} />
    </>
  );
}
