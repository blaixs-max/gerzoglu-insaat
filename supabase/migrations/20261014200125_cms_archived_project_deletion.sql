-- Keep every assigned address reserved after its project is permanently deleted.
-- project_id intentionally has no FK: this minimal address record outlives the project.
create table public.cms_project_addresses (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 160),
  project_id uuid not null unique,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid
);
alter table public.cms_project_addresses enable row level security;
revoke all on public.cms_project_addresses from public, anon, authenticated;
grant select on public.cms_project_addresses to authenticated;
grant all on public.cms_project_addresses to service_role;
create policy cms_project_addresses_admin_read on public.cms_project_addresses
  for select to authenticated using ((select cms_private.is_admin()));

insert into public.cms_project_addresses(slug,project_id,created_at)
select slug,id,created_at from public.cms_projects;

create or replace function cms_private.create_project(p_document jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := cms_private.require_admin(); v_id uuid := gen_random_uuid();
begin
  perform cms_private.validate_document(p_document,v_id,false);
  -- Both reservations happen in one transaction. A conflicting address never overwrites data.
  insert into public.cms_project_addresses(slug,project_id) values(p_document->>'slug',v_id);
  insert into public.cms_projects(id,slug,draft,created_by,updated_by)
    values(v_id,p_document->>'slug',p_document,v_user,v_user);
  perform cms_private.record_audit(v_id,'create',null,1);
  return cms_private.project_result(v_id);
end;
$$;

create function cms_private.delete_project(p_id uuid,p_expected_version integer,p_confirmation_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_project public.cms_projects%rowtype := cms_private.lock_project(p_id,p_expected_version);
begin
  if v_project.publication_state <> 'archived' then
    raise exception using errcode='P0001',message='CMS_DELETE_REQUIRES_ARCHIVE';
  end if;
  if nullif(trim(p_confirmation_name),'') is null
     or trim(p_confirmation_name) is distinct from trim(v_project.draft->>'name') then
    raise exception using errcode='22023',message='CMS_DELETE_NAME_MISMATCH';
  end if;
  -- Also reserve service-imported projects created after the migration's initial backfill.
  insert into public.cms_project_addresses(slug,project_id,created_at,deleted_at,deleted_by)
    values(v_project.slug,p_id,v_project.created_at,now(),auth.uid())
    on conflict(slug) do update set deleted_at=excluded.deleted_at,deleted_by=excluded.deleted_by
      where public.cms_project_addresses.project_id=excluded.project_id;
  if not found then
    raise exception using errcode='P0001',message='CMS_ADDRESS_RESERVATION_MISMATCH';
  end if;
  -- Existing FK cascades remove public catalogue, revision, audit and media rows atomically.
  -- Storage objects are deliberately untouched: removing metadata is not a byte-purge promise.
  delete from public.cms_projects where id=p_id;
  return jsonb_build_object('id',p_id,'deleted',true);
end;
$$;

create function public.cms_delete_project(p_id uuid,p_expected_version integer,p_confirmation_name text)
returns jsonb language sql security invoker set search_path = '' as $$
  select cms_private.delete_project(p_id,p_expected_version,p_confirmation_name);
$$;
revoke execute on function cms_private.delete_project(uuid,integer,text) from public,anon,authenticated;
grant execute on function cms_private.delete_project(uuid,integer,text) to authenticated;
revoke execute on function public.cms_delete_project(uuid,integer,text) from public,anon;
grant execute on function public.cms_delete_project(uuid,integer,text) to authenticated;
