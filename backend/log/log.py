"""
Logging setup for Zap AI backend.

- Daily rotating files: logs/app.DD.MM.YY.log  (90 days kept)
- Separate error file:  logs/error.DD.MM.YY.log
- Every line carries:   request_id | tenant_id | user_id
- Console output mirrors the file format.
"""
import logging
import logging.handlers
import os
import re
from pathlib import Path

from log.context import request_id_var, tenant_id_var, user_id_var

LOGS_DIR = Path(__file__).parent.parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)

LOG_FORMAT = (
    "%(asctime)s | %(levelname)-8s | "
    "req=%(request_id)s tenant=%(tenant_id)s user=%(user_id)s | "
    "%(name)s | %(message)s"
)
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
BACKUP_COUNT = 90  # 3 months of daily files


class _ContextFilter(logging.Filter):
    """Injects request_id, tenant_id, user_id into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get("-")
        record.tenant_id = tenant_id_var.get("-")
        record.user_id = user_id_var.get("-")
        return True


class _DailyFileHandler(logging.handlers.TimedRotatingFileHandler):
    """
    Rotates at midnight. Active file: app.log
    Rotated files:       app.DD.MM.YY.log
    """

    _DATE_RE = re.compile(r"\.(\d{2}\.\d{2}\.\d{2})$")

    def __init__(self, logs_dir: Path, stem: str, level: int = logging.DEBUG) -> None:
        self._logs_dir = logs_dir
        self._stem = stem
        super().__init__(
            filename=str(logs_dir / f"{stem}.log"),
            when="midnight",
            backupCount=BACKUP_COUNT,
            encoding="utf-8",
            delay=False,
        )
        self.suffix = "%d.%m.%y"
        # extMatch must match whatever rotation_filename produces (minus the base)
        self.extMatch = re.compile(r"^\.\d{2}\.\d{2}\.\d{2}\.log$")
        self.setLevel(level)
        self.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT))
        self.addFilter(_ContextFilter())

    def rotation_filename(self, default_name: str) -> str:
        """Rename app.log.DD.MM.YY  →  app.DD.MM.YY.log"""
        m = self._DATE_RE.search(default_name)
        if m:
            return str(self._logs_dir / f"{self._stem}.{m.group(1)}.log")
        return default_name

    def getFilesToDelete(self) -> list[str]:
        """Find rotated files matching app.DD.MM.YY.log for cleanup."""
        pattern = re.compile(
            rf"^{re.escape(self._stem)}\.\d{{2}}\.\d{{2}}\.\d{{2}}\.log$"
        )
        candidates = sorted(
            str(self._logs_dir / f)
            for f in os.listdir(self._logs_dir)
            if pattern.match(f)
        )
        if len(candidates) <= self.backupCount:
            return []
        return candidates[: len(candidates) - self.backupCount]


def _console_handler() -> logging.StreamHandler:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT))
    handler.addFilter(_ContextFilter())
    return handler


def setup_logging(level: int = logging.INFO) -> None:
    """
    Call once at startup (before uvicorn starts).
    Clears any handlers uvicorn may have pre-installed so ours are authoritative.
    """
    root = logging.getLogger()
    root.handlers.clear()  # evict uvicorn's default handlers
    root.setLevel(level)

    root.addHandler(_console_handler())
    root.addHandler(_DailyFileHandler(LOGS_DIR, "app"))
    root.addHandler(_DailyFileHandler(LOGS_DIR, "error", level=logging.ERROR))

    # Quieten noisy third-party loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("asyncpg").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Convenience wrapper — use in any module: logger = get_logger(__name__)"""
    return logging.getLogger(name)
