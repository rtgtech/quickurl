# URL Shortener (Flask + MySQL)

Simple URL shortener using a base62 counter with a small web UI.

## Requirements
- Python 3.9+
- MySQL

## Setup
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Configuration
Set these environment variables as needed:
- `MYSQL_HOST` (default: `localhost`)
- `MYSQL_USER` (default: `root`)
- `MYSQL_PASSWORD` (default: empty)
- `MYSQL_DATABASE` (default: `url_shortener`)
- `MYSQL_PORT` (default: `3306`)
- `PORT` (default: `5000`)
- `SHORTENER_COUNTER_START` (default: `1000`)
- `CORS_ALLOWED_ORIGINS` (comma-separated; default: `*`)

Example (PowerShell):
```powershell
$env:MYSQL_HOST="localhost"
$env:MYSQL_USER="root"
$env:MYSQL_PASSWORD="your_password"
$env:MYSQL_DATABASE="url_shortener"
```

## Run
```powershell
python main.py
```

The app will create the `quickurl` and `counter_state` tables if they don't exist.
Open the UI at `http://localhost:5000/` (do not use `file://`).

## API
### POST /shorten
Request JSON:
```json
{"url": "https://example.com"}
```
Response JSON:
```json
{"short_code": "g8", "short_url": "http://localhost:5000/g8"}
```

### GET /{code}
Redirects to the original URL.

### GET /resolve/{code}
Returns JSON for the destination URL if the code exists.
