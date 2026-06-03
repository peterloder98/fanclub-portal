import { getAvatarPublicUrl } from "@/lib/avatars/url";

export type ProfileDisplayRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_path?: string | null;
  updated_at?: string | null;
};

export function profileDisplayName(p: ProfileDisplayRow) {
  return p.first_name && p.last_name
    ? `${p.first_name} ${p.last_name}`
    : (p.email ?? "Mitglied");
}

export function profileToUserListEntry(p: ProfileDisplayRow) {
  return {
    id: p.id,
    name: profileDisplayName(p),
    avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at ?? null),
  };
}
