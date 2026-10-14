-- Business-level stale editors must never trigger PostgREST serialization retry loops.
-- SQLSTATE P0001 + CMS_STALE_VERSION is mapped to HTTP409 by the API.
create or replace function cms_private.lock_project(p_id uuid, p_expected_version integer) returns public.cms_projects
language plpgsql security definer set search_path = '' as $$
declare v_project public.cms_projects%rowtype;
begin
  perform cms_private.require_admin();
  select * into v_project from public.cms_projects where id = p_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'CMS_PROJECT_NOT_FOUND'; end if;
  if p_expected_version is null or v_project.version <> p_expected_version then
    raise exception using errcode = 'P0001', message = 'CMS_STALE_VERSION';
  end if;
  return v_project;
end;
$$;

create or replace function cms_private.reorder_projects(p_ids uuid[],p_expected_versions jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_project public.cms_projects%rowtype; v_index integer := 0; v_result jsonb := '[]'::jsonb;
begin
  perform cms_private.require_admin();
  if p_ids is null or cardinality(p_ids)=0 or cardinality(p_ids)>1000 or array_position(p_ids,null) is not null or cardinality(p_ids) <> (select count(distinct x) from unnest(p_ids) x) or jsonb_typeof(p_expected_versions) is distinct from 'object' then
    raise exception using errcode='22023',message='CMS_INVALID_ORDER';
  end if;
  -- Global UUID ordering gives all concurrent reorder transactions the same lock order.
  for v_id in select x from unnest(p_ids) x order by x loop
    select * into v_project from public.cms_projects where id=v_id for update;
    if not found then raise exception using errcode='P0002',message='CMS_PROJECT_NOT_FOUND'; end if;
    if p_expected_versions->>v_id::text is distinct from v_project.version::text then raise exception using errcode='P0001',message='CMS_STALE_VERSION'; end if;
  end loop;
  foreach v_id in array p_ids loop
    v_index := v_index+1;
    select * into strict v_project from public.cms_projects where id=v_id;
    update public.cms_projects set draft=jsonb_set(draft,'{listOrder}',to_jsonb(v_index)),
      published=case when publication_state='published' then jsonb_set(published,'{listOrder}',to_jsonb(v_index)) else published end,
      version=version+1,updated_at=now(),updated_by=auth.uid() where id=v_id;
    if v_project.publication_state='published' then perform cms_private.record_publication(v_id); end if;
    perform cms_private.record_audit(v_id,'reorder',v_project.version,v_project.version+1);
    v_result := v_result || jsonb_build_array(cms_private.project_result(v_id));
  end loop;
  return v_result;
end;
$$;
