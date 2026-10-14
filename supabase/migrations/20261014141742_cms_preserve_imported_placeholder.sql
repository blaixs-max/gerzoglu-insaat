-- Preserve the authoritative imported coverless project when its text is edited.
-- Draft-supplied legacy flags cannot waive cover requirements for a new project.
create or replace function cms_private.validate_document(p_document jsonb, p_project_id uuid, p_publish boolean) returns void
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
  if p_publish and (length(trim(coalesce(p_document->>'name',''))) = 0 or length(trim(coalesce(p_document->>'district',''))) = 0 or ((p_document->'cover' is null or p_document->'cover' = 'null'::jsonb) and not exists(select 1 from public.cms_projects existing where existing.id=p_project_id and existing.published is not null and (existing.published->'cover' is null or existing.published->'cover' = 'null'::jsonb)))) then
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
