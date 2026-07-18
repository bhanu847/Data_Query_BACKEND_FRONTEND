"""
AI Document Intelligence Engine.

Transforms PDF/DOCX/TXT documents into a conversational knowledge base.
Behaves like a Senior Research Analyst — not a search engine or PDF reader.

Pipeline:
  Document -> Extraction -> Retrieval (semantic embeddings, falls back to
  keyword search without an API key) -> Intent Classification -> GenAI
  Analysis -> Structured Response (Evidence + Insights + Recommendations)
"""

import json
import re
from typing import Any

import pdfplumber
from app.config import settings
from app.services import embeddings_store


# ---------------------------------------------------------------------------
#  LLM client
# ---------------------------------------------------------------------------

def _client():
    key = settings.OPENAI_API_KEY
    if not key or not key.startswith("sk-"):
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=key, timeout=30.0, max_retries=1)
    except Exception:
        return None


# ---------------------------------------------------------------------------
#  Document Extraction
# ---------------------------------------------------------------------------

def extract_pdf_text(file_path: str) -> list[dict[str, Any]]:
    pages = []
    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            if text and text.strip():
                pages.append({"page": i, "content": text.strip()})
    return pages


def extract_docx_text(file_path: str) -> list[dict[str, Any]]:
    from docx import Document
    doc = Document(file_path)
    paragraphs = []
    for i, p in enumerate(doc.paragraphs, 1):
        if p.text.strip():
            paragraphs.append({"paragraph": i, "content": p.text.strip()})
    return paragraphs


def extract_text_file(file_path: str) -> list[dict[str, Any]]:
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    lines = content.strip().split("\n")
    return [{"line": i, "content": line} for i, line in enumerate(lines, 1) if line.strip()]


# ---------------------------------------------------------------------------
#  Keyword Search & Retrieval
# ---------------------------------------------------------------------------

def _keyword_search(pages: list[dict[str, Any]], question: str) -> list[dict[str, Any]]:
    keywords = set(re.findall(r'\b\w{3,}\b', question.lower()))
    stop_words = {"the", "and", "for", "are", "was", "were", "what", "which", "who",
                  "how", "does", "this", "that", "from", "with", "about", "can", "will",
                  "tell", "show", "give", "find", "please", "could", "would", "should"}
    keywords -= stop_words

    if not keywords:
        return pages[:5]

    scored = []
    for page in pages:
        text_lower = page["content"].lower()
        hits = sum(1 for kw in keywords if kw in text_lower)
        if hits > 0:
            scored.append((hits, page))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [p for _, p in scored[:5]] if scored else pages[:3]


# ---------------------------------------------------------------------------
#  Question Intent Classification
# ---------------------------------------------------------------------------

_QUESTION_INTENTS = [
    (r"\b(summarize|summary|overview|executive summary|tell me about|describe)\b", "summary"),
    (r"\b(compare|comparison|versus|vs\.?|differ|similarities|changes between)\b", "comparison"),
    (r"\b(explain|what does|what is|define|meaning of|clarify|in simple)\b", "explain"),
    (r"\b(risk|risks|threat|threats|danger|hazard|concern|vulnerability)\b", "risk"),
    (r"\b(should we|approve|reject|decision|recommend|pros and cons|go ahead)\b", "decision"),
    (r"\b(action items|next steps|todo|to do|tasks|deadlines|timeline|milestones)\b", "action_items"),
    (r"\b(compliance|regulatory|regulation|legal|law|requirement|mandate)\b", "compliance"),
    (r"\b(financial|cost|budget|revenue|amount|price|payment|dollar|funding)\b", "financial"),
    (r"\b(opportunity|opportunities|potential|upside|growth|advantage|benefit)\b", "opportunity"),
]


def _classify_question_intent(question: str) -> str:
    q = question.lower().strip()
    for pattern, intent in _QUESTION_INTENTS:
        if re.search(pattern, q):
            return intent
    return "general"


