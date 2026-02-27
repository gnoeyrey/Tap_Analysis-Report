export interface Folder { id: string; name: string; parent_id: string; }

export interface StartupDetail {
  id: string;
  company_name: string;
  founding_date?: string;
  company_tel?: string;
  company_email?: string;
  company_address?: string;
  homepage?: string;
  ceo_name?: string;
  ceo_tel?: string;
  ceo_email?: string;
  biz_number?: string;
  corp_number?: string;
  biz_type?: string;
  manager_name?: string;
  manager_tel?: string;
  manager_email?: string;
  service_summary?: string;
  tips_info?: string;
  logo_url?: string;
  support_needs?: string[];
  support_needs_other?: string;
  created_at: string;
  education?: any[];
  careers?: any[];
  investments?: any[];
  services?: any[];
  sales?: any[];
  ips?: any[];
  biz_history?: any[];
  awards?: any[];
}
