-- Seed the first operational ontology and starter process catalog for Delikat OS.
-- This is structured scaffolding only: no AI, no generated SOP bodies, and no
-- changes to imported manual content.

with org as (
  select '00000000-0000-4000-8000-000000000001'::uuid as organization_id
),
department_seed as (
  insert into public.os_departments (organization_id, name, code, status)
  select org.organization_id, v.name, v.code, 'active'::public.os_record_status
  from org
  cross join (
    values
      ('Kitchen', 'kitchen', 'Kitchen operations and food production.', 1),
      ('Service', 'service', 'Guest-facing service and floor execution.', 2),
      ('Bar', 'bar', 'Bar service and beverage operations.', 3),
      ('Coffee', 'coffee', 'Coffee station and espresso service.', 4),
      ('Pastry', 'pastry', 'Pastry preparation and finishing.', 5),
      ('Purchasing', 'purchasing', 'Ordering, receiving, and inventory control.', 6),
      ('Management', 'management', 'Operational leadership and coordination.', 7),
      ('Marketing', 'marketing', 'Brand, campaigns, and communication controls.', 8),
      ('Human Resources', 'human-resources', 'Hiring, onboarding, and staff support.', 9),
      ('Finance', 'finance', 'Cash control, reporting, and financial oversight.', 10),
      ('Franchise Operations', 'franchise-operations', 'Franchise support, visits, and compliance.', 11)
  ) as v(name, code, description, sort_order)
  on conflict (organization_id, code) do update
    set name = excluded.name,
        status = excluded.status
  returning id, code, name
),
role_seed as (
  insert into public.os_roles (organization_id, name, code, description, status)
  select org.organization_id, v.name, v.code, v.description, 'active'::public.os_record_status
  from org
  cross join (
    values
      ('General Manager', 'general-manager', 'Overall store leadership and accountability.'),
      ('Operations Manager', 'operations-manager', 'Daily operational coordination and standards.'),
      ('Kitchen Manager', 'kitchen-manager', 'Kitchen execution, staffing, and readiness.'),
      ('Sous Chef', 'sous-chef', 'Kitchen line leadership and production support.'),
      ('Line Cook', 'line-cook', 'Station execution and food production.'),
      ('Prep Cook', 'prep-cook', 'Preparation, mise en place, and kitchen readiness.'),
      ('Pastry Chef', 'pastry-chef', 'Pastry production and finishing.'),
      ('Barista', 'barista', 'Coffee station preparation and guest service.'),
      ('Bartender', 'bartender', 'Bar beverage preparation and service.'),
      ('Waiter', 'waiter', 'Table service and guest coordination.'),
      ('Host', 'host', 'Guest reception and seating flow.'),
      ('Cashier', 'cashier', 'Cash handling and point-of-sale execution.'),
      ('Buyer', 'buyer', 'Purchasing, ordering, and vendor coordination.'),
      ('Inventory Supervisor', 'inventory-supervisor', 'Inventory counts, variance review, and storage control.'),
      ('Franchise Auditor', 'franchise-auditor', 'Franchise compliance review and visit documentation.'),
      ('HR Manager', 'hr-manager', 'Hiring, onboarding, and people operations.'),
      ('Marketing Manager', 'marketing-manager', 'Brand and campaign coordination.')
  ) as v(name, code, description)
  on conflict (organization_id, code) do update
    set name = excluded.name,
        description = excluded.description,
        status = excluded.status
  returning id, code, name
),
area_seed as (
  insert into public.os_areas (organization_id, name, code, description, status)
  select org.organization_id, v.name, v.code, v.description, 'active'::public.os_record_status
  from org
  cross join (
    values
      ('Dining Room', 'dining-room', 'Guest seating and table service area.'),
      ('Terrace', 'terrace', 'Outdoor guest seating area.'),
      ('Kitchen Line', 'kitchen-line', 'Hot line and production stations.'),
      ('Prep Area', 'prep-area', 'Food preparation and mise en place area.'),
      ('Pastry Area', 'pastry-area', 'Pastry production and finishing area.'),
      ('Bar', 'bar', 'Beverage service area.'),
      ('Coffee Station', 'coffee-station', 'Espresso and coffee service area.'),
      ('Cashier Station', 'cashier-station', 'Point-of-sale and cash control point.'),
      ('Storage', 'storage', 'Dry storage and inventory staging.'),
      ('Cold Storage', 'cold-storage', 'Refrigeration and frozen storage.'),
      ('Receiving Area', 'receiving-area', 'Inbound receiving and inspection point.'),
      ('Office', 'office', 'Administrative and management workspace.')
  ) as v(name, code, description)
  on conflict (organization_id, code) do update
    set name = excluded.name,
        description = excluded.description,
        status = excluded.status
  returning id, code, name
),
equipment_seed as (
  insert into public.os_equipment (organization_id, name, code, description, status)
  select org.organization_id, v.name, v.code, v.description, 'active'::public.os_record_status
  from org
  cross join (
    values
      ('Espresso Machine', 'espresso-machine', 'Espresso preparation equipment.'),
      ('Grinder', 'grinder', 'Coffee grinding equipment.'),
      ('POS Terminal', 'pos-terminal', 'Point-of-sale terminal.'),
      ('Printer', 'printer', 'Receipt and document printer.'),
      ('Refrigerator', 'refrigerator', 'Cold storage refrigeration unit.'),
      ('Freezer', 'freezer', 'Frozen storage unit.'),
      ('Oven', 'oven', 'Cooking and baking equipment.'),
      ('Stove', 'stove', 'Cooking and heating equipment.'),
      ('Dishwasher', 'dishwasher', 'Warewashing equipment.'),
      ('Scale', 'scale', 'Weighing equipment for inventory and recipes.'),
      ('Mixer', 'mixer', 'Mixing equipment for production.'),
      ('Blender', 'blender', 'Blending equipment for production.')
  ) as v(name, code, description)
  on conflict (organization_id, code) do update
    set name = excluded.name,
        description = excluded.description,
        status = excluded.status
  returning id, code, name
),
business_process_seed as (
  insert into public.os_business_processes (organization_id, name, code, description, status)
  select org.organization_id, v.name, v.code, v.description, 'active'::public.os_record_status
  from org
  cross join (
    values
      ('Opening', 'opening', 'Start-of-day operational readiness.'),
      ('Closing', 'closing', 'End-of-day operational wrap-up.'),
      ('Receiving', 'receiving', 'Inbound goods inspection and acceptance.'),
      ('Inventory Control', 'inventory-control', 'Stock counts and variance management.'),
      ('Food Preparation', 'food-preparation', 'Preparation of menu items and components.'),
      ('Service Execution', 'service-execution', 'Guest service execution during shifts.'),
      ('Cash Control', 'cash-control', 'Cash handling and register reconciliation.'),
      ('Cleaning and Sanitation', 'cleaning-and-sanitation', 'Cleaning and sanitation execution.'),
      ('Maintenance', 'maintenance', 'Equipment and facility maintenance checks.'),
      ('Staff Training', 'staff-training', 'Training and onboarding coordination.'),
      ('Customer Complaint Handling', 'customer-complaint-handling', 'Guest issue intake and resolution.'),
      ('Franchise Audit', 'franchise-audit', 'Franchise compliance review visits.'),
      ('Purchasing', 'purchasing', 'Ordering and vendor coordination.'),
      ('Marketing Campaign Approval', 'marketing-campaign-approval', 'Marketing review and approval flow.'),
      ('Financial Reporting', 'financial-reporting', 'Financial close and reporting flow.')
  ) as v(name, code, description)
  on conflict (organization_id, code) do update
    set name = excluded.name,
        description = excluded.description,
        status = excluded.status
  returning id, code, name
),
document_type_seed as (
  insert into public.os_document_types (organization_id, name, code, description, status)
  select org.organization_id, v.name, v.code, v.description, 'active'::public.os_record_status
  from org
  cross join (
    values
      ('SOP', 'sop', 'Standard operating procedure.'),
      ('Policy', 'policy', 'Operating policy or rule set.'),
      ('Checklist', 'checklist', 'Checklist or inspection list.'),
      ('Form', 'form', 'Operational form or template.'),
      ('Recipe', 'recipe', 'Recipe or menu build specification.'),
      ('Training Guide', 'training-guide', 'Training guide or learning aid.'),
      ('Audit Standard', 'audit-standard', 'Audit standard or review guide.'),
      ('Brand Standard', 'brand-standard', 'Brand standard or brand control.'),
      ('Financial Control', 'financial-control', 'Financial control or reporting rule.'),
      ('Role Description', 'role-description', 'Role description or position profile.')
  ) as v(name, code, description)
  on conflict (organization_id, code) do update
    set name = excluded.name,
        description = excluded.description,
        status = excluded.status
  returning id, code, name
),
required_group_seed as (
  insert into public.os_required_knowledge_groups (organization_id, name, code, description, status, sort_order)
  select org.organization_id, v.name, v.code, v.description, 'active'::public.os_record_status, v.sort_order
  from org
  cross join (
    values
      ('Daily Operations', 'daily-operations', 'Core daily operational readiness and closeout.', 1),
      ('Food Safety', 'food-safety', 'Food handling, sanitation, and safety control.', 2),
      ('Service Standards', 'service-standards', 'Guest service and floor execution standards.', 3),
      ('Cash and POS Control', 'cash-pos-control', 'Cash handling and POS control standards.', 4),
      ('Inventory and Purchasing', 'inventory-purchasing', 'Ordering, receiving, and inventory control.', 5),
      ('HR and Training', 'hr-training', 'Staff onboarding, training, and people operations.', 6),
      ('Franchise Compliance', 'franchise-compliance', 'Franchise review and audit compliance.', 7),
      ('Brand and Marketing', 'brand-marketing', 'Brand and campaign control standards.', 8),
      ('Financial Control', 'financial-control', 'Financial reporting and control standards.', 9)
  ) as v(name, code, description, sort_order)
  on conflict (organization_id, code) do update
    set name = excluded.name,
        description = excluded.description,
        status = excluded.status,
        sort_order = excluded.sort_order
  returning id, code, name
),
required_item_seed as (
  insert into public.os_required_knowledge_items (
    organization_id,
    group_id,
    title,
    code,
    description,
    priority,
    status,
    department_id,
    role_id,
    area_id,
    equipment_id,
    business_process_id,
    document_type_id,
    sort_order
  )
  select
    org.organization_id,
    g.id,
    v.title,
    v.code,
    v.description,
    v.priority,
    'active'::public.os_record_status,
    d.id,
    r.id,
    a.id,
    e.id,
    bp.id,
    dt.id,
    v.sort_order
  from org
  cross join (
    values
      ('Opening Checklist', 'opening-checklist', null::text, 'daily-operations', 'management', 'operations-manager', 'office', null::text, 'opening', 'checklist', 2, 1),
      ('Closing Checklist', 'closing-checklist', null::text, 'daily-operations', 'management', 'operations-manager', 'office', null::text, 'closing', 'checklist', 2, 2),
      ('Cleaning and Sanitation SOP', 'cleaning-and-sanitation-sop', null::text, 'food-safety', 'kitchen', null::text, 'kitchen-line', 'dishwasher', 'cleaning-and-sanitation', 'sop', 2, 3),
      ('Receiving Procedure', 'receiving-procedure', null::text, 'inventory-purchasing', 'purchasing', 'buyer', 'receiving-area', null::text, 'receiving', 'sop', 3, 4),
      ('Inventory Count Procedure', 'inventory-count-procedure', null::text, 'inventory-purchasing', 'purchasing', 'inventory-supervisor', 'storage', 'scale', 'inventory-control', 'sop', 3, 5),
      ('Cash Closing Procedure', 'cash-closing-procedure', null::text, 'cash-pos-control', 'finance', 'cashier', 'cashier-station', 'pos-terminal', 'cash-control', 'sop', 3, 6),
      ('POS Use Procedure', 'pos-use-procedure', null::text, 'cash-pos-control', 'service', 'cashier', 'cashier-station', 'pos-terminal', 'cash-control', 'sop', 3, 7),
      ('Customer Complaint Procedure', 'customer-complaint-procedure', null::text, 'service-standards', 'service', 'general-manager', 'dining-room', null::text, 'customer-complaint-handling', 'sop', 3, 8),
      ('Staff Onboarding Procedure', 'staff-onboarding-procedure', null::text, 'hr-training', 'human-resources', 'hr-manager', 'office', null::text, 'staff-training', 'training-guide', 3, 9),
      ('Recipe Documentation Standard', 'recipe-documentation-standard', null::text, 'food-safety', 'kitchen', 'kitchen-manager', 'prep-area', null::text, 'food-preparation', 'recipe', 3, 10),
      ('Franchise Audit Procedure', 'franchise-audit-procedure', null::text, 'franchise-compliance', 'franchise-operations', 'franchise-auditor', 'office', null::text, 'franchise-audit', 'audit-standard', 3, 11),
      ('Marketing Approval Policy', 'marketing-approval-policy', null::text, 'brand-marketing', 'marketing', 'marketing-manager', 'office', null::text, 'marketing-campaign-approval', 'policy', 3, 12),
      ('Financial Reporting Procedure', 'financial-reporting-procedure', null::text, 'financial-control', 'finance', 'general-manager', 'office', null::text, 'financial-reporting', 'financial-control', 2, 13),
      ('Equipment Maintenance Procedure', 'equipment-maintenance-procedure', null::text, 'daily-operations', 'management', 'operations-manager', 'office', 'printer', 'maintenance', 'sop', 3, 14),
      ('Food Safety Policy', 'food-safety-policy', null::text, 'food-safety', 'kitchen', 'kitchen-manager', 'kitchen-line', null::text, 'cleaning-and-sanitation', 'policy', 2, 15)
  ) as v(title, code, description, group_code, department_code, role_code, area_code, equipment_code, business_process_code, document_type_code, priority, sort_order)
  left join required_group_seed g on g.code = v.group_code
  left join department_seed d on d.code = v.department_code
  left join role_seed r on r.code = v.role_code
  left join area_seed a on a.code = v.area_code
  left join equipment_seed e on e.code = v.equipment_code
  left join business_process_seed bp on bp.code = v.business_process_code
  left join document_type_seed dt on dt.code = v.document_type_code
  on conflict (organization_id, code) do update
    set group_id = excluded.group_id,
        title = excluded.title,
        description = excluded.description,
        priority = excluded.priority,
        status = excluded.status,
        department_id = excluded.department_id,
        role_id = excluded.role_id,
        area_id = excluded.area_id,
        equipment_id = excluded.equipment_id,
        business_process_id = excluded.business_process_id,
        document_type_id = excluded.document_type_id,
        sort_order = excluded.sort_order
  returning id, code, title
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
    'M7-001 --- Marketing and Advertising Governance',
    'M9-001_Control_Management_Financial_Reporting_and_Franchise_Oversight'
  )
),
department_ontology_links as (
  insert into public.os_knowledge_ontology_links (organization_id, knowledge_id, department_id, notes)
  select org.organization_id, k.id, d.id, null
  from org
  join (
    values
      ('Kitchen', 'Food Safety'),
      ('Service', 'Service Standards'),
      ('Bar', 'Bar Cleaning'),
      ('Coffee', 'POS Platform'),
      ('Pastry', 'Kitchen Recipe Standards'),
      ('Purchasing', 'Purchasing'),
      ('Management', 'Closing Responsibilities'),
      ('Marketing', 'M7-001 --- Marketing and Advertising Governance'),
      ('Human Resources', 'M5-001 --- Human Resources Foundations, Organization and Positions'),
      ('Finance', 'M9-001_Control_Management_Financial_Reporting_and_Franchise_Oversight'),
      ('Franchise Operations', 'Franchise Audit Forms')
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
  returning id
),
role_ontology_links as (
  insert into public.os_knowledge_ontology_links (organization_id, knowledge_id, role_id, notes)
  select org.organization_id, k.id, r.id, null
  from org
  join (
    values
      ('General Manager', 'Closing Responsibilities'),
      ('Operations Manager', 'Opening Responsibilities'),
      ('Kitchen Manager', 'Kitchen Recipe Standards'),
      ('Sous Chef', 'Prep Recipe Standards'),
      ('Line Cook', 'Recipe Standard'),
      ('Prep Cook', 'Prep Recipe Standards'),
      ('Pastry Chef', 'Kitchen Recipe Standards'),
      ('Barista', 'POS Platform'),
      ('Bartender', 'Bar Cleaning'),
      ('Waiter', 'Service Standards'),
      ('Host', 'Opening Standards'),
      ('Cashier', 'Cash Control'),
      ('Buyer', 'Purchasing'),
      ('Inventory Supervisor', 'Inventory Records'),
      ('Franchise Auditor', 'Franchise Supervision Checklist'),
      ('HR Manager', 'Human Resources Foundations, Organization and Positions'),
      ('Marketing Manager', 'Brand Standards')
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
  returning id
),
area_ontology_links as (
  insert into public.os_knowledge_ontology_links (organization_id, knowledge_id, area_id, notes)
  select org.organization_id, k.id, a.id, null
  from org
  join (
    values
      ('Dining Room', 'Service Standards'),
      ('Terrace', 'Opening Standards'),
      ('Kitchen Line', 'Kitchen Inventory'),
      ('Prep Area', 'Prep Recipe Standards'),
      ('Pastry Area', 'Kitchen Recipe Standards'),
      ('Bar', 'Bar Cleaning'),
      ('Coffee Station', 'POS Platform'),
      ('Cashier Station', 'Cash Closing Process'),
      ('Storage', 'Inventory Records'),
      ('Cold Storage', 'Cooling Standards'),
      ('Receiving Area', 'Receiving'),
      ('Office', 'M9-001_Control_Management_Financial_Reporting_and_Franchise_Oversight')
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
  returning id
),
equipment_ontology_links as (
  insert into public.os_knowledge_ontology_links (organization_id, knowledge_id, equipment_id, notes)
  select org.organization_id, k.id, e.id, null
  from org
  join (
    values
      ('Espresso Machine', 'M3-005 --- Equipment, Inventory and Store Readiness'),
      ('Grinder', 'M3-005 --- Equipment, Inventory and Store Readiness'),
      ('POS Terminal', 'POS Platform'),
      ('Printer', 'M4-005 --- Operational Forms, Controls and Daily Records'),
      ('Refrigerator', 'M3-005 --- Equipment, Inventory and Store Readiness'),
      ('Freezer', 'M3-005 --- Equipment, Inventory and Store Readiness'),
      ('Oven', 'Kitchen Recipe Standards'),
      ('Stove', 'Food Safety'),
      ('Dishwasher', 'Cleaning, Sanitation and Operational Controls'),
      ('Scale', 'Inventory Records'),
      ('Mixer', 'Kitchen Recipe Standards'),
      ('Blender', 'Kitchen Recipe Standards')
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
  returning id
),
business_process_ontology_links as (
  insert into public.os_knowledge_ontology_links (organization_id, knowledge_id, business_process_id, notes)
  select org.organization_id, k.id, bp.id, null
  from org
  join (
    values
      ('Opening', 'Opening Standards'),
      ('Closing', 'Closing Standards'),
      ('Receiving', 'Receiving'),
      ('Inventory Control', 'Inventory Rules'),
      ('Food Preparation', 'Kitchen Recipe Standards'),
      ('Service Execution', 'Service Standards'),
      ('Cash Control', 'Cash Control'),
      ('Cleaning and Sanitation', 'M4-003 --- Cleaning, Sanitation and Operational Controls'),
      ('Maintenance', 'M3-005 --- Equipment, Inventory and Store Readiness'),
      ('Staff Training', 'Initial Training'),
      ('Customer Complaint Handling', 'Complaint Handling'),
      ('Franchise Audit', 'Franchise Supervision Checklist'),
      ('Purchasing', 'Purchasing'),
      ('Marketing Campaign Approval', 'M7-001 --- Marketing and Advertising Governance'),
      ('Financial Reporting', 'M9-001_Control_Management_Financial_Reporting_and_Franchise_Oversight')
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
  returning id
),
document_type_ontology_links as (
  insert into public.os_knowledge_ontology_links (organization_id, knowledge_id, document_type_id, notes)
  select org.organization_id, k.id, dt.id, null
  from org
  join (
    values
      ('SOP', 'M4-001 --- Daily Operations Manual (Operational Standard)'),
      ('Policy', 'Policy --- Franchisee Responsibility'),
      ('Checklist', 'Opening Checklists'),
      ('Form', 'Required Forms / Templates'),
      ('Recipe', 'Recipe Standard'),
      ('Training Guide', 'Initial Training'),
      ('Audit Standard', 'Franchise Audit Forms'),
      ('Brand Standard', 'Brand Standards'),
      ('Financial Control', 'M9-001_Control_Management_Financial_Reporting_and_Franchise_Oversight'),
      ('Role Description', 'Personnel Standards')
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
  returning id
),
process_seed as (
  insert into public.os_processes (
    organization_id,
    code,
    name,
    description,
    department_id,
    owner_role_id,
    area_id,
    frequency,
    estimated_duration_minutes,
    priority,
    criticality,
    trigger_type,
    status
  )
  select
    org.organization_id,
    v.code,
    v.name,
    v.description,
    d.id,
    r.id,
    a.id,
    v.frequency,
    v.estimated_duration_minutes,
    v.priority,
    v.criticality,
    v.trigger_type,
    'active'::public.os_record_status
  from org
  cross join (
    values
      ('daily-opening', 'Daily Opening', 'Starter operational scaffold for opening readiness.', 'management', 'operations-manager', 'office', 'Daily', 20, 2, 'medium', 'opening'),
      ('daily-closing', 'Daily Closing', 'Starter operational scaffold for closing readiness.', 'management', 'operations-manager', 'office', 'Daily', 20, 2, 'medium', 'closing'),
      ('receiving-goods', 'Receiving Goods', 'Starter operational scaffold for inbound receiving.', 'purchasing', 'buyer', 'receiving-area', 'As needed', 30, 2, 'medium', 'manual'),
      ('inventory-count', 'Inventory Count', 'Starter operational scaffold for inventory counting.', 'purchasing', 'inventory-supervisor', 'storage', 'Scheduled', 45, 3, 'medium', 'scheduled'),
      ('service-shift-execution', 'Service Shift Execution', 'Starter operational scaffold for service execution.', 'service', 'waiter', 'dining-room', 'Daily', 240, 3, 'high', 'manual'),
      ('cash-closing', 'Cash Closing', 'Starter operational scaffold for cash closeout.', 'finance', 'cashier', 'cashier-station', 'Daily', 20, 2, 'high', 'closing'),
      ('customer-complaint-handling', 'Customer Complaint Handling', 'Starter operational scaffold for complaint handling.', 'service', 'general-manager', 'dining-room', 'As needed', 15, 2, 'medium', 'event'),
      ('franchise-audit-visit', 'Franchise Audit Visit', 'Starter operational scaffold for franchise audit visits.', 'franchise-operations', 'franchise-auditor', 'office', 'Scheduled', 60, 2, 'high', 'scheduled')
  ) as v(code, name, description, department_code, role_code, area_code, frequency, estimated_duration_minutes, priority, criticality, trigger_type)
  left join department_seed d on d.code = v.department_code
  left join role_seed r on r.code = v.role_code
  left join area_seed a on a.code = v.area_code
  on conflict (organization_id, code) do update
    set name = excluded.name,
        description = excluded.description,
        department_id = excluded.department_id,
        owner_role_id = excluded.owner_role_id,
        area_id = excluded.area_id,
        frequency = excluded.frequency,
        estimated_duration_minutes = excluded.estimated_duration_minutes,
        priority = excluded.priority,
        criticality = excluded.criticality,
        trigger_type = excluded.trigger_type,
        status = excluded.status
  returning id, code, name
),
process_step_seed as (
  insert into public.os_process_steps (
    organization_id,
    process_id,
    sequence,
    title,
    description,
    expected_duration_minutes,
    required_knowledge_id,
    required_equipment_id,
    required_checklist_item_id
  )
  select
    org.organization_id,
    p.id,
    v.sequence,
    v.title,
    null,
    v.expected_duration_minutes,
    null,
    null,
    null
  from org
  cross join (
    values
      ('daily-opening', 1, 'Prepare area', 5),
      ('daily-opening', 2, 'Verify equipment', 5),
      ('daily-opening', 3, 'Review required knowledge', 5),
      ('daily-opening', 4, 'Confirm readiness', 5),
      ('daily-closing', 1, 'Secure area', 5),
      ('daily-closing', 2, 'Count cash', 5),
      ('daily-closing', 3, 'Review checklists', 5),
      ('daily-closing', 4, 'Confirm closure', 5),
      ('receiving-goods', 1, 'Inspect shipment', 8),
      ('receiving-goods', 2, 'Verify quantities', 8),
      ('receiving-goods', 3, 'Log receiving', 8),
      ('receiving-goods', 4, 'Store items', 6),
      ('inventory-count', 1, 'Count stock', 12),
      ('inventory-count', 2, 'Record variance', 10),
      ('inventory-count', 3, 'Review adjustments', 10),
      ('inventory-count', 4, 'Confirm completion', 5),
      ('service-shift-execution', 1, 'Prepare station', 10),
      ('service-shift-execution', 2, 'Start shift briefing', 10),
      ('service-shift-execution', 3, 'Serve guests', 20),
      ('service-shift-execution', 4, 'Complete handoff', 10),
      ('cash-closing', 1, 'Count drawer', 5),
      ('cash-closing', 2, 'Reconcile POS', 5),
      ('cash-closing', 3, 'Prepare deposit', 5),
      ('cash-closing', 4, 'Confirm cash close', 5),
      ('customer-complaint-handling', 1, 'Receive complaint', 4),
      ('customer-complaint-handling', 2, 'Document issue', 4),
      ('customer-complaint-handling', 3, 'Resolve action', 4),
      ('customer-complaint-handling', 4, 'Follow up', 3),
      ('franchise-audit-visit', 1, 'Review visit plan', 10),
      ('franchise-audit-visit', 2, 'Inspect compliance', 15),
      ('franchise-audit-visit', 3, 'Record findings', 15),
      ('franchise-audit-visit', 4, 'Complete recap', 10)
  ) as v(process_code, sequence, title, expected_duration_minutes)
  join process_seed p on p.code = v.process_code
  on conflict (process_id, sequence) do update
    set title = excluded.title,
        description = excluded.description,
        expected_duration_minutes = excluded.expected_duration_minutes,
        required_knowledge_id = excluded.required_knowledge_id,
        required_equipment_id = excluded.required_equipment_id,
        required_checklist_item_id = excluded.required_checklist_item_id
  returning id
)
select 1;
