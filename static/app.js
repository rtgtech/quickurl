const shortenBtn = document.getElementById("shortenBtn");
const goBtn = document.getElementById("goBtn");
const copyBtn = document.getElementById("copyBtn");
const logoLink = document.querySelector(".logo");

const longUrlInput = document.getElementById("longUrl");
const customCodeInput = document.getElementById("customCode");
const shortUrlValue = document.getElementById("shortUrlValue");

const codeInput = document.getElementById("codeInput");
const resolveValue = document.getElementById("resolveValue");

const httpsUrlPattern = /^https:\/\/[^/\s]+\.[A-Za-z]{2,}(?:[/?#].*)?$/;
const customCodePattern = /^[0-9A-Za-z]{2,64}$/;
const reservedCodes = new Set(["docs", "shorten", "resolve", "static"]);
let isShortUrlReady = false;

const setResult = (el, message, ok = true) => {
  el.textContent = message;
  el.style.color = ok ? "#141213" : "#b42318";
};

shortenBtn.addEventListener("click", async () => {
  const url = longUrlInput.value.trim();
  const customCode = customCodeInput ? customCodeInput.value.trim() : "";
  if (!url) {
    setResult(shortUrlValue, "Please enter a URL.", false);
    isShortUrlReady = false;
    return;
  }
  if (!httpsUrlPattern.test(url)) {
    setResult(
      shortUrlValue,
      "Enter a valid URL like https://example.com",
      false
    );
    isShortUrlReady = false;
    return;
  }

  if (customCode) {
    if (reservedCodes.has(customCode.toLowerCase())) {
      setResult(shortUrlValue, "That custom code is reserved.", false);
      isShortUrlReady = false;
      return;
    }
    if (!customCodePattern.test(customCode)) {
      setResult(
        shortUrlValue,
        "Custom code must be 2-64 characters: letters and digits only.",
        false
      );
      isShortUrlReady = false;
      return;
    }
  }

  setResult(shortUrlValue, "Working...");
  isShortUrlReady = false;

  try {
    const payload = { url };
    if (customCode) {
      payload.custom_code = customCode;
    }
    const res = await fetch("/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setResult(shortUrlValue, data.error || "Failed to shorten", false);
      isShortUrlReady = false;
      return;
    }

    const data = await res.json();
    setResult(shortUrlValue, data.short_url);
    isShortUrlReady = true;
  } catch (err) {
    setResult(shortUrlValue, "Network error", false);
    isShortUrlReady = false;
  }
});

goBtn.addEventListener("click", async () => {
  const code = codeInput.value.trim();
  if (!code) {
    setResult(resolveValue, "Please enter a code.", false);
    return;
  }

  setResult(resolveValue, "Checking...");

  try {
    const res = await fetch(`/resolve/${encodeURIComponent(code)}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setResult(resolveValue, data.error || "Code not found", false);
      return;
    }

    const data = await res.json();
    setResult(resolveValue, `Redirecting to ${data.url}`);
    window.location.href = `/${encodeURIComponent(code)}`;
  } catch (err) {
    setResult(resolveValue, "Network error", false);
  }
});

copyBtn.addEventListener("click", async () => {
  const text = shortUrlValue.textContent.trim();
  if (!text || !isShortUrlReady) {
    copyBtn.textContent = "No link";
    setTimeout(() => {
      copyBtn.textContent = "Copy";
    }, 1200);
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = "Copied";
  } catch (err) {
    copyBtn.textContent = "Failed";
  } finally {
    setTimeout(() => {
      copyBtn.textContent = "Copy";
    }, 1500);
  }
});

if (logoLink) {
  logoLink.addEventListener("click", (event) => {
    if (window.location.pathname === "/") {
      event.preventDefault();
    }
  });
}

const menu = document.querySelector(".topbar-menu");
const menuTrigger = document.querySelector(".menu-trigger");
if (menu && menuTrigger) {
  const menuPanel = menu.querySelector(".menu-panel");
  const menuItems = menuPanel
    ? menuPanel.querySelectorAll("a, button, [role='menuitem']")
    : [];

  const setMenuOpen = (open) => {
    menu.classList.toggle("open", open);
    menuTrigger.setAttribute("aria-expanded", String(open));
    if (menuPanel) {
      menuPanel.setAttribute("aria-hidden", String(!open));
    }
    menuItems.forEach((item) => {
      if (open) {
        item.removeAttribute("tabindex");
      } else {
        item.setAttribute("tabindex", "-1");
      }
    });
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  menuTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = !menu.classList.contains("open");
    setMenuOpen(isOpen);
  });

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      menuTrigger.focus();
    }
  });

  setMenuOpen(menu.classList.contains("open"));
}
