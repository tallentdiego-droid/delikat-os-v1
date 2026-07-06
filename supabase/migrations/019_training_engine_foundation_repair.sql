-- Repair training starter path items after the initial training foundation seed.
-- This only fills missing starter rows in production; it does not invent new content.

with org as (
  select '00000000-0000-4000-8000-000000000001'::uuid as organization_id
),
path_seed as (
  select id, code
  from public.os_training_paths
  where organization_id = (select organization_id from org)
    and code in ('waiter-mesero-onboarding', 'bar-onboarding')
),
required_item_lookup as (
  select id, code
  from public.os_required_knowledge_items
  where organization_id = (select organization_id from org)
    and code in ('food-safety-policy', 'opening-checklist')
),
knowledge_lookup as (
  select id, title
  from public.os_canonical_knowledge
  where title in ('Food Safety', 'Opening Checklists')
),
process_lookup as (
  select id, code
  from public.os_processes
  where organization_id = (select organization_id from org)
    and code = 'daily-opening'
),
process_step_lookup as (
  select step.id, process.code as process_code, step.sequence
  from public.os_process_steps step
  join public.os_processes process
    on process.id = step.process_id
    and process.organization_id = step.organization_id
  where process.organization_id = (select organization_id from org)
    and process.code = 'daily-opening'
    and step.sequence = 1
)
insert into public.os_training_path_items (
  organization_id,
  training_path_id,
  required_knowledge_item_id,
  knowledge_object_id,
  process_id,
  process_step_id,
  sort_order,
  item_type,
  completion_required
)
select
  org.organization_id,
  p.id,
  req.id,
  ko.id,
  proc.id,
  step.id,
  v.sort_order,
  v.item_type,
  true
from org
cross join (
  values
    ('waiter-mesero-onboarding', 'food-safety-policy', 2, 'knowledge', 'Food Safety', null::text),
    ('bar-onboarding', 'opening-checklist', 1, 'process_step', 'Opening Checklists', 'daily-opening')
) as v(path_code, required_item_code, sort_order, item_type, knowledge_title, process_code)
join path_seed p on p.code = v.path_code
join required_item_lookup req on req.code = v.required_item_code
left join knowledge_lookup ko on ko.title = v.knowledge_title
left join process_lookup proc on proc.code = v.process_code
left join process_step_lookup step on step.process_code = v.process_code and step.sequence = 1
where not exists (
  select 1
  from public.os_training_path_items existing
  where existing.training_path_id = p.id
    and existing.required_knowledge_item_id = req.id
);

