# Delikat OS V1 Supabase Foundation

This directory defines the database foundation for Delikat OS V1. It is intentionally limited to Supabase configuration, migrations, row-level security, indexes, and required Delikat reference seed data.

## Project

- Supabase project ref: `favlffjwdrkveqvthhxk`
- Public schema table prefix: `os_`
- Primary keys: UUID
- Evidence model: source manuals and source sections are immutable after insert
- Knowledge model: canonical knowledge points to an approved version
- AI access model: AI-facing reads should use `public.os_ai_approved_knowledge`

## Migration Modules

1. `001_extensions.sql` enables required extensions and shared trigger functions.
2. `002_enums.sql` defines operational status, approval, audit, incident, coverage, and object type enums.
3. `003_core_tables.sql` creates tenant, operations, evidence, knowledge, training, audit, incident, AI, approval, and coverage tables.
4. `004_relationships.sql` adds cross-table constraints and `updated_at`/immutability triggers.
5. `005_indexes.sql` adds foreign-key, tenant, filtered, and workflow indexes.
6. `006_rls.sql` enables RLS and tenant membership policies.
7. `007_seed.sql` inserts required Delikat reference data only.

## Validation

Run locally before applying to any remote database:

```bash
supabase db reset
```

Do not apply these migrations to the remote Supabase project without an explicit approval step.
