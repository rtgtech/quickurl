from __future__ import annotations

import os
import re
from urllib.parse import urlparse
from typing import Optional
from flask import Flask, jsonify, redirect, render_template, request
import mysql.connector
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
_allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
CORS(
    app,
    resources={
        r"/shorten": {"origins": _allowed_origins or "*"},
        r"/resolve/*": {"origins": _allowed_origins or "*"},
    },
)

ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
BASE = len(ALPHABET)

_COUNTER_ROW_ID = 1
_COUNTER_START = int(os.getenv("SHORTENER_COUNTER_START", "1000"))

_CUSTOM_CODE_PATTERN = re.compile(r"^[0-9A-Za-z]{2,64}$")
_RESERVED_CODES = {
    "docs",
    "shorten",
    "resolve",
    "static",
    "favicon.ico",
}

_LOCAL_HOSTNAMES = {"localhost", "127.0.0.1", "::1"}


def _base62_encode(num: int) -> str:
    if num == 0:
        return ALPHABET[0]
    chars = []
    while num > 0:
        num, rem = divmod(num, BASE)
        chars.append(ALPHABET[rem])
    return "".join(reversed(chars))


def _normalize_url(raw: str) -> str:
    raw = raw.strip()
    if not raw:
        return raw
    parsed = urlparse(raw)
    if parsed.scheme:
        return raw
    parsed_netloc = urlparse(f"//{raw}")
    host = parsed_netloc.hostname or ""
    if "localhost" in host or "127.0.0.1" in host:
        return f"http://{raw}"
    return f"https://{raw}"


def _validate_target_url(url: str) -> Optional[str]:
    if not url:
        return "Missing 'url' in JSON body"
    if any(ch.isspace() for ch in url):
        return "URL must not contain whitespace"

    parsed = urlparse(url)
    scheme = (parsed.scheme or "").lower()
    if scheme not in {"http", "https"}:
        return "URL must start with http:// or https://"

    hostname = parsed.hostname
    if not hostname:
        return "URL must include a hostname"

    if scheme == "http" and hostname.lower() not in _LOCAL_HOSTNAMES:
        return "Only https:// URLs are allowed"

    return None


def _get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=os.getenv("MYSQL_DATABASE", "url_shortener"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        autocommit=True,
    )


def _ensure_table():
    conn = _get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS quickurl (
                short_code VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                url TEXT NOT NULL,
                PRIMARY KEY (short_code)
            )
            """
        )
        try:
            cur.execute(
                """
                ALTER TABLE quickurl
                MODIFY short_code VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL
                """
            )
        except mysql.connector.Error as err:
            print(f"Warning: could not migrate quickurl.short_code column: {err}")
        try:
            cur.execute("ALTER TABLE quickurl ADD PRIMARY KEY (short_code)")
        except mysql.connector.Error as err:
            if getattr(err, "errno", None) != 1068:
                print(f"Warning: could not ensure quickurl primary key: {err}")

        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS counter_state (
                id INT PRIMARY KEY,
                value BIGINT NOT NULL
            )
            """
        )
        cur.execute(
            "INSERT IGNORE INTO counter_state (id, value) VALUES (%s, %s)",
            (_COUNTER_ROW_ID, _COUNTER_START),
        )
    finally:
        conn.close()


def _next_code(conn) -> str:
    original_autocommit = conn.autocommit
    conn.autocommit = False
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT value FROM counter_state WHERE id = %s FOR UPDATE",
            (_COUNTER_ROW_ID,),
        )
        row = cur.fetchone()
        if not row:
            cur.execute(
                "INSERT INTO counter_state (id, value) VALUES (%s, %s)",
                (_COUNTER_ROW_ID, _COUNTER_START),
            )
            current_value = _COUNTER_START
        else:
            current_value = int(row[0])
        code = _base62_encode(current_value)
        cur.execute(
            "UPDATE counter_state SET value = %s WHERE id = %s",
            (current_value + 1, _COUNTER_ROW_ID),
        )
        conn.commit()
        return code
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.autocommit = original_autocommit


