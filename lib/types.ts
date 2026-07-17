export type PosterStatus = "draft" | "published" | "archived";

export type Poster = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  preview_path: string;
  original_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  credit_cost: number;
  status: PosterStatus;
  featured: boolean;
  created_at: string;
  published_at: string | null;
  preview_url?: string;
  unlocked?: boolean;
};

export type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  amount_kes: number;
  active: boolean;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "client" | "admin";
  welcome_credits_granted_at: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  user_id: string;
  reference: string;
  package_id: string | null;
  credits: number;
  expected_amount_minor: number;
  paid_amount_minor: number | null;
  status: "pending" | "paid" | "failed" | "abandoned";
  provider_transaction_id: string | null;
  created_at: string;
  paid_at: string | null;
};
