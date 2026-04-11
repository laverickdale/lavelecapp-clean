import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/data";

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "")
    .replace(/\n/g, " ");
}

function wrapText(value: string, maxLength = 92) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLength) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createPdfBytes(lines: string[]) {
  const pageWidth = 595;
  const pageHeight = 842;
  const topMargin = 790;
  const lineHeight = 15;
  const linesPerPage = 46;

  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  if (!pages.length) pages.push([""]);

  const objects: string[] = [];
  const pageObjectNumbers: number[] = [];

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [PAGES] /Count COUNT >>\nendobj");
  objects.push("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj");
  objects.push("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj");

  let objectNumber = 5;

  for (const pageLines of pages) {
    const pageNumber = objectNumber++;
    const contentNumber = objectNumber++;
    pageObjectNumbers.push(pageNumber);

    const commands: string[] = [
      "BT",
      "/F1 11 Tf",
      `50 ${topMargin} Td`,
    ];

    pageLines.forEach((line, index) => {
      const safeLine = escapePdfText(line);
      if (index === 0) {
        commands.push(`(${safeLine}) Tj`);
      } else {
        commands.push(`0 -${lineHeight} Td`);
        commands.push(`(${safeLine}) Tj`);
      }
    });

    commands.push("ET");
    const stream = commands.join("\n");

    objects.push(
      `${pageNumber} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNumber} 0 R >>\nendobj`
    );
    objects.push(
      `${contentNumber} 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream\nendobj`
    );
  }

  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>\nendobj`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function safeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();

  if (!userId) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: jobsheet, error: jobsheetError } = await supabase
    .from("site_jobsheets")
    .select(
      "id, site_id, folder_id, site_visit_id, job_id, title, engineer_name, work_summary, materials_used, follow_up_required, follow_up_notes, client_name, created_at"
    )
    .eq("id", id)
    .single();

  if (jobsheetError || !jobsheet) {
    return NextResponse.json({ error: "Jobsheet not found." }, { status: 404 });
  }

  const [siteResult, visitResult, jobResult, photosResult] = await Promise.all([
    supabase
      .from("sites")
      .select("id, customer_id, name, address")
      .eq("id", jobsheet.site_id)
      .single(),
    jobsheet.site_visit_id
      ? supabase
          .from("site_visits")
          .select("id, visit_date, visit_type, summary")
          .eq("id", jobsheet.site_visit_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
    jobsheet.job_id
      ? supabase
          .from("jobs")
          .select("id, job_number, title")
          .eq("id", jobsheet.job_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("site_images")
      .select("id, caption, tag, file_name")
      .eq("jobsheet_id", jobsheet.id)
      .order("created_at", { ascending: true }),
  ]);

  const customerId = siteResult.data?.customer_id ?? null;
  const customerResult = customerId
    ? await supabase.from("customers").select("name").eq("id", customerId).single()
    : { data: null, error: null };

  const photoCount = photosResult.data?.length ?? 0;
  const photoLines = (photosResult.data ?? []).flatMap((photo, index) => {
    const label = [photo.tag ?? "general", photo.caption ?? photo.file_name ?? `Photo ${index + 1}`]
      .filter(Boolean)
      .join(" — ");
    return wrapText(`• ${label}`);
  });

  const lines: string[] = [];
  const pushBlock = (label: string, value: string | null | undefined) => {
    lines.push(`${label}:`);
    const text = value && value.trim() ? value.trim() : "Not recorded";
    wrapText(text).forEach((line) => lines.push(line));
    lines.push("");
  };

  lines.push("LAVELEC OPS — JOBSHEET EXPORT");
  lines.push("");
  pushBlock("Jobsheet title", jobsheet.title);
  pushBlock("Site", siteResult.data?.name ?? "Unknown site");
  pushBlock("Customer", customerResult.data?.name ?? jobsheet.client_name ?? "Unknown customer");
  pushBlock("Site address", siteResult.data?.address ?? "Not recorded");
  pushBlock("Engineer", jobsheet.engineer_name ?? "Unknown engineer");
  pushBlock("Created", formatDateTime(jobsheet.created_at));
  pushBlock("Visit date", formatDateTime(visitResult.data?.visit_date ?? null));
  pushBlock(
    "Linked job",
    jobResult.data ? `${jobResult.data.job_number} — ${jobResult.data.title}` : "No linked job"
  );
  pushBlock("Work completed", jobsheet.work_summary ?? "");
  pushBlock("Materials used", jobsheet.materials_used ?? "");
  pushBlock("Follow-up required", jobsheet.follow_up_required ? "Yes" : "No");
  pushBlock("Follow-up notes", jobsheet.follow_up_notes ?? "");
  pushBlock("Related photos", `${photoCount} linked photo${photoCount === 1 ? "" : "s"}`);

  if (photoLines.length) {
    lines.push("Photo notes:");
    photoLines.forEach((line) => lines.push(line));
    lines.push("");
  }

  pushBlock("Site visit summary", visitResult.data?.summary ?? "");
  lines.push("Generated from Lavelec Ops. Photos remain stored in the live site file.");

  const bytes = createPdfBytes(lines);
  const fileName = safeFilename(jobsheet.title || `jobsheet-${jobsheet.id}`) || `jobsheet-${jobsheet.id}`;

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