def _validate_custom_code(raw_code: str) -> Optional[str]:
    code = raw_code.strip()
    if not code:
        return "Custom code cannot be empty"
    if code.lower() in _RESERVED_CODES:
        return "This code is reserved"
    if not _CUSTOM_CODE_PATTERN.match(code):
        return "Custom code must be 2-64 characters: letters and digits only"
    return None


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route("/docs", methods=["GET"])
def docs():
    return render_template("docs.html")


@app.route("/shorten", methods=["POST"])
def shorten():
    payload = request.get_json(silent=True) or {}
    url = payload.get("url")
    custom_code = payload.get("custom_code") or payload.get("code")
    if not url:
        return jsonify({"error": "Missing 'url' in JSON body"}), 400
    if not isinstance(url, str):
        url = str(url)
    url = _normalize_url(url)
    if not url:
        return jsonify({"error": "Missing 'url' in JSON body"}), 400
    url_error = _validate_target_url(url)
    if url_error:
        return jsonify({"error": url_error}), 400

    if custom_code is not None:
        custom_code = str(custom_code).strip()
        if not custom_code:
            custom_code = None

    conn = _get_db_connection()
    try:
        cur = conn.cursor()
        if custom_code:
            error = _validate_custom_code(custom_code)
            if error:
                return jsonify({"error": error}), 400

            cur.execute(
                "SELECT url FROM quickurl WHERE short_code = %s",
                (custom_code,),
            )
            existing = cur.fetchone()
            if existing:
                existing_url = _normalize_url(str(existing[0] or ""))
                if existing_url == url:
                    return jsonify(
                        {
                            "short_code": custom_code,
                            "short_url": request.host_url + custom_code,
                        }
                    )
                return jsonify({"error": "Custom code is already taken"}), 409

            try:
                cur.execute(
                    "INSERT INTO quickurl (short_code, url) VALUES (%s, %s)",
                    (custom_code, url),
                )
            except mysql.connector.Error as err:
                if getattr(err, "errno", None) == 1062:
                    return jsonify({"error": "Custom code is already taken"}), 409
                raise
            code = custom_code
        else:
            code = None
            last_error: Optional[Exception] = None
            for _ in range(8):
                next_code = _next_code(conn)
                try:
                    cur.execute(
                        "INSERT INTO quickurl (short_code, url) VALUES (%s, %s)",
                        (next_code, url),
                    )
                    code = next_code
                    break
                except mysql.connector.Error as err:
                    if getattr(err, "errno", None) == 1062:
                        last_error = err
                        continue
                    raise
            if not code:
                raise RuntimeError(
                    f"Failed to allocate a unique short code: {last_error}"
                )
    finally:
        conn.close()

    return jsonify({"short_code": code, "short_url": request.host_url + code})


@app.route("/<code>", methods=["GET"])
def redirect_code(code: str):
    conn = _get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT url FROM quickurl WHERE short_code = %s", (code,))
        row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        return render_template("404.html", code=code), 404

    raw_url = (row[0] or "").strip()
    target = _normalize_url(raw_url)
    target_error = _validate_target_url(target)
    if target_error:
        return jsonify({"error": "Invalid URL for this short code"}), 400
    return redirect(target, code=301)


@app.route("/resolve/<code>", methods=["GET"])
def resolve_code(code: str):
    conn = _get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT url FROM quickurl WHERE short_code = %s", (code,))
        row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        return jsonify({"error": "Short code not found"}), 404

    target = _normalize_url(str(row[0] or ""))
    target_error = _validate_target_url(target)
    if target_error:
        return jsonify({"error": "Invalid URL for this short code"}), 400
    return jsonify({"url": target})


@app.errorhandler(404)
def not_found(_error):
    wants_json = (
        request.accept_mimetypes.accept_json
        and not request.accept_mimetypes.accept_html
    )
    if wants_json:
        return jsonify({"error": "Not found"}), 404
    return render_template("not_found.html", path=request.path), 404


if __name__ == "__main__":
    _ensure_table()
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)
