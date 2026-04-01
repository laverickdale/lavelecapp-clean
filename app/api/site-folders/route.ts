import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/data";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function POST(request: Request) {
  const userId = await requireUserId();

  if (!userId) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", userId).single();

  if (!profile || !["director", "office"].includes(profile.role)) {
    return NextResponse.json({ error: "Only directors or office staff can add folders." }, { status: 403 });
  }

  const body = (await request.json()) as { siteId?: string; name?: string };
  const siteId = String(body.siteId ?? "").trim();
  const name = String(body.name ?? "").trim();
  const slug = slugify(name);

  if (!siteId || !name || !slug) {
    return NextResponse.json({ error: "Site and folder name are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("site_folders")
    .insert({
      site_id: siteId,
      name,
      slug,
      created_by_name: profile.full_name,
      is_default: false,
    })
    .select("id, site_id, name, slug, is_default, created_by_name, created_at")
    .single();

  if (error || !data) {
    const message = error?.message?.includes("site_folders_site_id_slug_key")
      ? "A folder with that name already exists for this site."
      : error?.message ?? "Could not create the folder.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ folder: data });
}
