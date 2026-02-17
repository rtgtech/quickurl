"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface TopBarMenuItem {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
}

interface TopBarProps {
  logoSuffix?: string;
  menuItems: TopBarMenuItem[];
  actions: React.ReactNode;
}

export function TopBar({ logoSuffix, menuItems, actions }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("click", onDocumentClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link className="logo" href="/">
          QuickURL
          {logoSuffix ? <span className="logo-docs">{logoSuffix}</span> : null}
        </Link>
        <div className="topbar-right">
          <div className="topbar-actions">{actions}</div>
          <div className={`topbar-menu${menuOpen ? " open" : ""}`} ref={menuRef}>
            <button
              className="ghost menu-trigger"
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls="topbar-menu"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
            >
              Menu
            </button>
            <div className="menu-panel" id="topbar-menu" role="menu" aria-hidden={!menuOpen}>
              {menuItems.map((item) => {
                const className = `menu-item${item.primary ? " primary" : ""}`;
                if (item.href) {
                  return (
                    <Link key={item.label} className={className} href={item.href} role="menuitem">
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.label}
                    className={className}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      item.onClick?.();
                      setMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
