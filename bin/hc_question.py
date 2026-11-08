import re


MAX_QUESTION_BYTES = 8192


def suffix_indices(text, ignored):
    indices = [len(text)] * (len(text) + 1)
    for index in range(len(text) - 1, -1, -1):
        indices[index] = indices[index + 1] if ignored(text[index]) else index
    return indices


def direct_question(text):
    text = text[-MAX_QUESTION_BYTES:].encode("utf-8", errors="replace")[-MAX_QUESTION_BYTES:].decode("utf-8", errors="ignore")
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
    next_text = suffix_indices(text, str.isspace)
    next_answer = suffix_indices(text, lambda character: character in "*#")
    next_trailing = suffix_indices(text, lambda character: character in "*_")
    trailing_end = len(text.rstrip().rstrip("*_").rstrip())
    line_starts = [0] * (len(text) + 1)
    line_start = 0
    listed_lines = set()
    for line in text.split("\n"):
        if re.match(r"^\s*(?:[-*+]|\d+[.)])\s+", line):
            listed_lines.add(line_start)
        line_start += len(line) + 1
    line_start = 0
    for index, character in enumerate(text):
        line_starts[index] = line_start
        if character == "\n":
            line_start = index + 1
    for match in re.finditer(r"(?:\A|(?<=[.!?\n]))[^.!?\n]+\?", text):
        sentence = re.sub(r"^\s*(?:[-*+]|\d+[.)]|#{1,6})\s+", "", match.group()).strip()
        sentence = sentence.lstrip("*").strip()
        summary = re.fullmatch(r"(?:what changed|what was tested|how does it work)\?", sentence, re.IGNORECASE)
        answer_start = next_text[next_answer[next_text[match.end()]]]
        if summary and answer_start < len(text) and text[answer_start] != "?":
            continue
        if re.fullmatch(permission, sentence, re.IGNORECASE):
            return True
        if re.match(rf"(?:{addressed})[^?]*\?$", sentence, re.IGNORECASE):
            return True
        if re.match(generic, sentence, re.IGNORECASE):
            if re.search(r"\b(?:you|your)\b", sentence, re.IGNORECASE):
                return True
            line_start = line_starts[match.start()]
            listed = line_start in listed_lines
            in_report = line_start in reported_lines
            trailing_start = next_text[next_trailing[next_text[match.end()]]]
            if not listed and not in_report and trailing_start >= trailing_end:
                return True
    return False
