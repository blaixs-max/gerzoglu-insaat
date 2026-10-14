-- Initial CMS migration. Private drafts are published only through versioned atomic RPCs.
create schema if not exists cms_private;
revoke all on schema cms_private from public, anon, authenticated;
grant usage on schema cms_private to authenticated, service_role;
alter default privileges in schema cms_private revoke execute on functions from public;

create table public.cms_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cms_projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 160),
  version integer not null default 1 check (version > 0),
  publication_state text not null default 'draft' check (publication_state in ('draft','published','archived')),
  draft jsonb not null check (jsonb_typeof(draft) = 'object'),
  published jsonb check (published is null or jsonb_typeof(published) = 'object'),
  current_revision_id uuid,
  previous_published_revision_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  archived_at timestamptz,
  constraint cms_projects_publication_consistent check (publication_state <> 'published' or (published is not null and published_at is not null)),
  constraint cms_projects_document_slug check (draft->>'slug' = slug and (published is null or published->>'slug' = slug))
);

-- The only public catalogue. No drafts, admin identities, private upload paths or revisions.
create table public.cms_public_projects (
  id uuid primary key references public.cms_projects(id) on delete cascade,
  slug text not null unique,
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  published_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table public.cms_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.cms_projects(id) on delete cascade,
  project_version integer not null check (project_version > 0),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique(project_id, project_version)
);
alter table public.cms_projects add constraint cms_projects_current_revision_fkey foreign key(current_revision_id) references public.cms_revisions(id) on delete set null;
alter table public.cms_projects add constraint cms_projects_previous_revision_fkey foreign key(previous_published_revision_id) references public.cms_revisions(id) on delete set null;
create index cms_revisions_project_history_idx on public.cms_revisions(project_id, created_at desc);
create index cms_revisions_created_by_idx on public.cms_revisions(created_by);
create index cms_projects_created_by_idx on public.cms_projects(created_by);
create index cms_projects_updated_by_idx on public.cms_projects(updated_by);
create index cms_projects_current_revision_idx on public.cms_projects(current_revision_id);
create index cms_projects_previous_revision_idx on public.cms_projects(previous_published_revision_id);

create table public.cms_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.cms_projects(id) on delete cascade,
  bucket text not null default 'project-media-originals' check (bucket = 'project-media-originals'),
  path text not null unique check (length(path) between 1 and 512 and path !~ '(^|/)\.\.(/|$)'),
  file_name text not null default '',
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/avif')),
  size_bytes bigint not null check (size_bytes between 1 and 20971520),
  status text not null default 'pending' check (status in ('pending','processing','ready','failed')),
  width integer check (width > 0 and width <= 30000),
  height integer check (height > 0 and height <= 30000),
  variants jsonb not null default '[]'::jsonb check (jsonb_typeof(variants) = 'array'),
  image jsonb check (image is null or jsonb_typeof(image) = 'object'),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint cms_media_ready_dimensions check (status <> 'ready' or (width is not null and height is not null and image is not null and jsonb_array_length(variants) > 0))
);
create index cms_media_project_idx on public.cms_media(project_id);
create index cms_media_created_by_idx on public.cms_media(created_by);

create table public.cms_audit_log (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.cms_projects(id) on delete cascade,
  action text not null check (action in ('create','save','publish','archive','restore','discard','restore_revision','reorder')),
  before_version integer,
  after_version integer not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
create index cms_audit_log_project_idx on public.cms_audit_log(project_id, created_at desc);
create index cms_audit_log_created_by_idx on public.cms_audit_log(created_by);

alter table public.cms_admins enable row level security;
alter table public.cms_projects enable row level security;
alter table public.cms_public_projects enable row level security;
alter table public.cms_revisions enable row level security;
alter table public.cms_media enable row level security;
alter table public.cms_audit_log enable row level security;

-- Fresh database lookup means disabling an administrator also stops still-valid JWTs.
create function cms_private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.cms_admins where user_id = (select auth.uid()) and active);
$$;
create function cms_private.require_admin() returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null or not exists(select 1 from public.cms_admins where user_id = v_user and active) then
    raise exception using errcode = '42501', message = 'CMS_ADMIN_REQUIRED';
  end if;
  return v_user;
end;
$$;

