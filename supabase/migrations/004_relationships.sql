alter table public.os_canonical_knowledge
  add constraint os_canonical_knowledge_current_version_fk
  foreign key (current_approved_version_id)
  references public.os_knowledge_versions(id)
  on delete set null;

alter table public.os_sops
  add constraint os_sops_process_org_fk
  foreign key (process_id, organization_id)
  references public.os_processes(id, organization_id)
  on delete cascade;

alter table public.os_checklist_items
  add constraint os_checklist_items_checklist_org_fk
  foreign key (checklist_id, organization_id)
  references public.os_checklists(id, organization_id)
  on delete cascade;

alter table public.os_training_path_lessons
  add constraint os_training_path_lessons_path_org_fk
  foreign key (training_path_id, organization_id)
  references public.os_training_paths(id, organization_id)
  on delete cascade;

alter table public.os_training_path_lessons
  add constraint os_training_path_lessons_lesson_org_fk
  foreign key (lesson_id, organization_id)
  references public.os_lessons(id, organization_id)
  on delete cascade;

alter table public.os_quizzes
  add constraint os_quizzes_lesson_org_fk
  foreign key (lesson_id, organization_id)
  references public.os_lessons(id, organization_id)
  on delete cascade;

alter table public.os_quiz_questions
  add constraint os_quiz_questions_quiz_org_fk
  foreign key (quiz_id, organization_id)
  references public.os_quizzes(id, organization_id)
  on delete cascade;

alter table public.os_audit_findings
  add constraint os_audit_findings_audit_org_fk
  foreign key (audit_id, organization_id)
  references public.os_audits(id, organization_id)
  on delete cascade;

create trigger os_organizations_set_updated_at before update on public.os_organizations for each row execute function public.os_set_updated_at();
create trigger os_memberships_set_updated_at before update on public.os_memberships for each row execute function public.os_set_updated_at();
create trigger os_locations_set_updated_at before update on public.os_locations for each row execute function public.os_set_updated_at();
create trigger os_departments_set_updated_at before update on public.os_departments for each row execute function public.os_set_updated_at();
create trigger os_stations_set_updated_at before update on public.os_stations for each row execute function public.os_set_updated_at();
create trigger os_roles_set_updated_at before update on public.os_roles for each row execute function public.os_set_updated_at();
create trigger os_processes_set_updated_at before update on public.os_processes for each row execute function public.os_set_updated_at();
create trigger os_source_manuals_prevent_update before update or delete on public.os_source_manuals for each row execute function public.os_prevent_immutable_evidence_change();
create trigger os_source_sections_prevent_update before update or delete on public.os_source_sections for each row execute function public.os_prevent_immutable_evidence_change();
create trigger os_canonical_knowledge_set_updated_at before update on public.os_canonical_knowledge for each row execute function public.os_set_updated_at();
create trigger os_knowledge_versions_set_updated_at before update on public.os_knowledge_versions for each row execute function public.os_set_updated_at();
create trigger os_sops_set_updated_at before update on public.os_sops for each row execute function public.os_set_updated_at();
create trigger os_checklists_set_updated_at before update on public.os_checklists for each row execute function public.os_set_updated_at();
create trigger os_checklist_items_set_updated_at before update on public.os_checklist_items for each row execute function public.os_set_updated_at();
create trigger os_training_paths_set_updated_at before update on public.os_training_paths for each row execute function public.os_set_updated_at();
create trigger os_lessons_set_updated_at before update on public.os_lessons for each row execute function public.os_set_updated_at();
create trigger os_training_path_lessons_set_updated_at before update on public.os_training_path_lessons for each row execute function public.os_set_updated_at();
create trigger os_quizzes_set_updated_at before update on public.os_quizzes for each row execute function public.os_set_updated_at();
create trigger os_quiz_questions_set_updated_at before update on public.os_quiz_questions for each row execute function public.os_set_updated_at();
create trigger os_certifications_set_updated_at before update on public.os_certifications for each row execute function public.os_set_updated_at();
create trigger os_audits_set_updated_at before update on public.os_audits for each row execute function public.os_set_updated_at();
create trigger os_audit_findings_set_updated_at before update on public.os_audit_findings for each row execute function public.os_set_updated_at();
create trigger os_incidents_set_updated_at before update on public.os_incidents for each row execute function public.os_set_updated_at();
create trigger os_ai_agents_set_updated_at before update on public.os_ai_agents for each row execute function public.os_set_updated_at();
create trigger os_approvals_set_updated_at before update on public.os_approvals for each row execute function public.os_set_updated_at();
create trigger os_evidence_links_set_updated_at before update on public.os_evidence_links for each row execute function public.os_set_updated_at();
create trigger os_coverage_items_set_updated_at before update on public.os_coverage_items for each row execute function public.os_set_updated_at();
