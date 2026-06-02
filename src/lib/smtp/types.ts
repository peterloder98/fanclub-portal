export type SmtpEncryption = "SSL" | "TLS" | "STARTTLS" | "NONE";

export type SmtpAccountPublic = {
  id: string;
  server: string;
  port: number;
  encryption: SmtpEncryption;
  email: string;
  display_name: string | null;
  reply_to: string | null;
  is_default: boolean;
  artistflow_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SmtpAccountInput = {
  server: string;
  port: number;
  encryption: SmtpEncryption;
  email: string;
  password?: string;
  display_name?: string | null;
  reply_to?: string | null;
  is_default?: boolean;
  artistflow_id?: string | null;
};
