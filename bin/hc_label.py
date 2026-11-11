import json
import subprocess


def decision_pending(terminal):
    try:
        result = subprocess.run(["/usr/bin/hc", "get", terminal, "--json"], capture_output=True, text=True, timeout=2)
        if result.returncode:
            return False
        record = json.loads(result.stdout)
        labels = record.get("labels") if isinstance(record, dict) else None
        label = labels.get("decision") if isinstance(labels, dict) else None
        return isinstance(label, str) and bool(label.strip())
    except (OSError, ValueError, RecursionError, subprocess.TimeoutExpired):
        return False
