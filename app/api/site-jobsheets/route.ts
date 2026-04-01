import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/data";

export async function POST(request: Request) {
  const userId = await requireUserId();

  if (!userId) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
  const body = (await request.json()) as {
    siteId?: string;
    title?: string;
    jobId?: string | null;
    workSummary?: string;
    materialsUsed?: string;
    followUpRequired?: boolean;
    followUpNotes?: string;
    clientName?: string;
  };

  const siteId = String(body.siteId ?? "").trim();
  const title = String(body.title ?? "").trim();
  const workSummary = String(body.workSummary ?? "").trim();
  const materialsUsed = String(body.materialsUsed ?? "").trim();
  const followUpNotes = String(body.followUpNotes ?? "").trim();
  const clientName = String(body.clientName ?? "").trim();
  const followUpRequired = Boolean(body.followUpRequired);
  const jobId = body.jobId ? String(body.jobId) : null;

  if (!siteId || !title || !workSummary) {
    return NextResponse.json({ error: "Site, jobsheet title and work summary are required." }, { status: 400 });
  }

  const engineerName = profile?.full_name ?? "Unknown user";

  const { data: folder } = await supabase
    .from("site_folders")
    .select("id, site_id, name, slug, is_default, created_by_name, created_at")
    .eq("site_id", siteId)
    .eq("slug", "jobsheets")
    .single();

  if (!folder) {
    return NextResponse.json({ error: "The Jobsheets folder is missing for this site. Run the site-folders upgrade SQL first." }, { status: 400 });
  }

  const visitDate = new Date().toISOString();

  const { data: visit, error: visitError } = await supabase
    .from("site_visits")
    .insert({
      site_id: siteId,
      job_id: jobId,
      visit_date: visitDate,
      title,
      visit_type: "Jobsheet",
      engineer_name: engineerName,
      summary: workSummary,
    })
    .select("id, site_id, job_id, visit_date, title, visit_type, engineer_name, summary")
    .single();

  if (visitError || !visit) {
    return NextResponse.json({ error: visitError?.message ?? "Could not create the site visit record." }, { status: 400 });
  }

  const { data: jobsheet, error: jobsheetError } = await supabase
    .from("site_jobsheets")
    .insert({
      site_id: siteId,
      folder_id: folder.id,
      site_visit_id: visit.id,
      job_id: jobId,
      title,
      engineer_name: engineerName,
      work_summary: workSummary,
      materials_used: materialsUsed || null,
      follow_up_required: followUpRequired,
      follow_up_notes: followUpNotes || null,
      client_name: clientName || null,
    })
    .select(
      "id, site_id, folder_id, site_visit_id, job_id, title, engineer_name, work_summary, materials_used, follow_up_required, follow_up_notes, client_name, created_at"
    )
    .single();

  if (jobsheetError || !jobsheet) {
    return NextResponse.json({ error: jobsheetError?.message ?? "Could not create the jobsheet." }, { status: 400 });
  }

  await supabase.from("sites").update({ last_visit_at: visitDate }).eq("id", siteId);

  return NextResponse.json({ folder, visit, jobsheet });
}
