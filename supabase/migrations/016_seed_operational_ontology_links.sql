-- Seed starter ontology links for Delikat OS.
-- These are conservative cross-links from imported canonical knowledge to the
-- first operational taxonomy. No manual content is changed.

with org as (
  select '00000000-0000-4000-8000-000000000001'::uuid as organization_id
),
department_seed as (
  select id, code, name
  from public.os_departments
  where organization_id = (select organization_id from org)
),
role_seed as (
  select id, code, name
  from public.os_roles
  where organization_id = (select organization_id from org)
),
area_seed as (
  select id, code, name
  from public.os_areas
  where organization_id = (select organization_id from org)
),
equipment_seed as (
  select id, code, name
  from public.os_equipment
  where organization_id = (select organization_id from org)
),
business_process_seed as (
  select id, code, name
  from public.os_business_processes
  where organization_id = (select organization_id from org)
),
document_type_seed as (
  select id, code, name
  from public.os_document_types
  where organization_id = (select organization_id from org)
),
knowledge_lookup as (
  select id, title
  from public.os_canonical_knowledge
  where title in (
    'Food Safety',
    'Service Standards',
    'Bar Cleaning',
    'POS Platform',
    'Kitchen Recipe Standards',
    'Purchasing',
    'Closing Responsibilities',
    'M7-001 --- Marketing and Advertising Governance',
    'M5-001 --- Human Resources Foundations, Organization and Positions',
    'M9-001_Control_Management_Financial_Reporting_and_Franchise_Oversight',
    'Franchise Audit Forms',
    'Opening Responsibilities',
    'Opening Standards',
    'Closing Standards',
    'Complaint Handling',
    'Brand Standards',
    'Personnel Standards',
    'Inventory Records',
    'Inventory Rules',
    'Kitchen Inventory',
    'Cooling Standards',
    'Receiving',
    'Cash Closing Process',
    'Cash Control',
    'M3-005 --- Equipment, Inventory and Store Readiness',
    'M4-005 --- Operational Forms, Controls and Daily Records',
    'M4-003 --- Cleaning, Sanitation and Operational Controls',
    'M4-001 --- Daily Operations Manual (Operational Standard)',
    'Required Forms / Templates',
    'Policy --- Franchisee Responsibility',
    'Initial Training',
    'Recipe Documentation',
    'Recipe Standard',
    'Franchise Supervision Checklist',
    'Prep Recipe Standards'
  )
),
department_links as (
  insert into public.os_knowledge_ontology_links (organization_id, knowledge_id, department_id, notes)
  select org.organization_id, k.id, d.id, null
  from org
  join (
    values
      ('kitchen', 'Food Safety'),
      ('service', 'Service Standards'),
      ('bar', 'Bar Cleaning'),
      ('coffee', 'POS Platform'),
      ('pastry', 'Kitchen Recipe Standards'),
      ('purchasing', 'Purchasing'),
      ('management', 'Closing Responsibilities'),
      ('marketing', 'M7-001 --- Marketing and Advertising Governance'),
      ('human-resources', 'M5-001 --- Human Resources Foundations, Organization and Positions'),
      ('finance', 'M9-001_Control_Management_Financial_Reporting_and_Franchise_Oversight'),
      ('franchise-operations', 'Franchise Audit Forms')
  ) as v(department_code, knowledge_title) on true
  join department_seed d on d.code = v.department_code
  join knowledge_lookup k on k.title = v.knowledge_title
  where not exists (
    select 1
    from public.os_knowledge_ontology_links existing
    where existing.organization_id = org.organization_id
      and existing.knowledge_id = k.id
      and existing.department_id = d.id
  )
  returning 1
),
role_links as (
  insert into public.os_knowledge_ontology_links (organization_id, knowledge_id, role_id, notes)
  select org.organization_id, k.id, r.id, null
  from org
  join (
    values
      ('general-manager', 'Closing Responsibilities'),
      ('operations-manager', 'Opening Responsibilities'),
      ('kitchen-manager', 'Kitchen Recipe Standards'),
      ('sous-chef', 'Prep Recipe Standards'),
      ('line-cook', 'Recipe Standard'),
      ('prep-cook', 'Prep Recipe Standards'),
      ('pastry-chef', 'Kitchen Recipe Standards'),
      ('barista', 'POS Platform'),
      ('bartender', 'Bar Cleaning'),
      ('waiter', 'Service Standards'),
      ('host', 'Opening Standards'),
      ('cashier', 'Cash Control'),
      ('buyer', 'Purchasing'),
      ('inventory-supervisor', 'Inventory Records'),
      ('franchise-auditor', 'Franchise Supervision Checklist'),
      ('hr-manager', 'Human Resources Foundations, Organization and Positions'),
      ('marketing-manager', 'Brand Standards')
  ) as v(role_code, knowledge_title) on true
  join role_seed r on r.code = v.role_code
  join knowledge_lookup k on k.title = v.knowledge_title
  where not exists (
    select 1
    from public.os_knowledge_ontology_links existing
    where existing.organization_id = org.organization_id
      and existing.knowledge_id = k.id
      and existing.role_id = r.id
  )
  returning 1
),
area_links as (
  insert into public.os_knowledge_ontology_links (organization_id, knowledge_id, area_id, notes)
  select org.organization_id, k.id, a.id, null
  from org
  join (
    values
      ('dining-room', 'Service Standards'),
      ('terrace', 'Opening Standards'),
      ('kitchen-line', 'Kitchen Inventory'),
      ('prep-area', 'Prep Recipe Standards'),
      ('pastry-area', 'Kitchen Recipe Standards'),
      ('bar', 'Bar Cleaning'),
      ('coffee-station', 'POS Platform'),
      ('cashier-station', 'Cash Closing Process'),
      ('storage', 'Inventory Records'),
      ('cold-storage', 'Cooling Standards'),
      ('receiving-area', 'Receiving'),
      ('office', 'M9-001_Control_Management_Financial_Reporting_and_Franchise_Oversight')
  ) as v(area_code, knowledge_title) on true
  join area_seed a on a.code = v.area_code
  join knowledge_lookup k on k.title = v.knowledge_title
  where not exists (
    select 1
    from public.os_knowledge_ontology_links existing
    where existing.organization_id = org.organization_id
      and existing.knowledge_id = k.id
      and existing.area_id = a.id
  )
  returning 1
),
equipment_links as (
  insert into public.os_knowledge_ontology_links (organization_id, knowledge_id, equipment_id, notes)
  select org.organization_id, k.id, e.id, null
  from org
  join (
    values
      ('espresso-machine', 'M3-005 --- Equipment, Inventory and Store Readiness'),
      ('grinder', 'M3-005 --- Equipment, Inventory and Store Readiness'),
      ('pos-terminal', 'POS Platform'),
      ('printer', 'M4-005 --- Operational Forms, Controls and Daily Records'),
      ('refrigerator', 'M3-005 --- Equipment, Inventory and Store Readiness'),
      ('freezer', 'M3-005 --- Equipment, Inventory and Store Readiness'),
      ('oven', 'Kitchen Recipe Standards'),
      ('stove', 'Food Safety'),
      ('dishwasher', 'M4-003 --- Cleaning, Sanitation and Operational Controls'),
      ('scale', 'Inventory Records'),
      ('mixer', 'Kitchen Recipe Standards'),
      ('blender', 'Kitchen Recipe Standards')
  ) as v(equipment_code, knowledge_title) on true
  join equipment_seed e on e.code = v.equipment_code
  join knowledge_lookup k on k.title = v.knowledge_title
  where not exists (
    select 1
    from public.os_knowledge_ontology_links existing
    where existing.organization_id = org.organization_id
      and existing.knowledge_id = k.id
      and existing.equipment_id = e.id
  )
  returning 1
),
process_links as (
  insert into public.os_knowledge_ontology_links (organization_id, knowledge_id, business_process_id, notes)
  select org.organization_id, k.id, bp.id, null
  from org
  join (
    values
      ('opening', 'Opening Standards'),
      ('closing', 'Closing Standards'),
      ('receiving', 'Receiving'),
      ('inventory-control', 'Inventory Rules'),
      ('food-preparation', 'Kitchen Recipe Standards'),
      ('service-execution', 'Service Standards'),
      ('cash-control', 'Cash Control'),
      ('cleaning-and-sanitation', 'M4-003 --- Cleaning, Sanitation and Operational Controls'),
      ('maintenance', 'M3-005 --- Equipment, Inventory and Store Readiness'),
      ('staff-training', 'Initial Training'),
      ('customer-complaint-handling', 'Complaint Handling'),
      ('franchise-audit', 'Franchise Supervision Checklist'),
      ('purchasing', 'Purchasing'),
      ('marketing-campaign-approval', 'M7-001 --- Marketing and Advertising Governance'),
      ('financial-reporting', 'M9-001_Control_Management_Financial_Reporting_and_Franchise_Oversight')
  ) as v(process_code, knowledge_title) on true
  join business_process_seed bp on bp.code = v.process_code
  join knowledge_lookup k on k.title = v.knowledge_title
  where not exists (
    select 1
    from public.os_knowledge_ontology_links existing
    where existing.organization_id = org.organization_id
      and existing.knowledge_id = k.id
      and existing.business_process_id = bp.id
  )
  returning 1
),
document_type_links as (
  insert into public.os_knowledge_ontology_links (organization_id, knowledge_id, document_type_id, notes)
  select org.organization_id, k.id, dt.id, null
  from org
  join (
    values
      ('sop', 'M4-001 --- Daily Operations Manual (Operational Standard)'),
      ('policy', 'Policy --- Franchisee Responsibility'),
      ('checklist', 'Opening Checklists'),
      ('form', 'Required Forms / Templates'),
      ('recipe', 'Recipe Standard'),
      ('training-guide', 'Initial Training'),
      ('audit-standard', 'Franchise Audit Forms'),
      ('brand-standard', 'Brand Standards'),
      ('financial-control', 'M9-001_Control_Management_Financial_Reporting_and_Franchise_Oversight'),
      ('role-description', 'Personnel Standards')
  ) as v(document_type_code, knowledge_title) on true
  join document_type_seed dt on dt.code = v.document_type_code
  join knowledge_lookup k on k.title = v.knowledge_title
  where not exists (
    select 1
    from public.os_knowledge_ontology_links existing
    where existing.organization_id = org.organization_id
      and existing.knowledge_id = k.id
      and existing.document_type_id = dt.id
  )
  returning 1
)
select
  (select count(*) from department_links)
  + (select count(*) from role_links)
  + (select count(*) from area_links)
  + (select count(*) from equipment_links)
  + (select count(*) from process_links)
  + (select count(*) from document_type_links) as inserted_links;
