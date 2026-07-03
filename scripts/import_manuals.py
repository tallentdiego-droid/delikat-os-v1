#!/usr/bin/env python3
"""
Delikat OS V1 - Sprint 3 Knowledge Import Engine

Imports original Delikat .docx manuals into the existing Supabase source evidence
schema:
- os_source_manuals
- os_source_sections

This script intentionally does NOT extract SOPs, processes, training, coverage,
canonical knowledge, evidence links, or embeddings. Sprint 3 is only clean
manual and section ingestion.
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
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Iterable

try:
    from docx import Document
    from docx.document import Document as DocxDocument
    from docx.oxml.table import CT_Tbl
    from docx.oxml.text.paragraph import CT_P
    from docx.table import Table
    from docx.text.paragraph import Paragraph
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "Missing dependency: python-docx. Install with: python3 -m pip install python-docx"
    ) from exc


DEFAULT_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001"

EXPECTED_MANUALS = {
    "1": "Consideraciones preliminares",
    "2": "Introduccion",
    "3": "Puesta en marcha",
    "4": "Procedimientos diarios",
    "5": "Personal",
    "6": "Productos",
    "7": "Publicidad",
    "8": "Sistema de Punto de Ventas",
    "9": "Control de Gestion",
}

SECTION_HEADING_RE = re.compile(
    r"^(?:(?:[IVXLCDM]+|\d+(?:\.\d+)*)[.)]?\s+)?[A-ZÁÉÍÓÚÜÑ0-9][A-ZÁÉÍÓÚÜÑ0-9\s,;:#/\-–—()¿?¡!.]+$"
)
NUMBERED_HEADING_RE = re.compile(r"^\d+(?:\.\d+){0,4}[.)]?\s+\S+")
NOISE_LINES = {
    "IR AL INDICE",
    "IR AL ÍNDICE",
    "CORRESPONDENCIA Y COMUNICACIÓN",
    "CORRESPONDENCIA Y COMUNICACION",
}


@dataclass(frozen=True)
class DocxBlock:
    kind: str
    text: str
    style_name: str | None = None


@dataclass(frozen=True)
class ManualRecord:
    path: Path
    title: str
    manual_code: str
    full_text: str
    content_hash: str
    file_hash: str
    metadata: dict[str, Any]


@dataclass(frozen=True)
class SourceSection:
    section_key: str
    heading: str
    body: str
    content_hash: str
    page_start: int | None = None
    page_end: int | None = None


class SupabaseConflict(RuntimeError):
    pass


def json_safe(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def normalize_text(value: str) -> str:
    value = value.replace("\u00a0", " ")
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r" *\n *", "\n", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_text(value: str) -> str:
    return sha256_bytes(normalize_text(value).encode("utf-8"))


def slugify(value: str, max_length: int = 64) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    value = re.sub(r"-{2,}", "-", value)
    value = value[:max_length].strip("-")
    return value or "section"


def manual_number_from_filename(path: Path) -> str | None:
    match = re.match(r"^(\d+)", path.name)
    return match.group(1) if match else None


def manual_code_from_filename(path: Path) -> str:
    number = manual_number_from_filename(path)
    if number:
        return f"M{int(number)}"
    return slugify(path.stem, 16).upper()


def title_from_filename(path: Path, document_title: str | None = None) -> str:
    number = manual_number_from_filename(path)
    if number and number in EXPECTED_MANUALS:
        return EXPECTED_MANUALS[number]
    if document_title:
        return document_title
    return path.stem


def paragraph_text(paragraph: Paragraph) -> str:
    return normalize_text(paragraph.text)


def table_text(table: Table) -> str:
    rows: list[str] = []
    for row in table.rows:
        cells = [normalize_text(cell.text) for cell in row.cells]
        if any(cells):
            rows.append(" | ".join(cells))
    return normalize_text("\n".join(rows))


def iter_docx_blocks(document: DocxDocument) -> Iterable[DocxBlock]:
    table_index = 0
    for child in document.element.body.iterchildren():
        if isinstance(child, CT_P):
            paragraph = Paragraph(child, document)
            text = paragraph_text(paragraph)
            if text:
                style_name = paragraph.style.name if paragraph.style is not None else None
                yield DocxBlock(kind="paragraph", text=text, style_name=style_name)
        elif isinstance(child, CT_Tbl):
            table_index += 1
            table = Table(child, document)
            text = table_text(table)
            if text:
                yield DocxBlock(kind="table", text=f"[TABLE {table_index}]\n{text}")


def document_metadata(path: Path, document: DocxDocument, block_count: int) -> dict[str, Any]:
    props = document.core_properties
    stat = path.stat()
    core_properties = {
        "author": props.author,
        "category": props.category,
        "comments": props.comments,
        "content_status": props.content_status,
        "created": json_safe(props.created),
        "identifier": props.identifier,
        "keywords": props.keywords,
        "language": props.language,
        "last_modified_by": props.last_modified_by,
        "last_printed": json_safe(props.last_printed),
        "modified": json_safe(props.modified),
        "revision": props.revision,
        "subject": props.subject,
        "title": props.title,
        "version": props.version,
    }
    return {
        "original_filename": path.name,
        "relative_path": path.as_posix(),
        "manual_code": manual_code_from_filename(path),
        "file_size_bytes": stat.st_size,
        "file_modified_at_utc": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
        "docx_block_count": block_count,
        "docx_core_properties": core_properties,
        "imported_from": "scripts/import_manuals.py",
        "import_engine_version": "sprint-3-v1",
        "captured_at_utc": datetime.now(timezone.utc).isoformat(),
    }


def read_manual(path: Path, root_dir: Path) -> ManualRecord:
    document = Document(str(path))
    blocks = list(iter_docx_blocks(document))
    full_text = normalize_text("\n\n".join(block.text for block in blocks))
    if not full_text:
        raise ValueError(f"Manual has no readable text: {path}")

    metadata = document_metadata(path.relative_to(root_dir), document, len(blocks))
    file_hash = sha256_bytes(path.read_bytes())
    metadata["file_sha256"] = file_hash

    document_title = document.core_properties.title or None
    title = title_from_filename(path, document_title)
    manual_code = manual_code_from_filename(path)

    return ManualRecord(
        path=path,
        title=title,
        manual_code=manual_code,
        full_text=full_text,
        content_hash=sha256_text(full_text),
        file_hash=file_hash,
        metadata=metadata,
    )


def is_heading(block: DocxBlock) -> bool:
    line = normalize_text(block.text)
    if not line or line.upper() in NOISE_LINES:
        return False
    if block.kind == "table" or line.startswith("[TABLE"):
        return False
    if len(line) > 140:
        return False

    style_name = (block.style_name or "").lower()
    if style_name.startswith("heading") or style_name.startswith("titulo") or style_name.startswith("título"):
        return True

    if NUMBERED_HEADING_RE.match(line) and len(line.split()) <= 18:
        return True

    if line.upper() == line and len(line.split()) <= 16:
        return bool(SECTION_HEADING_RE.match(line))

    return False


def split_sections_from_blocks(manual: ManualRecord, blocks: list[DocxBlock]) -> list[SourceSection]:
    sections: list[tuple[str, list[str]]] = []
    current_heading = manual.title
    current_body: list[str] = []

    for block in blocks:
        text = normalize_text(block.text)
        if not text:
            continue
        if is_heading(block):
            if current_body:
                sections.append((current_heading, current_body))
            current_heading = text.title() if text.upper() == text else text
            current_body = []
            continue
        current_body.append(text)

    if current_body:
        sections.append((current_heading, current_body))

    output: list[SourceSection] = []
    used_keys: set[str] = set()
    for index, (heading, body_lines) in enumerate(sections, start=1):
        body = normalize_text("\n\n".join(body_lines))
        if len(body) < 40:
            continue

        base_key = f"{manual.manual_code.lower()}-{index:03d}-{slugify(heading)}"
        section_key = base_key
        suffix = 2
        while section_key in used_keys:
            section_key = f"{base_key}-{suffix}"
            suffix += 1
        used_keys.add(section_key)

        section_hash = sha256_text(
            "\n\n".join([manual.content_hash, section_key, heading, body])
        )
        output.append(
            SourceSection(
                section_key=section_key,
                heading=heading,
                body=body,
                content_hash=section_hash,
            )
        )

    if output:
        return output

    return [
        SourceSection(
            section_key=f"{manual.manual_code.lower()}-001-documento-completo",
            heading="Documento completo",
            body=manual.full_text,
            content_hash=sha256_text(
                "\n\n".join([manual.content_hash, "documento-completo", manual.full_text])
            ),
        )
    ]


def split_sections(manual: ManualRecord) -> list[SourceSection]:
    document = Document(str(manual.path))
    return split_sections_from_blocks(manual, list(iter_docx_blocks(document)))


class SupabaseClient:
    def __init__(self, url: str, service_role_key: str) -> None:
        self.url = url.rstrip("/")
        self.service_role_key = service_role_key

    def request(self, method: str, path: str, payload: Any | None = None) -> Any:
        request = urllib.request.Request(
            f"{self.url}/rest/v1/{path}",
            method=method,
            headers={
                "apikey": self.service_role_key,
                "Authorization": f"Bearer {self.service_role_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
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
            if exc.code == 409:
                raise SupabaseConflict(detail) from exc
            raise RuntimeError(f"Supabase API error {exc.code}: {detail}") from exc

    def select_one(self, table: str, filters: dict[str, str], columns: str = "*") -> dict[str, Any] | None:
        query = {"select": columns, "limit": "1"}
        for key, value in filters.items():
            query[key] = f"eq.{value}"
        records = self.request("GET", f"{table}?{urllib.parse.urlencode(query)}")
        if not records:
            return None
        return records[0]

    def insert_one(self, table: str, payload: dict[str, Any]) -> dict[str, Any]:
        records = self.request("POST", table, payload=payload)
        if not records:
            raise RuntimeError(f"Insert returned no record for {table}")
        return records[0]

    def get_or_insert_source_manual(self, organization_id: str, manual: ManualRecord) -> tuple[dict[str, Any], bool]:
        existing = self.select_one(
            "os_source_manuals",
            {"organization_id": organization_id, "content_hash": manual.content_hash},
            columns="id,organization_id,content_hash,title",
        )
        if existing:
            return existing, False

        payload = {
            "organization_id": organization_id,
            "title": manual.title,
            "manual_type": "manual",
            "source_uri": f"manuals/{manual.path.name}",
            "content_hash": manual.content_hash,
            "metadata": manual.metadata,
        }
        try:
            return self.insert_one("os_source_manuals", payload), True
        except SupabaseConflict:
            existing = self.select_one(
                "os_source_manuals",
                {"organization_id": organization_id, "content_hash": manual.content_hash},
                columns="id,organization_id,content_hash,title",
            )
            if existing:
                return existing, False
            raise

    def get_or_insert_source_section(
        self,
        organization_id: str,
        manual_id: str,
        section: SourceSection,
    ) -> tuple[dict[str, Any], bool]:
        existing = self.select_one(
            "os_source_sections",
            {"manual_id": manual_id, "section_key": section.section_key},
            columns="id,manual_id,section_key,content_hash",
        )
        if existing:
            return existing, False

        existing_by_hash = self.select_one(
            "os_source_sections",
            {"organization_id": organization_id, "content_hash": section.content_hash},
            columns="id,manual_id,section_key,content_hash",
        )
        if existing_by_hash:
            return existing_by_hash, False

        payload = {
            "organization_id": organization_id,
            "manual_id": manual_id,
            "section_key": section.section_key,
            "heading": section.heading,
            "body": section.body,
            "content_hash": section.content_hash,
            "page_start": section.page_start,
            "page_end": section.page_end,
        }
        try:
            return self.insert_one("os_source_sections", payload), True
        except SupabaseConflict:
            existing = self.select_one(
                "os_source_sections",
                {"manual_id": manual_id, "section_key": section.section_key},
                columns="id,manual_id,section_key,content_hash",
            )
            if existing:
                return existing, False
            existing_by_hash = self.select_one(
                "os_source_sections",
                {"organization_id": organization_id, "content_hash": section.content_hash},
                columns="id,manual_id,section_key,content_hash",
            )
            if existing_by_hash:
                return existing_by_hash, False
            raise


def discover_manuals(manuals_dir: Path) -> list[Path]:
    files = sorted(
        manuals_dir.rglob("*.docx"),
        key=lambda path: (manual_code_from_filename(path), path.as_posix().lower()),
    )
    return [path for path in files if not path.name.startswith("~$")]


def parse_manuals(manuals_dir: Path) -> list[tuple[ManualRecord, list[SourceSection]]]:
    manual_paths = discover_manuals(manuals_dir)
    if not manual_paths:
        raise SystemExit(f"No .docx manuals found in: {manuals_dir}")

    parsed: list[tuple[ManualRecord, list[SourceSection]]] = []
    for path in manual_paths:
        manual = read_manual(path, manuals_dir)
        sections = split_sections(manual)
        parsed.append((manual, sections))
    return parsed


def build_summary(parsed: list[tuple[ManualRecord, list[SourceSection]]], dry_run: bool) -> dict[str, Any]:
    return {
        "dry_run": dry_run,
        "manual_count": len(parsed),
        "section_count": sum(len(sections) for _, sections in parsed),
        "manuals": [
            {
                "filename": manual.path.name,
                "title": manual.title,
                "manual_code": manual.manual_code,
                "content_hash": manual.content_hash,
                "file_sha256": manual.file_hash,
                "sections": len(sections),
            }
            for manual, sections in parsed
        ],
    }


def import_manuals(
    client: SupabaseClient,
    organization_id: str,
    parsed: list[tuple[ManualRecord, list[SourceSection]]],
) -> dict[str, Any]:
    result = {
        "manuals_seen": len(parsed),
        "manuals_inserted": 0,
        "manuals_existing": 0,
        "sections_seen": 0,
        "sections_inserted": 0,
        "sections_existing": 0,
        "manuals": [],
    }

    for manual, sections in parsed:
        manual_record, manual_inserted = client.get_or_insert_source_manual(organization_id, manual)
        result["manuals_inserted" if manual_inserted else "manuals_existing"] += 1
        section_result = {"inserted": 0, "existing": 0}

        for section in sections:
            result["sections_seen"] += 1
            _, section_inserted = client.get_or_insert_source_section(
                organization_id,
                manual_record["id"],
                section,
            )
            key = "inserted" if section_inserted else "existing"
            section_result[key] += 1
            result["sections_inserted" if section_inserted else "sections_existing"] += 1

        result["manuals"].append(
            {
                "filename": manual.path.name,
                "manual_id": manual_record["id"],
                "inserted": manual_inserted,
                "sections": section_result,
            }
        )

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Import Delikat manuals into Supabase source tables.")
    parser.add_argument("--manuals-dir", default="manuals", help="Directory containing original .docx manuals")
    parser.add_argument("--organization-id", default=os.getenv("ORGANIZATION_ID", DEFAULT_ORGANIZATION_ID))
    parser.add_argument("--apply", action="store_true", help="Write parsed manuals and sections to Supabase")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON only")
    args = parser.parse_args()

    manuals_dir = Path(args.manuals_dir).resolve()
    if not manuals_dir.exists():
        raise SystemExit(f"Manuals directory does not exist: {manuals_dir}")

    parsed = parse_manuals(manuals_dir)
    summary = build_summary(parsed, dry_run=not args.apply)

    if not args.apply:
        print(json.dumps(summary, indent=2, ensure_ascii=False))
        return 0

    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_role_key:
        raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before importing.")

    client = SupabaseClient(supabase_url, service_role_key)
    import_result = import_manuals(client, args.organization_id, parsed)
    output = {**summary, "import": import_result}
    print(json.dumps(output, indent=None if args.json else 2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
