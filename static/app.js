const shortenBtn = document.getElementById("shortenBtn");
const goBtn = document.getElementById("goBtn");
const copyBtn = document.getElementById("copyBtn");

const longUrlInput = document.getElementById("longUrl");
const shortUrlValue = document.getElementById("shortUrlValue");

const codeInput = document.getElementById("codeInput");
const resolveValue = document.getElementById("resolveValue");

const setResult = (el, message, ok = true) => {
  el.textContent = message;
  el.style.color = ok ? "#141213" : "#b42318";
};

shortenBtn.addEventListener("click", async () => {
  const url = longUrlInput.value.trim();
  if (!url) {
    setResult(shortUrlValue, "Please enter a URL.", false);
    return;
  }

  setResult(shortUrlValue, "Working...");

  try {
    const res = await fetch("/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setResult(shortUrlValue, data.error || "Failed to shorten", false);
      return;
    }

    const data = await res.json();
    setResult(shortUrlValue, data.short_url);
  } catch (err) {
    setResult(shortUrlValue, "Network error", false);
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
  if (!text || text === "Paste a link above") {
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
