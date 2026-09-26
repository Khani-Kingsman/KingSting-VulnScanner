import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
REPORTS_DIR = DATA_DIR / "reports"
DB_PATH = DATA_DIR / "kingsting_audit.db"

# Ensure runtime directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

APP_TITLE = "KING STING VULNScanner"
APP_VERSION = "1.0.0-phase1"
API_HOST = "0.0.0.0"
API_PORT = 8765
