# URL Shortener Technical Documentation

## Overview
This project is a Flask-based URL shortener that generates short codes from a counter, stores mappings in MySQL, and provides both an API and a web UI for creation and redirection.

## Architecture
- **Backend**: Flask app with REST endpoints and server-rendered UI.
- **Database**: MySQL table `quickurl` for code-to-URL mapping.
- **Frontend**: Static HTML/CSS/JS served from Flask templates and static folder.

## Data Model
Table: `quickurl`
- `short_code` (TEXT, required)
- `url` (TEXT, required)

Table: `counter_state`
- `id` (INT, primary key)
- `value` (BIGINT)

Tables are created automatically on startup if they do not exist.
The counter is stored as a single row with `id = 1`, and updates use a row lock to avoid duplicate codes.

## URL Generation
1. Counter starts at `1000` (configurable via `SHORTENER_COUNTER_START`).
2. Counter value is stored in MySQL table `counter_state` and incremented atomically.
3. Counter is encoded to base62 using the alphabet:
   `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`
4. Counter increments after each code generation.
5. Generated `{short_code, url}` is persisted in MySQL.

## URL Normalization
If a user submits a URL without a scheme (e.g. `youtube.com`), the backend normalizes it to `https://youtube.com` before storing or redirecting.

## API Endpoints
### POST `/shorten`
Creates a short code.
- **Input**: JSON body `{ "url": "https://example.com" }`
- **Output**: `{ "short_code": "g8", "short_url": "http://localhost:5000/g8" }`
- **Errors**: `400` if `url` is missing or empty.

### GET `/{code}`
Redirects to the stored long URL.
- **Output**: HTTP 302 redirect.
- **Errors**: `404` if the code does not exist.

### GET `/resolve/{code}`
Validates a code and returns the destination URL.
- **Output**: `{ "url": "https://example.com" }`
- **Errors**: `404` if the code does not exist.

## Web UI
Served from `/` and built with `templates/index.html` and `static` assets.
- **Left card**: accepts a long URL and calls `/shorten`.
- **Right card**: accepts a short code, checks `/resolve/{code}`, then redirects to `/{code}`.

## CORS
Cross-origin requests are enabled only for API endpoints and can be configured via:
- `CORS_ALLOWED_ORIGINS` (comma-separated list). Defaults to `*` if not set.

## Configuration
Environment variables:
- `MYSQL_HOST` (default: `localhost`)
- `MYSQL_USER` (default: `root`)
- `MYSQL_PASSWORD` (default: empty)
- `MYSQL_DATABASE` (default: `url_shortener`)
- `MYSQL_PORT` (default: `3306`)
- `PORT` (default: `5000`)
- `SHORTENER_COUNTER_START` (default: `1000`)
- `CORS_ALLOWED_ORIGINS` (default: `*`)

## Error Handling
- Missing request body fields return `400`.
- Missing short codes return `404`.
- Database connection errors surface as server errors (improve with try/except as needed).

## Security Considerations
- No authentication or rate limiting is implemented.
- URLs are stored as provided; consider validation and allowlists if exposed publicly.
- Use restricted CORS origins in production.

## Limitations and Future Improvements
- Add uniqueness constraints on `short_code`.
- Add analytics and expiry for links.
