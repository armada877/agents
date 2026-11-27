import json
import subprocess


def label_value(terminal, name):
    try:
        result = subprocess.run(["/usr/bin/hc", "get", terminal, "--json"], capture_output=True, text=True, timeout=2)
        if result.returncode:
            return None
        record = json.loads(result.stdout)
        labels = record.get("labels") if isinstance(record, dict) else None
        label = labels.get(name) if isinstance(labels, dict) else None
        return label if isinstance(label, str) else None
    except (OSError, ValueError, RecursionError, subprocess.TimeoutExpired):
        return None


def decision_pending(terminal):
    label = label_value(terminal, "decision")
    return isinstance(label, str) and bool(label.strip())
