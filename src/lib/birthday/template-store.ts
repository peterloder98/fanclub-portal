import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type BirthdayGreetingTemplate = {
  id: string;
  title_template: string;
  body_template: string;
  sort_order: number;
  is_active: boolean;
};

export async function loadActiveBirthdayTemplates(): Promise<BirthdayGreetingTemplate[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("birthday_greeting_templates")
    .select("id,title_template,body_template,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    if (/birthday_greeting_templates|does not exist/i.test(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }
  return (data ?? []) as BirthdayGreetingTemplate[];
}

export async function loadAllBirthdayTemplates(): Promise<BirthdayGreetingTemplate[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("birthday_greeting_templates")
    .select("id,title_template,body_template,sort_order,is_active")
    .order("sort_order", { ascending: true });
  if (error) {
    if (/birthday_greeting_templates|does not exist/i.test(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }
  return (data ?? []) as BirthdayGreetingTemplate[];
}