# ---------------------------------------------------------------------------
#  AI Document Analyst System Prompt
# ---------------------------------------------------------------------------

_DOCUMENT_ANALYST_PROMPT = """You are an AI Document Intelligence Analyst — a Senior Research Analyst, not a search engine.

Your job is to UNDERSTAND documents, not just retrieve text. You must:
1. Analyze context and identify the document's purpose
2. Understand the user's intent behind their question
3. Extract relevant evidence from the document
4. Reason over the evidence to generate insights
5. Provide actionable analysis with source citations

RESPONSE RULES:
- Always cite source pages/sections: "[Page X]" or "[Section Y]"
- Never fabricate information not present in the document
- If evidence is insufficient, explicitly state: "The document does not provide sufficient evidence for this conclusion."
- Separate facts (from document) from your analysis/interpretation
- Write like a consultant presenting findings to a client — not like a search result

Return ONLY valid JSON with this structure:
{
  "answer": "Direct, clear answer to the question (2-4 sentences)",
  "executive_summary": "Executive-level summary of findings (2-3 sentences, null if not a summary question)",
  "key_findings": ["Finding 1 with [Page X] citation", "Finding 2 with citation"],
  "risks": ["Risk identified in document with citation"],
  "opportunities": ["Opportunity identified with citation"],
  "recommendations": ["Actionable recommendation based on evidence"],
  "source_evidence": [{"page": 1, "quote": "relevant quote from document"}],
  "confidence": "High|Medium|Low",
  "confidence_reason": "Why this confidence level"
}

INTENT-SPECIFIC BEHAVIOR:

For SUMMARY questions:
- Generate executive summary, key findings, risks, opportunities, and recommendations
- Cover the entire document scope, not just one section

For COMPARISON questions:
- Identify similarities, differences, key changes, and business impact
- Use a structured comparison format

For EXPLAIN questions:
- Provide plain-English explanation with examples
- Highlight implications and recommended actions

For RISK questions:
- List each risk with severity (High/Medium/Low), likelihood, and potential impact
- Suggest mitigation strategies

For DECISION questions:
- Present pros and cons with evidence
- Give a clear recommendation with confidence level
- Flag any missing information needed for a full decision"""


# ---------------------------------------------------------------------------
#  Main Query Function
# ---------------------------------------------------------------------------

def run_text_query(file_path: str, kind: str, question: str, source_id: int | None = None) -> dict[str, Any]:
    if kind == "pdf":
        pages = extract_pdf_text(file_path)
    elif kind in ("docx", "doc"):
        pages = extract_docx_text(file_path)
    else:
        pages = extract_text_file(file_path)

    if not pages:
        return {
            "answer": "Could not extract any readable text from this document.",
            "excerpts": [],
            "source_type": kind,
            "page_count": 0,
            "total_characters": 0,
            "executive_summary": None,
            "key_findings": [],
            "risks": [],
            "opportunities": [],
            "recommendations": [],
            "confidence": "Low",
            "confidence_reason": "No text could be extracted from the document.",
            "retrieval_method": None,
        }

    full_text = "\n\n".join(p["content"] for p in pages)

    # Real RAG: embed the question + every chunk, retrieve by cosine
    # similarity. Falls back to keyword search if no API key is configured
    # or the embedding call fails for any reason (network, rate limit, etc).
    relevant = None
    if source_id is not None:
        relevant = embeddings_store.semantic_search(source_id, pages, question)
    retrieval_method = "semantic" if relevant is not None else "keyword"
    if relevant is None:
        relevant = _keyword_search(pages, question)

    intent = _classify_question_intent(question)

    client = _client()
    if client:
        result = _llm_document_analysis(client, pages, relevant, question, intent, kind)
    else:
        result = _rule_based_analysis(question, relevant, pages, intent)

    excerpts = [
        {
            "section": p.get("page", p.get("paragraph", p.get("line", 0))),
            "content": p["content"][:300],
        }
        for p in relevant[:3]
    ]

    result["excerpts"] = excerpts
    result["source_type"] = kind
    result["page_count"] = len(pages)
    result["total_characters"] = len(full_text)
    result["retrieval_method"] = retrieval_method

    return result