create policy cms_admin_membership_self on public.cms_admins for select to authenticated using (user_id = (select auth.uid()));
create policy cms_projects_admin_read on public.cms_projects for select to authenticated using ((select cms_private.is_admin()));
create policy cms_revisions_admin_read on public.cms_revisions for select to authenticated using ((select cms_private.is_admin()));
create policy cms_media_admin_read on public.cms_media for select to authenticated using ((select cms_private.is_admin()));
create policy cms_audit_admin_read on public.cms_audit_log for select to authenticated using ((select cms_private.is_admin()));
create policy cms_public_catalogue_read on public.cms_public_projects for select to anon, authenticated using (true);

revoke all on public.cms_admins, public.cms_projects, public.cms_public_projects, public.cms_revisions, public.cms_media, public.cms_audit_log from public, anon, authenticated;
grant select on public.cms_admins, public.cms_projects, public.cms_revisions, public.cms_media, public.cms_audit_log to authenticated;
grant select on public.cms_public_projects to anon, authenticated;
grant all on public.cms_admins, public.cms_projects, public.cms_public_projects, public.cms_revisions, public.cms_media, public.cms_audit_log to service_role;
grant usage, select on sequence public.cms_audit_log_id_seq to service_role;

-- Validation occurs in PostgreSQL as well as HTTP handlers: direct RPC calls cannot bypass it.
create function cms_private.validate_document(p_document jsonb, p_project_id uuid, p_publish boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_image jsonb;
  v_media public.cms_media%rowtype;
  v_id uuid;
  v_date text;
begin
  if p_document is null or jsonb_typeof(p_document) <> 'object' or octet_length(p_document::text) > 2097152 then
    raise exception using errcode = '22023', message = 'CMS_INVALID_DOCUMENT';
  end if;
  if jsonb_typeof(p_document->'schemaVersion') is distinct from 'number' or p_document->>'schemaVersion' is distinct from '1' or coalesce(p_document->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_document->>'slug') > 160 then
    raise exception using errcode = '22023', message = 'CMS_INVALID_SLUG';
  end if;
  if coalesce(p_document->>'status','') not in ('teslim','devam','planlanan','satista') then
    raise exception using errcode = '22023', message = 'CMS_INVALID_STATUS';
  end if;
  if p_document ? 'previewSrc' or jsonb_path_exists(p_document, '$.**.previewSrc') then
    raise exception using errcode = '22023', message = 'CMS_PRIVATE_PREVIEW_NOT_STORABLE';
  end if;
  if p_publish and (length(trim(coalesce(p_document->>'name',''))) = 0 or length(trim(coalesce(p_document->>'district',''))) = 0 or p_document->'cover' is null or p_document->'cover' = 'null'::jsonb) then
    raise exception using errcode = '22023', message = 'CMS_REQUIRED_FIELDS';
  end if;
  if length(coalesce(p_document->>'name','')) > 240 or length(coalesce(p_document->>'district','')) > 160 then
    raise exception using errcode = '22023', message = 'CMS_TEXT_TOO_LONG';
  end if;
  if coalesce(jsonb_typeof(p_document->'gallery'),'array') <> 'array' or coalesce(jsonb_typeof(p_document->'interiors'),'array') <> 'array' or coalesce(jsonb_typeof(p_document->'facts'),'array') <> 'array' then
    raise exception using errcode = '22023', message = 'CMS_INVALID_ARRAY';
  end if;
  if jsonb_array_length(coalesce(p_document->'gallery','[]'::jsonb)) > 80 or jsonb_array_length(coalesce(p_document->'interiors','[]'::jsonb)) > 80 then
    raise exception using errcode = '22023', message = 'CMS_TOO_MANY_IMAGES';
  end if;
  foreach v_date in array array[coalesce(p_document#>>'{start,value}',''),coalesce(p_document#>>'{end,value}','')] loop
    if v_date <> '' then
      if v_date !~ '^[0-9]{4}(-[0-9]{2}-[0-9]{2})?$' then
        raise exception using errcode = '22023', message = 'CMS_INVALID_DATE';
      end if;
      if length(v_date) = 10 then perform v_date::date; end if;
    end if;
  end loop;
  if p_document->'constructionArea' is not null and p_document->'constructionArea' <> 'null'::jsonb and (jsonb_typeof(p_document->'constructionArea') <> 'number' or (p_document->>'constructionArea')::numeric < 0) then
    raise exception using errcode = '22023', message = 'CMS_INVALID_AREA';
  end if;
  if p_document->'unitCount' is not null and p_document->'unitCount' <> 'null'::jsonb and (jsonb_typeof(p_document->'unitCount') <> 'number' or (p_document->>'unitCount')::numeric < 0 or (p_document->>'unitCount')::numeric <> trunc((p_document->>'unitCount')::numeric)) then
    raise exception using errcode = '22023', message = 'CMS_INVALID_UNIT_COUNT';
  end if;
  if p_document ? 'listOrder' and (jsonb_typeof(p_document->'listOrder') <> 'number' or (p_document->>'listOrder')::numeric <> trunc((p_document->>'listOrder')::numeric) or abs((p_document->>'listOrder')::numeric) > 1000000) then
    raise exception using errcode = '22023', message = 'CMS_INVALID_ORDER';
  end if;
  for v_image in
    select image from (
      select p_document->'cover' as image
      union all select value from jsonb_array_elements(coalesce(p_document->'gallery','[]'::jsonb))
      union all select value from jsonb_array_elements(coalesce(p_document->'interiors','[]'::jsonb))
    ) images where image is not null and image <> 'null'::jsonb
  loop
    if jsonb_typeof(v_image) <> 'object' or coalesce(v_image->>'kind','other') not in ('exterior','interior','plan','other') then
      raise exception using errcode = '22023', message = 'CMS_INVALID_IMAGE';
    end if;
    if coalesce(v_image->>'id','') <> '' then
      begin v_id := (v_image->>'id')::uuid;
      exception when invalid_text_representation then raise exception using errcode = '22023', message = 'CMS_INVALID_MEDIA_ID'; end;
      select * into v_media from public.cms_media where id = v_id and project_id = p_project_id for share;
      if not found then raise exception using errcode = '22023', message = 'CMS_MEDIA_NOT_OWNED'; end if;
      if p_publish and v_media.status <> 'ready' then raise exception using errcode = '22023', message = 'CMS_MEDIA_NOT_READY'; end if;
      if p_publish and (v_image->>'src' is distinct from v_media.image->>'src' or coalesce(v_image->>'srcset','') is distinct from coalesce(v_media.image->>'srcset','') or v_image->>'width' is distinct from v_media.image->>'width' or v_image->>'height' is distinct from v_media.image->>'height') then
        raise exception using errcode = '22023', message = 'CMS_MEDIA_METADATA_MISMATCH';
      end if;
    else
      if coalesce(v_image->>'src','') !~ '^/(assets|images|img)/[^[:cntrl:]\\]+$' or v_image->>'src' ~ '(^|/)\.\.(/|$)' then
        raise exception using errcode = '22023', message = 'CMS_IMPORTED_IMAGE_PATH_REQUIRED';
      end if;
      if coalesce(v_image->>'srcset','') ~ '(https?:|//|\\|\.\.)' then
        raise exception using errcode = '22023', message = 'CMS_INVALID_SRCSET';
      end if;
    end if;
  end loop;
end;
$$;

create function cms_private.project_result(p_id uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select to_jsonb(p) || jsonb_build_object('has_unpublished_changes',p.draft is distinct from p.published)
  from public.cms_projects p where p.id = p_id;
$$;

create function cms_private.lock_project(p_id uuid, p_expected_version integer) returns public.cms_projects
language plpgsql security definer set search_path = '' as $$
declare v_project public.cms_projects%rowtype;
begin
  perform cms_private.require_admin();
  select * into v_project from public.cms_projects where id = p_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'CMS_PROJECT_NOT_FOUND'; end if;
  if p_expected_version is null or v_project.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'CMS_STALE_VERSION';
  end if;
  return v_project;
end;
$$;

create function cms_private.record_audit(p_id uuid,p_action text,p_before integer,p_after integer) returns void
language sql security definer set search_path = '' as $$
  insert into public.cms_audit_log(project_id,action,before_version,after_version,created_by) values(p_id,p_action,p_before,p_after,auth.uid());
$$;

create function cms_private.record_publication(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_project public.cms_projects%rowtype; v_revision uuid;
begin
  select * into strict v_project from public.cms_projects where id = p_id;
  insert into public.cms_revisions(project_id,project_version,document,created_by) values(p_id,v_project.version,v_project.published,auth.uid()) returning id into v_revision;
  update public.cms_projects set previous_published_revision_id=current_revision_id,current_revision_id=v_revision where id=p_id;
  insert into public.cms_public_projects(id,slug,document,published_at,updated_at) values(p_id,v_project.slug,v_project.published,v_project.published_at,now())
  on conflict(id) do update set slug=excluded.slug,document=excluded.document,published_at=excluded.published_at,updated_at=excluded.updated_at;
end;
$$;

create function cms_private.create_project(p_document jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := cms_private.require_admin(); v_id uuid := gen_random_uuid();
begin
  perform cms_private.validate_document(p_document,v_id,false);
  insert into public.cms_projects(id,slug,draft,created_by,updated_by) values(v_id,p_document->>'slug',p_document,v_user,v_user);
  perform cms_private.record_audit(v_id,'create',null,1);
  return cms_private.project_result(v_id);
end;
$$;

create function cms_private.save_project(p_id uuid,p_expected_version integer,p_document jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_project public.cms_projects%rowtype := cms_private.lock_project(p_id,p_expected_version);
begin
  perform cms_private.validate_document(p_document,p_id,false);
  if p_document->>'slug' is distinct from v_project.slug then
    raise exception using errcode = '22023', message = 'CMS_SLUG_IMMUTABLE';
  end if;
  update public.cms_projects set draft=p_document,version=version+1,updated_at=now(),updated_by=auth.uid() where id=p_id;
  perform cms_private.record_audit(p_id,'save',v_project.version,v_project.version+1);
  return cms_private.project_result(p_id);
end;
$$;

create function cms_private.publish_project(p_id uuid,p_expected_version integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_project public.cms_projects%rowtype := cms_private.lock_project(p_id,p_expected_version);
begin
  perform cms_private.validate_document(v_project.draft,p_id,true);
  update public.cms_media m set published_at=coalesce(published_at,now()) where m.project_id=p_id and exists (
    select 1 from (
      select v_project.draft->'cover' as image
      union all select value from jsonb_array_elements(coalesce(v_project.draft->'gallery','[]'::jsonb))
      union all select value from jsonb_array_elements(coalesce(v_project.draft->'interiors','[]'::jsonb))
    ) refs where refs.image->>'id'=m.id::text
  );
  update public.cms_projects set published=draft,publication_state='published',version=version+1,published_at=now(),archived_at=null,updated_at=now(),updated_by=auth.uid() where id=p_id;
  perform cms_private.record_publication(p_id);
  perform cms_private.record_audit(p_id,'publish',v_project.version,v_project.version+1);
  return cms_private.project_result(p_id);
end;
$$;

create function cms_private.archive_project(p_id uuid,p_expected_version integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_project public.cms_projects%rowtype := cms_private.lock_project(p_id,p_expected_version);
begin
  update public.cms_projects set publication_state='archived',archived_at=now(),version=version+1,updated_at=now(),updated_by=auth.uid() where id=p_id;
  delete from public.cms_public_projects where id=p_id;
  perform cms_private.record_audit(p_id,'archive',v_project.version,v_project.version+1);
  return cms_private.project_result(p_id);
end;
$$;

-- Restore removes archive state into a private draft. Publishing always remains explicit.
create function cms_private.restore_project(p_id uuid,p_expected_version integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_project public.cms_projects%rowtype := cms_private.lock_project(p_id,p_expected_version);
begin
  if v_project.publication_state <> 'archived' then raise exception using errcode='22023',message='CMS_NOT_ARCHIVED'; end if;
  update public.cms_projects set publication_state='draft',archived_at=null,version=version+1,updated_at=now(),updated_by=auth.uid() where id=p_id;
  perform cms_private.record_audit(p_id,'restore',v_project.version,v_project.version+1);
  return cms_private.project_result(p_id);
end;
$$;

create function cms_private.discard_draft(p_id uuid,p_expected_version integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_project public.cms_projects%rowtype := cms_private.lock_project(p_id,p_expected_version);
begin
  if v_project.published is null then raise exception using errcode='22023',message='CMS_NO_PUBLISHED_REVISION'; end if;
  update public.cms_projects set draft=published,version=version+1,updated_at=now(),updated_by=auth.uid() where id=p_id;
  perform cms_private.record_audit(p_id,'discard',v_project.version,v_project.version+1);
  return cms_private.project_result(p_id);
end;
$$;

create function cms_private.restore_revision(p_id uuid,p_expected_version integer,p_revision_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_project public.cms_projects%rowtype := cms_private.lock_project(p_id,p_expected_version); v_document jsonb;
begin
  select document into v_document from public.cms_revisions where id=p_revision_id and project_id=p_id;
  if not found then raise exception using errcode='P0002',message='CMS_REVISION_NOT_FOUND'; end if;
  update public.cms_projects set draft=v_document,version=version+1,updated_at=now(),updated_by=auth.uid() where id=p_id;
  perform cms_private.record_audit(p_id,'restore_revision',v_project.version,v_project.version+1);
  return cms_private.project_result(p_id);
end;
$$;

create function cms_private.reorder_projects(p_ids uuid[],p_expected_versions jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
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
    if p_expected_versions->>v_id::text is distinct from v_project.version::text then raise exception using errcode='40001',message='CMS_STALE_VERSION'; end if;
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

-- Public wrappers are invokers. Privileged implementations never live in the API schema.
create function public.cms_create_project(p_document jsonb) returns jsonb language sql security invoker set search_path='' as $$ select cms_private.create_project(p_document); $$;
create function public.cms_save_project(p_id uuid,p_expected_version integer,p_document jsonb) returns jsonb language sql security invoker set search_path='' as $$ select cms_private.save_project(p_id,p_expected_version,p_document); $$;
create function public.cms_publish_project(p_id uuid,p_expected_version integer) returns jsonb language sql security invoker set search_path='' as $$ select cms_private.publish_project(p_id,p_expected_version); $$;
create function public.cms_archive_project(p_id uuid,p_expected_version integer) returns jsonb language sql security invoker set search_path='' as $$ select cms_private.archive_project(p_id,p_expected_version); $$;
create function public.cms_restore_project(p_id uuid,p_expected_version integer) returns jsonb language sql security invoker set search_path='' as $$ select cms_private.restore_project(p_id,p_expected_version); $$;
create function public.cms_discard_draft(p_id uuid,p_expected_version integer) returns jsonb language sql security invoker set search_path='' as $$ select cms_private.discard_draft(p_id,p_expected_version); $$;
create function public.cms_restore_revision(p_id uuid,p_expected_version integer,p_revision_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select cms_private.restore_revision(p_id,p_expected_version,p_revision_id); $$;
create function public.cms_reorder_projects(p_ids uuid[],p_expected_versions jsonb) returns jsonb language sql security invoker set search_path='' as $$ select cms_private.reorder_projects(p_ids,p_expected_versions); $$;

revoke all on all functions in schema cms_private from public, anon, authenticated;
grant execute on function cms_private.is_admin(),cms_private.require_admin(),cms_private.create_project(jsonb),cms_private.save_project(uuid,integer,jsonb),cms_private.publish_project(uuid,integer),cms_private.archive_project(uuid,integer),cms_private.restore_project(uuid,integer),cms_private.discard_draft(uuid,integer),cms_private.restore_revision(uuid,integer,uuid),cms_private.reorder_projects(uuid[],jsonb) to authenticated;
revoke execute on function public.cms_create_project(jsonb),public.cms_save_project(uuid,integer,jsonb),public.cms_publish_project(uuid,integer),public.cms_archive_project(uuid,integer),public.cms_restore_project(uuid,integer),public.cms_discard_draft(uuid,integer),public.cms_restore_revision(uuid,integer,uuid),public.cms_reorder_projects(uuid[],jsonb) from public,anon;
grant execute on function public.cms_create_project(jsonb),public.cms_save_project(uuid,integer,jsonb),public.cms_publish_project(uuid,integer),public.cms_archive_project(uuid,integer),public.cms_restore_project(uuid,integer),public.cms_discard_draft(uuid,integer),public.cms_restore_revision(uuid,integer,uuid),public.cms_reorder_projects(uuid[],jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('project-media-originals','project-media-originals',false,20971520,array['image/jpeg','image/png','image/webp','image/avif']),
       ('project-media-variants','project-media-variants',false,20971520,array['image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- No storage.objects policy grants browser upload, replacement or public reads.
-- Server issues one immutable-path signed upload after active admin authorization.
