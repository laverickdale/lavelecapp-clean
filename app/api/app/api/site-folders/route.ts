import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { WorkflowStage } from "@/lib/types";
import { nextStage } from "@/lib/utils";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();

  if (!userId) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("jobs")
    .select("id, job_number, title, customer_id, site_id, job_type, stage, assignee_name, scheduled_for, value_gbp, summary")
    .eq("id", id)
    .single();

  if (existingError || !existing) {
    return NextResponse.json({ error: existingError?.message ?? "Job not found." }, { status: 404 });
  }

  const newStage = nextStage(existing.stage as WorkflowStage);

  const { data: updated, error } = await supabase
    .from("jobs")
    .update({ stage: newStage })
    .eq("id", id)
    .select("id, job_number, title, customer_id, site_id, job_type, stage, assignee_name, scheduled_for, value_gbp, summary")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Could not update the job." }, { status: 400 });
  }

  const customer = updated.customer_id
    ? (await supabase.from("customers").select("name").eq("id", updated.customer_id).single()).data
    : null;

  return NextResponse.json({
    job: {
      id: updated.id,
      job_number: updated.job_number,
      title: updated.title,
      customer_name: customer?.name ?? "Unknown customer",
      site_id: updated.site_id,
      job_type: updated.job_type,
      stage: updated.stage,
      assignee_name: updated.assignee_name,
      scheduled_for: updated.scheduled_for,
      value_gbp: Number(updated.value_gbp ?? 0),
      summary: updated.summary,
    },
  });
}
