# LEGACY Branch (Flask Baseline)

This branch preserves the original Flask + MySQL implementation of QuickURL as an archived baseline.

## Purpose 
  - Keep a stable snapshot of the pre-Next.js architecture.
  - Provide rollback/reference history during and after migration. 
  - Support audits, comparisons, and migration troubleshooting.

## Status
  - Archived
  - Maintenance mode only
  - No new features planned

## Stack(Legacy)
  - Flask (Python)
  - MySQL
  - Server-rendered templates (`templates/`)
  - Static assets (`static/`)
  - Entry point: `main.py`

## Legacy API Shape
  - `POST /shorten`
  - `GET /<code>` (redirect)
  - `GET /resolve/<code>`

## Branch Policy                                                         
  - Do not develop new product functionality here.
  - Only allow critical fixes if absolutely required for historical recovery.
  - All active development continues on the Next.js/Firebase codebase (`main` after refactor merge).

  ## Migration Note                           
  The canonical implementation has moved to Next.js + Firebase.
  This branch is retained only as a historical snapshot and fallback reference.