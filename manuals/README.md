# Delikat OS V1 Manuals

This directory is the local staging area for the original Delikat manual files used by Sprint 3: Knowledge Import Engine.

## Required files

Place the original `.docx` manuals here before running the importer:

1. `1er Manual DELIKAT 2024 - revisado Gilles.docx` - Consideraciones preliminares
2. `2do Manual DELIKAT 2024 - revisado Gilles.docx` - Introduccion
3. `3er Manual DELIKAT 2024 - revisado Gilles.docx` - Puesta en marcha
4. `4to Manual DELIKAT 2024 - revisado Gilles JUNIO 2024 (1).docx` - Procedimientos diarios
5. `5to Manual DELIKAT 2024-revisado gilles .docx` - Personal
6. `6to Manual DELIKAT 2024 -revisado por Gilles b.docx` - Productos
7. `7mo Manual DELIKAT 2024 - revisado Gilles.docx` - Publicidad
8. `8vo Manual DELIKAT 2024 - revisado Gilles .docx` - Sistema de Punto de Ventas
9. `9no Manual DELIKAT 2024 - revisado gilles.docx` - Control de Gestion

## Rules

- Do not invent manual content.
- Do not extract SOPs in this sprint.
- Do not generate canonical processes in this sprint.
- Do not populate `os_evidence_links` in this sprint.
- Do not build embeddings in this sprint.
- Do not commit confidential `.docx` files unless explicitly approved.
- Use this directory only as a staging area for import execution.
- Imported records must preserve source evidence in `os_source_manuals` and `os_source_sections`.

## Import target

The importer writes to the existing database tables only:

- `os_source_manuals`
- `os_source_sections`

No database redesign is allowed for this sprint.

## Dry run

Run a dry run before writing to Supabase:

```bash
python3 scripts/import_manuals.py --manuals-dir manuals
```

The dry run parses all staged `.docx` files, preserves document metadata, splits manuals into logical sections, generates deterministic section keys, and computes manual and section hashes. It does not write to Supabase.

## Apply import

Only apply after reviewing the dry-run output:

```bash
SUPABASE_URL="https://favlffjwdrkveqvthhxk.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="..." \
python3 scripts/import_manuals.py --manuals-dir manuals --apply
```

The importer is idempotent against immutable evidence tables: it reuses existing rows by hash or key and inserts only missing manuals and sections. It does not update or delete existing source evidence rows.
