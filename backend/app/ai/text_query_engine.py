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
                        "provided document content. Be thorough and specific. If the document doesn't contain "
                        "enough information to answer, say so clearly. Always reference which page/section "
                        "the information comes from."
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
        if relevant:
            excerpts_text = "\n\n".join(
                f"--- Section {p.get('page', p.get('paragraph', p.get('line', '?')))} ---\n{p['content'][:500]}"
                for p in relevant
            )
            answer = (
                f"Here are the most relevant sections from your document:\n\n{excerpts_text}\n\n"
                f"(For AI-powered answers, configure your OpenAI API key.)"
            )
        else:
            answer = (
                f"The document has {len(pages)} pages/sections but I couldn't find content "
                f"matching your question. Try rephrasing or ask about specific topics in the document."
            )

    excerpts = [
        {
            "section": p.get("page", p.get("paragraph", p.get("line", 0))),
            "content": p["content"][:300],
        }
        for p in relevant
    ]

    return {
        "answer": answer,
        "excerpts": excerpts,
        "source_type": kind,
        "page_count": len(pages),
        "total_characters": len(full_text),
    }
