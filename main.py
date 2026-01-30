from __future__ import annotations

import os
from urllib.parse import urlparse
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
                short_code TEXT NOT NULL,
                url TEXT NOT NULL
            )
            """
        )
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


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route("/shorten", methods=["POST"])
def shorten():
    payload = request.get_json(silent=True) or {}
    url = payload.get("url")
    if not url:
        return jsonify({"error": "Missing 'url' in JSON body"}), 400
    url = _normalize_url(url)
    if not url:
        return jsonify({"error": "Missing 'url' in JSON body"}), 400

    conn = _get_db_connection()
    try:
        cur = conn.cursor()
        code = _next_code(conn)
        cur.execute(
            "INSERT INTO quickurl (short_code, url) VALUES (%s, %s)",
            (code, url),
        )
        if not conn.autocommit:
            conn.commit()
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

    target = _normalize_url(row[0])
    return redirect(target, code=302)


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

    target = _normalize_url(row[0])
    return jsonify({"url": target})


if __name__ == "__main__":
    _ensure_table()
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)
