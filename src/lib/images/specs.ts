/** Zielgrößen für Storage — an max. Anzeige im UI (inkl. ~2× Retina). */

/** Topbar/Profil max. 40px → 96px Storage reicht für Hover (~56px). */
export const AVATAR_STORAGE_PX = 96;
export const AVATAR_MAX_BYTES = 28_000;

/** Feed-Vorschau max-h-28 (~112px), Lightbox bis ~960px — Storage 720px Seite. */
export const POST_MEDIA_MAX_SIDE_PX = 720;
export const POST_MEDIA_MAX_BYTES = 102_400;

/** Rohe Uploads (Handy-Fotos) — werden serverseitig verkleinert. */
export const AVATAR_INPUT_MAX_BYTES = 8 * 1024 * 1024;
export const POST_MEDIA_INPUT_MAX_BYTES = 12 * 1024 * 1024;
