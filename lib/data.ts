import { createClient } from "@/lib/supabase/server";
import type {
  ChatMessage,
  ChatThread,
  Customer,
  FieldOpsData,
  Invoice,
  Job,
  Profile,
  Site,
  SiteFolder,
  SiteImage,
  SiteJobsheet,
  SiteVisit,
  SiteWithDetails,
} from "@/lib/types";

export async function loadFieldOpsData(userId: string): Promise<FieldOpsData> {
  const supabase = await createClient();

  const [
    profileResult,
    customersResult,
    sitesResult,
    visitsResult,
    imagesResult,
    foldersResult,
    jobsheetsResult,
    jobsResult,
    invoicesResult,
    threadsResult,
    messagesResult,
    teamMembersResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role").eq("id", userId).single(),
    supabase.from("customers").select("id, name, primary_contact, phone, email, address").order("name"),
    supabase
      .from("sites")
      .select("id, customer_id, name, address, notes, primary_engineer_name, last_visit_at, next_visit_at")
      .order("name"),
    supabase
      .from("site_visits")
      .select("id, site_id, job_id, visit_date, title, visit_type, engineer_name, summary")
      .order("visit_date", { ascending: false }),
    supabase
      .from("site_images")
      .select("id, site_id, folder_id, jobsheet_id, image_url, caption, tag, file_name, storage_path, uploaded_by_name, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("site_folders")
      .select("id, site_id, name, slug, is_default, created_by_name, created_at")
      .order("name"),
    supabase
      .from("site_jobsheets")
      .select(
        "id, site_id, folder_id, site_visit_id, job_id, title, engineer_name, work_summary, materials_used, follow_up_required, follow_up_notes, client_name, created_at"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("jobs")
      .select(
        "id, job_number, title, customer_id, site_id, job_type, stage, assignee_name, scheduled_for, value_gbp, summary"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, invoice_number, customer_id, amount_gbp, status, due_date")
      .order("due_date", { ascending: true }),
    supabase.from("chat_threads").select("id, name, directors_only").order("name"),
    supabase
      .from("chat_messages")
      .select("id, thread_id, author_name, body, created_at")
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, email, full_name, role, created_at").order("created_at", { ascending: true }),
  ]);

  if (profileResult.error || !profileResult.data) {
    throw new Error(profileResult.error?.message || "Unable to load your profile.");
  }

  const currentUser = profileResult.data as Profile;
  const customers = (customersResult.data ?? []) as Customer[];
  const sites = (sitesResult.data ?? []) as Site[];
  const visits = (visitsResult.data ?? []) as SiteVisit[];
  const images = (imagesResult.data ?? []) as SiteImage[];
  const folders = (foldersResult.data ?? []) as SiteFolder[];
  const jobsheets = (jobsheetsResult.data ?? []) as SiteJobsheet[];
  const jobsRaw = (jobsResult.data ?? []) as Array<Job & { customer_id?: string | null }>;
  const invoicesRaw = (invoicesResult.data ?? []) as Array<Invoice & { customer_id?: string | null }>;
  const threads = (threadsResult.data ?? []) as ChatThread[];
  const messages = (messagesResult.data ?? []) as ChatMessage[];
  const teamMembers = (teamMembersResult.data ?? []) as Profile[];

  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

  const jobs: Job[] = jobsRaw.map((job) => ({
    id: job.id,
    job_number: job.job_number,
    title: job.title,
    customer_name: customerMap.get(job.customer_id ?? "")?.name ?? "Unknown customer",
    site_id: job.site_id,
    job_type: job.job_type,
    stage: job.stage,
    assignee_name: job.assignee_name,
    scheduled_for: job.scheduled_for,
    value_gbp: Number(job.value_gbp ?? 0),
    summary: job.summary,
  }));

  const invoices: Invoice[] = invoicesRaw.map((invoice) => ({
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    customer_id: invoice.customer_id ?? null,
    customer_name: customerMap.get(invoice.customer_id ?? "")?.name ?? "Unknown customer",
    amount_gbp: Number(invoice.amount_gbp ?? 0),
    status: invoice.status,
    due_date: invoice.due_date,
  }));

  const sitesWithDetails: SiteWithDetails[] = sites.map((site) => ({
    ...site,
    customer_name: customerMap.get(site.customer_id ?? "")?.name ?? "Unknown customer",
    visits: visits.filter((visit) => visit.site_id === site.id),
    images: images.filter((image) => image.site_id === site.id),
    folders: folders.filter((folder) => folder.site_id === site.id),
    jobsheets: jobsheets.filter((jobsheet) => jobsheet.site_id === site.id),
  }));

  const initialMessages = Object.fromEntries(
    threads.map((thread) => [thread.id, messages.filter((message) => message.thread_id === thread.id)])
  );

  return {
    currentUser,
    customers,
    sites: sitesWithDetails,
    jobs,
    invoices,
    threads,
    teamMembers,
    initialMessages,
  };
}

export async function requireUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return typeof data?.claims?.sub === "string" ? data.claims.sub : null;
}
