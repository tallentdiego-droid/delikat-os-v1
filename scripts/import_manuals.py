#!/usr/bin/env python3
"""
Delikat OS V1 — Sprint 3 Knowledge Import Engine

Imports original Delikat .docx manuals into the existing Supabase schema:
- os_source_manuals
- os_source_sections

This script intentionally does NOT extract SOPs, processes, training, coverage,
or canonical knowledge. Sprint 3 is only clean manual + section ingestion.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

try:
    from docx import Document
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "Missing dependency: python-docx. Install with: python3 -m pip install python-docx"
    ) from exc


DEFAULT_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001"

MANUAL_TITLES_BY_PREFIX = {
    "1": "Consideraciones preliminares",
    "2": "Introducción",
    "3": "Puesta en marcha",
    "4": "Procedimientos diarios",
    "5": "Personal",
    "6": "Productos",
    "7": "Publicidad",
    "8": "Sistema de Punto de Ventas",
    "9": "Control de Gestión",
}

SECTION_HEADING_RE = re.compile(
    r"^(?:(?:[IVXLCDM]+|\d+)\.\s+)?[A-ZÁÉÍÓÚÜÑ0-9][A-ZÁÉÍÓÚÜÑ0-9\s,;:#/\-–—()¿?¡!.]+$"
)
NOISE_LINES = {
    "IR AL INDICE",
    "CORRESPONDENCIA Y COMUNICACIÓN",
}


@dataclass(frozen=True)
class ManualRecord:
    path: Path
    title: str
    manual_code: str
    full_text: str
    content_hash: str
    metadata: dict[str, Any]


@dataclass(frozen=True)
class SourceSection:
    section_key: str
    heading: str
    body: str
    content_hash: str
    page_start: int | None = None
    page_end: int | None = None


def normalize_text(value: str) -> str:
    value = value.replace("\u00a0", " ")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def sha256_text(value: str) -> str:
    normalized = normalize_text(value).encode("utf-8")
    return hashlib.sha256(normalized).hexdigest()


def slugify(value: str, max_length: int = 64) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    value = re.sub(r"-{2,}", "-", value)
    return (value or "section")[:max_length].strip("-") or "section"


def manual_code_from_filename(path: Path) -> str:
    match = re.match(r"^(\d+)", path.name)
    if not match:
        return slugify(path.stem, 16).upper()
    return f"M{int(match.group(1))}"


def title_from_filename(path: Path) -> str:
    match = re.match(r"^(\d+)", path.name)
    if match and match.group(1) in MANUAL_TITLES_BY_PREFIX:
        return MANUAL_TITLES_BY_PREFIX[match.group(1)]
    return path.stem


def iter_docx_blocks(document: Document) -> Iterable[str]:
    for paragraph in document.paragraphs:
        text = normalize_text(paragraph.text)
        if text:
            yield text

    for table_index, table in enumerate(document.tables, start=1):
        rows: list[str] = []
        for row in table.rows:
            cells = [normalize_text(cell.text) for cell in row.cells]
            if any(cells):
                rows.append(" | ".join(cells))
        if rows:
            yield f"[TABLE {table_index}]\n" + "\n".join(rows)


def read_manual(path: Path) -> ManualRecord:
    document = Document(str(path))
    blocks = list(iter_docx_blocks(document))
    full_text = normalize_text("\n\n".join(blocks))
    manual_code = manual_code_from_filename(path)
    title = title_from_filename(path)

    stat = path.stat()
    metadata = {
        "original_filename": path.name,
        "manual_code": manual_code,
        "file_size_bytes": stat.st_size,
        "imported_from": "scripts/import_manuals.py",
        "docx_block_count": len(blocks),
        "captured_at_utc": datetime.now(timezone.utc).isoformat(),
    }

    return ManualRecord(
        path=path,
        title=title,
        manual_code=manual_code,
        full_text=full_text,
        content_hash=sha256_text(full_text),
        metadata=metadata,
    )


def is_heading(line: str) -> bool:
    line = normalize_text(line)
    if not line or line in NOISE_LINES:
        return False
    if line.startswith("[TABLE"):
        return False
    if len(line) > 120:
        return False
    if line.upper() != line:
        return False
    if len(line.split()) > 14:
        return False
    return bool(SECTION_HEADING_RE.match(line))


def split_sections(manual: ManualRecord) -> list[SourceSection]:
    lines = [normalize_text(line) for line in manual.full_text.splitlines()]
    sections: list[tuple[str, list[str]]] = []
    current_heading = "Documento completo"
    current_body: list[str] = []

    for line in lines:
        if not line:
            continue
        if is_heading(line) and current_body:
            sections.append((current_heading, current_body))
            current_heading = line.title()
            current_body = []
        elif is_heading(line) and not current_body:
            current_heading = line.title()
        else:
            current_body.append(line)

    if current_body:
        sections.append((current_heading, current_body))

    output: list[SourceSection] = []
    used_keys: set[str] = set()
    for index, (heading, body_lines) in enumerate(sections, start=1):
        body = normalize_text("\n".join(body_lines))
        if len(body) < 40:
            continue

        base_key = f"{manual.manual_code.lower()}-{index:03d}-{slugify(heading)}"
        section_key = base_key
        suffix = 2
        while section_key in used_keys:
            section_key = f"{base_key}-{suffix}"
            suffix += 1
        used_keys.add(section_key)

        section_hash = sha256_text(f"{manual.content_hash}\n{section_key}\n{heading}\n{body}")
        output.append(
            SourceSection(
                section_key=section_key,
                heading=heading,
                body=body,
                content_hash=section_hash,
            )
        )

    if not output:
        output.append(
            SourceSection(
                section_key=f"{manual.manual_code.lower()}-001-documento-completo",
                heading="Documento completo",
                body=manual.full_text,
                content_hash=sha256_text(f"{manual.content_hash}\ndocumento-completo\n{manual.full_text}"),
            )
        )

    return output


class SupabaseClient:
    def __init__(self, url: str, service_role_key: str) -> None:
        self.url = url.rstrip("/")
        self.service_role_key = service_role_key

    def request(self, method: str, path: str, payload: Any | None = None, query: dict[str, str] | None = None) -> Any:
        query_string = ""
        if query:
            query_string = "?" + urllib.parse.urlencode(query)
        request = urllib.request.Request(
            f"{self.url}/rest/v1/{path}{query_string}",
            method=method,
            headers={
                "apikey": self.service_role_key,
                "Authorization": f"Bearer {self.service_role_key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=representation",
            },
        )
        if payload is not None:
            request.data = json.dumps(payload).encode("utf-8")

        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Supabase API error {exc.code}: {detail}") from exc

    def upsert_source_manual(self, organization_id: str, manual: ManualRecord) -> dict[str, Any]:
        payload = {
            "organization_id": organization_id,
            "title": manual.title,
            "manual_type": "manual",
            "source_uri": f"manuals/{manual.path.name}",
            "content_hash": manual.content_hash,
            "metadata": manual.metadata,
        }
        records = self.request(
            "POST",
            "os_source_manuals",
            payload=[payload],
            query={"on_conflict": "organization_id,content_hash"},
        )
        if not records:
            raise RuntimeError(f"Manual upsert returned no record for {manual.path.name}")
        return records[0]

    def upsert_source_sections(
        self,
        organization_id: str,
        manual_id: str,
        sections: list[SourceSection],
    ) -> list[dict[str, Any]]:
        payload = [
            {
                "organization_id": organization_id,
                "manual_id": manual_id,
                "section_key": section.section_key,
                "heading": section.heading,
                "body": section.body,
                "content_hash": section.content_hash,
                "page_start": section.page_start,
                "page_end": section.page_end,
            }
            for section in sections
        ]
        if not payload:
            return []
        return self.request(
            "POST",
            "os_source_sections",
            payload=payload,
            query={"on_conflict": "manual_id,section_key"},
        )


def discover_manuals(manuals_dir: Path) -> list[Path]:
    files = sorted(manuals_dir.glob("*.docx"), key=lambda p: manual_code_from_filename(p))
    return [path for path in files if not path.name.startswith("~$")]


def main() -> int:
    parser = argparse.ArgumentParser(description="Import Delikat manuals into Supabase source tables.")
    parser.add_argument("--manuals-dir", default="manuals", help="Directory containing .docx manuals")
    parser.add_argument("--organization-id", default=os.getenv("ORGANIZATION_ID", DEFAULT_ORGANIZATION_ID))
    parser.add_argument("--dry-run", action="store_true", help="Parse and report without writing to Supabase")
    args = parser.parse_args()

    manuals_dir = Path(args.manuals_dir).resolve()
    if not manuals_dir.exists():
        raise SystemExit(f"Manuals directory does not exist: {manuals_dir}")

    manual_paths = discover_manuals(manuals_dir)
    if not manual_paths:
        raise SystemExit(f"No .docx manuals found in: {manuals_dir}")

    parsed: list[tuple[ManualRecord, list[SourceSection]]] = []
    for path in manual_paths:
        manual = read_manual(path)
        sections = split_sections(manual)
        parsed.append((manual, sections))

    summary = {
        "manual_count": len(parsed),
        "section_count": sum(len(sections) for _, sections in parsed),
        "manuals": [
            {
                "filename": manual.path.name,
                "title": manual.title,
                "manual_code": manual.manual_code,
                "content_hash": manual.content_hash,
                "sections": len(sections),
            }
            for manual, sections in parsed
        ],
    }
    print(json.dumps(summary, indent=2, ensure_ascii=False))

    if args.dry_run:
        return 0

    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_role_key:
        raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before importing.")

    client = SupabaseClient(supabase_url, service_role_key)
    for manual, sections in parsed:
        manual_record = client.upsert_source_manual(args.organization_id, manual)
        inserted_sections = client.upsert_source_sections(args.organization_id, manual_record["id"], sections)
        print(
            json.dumps(
                {
                    "imported_manual": manual.path.name,
                    "manual_id": manual_record["id"],
                    "sections_written": len(inserted_sections),
                },
                ensure_ascii=False,
            )
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
