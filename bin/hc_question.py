import re


def direct_question(text):
    text = re.sub(r"```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)", "", text)
    text = re.sub(r"`[^`]*`|\"[^\"]*\"|“[^”]*”|‘[^’]*’", "", text)
    text = re.sub(r"(?<!\w)'[^'\n]*'(?!\w)", "", text)
    text = re.sub(r"(?m)^\s*>.*$", "", text)
    addressed = r"(?:can|could|would|will|do|did|are|have) you\b|(?:should|shall|may|can) I\b"
    generic = r"(?:which|what|how|where|when)\b"
    permission = r"(?:is that okay|is it okay if I\b[^?]*|does that work for you|do I have your approval)\?"
    reported_lines = set()
    reported = False
    offset = 0
    for line in text.splitlines(keepends=True):
        heading = re.sub(r"^\s*#{1,6}\s+", "", line).strip().strip("*")
        if not heading:
            reported = False
        elif re.search(r"(?:research questions|reported questions|questions (?:from|for) .+|.+ (?:asked|asks)):\s*$", heading, re.IGNORECASE):
            reported = True
        elif re.match(r"^\s*#{1,6}\s+", line):
            reported = False
        if reported:
            reported_lines.add(offset)
        offset += len(line)
    for match in re.finditer(r"[^.!?\n]+\?", text):
        sentence = re.sub(r"^\s*(?:[-*+]|\d+[.)]|#{1,6})\s+", "", match.group()).strip()
        sentence = sentence.lstrip("*").strip()
        summary = re.fullmatch(r"(?:what changed|what was tested|how does it work)\?", sentence, re.IGNORECASE)
        answer = text[match.end():].strip().lstrip("*#").strip()
        if summary and answer and not answer.startswith("?"):
            continue
        if re.fullmatch(permission, sentence, re.IGNORECASE):
            return True
        if re.match(rf"(?:{addressed})[^?]*\?$", sentence, re.IGNORECASE):
            return True
        if re.match(generic, sentence, re.IGNORECASE):
            if re.search(r"\b(?:you|your)\b", sentence, re.IGNORECASE):
                return True
            line_start = text.rfind("\n", 0, match.start()) + 1
            line = text[line_start:match.end()]
            listed = re.match(r"^\s*(?:[-*+]|\d+[.)])\s+", line)
            in_report = line_start in reported_lines
            trailing = text[match.end():].strip().strip("*_").strip()
            if not listed and not in_report and not trailing:
                return True
    return False