# ---------------------------------------------------------------------------
#  LLM-Powered Document Analysis
# ---------------------------------------------------------------------------

def _llm_document_analysis(
    client,
    all_pages: list[dict],
    relevant: list[dict],
    question: str,
    intent: str,
    kind: str,
) -> dict[str, Any]:
    context = "\n\n---\n\n".join(
        f"[Page/Section {p.get('page', p.get('paragraph', p.get('line', '?')))}]\n{p['content']}"
        for p in relevant
    )

    # For summary questions, include more context
    if intent == "summary" and len(all_pages) > len(relevant):
        extra = [p for p in all_pages if p not in relevant][:3]
        extra_text = "\n\n---\n\n".join(
            f"[Page/Section {p.get('page', p.get('paragraph', p.get('line', '?')))}]\n{p['content']}"
            for p in extra
        )
        context += f"\n\n--- Additional Context ---\n\n{extra_text}"

    user_content = (
        f"Document type: {kind.upper()}\n"
        f"Total pages/sections: {len(all_pages)}\n"
        f"Question intent: {intent}\n\n"
        f"Document content:\n\n{context}\n\n"
        f"Question: {question}"
    )

    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": _DOCUMENT_ANALYST_PROMPT},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=1500,
        )
        raw = (response.choices[0].message.content or "").strip()
        parsed = json.loads(raw)

        return {
            "answer": parsed.get("answer", ""),
            "executive_summary": parsed.get("executive_summary"),
            "key_findings": parsed.get("key_findings", []),
            "risks": parsed.get("risks", []),
            "opportunities": parsed.get("opportunities", []),
            "recommendations": parsed.get("recommendations", []),
            "confidence": parsed.get("confidence", "Medium"),
            "confidence_reason": parsed.get("confidence_reason", ""),
        }
    except Exception as exc:
        return {
            "answer": f"Document analysis encountered an error: {exc}",
            "executive_summary": None,
            "key_findings": [],
            "risks": [],
            "opportunities": [],
            "recommendations": [],
            "confidence": "Low",
            "confidence_reason": f"LLM analysis failed: {exc}",
        }


# ---------------------------------------------------------------------------
#  Rule-Based Fallback (no LLM)
# ---------------------------------------------------------------------------

