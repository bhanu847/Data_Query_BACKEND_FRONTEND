"""
Runs the backend over HTTPS using the same office-addin-dev-certs certificate
that excel-addin and frontend use for local dev, so Excel Live's sign-in
dialog (which requires HTTPS end to end) can call this API without
cert/mixed-content errors in the browser.

Usage:      python run_https.py
Prereq:     npx office-addin-dev-certs install   (run once, from excel-addin/ or frontend/)
Plain HTTP: uvicorn app.main:app --reload         (fine for everything except Excel Live)
"""

import sys
from pathlib import Path

import uvicorn

CERT_DIR = Path.home() / ".office-addin-dev-certs"
CERT_FILE = CERT_DIR / "localhost.crt"
KEY_FILE = CERT_DIR / "localhost.key"

if __name__ == "__main__":
    if not CERT_FILE.exists() or not KEY_FILE.exists():
        sys.exit(
            f"Dev certificate not found at {CERT_DIR}.\n"
            "Run `npx office-addin-dev-certs install` from excel-addin/ or frontend/ first."
        )

    uvicorn.run(
        "app.main:app",
        host="localhost",
        port=8000,
        reload=True,
        ssl_certfile=str(CERT_FILE),
        ssl_keyfile=str(KEY_FILE),
    )
