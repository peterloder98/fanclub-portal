export type MapEvent = {
  id: string;
  kind?: string | null;
  title: string;
  start_at: string | null;
  ticket_url: string | null;
  venue: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country?: string | null;
  broadcaster?: string | null;
  lat: number | null;
  lng: number | null;
};
