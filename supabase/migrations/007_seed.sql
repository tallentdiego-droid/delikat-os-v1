insert into public.os_organizations (id, name, slug, status)
values ('00000000-0000-4000-8000-000000000001', 'Delikat', 'delikat', 'active')
on conflict (slug) do nothing;

insert into public.os_roles (organization_id, name, code, description, status)
values
  ('00000000-0000-4000-8000-000000000001', 'Owner', 'owner', 'Business owner and final approver.', 'active'),
  ('00000000-0000-4000-8000-000000000001', 'Administrator', 'administrator', 'System administrator for Delikat OS.', 'active'),
  ('00000000-0000-4000-8000-000000000001', 'Operations Manager', 'operations-manager', 'Manager accountable for operating standards.', 'active'),
  ('00000000-0000-4000-8000-000000000001', 'Trainer', 'trainer', 'Maintains training and certification readiness.', 'active'),
  ('00000000-0000-4000-8000-000000000001', 'Auditor', 'auditor', 'Reviews operating compliance and evidence coverage.', 'active')
on conflict (organization_id, code) do nothing;

insert into public.os_ai_agents (organization_id, name, code, purpose, status)
values (
  '00000000-0000-4000-8000-000000000001',
  'Delikat Knowledge Assistant',
  'delikat-knowledge-assistant',
  'Reads approved canonical knowledge to answer operating-system questions.',
  'active'
)
on conflict (organization_id, code) do nothing;
