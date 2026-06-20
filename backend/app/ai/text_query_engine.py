"""
Query engine for text-based documents (PDF, DOCX, TXT).

Unlike the tabular query engine that operates on DataFrames with pandas,
this engine reads the raw text content and answers questions using
keyword search + optional LLM.
"""

import json
import re
from typing import Any

import pdfplumber
from app.config import settings


def _client():
    if not settings.OPENAI_API_KEY:
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=settings.OPENAI_API_KEY, timeout=15.0, max_retries=0)
    except Exception:
        return None


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


def run_text_query(file_path: str, kind: str, question: str) -> dict[str, Any]:
    if kind == "pdf":
        pages = extract_pdf_text(file_path)
    elif kind == "docx":
        pages = extract_docx_text(file_path)
    else:
        pages = extract_text_file(file_path)

    if not pages:
        return {
            "answer": "Could not extract any readable text from this document.",
            "excerpts": [],
            "source_type": kind,
            "page_count": 0,
        }

    full_text = "\n\n".join(p["content"] for p in pages)
    relevant = _keyword_search(pages, question)

    client = _client()
    if client:
        context = "\n\n---\n\n".join(
            f"[Page/Section {p.get('page', p.get('paragraph', p.get('line', '?')))}]\n{p['content']}"
            for p in relevant
        )

        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert document analyst. Answer the user's question based ONLY on the "
                        "provided document content. Be concise and direct. Give the answer first, then "
                        "supporting details if needed. Do NOT dump raw text. Do NOT repeat the question."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Document content ({len(pages)} pages/sections total):\n\n{context}\n\n"
                        f"Question: {question}"
                    ),
                },
            ],
            temperature=0.2,
            max_tokens=1000,
        )
        answer = (response.choices[0].message.content or "").strip()
    else:
        answer = _smart_extract(question, relevant, pages)

    excerpts = [
        {
            "section": p.get("page", p.get("paragraph", p.get("line", 0))),
            "content": p["content"][:300],
        }
        for p in relevant[:3]
    ]

    return {
        "answer": answer,
        "excerpts": excerpts,
        "source_type": kind,
        "page_count": len(pages),
        "total_characters": len(full_text),
    }


def _smart_extract(question: str, relevant: list[dict], all_pages: list[dict]) -> str:
    q_lower = question.lower().strip().rstrip("?").strip()

    if not relevant:
        return (
            f"The document has {len(all_pages)} pages but no content matched your question. "
            "Try asking about specific topics mentioned in the document."
        )

    best = relevant[0]["content"]

    # Name extraction
    if any(w in q_lower for w in ("name", "who is", "whose", "author", "candidate", "applicant")):
        for line in best.split("\n"):
            line = line.strip()
            if len(line) > 2 and not line.startswith(("#", "-", "*", "•")) and "@" not in line:
                words = line.split()
                if 2 <= len(words) <= 5 and all(w[0].isupper() for w in words if w.isalpha()):
                    return line
        parts = best.split("\n")
        if parts:
            return parts[0].strip()

    # Contact info
    if any(w in q_lower for w in ("email", "phone", "contact", "number", "mobile")):
        for line in best.split("\n"):
            line = line.strip()
            if "@" in line and "email" in q_lower.lower():
                emails = re.findall(r'[\w.+-]+@[\w-]+\.[\w.-]+', line)
                if emails:
                    return emails[0]
            if any(w in q_lower for w in ("phone", "number", "mobile", "contact")):
                phones = re.findall(r'[\+]?[\d][\d\s\-\(\)]{6,}', line)
                if phones:
                    return phones[0].strip()

    # Summary / overview
    if any(w in q_lower for w in ("summary", "summarize", "overview", "about", "describe", "tell me about")):
        all_text = "\n\n".join(p["content"] for p in relevant[:3])
        sentences = re.split(r'[.!?\n]', all_text)
        clean = [s.strip() for s in sentences if len(s.strip()) > 25 and "@" not in s and "|" not in s]
        return ". ".join(clean[:5]) + "." if clean else best[:500]

    # Skills / experience / education
    if any(w in q_lower for w in ("skill", "experience", "education", "qualification", "technology", "tech stack")):
        all_text = "\n\n".join(p["content"] for p in relevant[:3])
        lines = [l.strip() for l in all_text.split("\n") if l.strip() and len(l.strip()) > 5 and "@" not in l]
        return "\n".join(lines[:12])

    # Default: return the most relevant content, cleaned up
    sentences = re.split(r'[.!?\n]', best)
    clean = [s.strip() for s in sentences if len(s.strip()) > 15]
    if clean:
        return ". ".join(clean[:5]) + "."
    return best[:600]
