export type AppRole = "director" | "office" | "engineer";
export type View =
  | "dashboard"
  | "calendar"
  | "workflow"
  | "sites"
  | "chat"
  | "customers"
  | "invoices"
  | "compliance"
  | "team"
  | "onedrive";

export type Tone = "slate" | "blue" | "green" | "amber" | "red" | "purple";

export type WorkflowStage =
  | "quote_sent"
  | "accepted"
  | "declined"
  | "po_received"
  | "materials_ordered"
  | "booked"
  | "completed"
  | "not_completed"
  | "report_complete"
  | "invoice_sent";

export type JobType = "Electrical" | "Fire";
export type InvoiceStatus = "draft" | "due" | "paid" | "overdue";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  role: AppRole;
  created_at?: string;
};

export type Customer = {
  id: string;
  name: string;
  primary_contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export type Job = {
  id: string;
  job_number: string;
  title: string;
  customer_name: string;
  site_id: string | null;
  job_type: JobType;
  stage: WorkflowStage;
  assignee_name: string | null;
  scheduled_for: string | null;
  value_gbp: number;
  summary: string | null;
};

export type SiteVisit = {
  id: string;
  site_id: string;
  visit_date: string;
  title: string;
  visit_type: string;
  engineer_name: string | null;
  summary: string | null;
};

export type SiteImage = {
  id: string;
  site_id: string;
  image_url: string | null;
  caption: string | null;
  uploaded_by_name: string | null;
  created_at: string;
};

export type Site = {
  id: string;
  customer_id: string | null;
  name: string;
  address: string | null;
  notes: string | null;
  primary_engineer_name: string | null;
  last_visit_at: string | null;
  next_visit_at: string | null;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name: string;
  amount_gbp: number;
  status: InvoiceStatus;
  due_date: string | null;
};

export type ChatThread = {
  id: string;
  name: string;
  directors_only: boolean;
};

export type ChatMessage = {
  id: string;
  thread_id: string;
  author_name: string | null;
  body: string;
  created_at: string;
};

export type SiteWithDetails = Site & {
  customer_name: string;
  visits: SiteVisit[];
  images: SiteImage[];
};

export type FieldOpsData = {
  currentUser: Profile;
  jobs: Job[];
  customers: Customer[];
  sites: SiteWithDetails[];
  invoices: Invoice[];
  threads: ChatThread[];
  teamMembers: Profile[];
  initialMessages: Record<string, ChatMessage[]>;
};

export const WORKFLOW_STAGES: Array<{ key: WorkflowStage; label: string }> = [
  { key: "quote_sent", label: "Quote sent" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
  { key: "po_received", label: "PO received" },
  { key: "materials_ordered", label: "Materials ordered" },
  { key: "booked", label: "Job booked in" },
  { key: "completed", label: "Job completed" },
  { key: "not_completed", label: "Not completed" },
  { key: "report_complete", label: "Job report complete" },
  { key: "invoice_sent", label: "Invoice sent" },
];

export const STAGE_LABELS: Record<WorkflowStage, string> = Object.fromEntries(
  WORKFLOW_STAGES.map((stage) => [stage.key, stage.label])
) as Record<WorkflowStage, string>;

export const STAGE_TONES: Record<WorkflowStage, Tone> = {
  quote_sent: "blue",
  accepted: "green",
  declined: "red",
  po_received: "purple",
  materials_ordered: "amber",
  booked: "slate",
  completed: "green",
  not_completed: "red",
  report_complete: "blue",
  invoice_sent: "purple",
};
