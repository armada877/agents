import json
import os
from pathlib import Path
import re
import tempfile


MAX_RECORD = 64 * 1024
BLOCK = re.compile(r"^(?:block:)?([0-9A-Za-z-]{1,64})$")


def state_home():
    base = os.environ.get("XDG_STATE_HOME") or ""
    if not Path(base).is_absolute():
        base = Path.home() / ".local/state"
    return Path(base) / "hc"


def agents_dir():
    return state_home() / "rx" / "agents"


def block_key(block_id):
    match = BLOCK.match(block_id) if isinstance(block_id, str) else None
    return match.group(1) if match else None


def record_path(block_id):
    key = block_key(block_id)
    return agents_dir() / f"{key}.json" if key else None


def parse_record(text):
    record = json.loads(text)
    return record if isinstance(record, dict) else None


def read_record(block_id):
    path = record_path(block_id)
    if path is None:
        return None
    try:
        with path.open(encoding="utf-8") as stream:
            text = stream.read(MAX_RECORD + 1)
        if len(text) > MAX_RECORD:
            return None
        return parse_record(text)
    except (OSError, ValueError, UnicodeError, RecursionError):
        return None


def write_record(record):
    path = record_path(record.get("block_id"))
    if path is None:
        raise ValueError("record has no valid block_id")
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    handle, temporary = tempfile.mkstemp(dir=path.parent, prefix=".tmp-")
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as stream:
            json.dump(record, stream, indent=2, sort_keys=True)
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    except BaseException:
        Path(temporary).unlink(missing_ok=True)
        raise


def delete_record(block_id):
    path = record_path(block_id)
    if path is not None:
        path.unlink(missing_ok=True)


def records():
    folder = agents_dir()
    try:
        paths = sorted(folder.glob("*.json"))
    except OSError:
        return []
    found = []
    for path in paths:
        record = read_record(path.stem)
        if record and record.get("block_id"):
            found.append(record)
    return found


def label_value(block_id, name):
    record = read_record(block_id)
    labels = record.get("labels") if record else None
    value = labels.get(name) if isinstance(labels, dict) else None
    return value if isinstance(value, str) else None


def decision_pending(block_id):
    value = label_value(block_id, "decision")
    return isinstance(value, str) and bool(value.strip())