def _rule_based_analysis(
    question: str,
    relevant: list[dict],
    all_pages: list[dict],
    intent: str,
) -> dict[str, Any]:
    q_lower = question.lower().strip().rstrip("?").strip()

    if not relevant:
        return {
            "answer": (
                f"The document has {len(all_pages)} pages but no content matched your question. "
                "Try asking about specific topics mentioned in the document."
            ),
            "executive_summary": None,
            "key_findings": [],
            "risks": [],
            "opportunities": [],
            "recommendations": [],
            "confidence": "Low",
            "confidence_reason": "No relevant content found matching the query.",
        }

    best = relevant[0]["content"]

    # Name extraction
    if any(w in q_lower for w in ("name", "who is", "whose", "author", "candidate", "applicant")):
        answer = _extract_name(best)
    # Contact info
    elif any(w in q_lower for w in ("email", "phone", "contact", "number", "mobile")):
        answer = _extract_contact(best, q_lower)
    # Summary / overview
    elif intent == "summary":
        answer = _extract_summary(relevant, all_pages)
    # Skills / experience / education
    elif any(w in q_lower for w in ("skill", "experience", "education", "qualification",
                                     "technology", "project", "certification")):
        answer = _extract_section(q_lower, relevant, all_pages)
    else:
        answer = _extract_general(relevant)

    # Generate rule-based findings
    key_findings = []
    all_text = "\n".join(p["content"] for p in relevant[:3])

    # Detect financial values
    money_pattern = re.findall(r'\$[\d,]+(?:\.\d{2})?|\b\d+\s*(?:million|billion|thousand)\b', all_text, re.IGNORECASE)
    if money_pattern:
        key_findings.append(f"Financial values detected: {', '.join(money_pattern[:3])}")

    # Detect dates/deadlines
    date_pattern = re.findall(r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b', all_text)
    if date_pattern:
        key_findings.append(f"Key dates found: {', '.join(date_pattern[:3])}")

    # Detect risks
    risks = []
    risk_keywords = re.findall(r'(?:risk|threat|concern|warning|caution|danger|liability|exposure)[^.]*\.', all_text, re.IGNORECASE)
    for r in risk_keywords[:2]:
        risks.append(r.strip())

    return {
        "answer": answer,
        "executive_summary": _extract_summary(relevant, all_pages) if intent == "summary" else None,
        "key_findings": key_findings,
        "risks": risks,
        "opportunities": [],
        "recommendations": [],
        "confidence": "Medium" if relevant else "Low",
        "confidence_reason": (
            f"Based on keyword matching across {len(relevant)} relevant sections. "
            "LLM-powered analysis would provide deeper insights."
        ),
    }


def _extract_name(text: str) -> str:
    for line in text.split("\n"):
        line = line.strip()
        if len(line) > 2 and not line.startswith(("#", "-", "*")) and "@" not in line:
            words = line.split()
            if 2 <= len(words) <= 5 and all(w[0].isupper() for w in words if w.isalpha()):
                return line
    parts = text.split("\n")
    return parts[0].strip() if parts else text[:100]


def _extract_contact(text: str, q_lower: str) -> str:
    for line in text.split("\n"):
        line = line.strip()
        if "@" in line and "email" in q_lower:
            emails = re.findall(r'[\w.+-]+@[\w-]+\.[\w.-]+', line)
            if emails:
                return emails[0]
        if any(w in q_lower for w in ("phone", "number", "mobile", "contact")):
            phones = re.findall(r'[\+]?[\d][\d\s\-\(\)]{6,}', line)
            if phones:
                return phones[0].strip()
    return text[:200]


def _extract_summary(relevant: list[dict], all_pages: list[dict]) -> str:
    source = relevant[:3] if relevant else all_pages[:3]
    all_text = "\n\n".join(p["content"] for p in source)
    sentences = re.split(r'[.!?\n]', all_text)
    clean = [s.strip() for s in sentences if len(s.strip()) > 25 and "@" not in s and "|" not in s]
    return ". ".join(clean[:5]) + "." if clean else all_text[:500]


def _extract_section(q_lower: str, relevant: list[dict], all_pages: list[dict]) -> str:
    section_words = [w for w in ("skill", "experience", "education", "qualification",
                                  "technology", "project", "certification", "work history")
                     if w in q_lower]
    if not section_words:
        return _extract_general(relevant)

    target = section_words[0]
    best_page = None
    for p in all_pages:
        for line in p["content"].split("\n"):
            if target in line.lower() and len(line.strip()) < 60:
                best_page = p
                break
        if best_page:
            break

    source = best_page["content"] if best_page else "\n\n".join(p["content"] for p in relevant[:3])
    lines = [l.strip() for l in source.split("\n") if l.strip() and len(l.strip()) > 3 and "@" not in l]
    return "\n".join(lines[:15])


def _extract_general(relevant: list[dict]) -> str:
    all_text = "\n\n".join(p["content"] for p in relevant[:2])
    sentences = re.split(r'[.!?\n]', all_text)
    clean = [s.strip() for s in sentences if len(s.strip()) > 15 and "@" not in s and "|" not in s]
    if clean:
        return ". ".join(clean[:5]) + "."
    return relevant[0]["content"][:600] if relevant else "No relevant content found."
