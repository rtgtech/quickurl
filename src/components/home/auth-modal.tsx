"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import {
  getFirebaseClientAuth,
  getGoogleProvider,
  isFirebaseClientConfigured,
} from "@/lib/firebase/client";
import { useAuth } from "@/components/home/auth-provider";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: "signup" | "signin";
  onAuthenticated?: () => void;
}

export function AuthModal({
  open,
  onClose,
  defaultMode = "signup",
  onAuthenticated,
}: AuthModalProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"signup" | "signin">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const authEnabled = isFirebaseClientConfigured();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const title = useMemo(() => (mode === "signup" ? "Create account" : "Sign in"), [mode]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setMode(defaultMode);

    // Focus the first actionable field when the modal opens for keyboard users.
    if (!user) {
      window.setTimeout(() => {
        emailInputRef.current?.focus();
        emailInputRef.current?.select();
      }, 0);
    }
  }, [defaultMode, open, user]);

  if (!open) {
    return null;
  }

  const showErrorDialog = (nextMessage: string) => {
    setDialogMessage(nextMessage);
  };

  const getErrorMessage = (error: unknown): string => {
    const code = (error as { code?: string })?.code ?? "";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
      return "Invalid email or password.";
    }
    if (code === "auth/email-already-in-use") {
      return "An account with this email already exists.";
    }
    if (code === "auth/invalid-email") {
      return "Please enter a valid email address.";
    }
    if (code === "auth/weak-password") {
      return "Password must be at least 6 characters.";
    }
    if (code === "auth/popup-closed-by-user") {
      return "Google sign-in was cancelled.";
    }
    return (error as Error).message ?? "Authentication failed.";
  };

  const submitEmail = async () => {
    if (!authEnabled) {
      showErrorDialog("Firebase client configuration is missing.");
      return;
    }

    if (!email.trim() || !password.trim()) {
      showErrorDialog("Email and password are required.");
      return;
    }

    setBusy(true);
    try {
      const auth = getFirebaseClientAuth();
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      onAuthenticated?.();
      onClose();
    } catch (error) {
      showErrorDialog(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const submitGoogle = async () => {
    if (!authEnabled) {
      showErrorDialog("Firebase client configuration is missing.");
      return;
    }

    setBusy(true);
    try {
      await signInWithPopup(getFirebaseClientAuth(), getGoogleProvider());
      onAuthenticated?.();
      onClose();
    } catch (error) {
      showErrorDialog(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-modal-backdrop" role="dialog" aria-modal="true" aria-label="Authentication">
      <div className="auth-modal">
        <div>
          <p className="kicker">QuickURL</p>
          <h2>{user ? "Account" : title}</h2>
          <p className="muted">{user ? "You are already signed in." : "Email/Password and Google are supported."}</p>
        </div>

        {!user ? (
          <>
            <label className="auth-row">
              <span>Email</span>
              <input
                id="auth-email"
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    passwordInputRef.current?.focus();
                  }
                }}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
              />
            </label>
            <label className="auth-row">
              <span>Password</span>
              <input
                id="auth-password"
                ref={passwordInputRef}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void submitEmail();
                  }
                }}
                placeholder="At least 6 characters"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </label>
            {mode === "signin" ? (
              <p className="auth-switch">
                Don&apos;t have an account?{" "}
                <button type="button" onClick={() => setMode("signup")}>
                  Sign Up
                </button>
              </p>
            ) : null}
            <div className="auth-actions">
              <button type="button" className="primary" onClick={submitEmail} disabled={busy || !authEnabled}>
                {busy ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
              </button>
              <button type="button" className="secondary" onClick={submitGoogle} disabled={busy || !authEnabled}>
                Continue with Google
              </button>
            </div>
            {mode === "signup" ? (
              <p className="auth-switch">
                Already have an account?{" "}
                <button type="button" onClick={() => setMode("signin")}>
                  Sign In
                </button>
              </p>
            ) : null}
          </>
        ) : null}

        <button type="button" className="ghost" onClick={onClose}>
          Close
        </button>
      </div>

      {dialogMessage ? (
        <div className="auth-modal-backdrop" role="alertdialog" aria-modal="true" aria-label="Authentication error">
          <div className="auth-modal">
            <div>
              <p className="kicker">QuickURL</p>
              <h2>Authentication issue</h2>
              <p className="muted">{dialogMessage}</p>
            </div>
            <button type="button" className="primary" onClick={() => setDialogMessage(null)}>
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
