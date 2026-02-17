"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthModal } from "@/components/home/auth-modal";
import { TopBar } from "@/components/home/topbar";
import { useAuth } from "@/components/home/auth-provider";
import type { LinkDocument } from "@/lib/types";

interface ApiLinkListResponse {
  links: LinkDocument[];
}

export function DashboardClient() {
  const { user, getIdToken, signOutUser, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [links, setLinks] = useState<LinkDocument[]>([]);
  const [message, setMessage] = useState("Sign in to manage your links.");
  const [isError, setIsError] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const statusLabel = useMemo(() => (isError ? "Error" : "Status"), [isError]);

  const loadLinks = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setLinks([]);
      setMessage("Sign in to manage your links.");
      setIsError(false);
      return;
    }

    setMessage("Loading your links...");
    setIsError(false);

    const response = await fetch("/api/my-links", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setLinks([]);
      setMessage(body.error ?? "Failed to load links");
      setIsError(true);
      return;
    }

    const body = (await response.json()) as ApiLinkListResponse;
    setLinks(body.links);
    setMessage(`Loaded ${body.links.length} link${body.links.length === 1 ? "" : "s"}.`);
    setIsError(false);
  }, [getIdToken]);

  useEffect(() => {
    if (loading) {
      return;
    }

    void loadLinks();
  }, [user, loading, loadLinks]);

  const onUpdate = async (code: string, nextUrl: string) => {
    const token = await getIdToken();
    if (!token) {
      setMessage("Authentication required.");
      setIsError(true);
      return;
    }

    setBusyCode(code);
    const response = await fetch(`/api/my-links/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url: nextUrl }),
    });
    setBusyCode(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(body.error ?? "Failed to update link");
      setIsError(true);
      return;
    }

    setMessage("Link updated.");
    setIsError(false);
    await loadLinks();
  };

  const onDelete = async (code: string) => {
    const token = await getIdToken();
    if (!token) {
      setMessage("Authentication required.");
      setIsError(true);
      return;
    }

    setBusyCode(code);
    const response = await fetch(`/api/my-links/${encodeURIComponent(code)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setBusyCode(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(body.error ?? "Failed to delete link");
      setIsError(true);
      return;
    }

    setMessage("Link deleted.");
    setIsError(false);
    await loadLinks();
  };

  return (
    <>
      <TopBar
        actions={
          <>
            <Link className="nav-button ghost" href="/docs">
              Docs
            </Link>
            <Link className="nav-button ghost" href="/">
              Home
            </Link>
            {!user ? (
              <button className="nav-button primary" type="button" onClick={() => setAuthOpen(true)}>
                Sign Up
              </button>
            ) : (
              <button
                className="nav-button primary"
                type="button"
                onClick={async () => {
                  await signOutUser();
                }}
              >
                Sign Out
              </button>
            )}
          </>
        }
        menuItems={
          user
            ? [
                { label: "Docs", href: "/docs" },
                { label: "Home", href: "/" },
                { label: "Sign Out", onClick: () => void signOutUser(), primary: true },
              ]
            : [
                { label: "Docs", href: "/docs" },
                { label: "Home", href: "/" },
                { label: "Sign Up", onClick: () => setAuthOpen(true), primary: true },
              ]
        }
      />

      <div className="page">
        <header className="hero">
          <div>
            <p className="kicker">Dashboard</p>
            <h1>Manage your links.</h1>
            <p className="subhead">Signed-in users can list, update, and delete only links they own.</p>
          </div>
          <div className="orb" aria-hidden="true" />
        </header>

        <main className="cards">
          <section className="card dashboard-grid">
            <div className="dashboard-toolbar">
              <h2>My links</h2>
              {user ? (
                <button className="ghost" type="button" onClick={() => void loadLinks()}>
                  Refresh
                </button>
              ) : null}
            </div>

            {!user ? (
              <p className="muted">Sign in from the top bar to load your owned links.</p>
            ) : links.length === 0 ? (
              <p className="muted">No links found for this account yet.</p>
            ) : (
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Destination</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((link) => (
                    <DashboardRow
                      key={link.shortCode}
                      link={link}
                      busy={busyCode === link.shortCode}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                    />
                  ))}
                </tbody>
              </table>
            )}

            <div className="result" aria-live="polite">
              <span className="label">{statusLabel}</span>
              <div className="value" style={{ color: isError ? "#b42318" : undefined }}>
                {message}
              </div>
            </div>
          </section>
        </main>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

function DashboardRow({
  link,
  busy,
  onUpdate,
  onDelete,
}: {
  link: LinkDocument;
  busy: boolean;
  onUpdate: (code: string, nextUrl: string) => Promise<void>;
  onDelete: (code: string) => Promise<void>;
}) {
  const [editableUrl, setEditableUrl] = useState(link.url);

  useEffect(() => {
    setEditableUrl(link.url);
  }, [link.url]);

  return (
    <tr>
      <td>
        <strong>{link.shortCode}</strong>
      </td>
      <td>
        <input
          type="url"
          value={editableUrl}
          onChange={(event) => setEditableUrl(event.target.value)}
          aria-label={`URL for ${link.shortCode}`}
        />
      </td>
      <td>{new Date(link.createdAt).toLocaleString()}</td>
      <td>
        <div className="inline-actions">
          <button
            className="secondary"
            type="button"
            disabled={busy}
            onClick={() => void onUpdate(link.shortCode, editableUrl)}
          >
            {busy ? "Working..." : "Update"}
          </button>
          <button
            className="danger"
            type="button"
            disabled={busy}
            onClick={() => void onDelete(link.shortCode)}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
