import { redirect } from "next/navigation";

/** Spotify-Admin-Seite entfällt — Embed läuft nur in der Sidebar, ohne Admin-Pflege. */
export default function AdminSpotifySettingsPage() {
  redirect("/admin");
}
