-- Geokoordinaten für Events ohne Zuordnung (Elisabethszell, Löwenberg / Löwenberger Land)

update public.external_events
set
  lat = 48.6792,
  lng = 13.1523,
  geocoding_status = 'success',
  geocoded_at = now()
where is_visible = true
  and (lat is null or geocoding_status = 'failed')
  and (
    city ilike '%Elisabethszell%'
    or venue ilike '%Elisabethszell%'
    or address ilike '%Elisabethszell%'
  );

update public.external_events
set
  lat = 52.9667,
  lng = 13.1500,
  geocoding_status = 'success',
  geocoded_at = now()
where is_visible = true
  and (lat is null or geocoding_status = 'failed')
  and (
    city ilike '%Löwenberg%'
    or city ilike '%Löwenberger%'
    or venue ilike '%Löwenberg%'
    or venue ilike '%Löwenberger%'
    or address ilike '%Löwenberg%'
    or address ilike '%Löwenberger%'
  );

insert into public.geocoding_cache (address_signature, lat, lng, status)
select distinct
  lower(trim(concat_ws(', ', nullif(trim(coalesce(address, venue, '')), ''), postal_code, city, country))),
  lat,
  lng,
  'success'
from public.external_events
where lat is not null
  and lng is not null
  and (
    city ilike '%Elisabethszell%'
    or city ilike '%Löwenberg%'
    or city ilike '%Löwenberger%'
  )
on conflict (address_signature) do update set
  lat = excluded.lat,
  lng = excluded.lng,
  status = excluded.status,
  geocoded_at = now();
