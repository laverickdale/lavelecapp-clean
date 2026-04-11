"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  type ChatMessage,
  type FieldOpsData,
  type SiteFolder,
  type SiteImage,
  type SiteImageTag,
  type SiteJobsheet,
  type SiteVisit,
  type Tone,
  type View,
  WORKFLOW_STAGES,
  STAGE_LABELS,
} from "@/lib/types";
import { currency, formatDate, formatDateTime, nextStage, stageTone } from "@/lib/utils";

type CalendarItem = {
  time: string;
  engineer: string;
  task: string;
  site: string;
  tone: Tone;
};

type JobsheetDraft = {
  title: string;
  jobId: string;
  workSummary: string;
  materialsUsed: string;
  followUpRequired: boolean;
  followUpNotes: string;
  clientName: string;
};

type PhotoTagOption = { value: SiteImageTag; label: string };

const PHOTO_TAGS: PhotoTagOption[] = [
  { value: "general", label: "General" },
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
  { value: "issue", label: "Issue" },
  { value: "complete", label: "Complete" },
];

const supabase = createClient();

function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function MetricCard({ label, value, hint }: { label: string; value: ReactNode; hint: string }) {
  return (
    <div className="card metric-card">
      <p className="metric-label">{label}</p>
      <div className="metric-value">{value}</div>
      <p className="metric-hint">{hint}</p>
    </div>
  );
}

function SectionHead({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <div>
        <h3>{title}</h3>
        <p className="muted" style={{ marginTop: 6 }}>
          {subtitle}
        </p>
      </div>
      {action}
    </div>
  );
}

function CalendarCard({ day, items }: { day: string; items: CalendarItem[] }) {
  return (
    <div className="card calendar-card">
      <div className="section-head" style={{ marginBottom: 10 }}>
        <div>
          <h3>{day}</h3>
          <p className="muted">{items.length} scheduled item{items.length === 1 ? "" : "s"}</p>
        </div>
      </div>
      <div className="item-list">
        {items.map((item) => (
          <div className="soft-panel" key={`${day}-${item.time}-${item.task}`}>
            <div className="section-head" style={{ marginBottom: 8 }}>
              <strong>{item.time}</strong>
              <Badge tone={item.tone}>{item.engineer}</Badge>
            </div>
            <p style={{ fontWeight: 700 }}>{item.task}</p>
            <p className="muted" style={{ marginTop: 6 }}>
              {item.site}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function folderTone(slug: string): Tone {
  switch (slug) {
    case "electrical":
      return "blue";
    case "fire":
      return "red";
    case "dbs":
      return "amber";
    case "emergency-lighting":
      return "purple";
    case "jobsheets":
      return "green";
    default:
      return "slate";
  }
}

function folderDescription(slug: string, name: string) {
  switch (slug) {
    case "electrical":
      return "Keep electrical jobs, notes and future uploads grouped together for quick engineer access.";
    case "fire":
      return "Use this for fire alarm work, service history and future fire-specific files.";
    case "dbs":
      return "A home for distribution board photos, schedules and identification notes.";
    case "emergency-lighting":
      return "Store emergency lighting tests, certificates and follow-up items here.";
    case "jobsheets":
      return "Jobsheets created in the app file themselves here automatically, and related photos can be linked here too.";
    case "other":
      return "A flexible folder for anything that does not fit the standard structure yet.";
    default:
      return `Use ${name} for extra site records that matter to your team.`;
  }
}

function createSafeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function photoTagTone(tag: string | null | undefined): Tone {
  switch (tag) {
    case "before":
      return "amber";
    case "after":
    case "complete":
      return "green";
    case "issue":
      return "red";
    default:
      return "blue";
  }
}

function createEmptyJobsheetDraft(siteName?: string): JobsheetDraft {
  return {
    title: siteName ? `${siteName} visit jobsheet` : "",
    jobId: "",
    workSummary: "",
    materialsUsed: "",
    followUpRequired: false,
    followUpNotes: "",
    clientName: "",
  };
}

export default function FieldOpsShell({ initialData }: { initialData: FieldOpsData }) {
  const [view, setView] = useState<View>("dashboard");
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState(initialData.jobs);
  const [sites, setSites] = useState(initialData.sites);
  const [threads] = useState(initialData.threads);
  const [selectedSiteId, setSelectedSiteId] = useState(initialData.sites[0]?.id ?? "");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState(initialData.threads[0]?.id ?? "");
  const [messagesByThread, setMessagesByThread] = useState<Record<string, ChatMessage[]>>(initialData.initialMessages);
  const [messageDraft, setMessageDraft] = useState("");
  const [teamMembers, setTeamMembers] = useState(initialData.teamMembers);
  const [teamSearch, setTeamSearch] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoTag, setPhotoTag] = useState<SiteImageTag>("general");
  const [photoJobsheetId, setPhotoJobsheetId] = useState("");
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [folderSuccess, setFolderSuccess] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);
  const [jobsheetError, setJobsheetError] = useState<string | null>(null);
  const [jobsheetSuccess, setJobsheetSuccess] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamSuccess, setTeamSuccess] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState<string | null>(null);
  const [isSavingUserId, setIsSavingUserId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingJobsheet, setIsSavingJobsheet] = useState(false);
  const [jobsheetDraft, setJobsheetDraft] = useState<JobsheetDraft>(
    createEmptyJobsheetDraft(initialData.sites[0]?.name)
  );

  const openJobsheetPdf = (jobsheetId: string) => {
    if (typeof window === "undefined") return;
    window.open(`/api/site-jobsheets/${jobsheetId}/pdf`, "_blank", "noopener,noreferrer");
  };

  const visibleNav: Array<{ key: View; label: string }> = useMemo(() => {
    const base: Array<{ key: View; label: string }> = [
      { key: "dashboard", label: "Dashboard" },
      { key: "calendar", label: "Calendar" },
      { key: "workflow", label: "Workflow" },
      { key: "sites", label: "Site files" },
      { key: "chat", label: "Team chat" },
      { key: "customers", label: "Customers" },
    ];

    if (initialData.currentUser.role !== "engineer") {
      base.push({ key: "invoices", label: "Invoices" });
      base.push({ key: "compliance", label: "Compliance" });
    }

    if (initialData.currentUser.role === "director") {
      base.push({ key: "team", label: "Team" });
      base.push({ key: "onedrive", label: "Directors only" });
    }

    return base;
  }, [initialData.currentUser.role]);

  const mobileTabs = useMemo(
    () => [
      { key: "dashboard" as View, label: "Home" },
      { key: "calendar" as View, label: "Diary" },
      { key: "sites" as View, label: "Sites" },
      { key: "workflow" as View, label: "Flow" },
      { key: "chat" as View, label: "Chat" },
    ],
    []
  );

  const filteredJobs = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return jobs;

    return jobs.filter((job) => {
      return [job.job_number, job.title, job.customer_name, job.assignee_name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [jobs, search]);

  const selectedSite = useMemo(() => sites.find((site) => site.id === selectedSiteId) ?? sites[0], [sites, selectedSiteId]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? threads[0],
    [selectedThreadId, threads]
  );

  const selectedMessages = useMemo(() => {
    if (!selectedThreadId) return [];
    return messagesByThread[selectedThreadId] ?? [];
  }, [messagesByThread, selectedThreadId]);

  const filteredTeamMembers = useMemo(() => {
    const term = teamSearch.toLowerCase().trim();
    const sorted = [...teamMembers].sort((a, b) => {
      if (a.id === initialData.currentUser.id) return -1;
      if (b.id === initialData.currentUser.id) return 1;
      return a.full_name.localeCompare(b.full_name);
    });

    if (!term) return sorted;

    return sorted.filter((member) => [member.full_name, member.email ?? "", member.role].join(" ").toLowerCase().includes(term));
  }, [initialData.currentUser.id, teamMembers, teamSearch]);

  const metrics = useMemo(() => {
    const openQuotes = jobs.filter((job) => job.stage === "quote_sent").length;
    const booked = jobs.filter((job) => job.stage === "booked").length;
    const completed = jobs.filter((job) => job.stage === "completed" || job.stage === "invoice_sent").length;
    const liveValue = jobs.reduce((total, job) => total + Number(job.value_gbp ?? 0), 0);

    return { openQuotes, booked, completed, liveValue };
  }, [jobs]);

  const calendarDays = useMemo(() => {
    const grouped = new Map<string, CalendarItem[]>();

    jobs
      .filter((job) => job.scheduled_for)
      .slice(0, 12)
      .forEach((job) => {
        const date = new Date(job.scheduled_for as string);
        if (Number.isNaN(date.getTime())) return;

        const label = new Intl.DateTimeFormat("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "short",
        }).format(date);

        const item: CalendarItem = {
          time: new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(date),
          engineer: job.assignee_name ?? "Unassigned",
          task: job.title,
          site: sites.find((site) => site.id === job.site_id)?.name ?? job.customer_name,
          tone: stageTone(job.stage),
        };

        grouped.set(label, [...(grouped.get(label) ?? []), item]);
      });

    return Array.from(grouped.entries()).map(([label, items]) => ({ label, items })).slice(0, 4);
  }, [jobs, sites]);

  const selectedSiteJobs = useMemo(
    () => (selectedSite ? jobs.filter((job) => job.site_id === selectedSite.id) : []),
    [jobs, selectedSite]
  );

  const selectedFolder = useMemo(
    () => selectedSite?.folders.find((folder) => folder.id === selectedFolderId) ?? null,
    [selectedFolderId, selectedSite]
  );

  const selectedFolderJobsheets = useMemo(
    () => (selectedSite && selectedFolder ? selectedSite.jobsheets.filter((jobsheet) => jobsheet.folder_id === selectedFolder.id) : []),
    [selectedFolder, selectedSite]
  );

  const selectedFolderImages = useMemo(
    () =>
      selectedSite && selectedFolder
        ? selectedSite.images.filter((image) => image.folder_id === selectedFolder.id)
        : [],
    [selectedFolder, selectedSite]
  );

  const folderCounts = useMemo(() => {
    if (!selectedSite) return new Map<string, number>();

    const counts = new Map<string, number>();

    selectedSite.folders.forEach((folder) => {
      const imageCount = selectedSite.images.filter((image) => image.folder_id === folder.id).length;

      if (folder.slug === "jobsheets") {
        counts.set(folder.id, selectedSite.jobsheets.length + imageCount);
        return;
      }

      counts.set(folder.id, imageCount);
    });

    return counts;
  }, [selectedSite]);

  useEffect(() => {
    if (!selectedSite) return;

    setSelectedFolderId((current) => {
      if (current && selectedSite.folders.some((folder) => folder.id === current)) {
        return current;
      }

      return (
        selectedSite.folders.find((folder) => folder.slug === "jobsheets")?.id ??
        selectedSite.folders[0]?.id ??
        ""
      );
    });

    setJobsheetDraft((current) => ({
      ...current,
      title:
        current.title && current.title !== `${selectedSite.name} visit jobsheet`
          ? current.title
          : `${selectedSite.name} visit jobsheet`,
    }));
  }, [selectedSite]);

  useEffect(() => {
    setPhotoError(null);
    setPhotoSuccess(null);
    setPhotoCaption("");
    setPhotoTag("general");
    setPhotoJobsheetId("");
    setSelectedPhotoFile(null);
  }, [selectedFolderId, selectedSiteId]);

  async function loadMessages(threadId: string) {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, thread_id, author_name, body, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      setChatError(error.message);
      return;
    }

    setMessagesByThread((current) => ({
      ...current,
      [threadId]: (data ?? []) as ChatMessage[],
    }));
  }

  useEffect(() => {
    if (!selectedThreadId) return;

    let alive = true;

    loadMessages(selectedThreadId);

    const channel = supabase
      .channel(`thread-${selectedThreadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${selectedThreadId}`,
        },
        async () => {
          if (alive) {
            await loadMessages(selectedThreadId);
          }
        }
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [selectedThreadId]);

  async function saveTeamMember(memberId: string, updates: { full_name: string; role: "director" | "office" | "engineer" }) {
    setIsSavingUserId(memberId);
    setTeamError(null);
    setTeamSuccess(null);

    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: updates.full_name.trim() || "New user",
        role: updates.role,
      })
      .eq("id", memberId)
      .select("id, email, full_name, role, created_at")
      .single();

    if (error || !data) {
      setTeamError(error?.message ?? "Could not save this team member.");
      setIsSavingUserId(null);
      return;
    }

    setTeamMembers((current) =>
      current.map((member) => (member.id === memberId ? { ...member, ...(data as typeof member) } : member))
    );

    setTeamSuccess("Team member updated.");
    setIsSavingUserId(null);
  }

  function updateTeamDraft(memberId: string, changes: Partial<(typeof teamMembers)[number]>) {
    setTeamMembers((current) => current.map((member) => (member.id === memberId ? { ...member, ...changes } : member)));
  }

  async function sendMessage() {
    const body = messageDraft.trim();
    if (!body || !selectedThreadId) return;

    setIsSending(true);
    setChatError(null);

    const { error } = await supabase.from("chat_messages").insert({
      thread_id: selectedThreadId,
      author_name: initialData.currentUser.full_name,
      body,
    });

    if (error) {
      setChatError(error.message);
      setIsSending(false);
      return;
    }

    setMessageDraft("");
    setIsSending(false);
  }

  async function advanceStage(jobId: string) {
    setIsAdvancing(jobId);
    setJobError(null);

    const response = await fetch(`/api/jobs/${jobId}/advance`, {
      method: "POST",
    });

    const payload = (await response.json()) as { job?: (typeof jobs)[number]; error?: string };

    if (!response.ok || !payload.job) {
      setJobError(payload.error ?? "Could not update the job stage.");
      setIsAdvancing(null);
      return;
    }

    setJobs((current) => current.map((job) => (job.id === jobId ? payload.job! : job)));
    setIsAdvancing(null);
  }

  async function createFolder() {
    if (!selectedSite || !newFolderName.trim()) return;

    setIsCreatingFolder(true);
    setFolderError(null);
    setFolderSuccess(null);

    const response = await fetch("/api/site-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: selectedSite.id, name: newFolderName }),
    });

    const payload = (await response.json()) as { folder?: SiteFolder; error?: string };

    if (!response.ok || !payload.folder) {
      setFolderError(payload.error ?? "Could not create the folder.");
      setIsCreatingFolder(false);
      return;
    }

    setSites((current) =>
      current.map((site) =>
        site.id === selectedSite.id
          ? { ...site, folders: [...site.folders, payload.folder!].sort((a, b) => a.name.localeCompare(b.name)) }
          : site
      )
    );
    setSelectedFolderId(payload.folder.id);
    setNewFolderName("");
    setFolderSuccess("Folder created.");
    setIsCreatingFolder(false);
  }

  async function createJobsheet() {
    if (!selectedSite) return;

    setIsSavingJobsheet(true);
    setJobsheetError(null);
    setJobsheetSuccess(null);

    const response = await fetch("/api/site-jobsheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId: selectedSite.id,
        title: jobsheetDraft.title,
        jobId: jobsheetDraft.jobId || null,
        workSummary: jobsheetDraft.workSummary,
        materialsUsed: jobsheetDraft.materialsUsed,
        followUpRequired: jobsheetDraft.followUpRequired,
        followUpNotes: jobsheetDraft.followUpNotes,
        clientName: jobsheetDraft.clientName,
      }),
    });

    const payload = (await response.json()) as {
      jobsheet?: SiteJobsheet;
      visit?: SiteVisit;
      error?: string;
    };

    if (!response.ok || !payload.jobsheet || !payload.visit) {
      setJobsheetError(payload.error ?? "Could not save the jobsheet.");
      setIsSavingJobsheet(false);
      return;
    }

    setSites((current) =>
      current.map((site) =>
        site.id === selectedSite.id
          ? {
              ...site,
              last_visit_at: payload.visit!.visit_date,
              visits: [payload.visit!, ...site.visits],
              jobsheets: [payload.jobsheet!, ...site.jobsheets],
            }
          : site
      )
    );

    setJobsheetSuccess("Jobsheet saved into the Jobsheets folder.");
    setSelectedFolderId(selectedSite.folders.find((folder) => folder.slug === "jobsheets")?.id ?? selectedFolderId);
    setJobsheetDraft(createEmptyJobsheetDraft(selectedSite.name));
    setIsSavingJobsheet(false);
  }

  async function uploadPhoto() {
    if (!selectedSite || !selectedFolder || !selectedPhotoFile) return;

    setIsUploadingPhoto(true);
    setPhotoError(null);
    setPhotoSuccess(null);

    const safeName = createSafeFileName(selectedPhotoFile.name || `site-photo-${Date.now()}.jpg`);
    const storagePath = `${selectedSite.id}/${selectedFolder.slug}/${Date.now()}-${safeName}`;

    const uploadResult = await supabase.storage.from("site-files").upload(storagePath, selectedPhotoFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: selectedPhotoFile.type || undefined,
    });

    if (uploadResult.error) {
      setPhotoError(uploadResult.error.message);
      setIsUploadingPhoto(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("site-files").getPublicUrl(storagePath);

    const { data, error } = await supabase
      .from("site_images")
      .insert({
        site_id: selectedSite.id,
        folder_id: selectedFolder.id,
        jobsheet_id: selectedFolder.slug === "jobsheets" ? photoJobsheetId || null : null,
        image_url: publicUrlData.publicUrl,
        caption: photoCaption.trim() || selectedPhotoFile.name,
        tag: photoTag,
        file_name: selectedPhotoFile.name,
        storage_path: storagePath,
        uploaded_by_name: initialData.currentUser.full_name,
      })
      .select("id, site_id, folder_id, jobsheet_id, image_url, caption, tag, file_name, storage_path, uploaded_by_name, created_at")
      .single();

    if (error || !data) {
      setPhotoError(error?.message ?? "Could not save the photo record.");
      setIsUploadingPhoto(false);
      return;
    }

    setSites((current) =>
      current.map((site) =>
        site.id === selectedSite.id
          ? { ...site, images: [data as SiteImage, ...site.images] }
          : site
      )
    );

    setPhotoSuccess(`Photo added to ${selectedFolder.name}.`);
    setPhotoCaption("");
    setPhotoTag("general");
    setPhotoJobsheetId("");
    setSelectedPhotoFile(null);
    setIsUploadingPhoto(false);
  }

  const relatedFolderJobs = useMemo(() => {
    if (!selectedSite || !selectedFolder) return [];
    if (selectedFolder.slug === "electrical") {
      return selectedSiteJobs.filter((job) => job.job_type === "Electrical");
    }
    if (selectedFolder.slug === "fire") {
      return selectedSiteJobs.filter((job) => job.job_type === "Fire");
    }
    if (selectedFolder.slug === "emergency-lighting") {
      return selectedSiteJobs.filter((job) => /emergency/i.test(`${job.title} ${job.summary ?? ""}`));
    }
    return selectedSiteJobs;
  }, [selectedFolder, selectedSite, selectedSiteJobs]);

  const relatedFolderVisits = useMemo(() => {
    if (!selectedSite || !selectedFolder) return [];
    if (selectedFolder.slug === "jobsheets") {
      return selectedSite.visits.filter((visit) => visit.visit_type.toLowerCase() === "jobsheet");
    }
    if (selectedFolder.slug === "fire") {
      const fireJobIds = new Set(selectedSiteJobs.filter((job) => job.job_type === "Fire").map((job) => job.id));
      return selectedSite.visits.filter((visit) => visit.job_id && fireJobIds.has(visit.job_id));
    }
    if (selectedFolder.slug === "electrical") {
      const electricalJobIds = new Set(selectedSiteJobs.filter((job) => job.job_type === "Electrical").map((job) => job.id));
      return selectedSite.visits.filter((visit) => visit.job_id && electricalJobIds.has(visit.job_id));
    }
    return selectedSite.visits.filter((visit) => !visit.job_id);
  }, [selectedFolder, selectedSite, selectedSiteJobs]);

  const jobsheetPhotoCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!selectedSite) return counts;

    selectedSite.images.forEach((image) => {
      if (!image.jobsheet_id) return;
      counts.set(image.jobsheet_id, (counts.get(image.jobsheet_id) ?? 0) + 1);
    });

    return counts;
  }, [selectedSite]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <img alt="Lavelec logo" className="brand-logo" src="/branding/lavelec-orb.png" />
          <div>
            <p className="eyebrow accent-eyebrow">Lavelec</p>
            <h1>Lavelec Ops</h1>
            <p className="brand-subtitle">Electrical + fire systems</p>
          </div>
        </div>

        <div className="sidebar-info">
          <p className="eyebrow">Signed in</p>
          <h3 style={{ marginTop: 8 }}>{initialData.currentUser.full_name}</h3>
          <p className="muted-on-dark">{initialData.currentUser.email ?? "No email"}</p>
        </div>

        <div className="role-panel">
          <p className="eyebrow">Role</p>
          <div style={{ marginTop: 12 }}>
            <Badge tone={initialData.currentUser.role === "director" ? "purple" : initialData.currentUser.role === "office" ? "blue" : "green"}>
              {initialData.currentUser.role}
            </Badge>
          </div>
          <p className="muted-on-dark">
            Engineers get site files, jobsheets and diary access. Office staff unlock workflow and admin controls. Directors also see the secure OneDrive area.
          </p>
        </div>

        <nav className="nav-list">
          {visibleNav.map((item) => (
            <button className={`nav-item ${view === item.key ? "active" : ""}`} key={item.key} onClick={() => setView(item.key)} type="button">
              {item.label}
            </button>
          ))}
        </nav>

        <div className="gradient-card">
          <p className="eyebrow" style={{ color: "rgba(255,255,255,0.7)" }}>
            Calm by default
          </p>
          <h3 style={{ marginTop: 10 }}>Built to be used daily</h3>
          <p className="muted-on-dark" style={{ color: "rgba(255,255,255,0.85)" }}>
            Premium branding outside, calm workflow inside. Built to feel familiar to the Lavelec team from the first login.
          </p>
        </div>
      </aside>

      <section className="content-shell">
        <header className="topbar">
          <div>
            <p className="muted">Lavelec control centre</p>
            <h2>Run electrical, fire and site records in one place</h2>
          </div>
          <div className="topbar-actions">
            <input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs, customers, engineers" />
            <button className="primary-button" onClick={() => setView("workflow")} type="button">
              Open workflow
            </button>
          </div>
        </header>

        <div className="page-content">
          {view === "dashboard" ? (
            <div className="item-list">
              <div className="grid-4">
                <MetricCard label="Open quotes" value={metrics.openQuotes} hint="Waiting for acceptance or decline" />
                <MetricCard label="Booked jobs" value={metrics.booked} hint="Ready for the diary and engineers" />
                <MetricCard label="Completed" value={metrics.completed} hint="Finished work and invoiced jobs" />
                <MetricCard label="Live value" value={currency(metrics.liveValue)} hint="Across active jobs in the system" />
              </div>

              <div className="grid-split-wide">
                <div className="card large-card">
                  <SectionHead title="Easy on the eye calendar" subtitle="A gentle diary view with only what matters" />
                  {calendarDays.length ? (
                    <div className="calendar-grid">
                      {calendarDays.map((day) => (
                        <CalendarCard key={day.label} day={day.label} items={day.items} />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">No scheduled jobs yet. Seed data or create a booked job in Supabase.</div>
                  )}
                </div>

                <div className="card large-card">
                  <SectionHead title="What needs attention" subtitle="A few priority prompts instead of a wall of admin" />
                  <div className="item-list">
                    <div className="item-card">
                      <div className="badge-row">
                        <Badge tone="amber">{jobs.filter((job) => job.stage === "quote_sent").length}</Badge>
                      </div>
                      <p style={{ fontWeight: 700, marginTop: 10 }}>Quotes waiting on a decision</p>
                      <p className="muted" style={{ marginTop: 6 }}>Keep the estimator queue visible without crowding the full dashboard.</p>
                    </div>
                    <div className="item-card">
                      <div className="badge-row">
                        <Badge tone="green">{sites.reduce((total, site) => total + site.jobsheets.length, 0)}</Badge>
                      </div>
                      <p style={{ fontWeight: 700, marginTop: 10 }}>Jobsheets filed inside sites</p>
                      <p className="muted" style={{ marginTop: 6 }}>Every saved jobsheet now files itself into the correct site record automatically.</p>
                    </div>
                    <div className="item-card">
                      <div className="badge-row">
                        <Badge tone="purple">{threads.length}</Badge>
                      </div>
                      <p style={{ fontWeight: 700, marginTop: 10 }}>Internal chat channels</p>
                      <p className="muted" style={{ marginTop: 6 }}>Keeps handovers, site updates and questions inside the app.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid-2">
                <div className="card large-card">
                  <SectionHead title="Site files" subtitle="Folders, visits, jobsheets and photos grouped by site" action={<button className="secondary-button" onClick={() => setView("sites")} type="button">Open sites</button>} />
                  <div className="item-list">
                    {sites.slice(0, 3).map((site) => (
                      <button
                        className="selectable-card"
                        key={site.id}
                        onClick={() => {
                          setSelectedSiteId(site.id);
                          setView("sites");
                        }}
                        type="button"
                      >
                        <p style={{ fontWeight: 700 }}>{site.name}</p>
                        <p className="muted" style={{ marginTop: 6 }}>{site.customer_name}</p>
                        <div className="badge-row" style={{ marginTop: 10 }}>
                          <Badge tone="green">{site.jobsheets.length} jobsheets</Badge>
                          <Badge tone="purple">{site.folders.length} folders</Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="card large-card">
                  <SectionHead title="Workflow" subtitle="Track every job through the same simple stages" action={<button className="secondary-button" onClick={() => setView("workflow")} type="button">Open workflow</button>} />
                  <div className="grid-2">
                    {WORKFLOW_STAGES.slice(0, 8).map((stage) => (
                      <div className="soft-panel" key={stage.key}>
                        <Badge tone={stageTone(stage.key)}>{stage.label}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {view === "calendar" ? (
            <div className="card large-card">
              <SectionHead title="Calendar" subtitle="A clean schedule view designed to stay calm and readable" action={<Badge tone="blue">Simple diary</Badge>} />
              {calendarDays.length ? (
                <div className="calendar-grid">
                  {calendarDays.map((day) => (
                    <CalendarCard key={day.label} day={day.label} items={day.items} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">No scheduled items yet.</div>
              )}
            </div>
          ) : null}

          {view === "workflow" ? (
            <div className="item-list">
              <div className="card large-card">
                <SectionHead title="Job workflow" subtitle="Every job follows the same visual path so nothing gets missed" action={<Badge tone="purple">{WORKFLOW_STAGES.length} stages</Badge>} />
                <div className="badge-row">
                  {WORKFLOW_STAGES.map((stage) => (
                    <Badge key={stage.key} tone={stageTone(stage.key)}>
                      {stage.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {jobError ? <div className="banner">{jobError}</div> : null}

              <div className="grid-2">
                {filteredJobs.map((job) => {
                  const finalStage = nextStage(job.stage) === job.stage;
                  return (
                    <div className="card large-card" key={job.id}>
                      <div className="section-head">
                        <div>
                          <div className="badge-row" style={{ marginBottom: 8 }}>
                            <Badge tone={job.job_type === "Fire" ? "red" : "blue"}>{job.job_type}</Badge>
                            <Badge tone={stageTone(job.stage)}>{STAGE_LABELS[job.stage]}</Badge>
                          </div>
                          <h3>{job.title}</h3>
                          <p className="muted" style={{ marginTop: 6 }}>
                            {job.customer_name} · {job.job_number}
                          </p>
                        </div>
                        <strong>{currency(job.value_gbp)}</strong>
                      </div>
                      <div className="soft-panel">
                        <p>{job.summary ?? "No job summary added yet."}</p>
                        <div className="badge-row" style={{ marginTop: 12 }}>
                          <Badge tone="slate">{job.assignee_name ?? "Unassigned"}</Badge>
                          <Badge tone="slate">{formatDateTime(job.scheduled_for, "Not scheduled")}</Badge>
                        </div>
                      </div>
                      <div className="button-row" style={{ marginTop: 14 }}>
                        <button className="primary-button" disabled={finalStage || isAdvancing === job.id} onClick={() => advanceStage(job.id)} type="button">
                          {finalStage ? "Final stage" : isAdvancing === job.id ? "Updating..." : `Move to ${STAGE_LABELS[nextStage(job.stage)]}`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {view === "sites" ? (
            <div className="grid-split">
              <div>
                <SectionHead title="Site files" subtitle="A running record of every site your team looks after" />
                <div className="site-picker">
                  {sites.map((site) => (
                    <button className={`selectable-card ${selectedSite?.id === site.id ? "active" : ""}`} key={site.id} onClick={() => setSelectedSiteId(site.id)} type="button">
                      <p style={{ fontWeight: 700 }}>{site.name}</p>
                      <p className="muted" style={{ marginTop: 6 }}>{site.customer_name}</p>
                      <div className="badge-row" style={{ marginTop: 10 }}>
                        <Badge tone="green">{site.jobsheets.length} jobsheets</Badge>
                        <Badge tone="purple">{site.folders.length} folders</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="item-list">
                {selectedSite ? (
                  <>
                    <div className="card large-card">
                      <SectionHead title={selectedSite.name} subtitle={`${selectedSite.customer_name} · ${selectedSite.address ?? "No address"}`} action={<Badge tone="blue">{selectedSite.primary_engineer_name ?? "No primary engineer"}</Badge>} />
                      <p className="muted">{selectedSite.notes ?? "No site notes added yet."}</p>
                      <div className="grid-4" style={{ marginTop: 18 }}>
                        <div className="small-box">
                          <p className="kicker">Last visit</p>
                          <p style={{ marginTop: 8, fontWeight: 700 }}>{formatDate(selectedSite.last_visit_at, "No visit yet")}</p>
                        </div>
                        <div className="small-box">
                          <p className="kicker">Next visit</p>
                          <p style={{ marginTop: 8, fontWeight: 700 }}>{formatDate(selectedSite.next_visit_at, "Not booked")}</p>
                        </div>
                        <div className="small-box">
                          <p className="kicker">Folders</p>
                          <p style={{ marginTop: 8, fontWeight: 700 }}>{selectedSite.folders.length} folders</p>
                        </div>
                        <div className="small-box">
                          <p className="kicker">Jobsheets</p>
                          <p style={{ marginTop: 8, fontWeight: 700 }}>{selectedSite.jobsheets.length} items</p>
                        </div>
                      </div>

                      {(initialData.currentUser.role === "director" || initialData.currentUser.role === "office") ? (
                        <div className="folder-builder" style={{ marginTop: 18 }}>
                          <div>
                            <p className="kicker">Add a folder</p>
                            <p className="muted" style={{ marginTop: 6 }}>
                              Standard folders are already created, but you can add extra folders for this site whenever you need them.
                            </p>
                          </div>
                          <div className="button-row folder-builder-row">
                            <input className="text-input" value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="Example: Drawings or Access notes" />
                            <button className="secondary-button" disabled={isCreatingFolder || !newFolderName.trim()} onClick={createFolder} type="button">
                              {isCreatingFolder ? "Adding..." : "Add folder"}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {folderError ? <div className="banner">{folderError}</div> : null}
                    {folderSuccess ? <div className="banner success-banner">{folderSuccess}</div> : null}
                    {photoError ? <div className="banner">{photoError}</div> : null}
                    {photoSuccess ? <div className="banner success-banner">{photoSuccess}</div> : null}
                    {jobsheetError ? <div className="banner">{jobsheetError}</div> : null}
                    {jobsheetSuccess ? <div className="banner success-banner">{jobsheetSuccess}</div> : null}

                    <div className="card large-card">
                      <SectionHead title="Folders" subtitle="Keep each site file tidy as it grows" />
                      <div className="folder-grid">
                        {selectedSite.folders.map((folder) => (
                          <button
                            className={`folder-card ${selectedFolder?.id === folder.id ? "active" : ""}`}
                            key={folder.id}
                            onClick={() => setSelectedFolderId(folder.id)}
                            type="button"
                          >
                            <div className="section-head" style={{ marginBottom: 10 }}>
                              <div>
                                <h3>{folder.name}</h3>
                                <p className="muted" style={{ marginTop: 6 }}>{folder.is_default ? "Standard folder" : "Custom folder"}</p>
                              </div>
                              <Badge tone={folderTone(folder.slug)}>{folderCounts.get(folder.id) ?? 0}</Badge>
                            </div>
                            <p className="muted">{folderDescription(folder.slug, folder.name)}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedFolder ? (
                      <div className="card large-card">
                        <SectionHead
                          title={`Upload photos to ${selectedFolder.name}`}
                          subtitle="Add visual records from phone or desktop and file them straight into the selected folder."
                          action={<Badge tone={folderTone(selectedFolder.slug)}>{selectedFolderImages.length} saved</Badge>}
                        />
                        <div className="grid-2">
                          <div className="item-list">
                            <div>
                              <label className="kicker" htmlFor="site-photo-file">Choose image</label>
                              <input
                                id="site-photo-file"
                                accept="image/*"
                                className="file-input"
                                onChange={(event) => setSelectedPhotoFile(event.target.files?.[0] ?? null)}
                                style={{ marginTop: 8 }}
                                type="file"
                              />
                              <p className="muted" style={{ marginTop: 8 }}>
                                {selectedPhotoFile ? selectedPhotoFile.name : "Pick a photo from your phone or laptop."}
                              </p>
                            </div>

                            <div>
                              <label className="kicker" htmlFor="site-photo-caption">Caption</label>
                              <input
                                id="site-photo-caption"
                                className="text-input"
                                onChange={(event) => setPhotoCaption(event.target.value)}
                                placeholder="Example: Panel before remedials"
                                style={{ marginTop: 8 }}
                                value={photoCaption}
                              />
                            </div>
                          </div>

                          <div className="item-list">
                            <div>
                              <label className="kicker" htmlFor="site-photo-tag">Photo tag</label>
                              <select
                                id="site-photo-tag"
                                className="text-input"
                                onChange={(event) => setPhotoTag(event.target.value as SiteImageTag)}
                                style={{ marginTop: 8 }}
                                value={photoTag}
                              >
                                {PHOTO_TAGS.map((tag) => (
                                  <option key={tag.value} value={tag.value}>
                                    {tag.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {selectedFolder.slug === "jobsheets" ? (
                              <div>
                                <label className="kicker" htmlFor="site-photo-jobsheet">Link to jobsheet</label>
                                <select
                                  id="site-photo-jobsheet"
                                  className="text-input"
                                  onChange={(event) => setPhotoJobsheetId(event.target.value)}
                                  style={{ marginTop: 8 }}
                                  value={photoJobsheetId}
                                >
                                  <option value="">No linked jobsheet</option>
                                  {selectedSite.jobsheets.map((jobsheet) => (
                                    <option key={jobsheet.id} value={jobsheet.id}>
                                      {jobsheet.title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : null}

                            <div className="button-row">
                              <button
                                className="primary-button"
                                disabled={isUploadingPhoto || !selectedPhotoFile}
                                onClick={uploadPhoto}
                                type="button"
                              >
                                {isUploadingPhoto ? "Uploading..." : "Upload photo"}
                              </button>
                              <span className="muted">Photos are filed to this folder immediately.</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {selectedFolder?.slug === "jobsheets" ? (
                      <div className="grid-split-wide">
                        <div className="card large-card">
                          <SectionHead title="New jobsheet" subtitle="Create a jobsheet inside the app and file it automatically under Jobsheets" action={<Badge tone="green">Auto-filed</Badge>} />
                          <div className="item-list">
                            <div>
                              <label className="kicker" htmlFor="jobsheet-title">Jobsheet title</label>
                              <input id="jobsheet-title" className="text-input" value={jobsheetDraft.title} onChange={(event) => setJobsheetDraft((current) => ({ ...current, title: event.target.value }))} style={{ marginTop: 8 }} />
                            </div>

                            <div>
                              <label className="kicker" htmlFor="jobsheet-job">Linked job</label>
                              <select id="jobsheet-job" className="text-input" value={jobsheetDraft.jobId} onChange={(event) => setJobsheetDraft((current) => ({ ...current, jobId: event.target.value }))} style={{ marginTop: 8 }}>
                                <option value="">No linked job</option>
                                {selectedSiteJobs.map((job) => (
                                  <option key={job.id} value={job.id}>
                                    {job.job_number} · {job.title}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="kicker" htmlFor="jobsheet-summary">Work completed</label>
                              <textarea id="jobsheet-summary" className="textarea" value={jobsheetDraft.workSummary} onChange={(event) => setJobsheetDraft((current) => ({ ...current, workSummary: event.target.value }))} style={{ marginTop: 8 }} />
                            </div>

                            <div>
                              <label className="kicker" htmlFor="jobsheet-materials">Materials used</label>
                              <textarea id="jobsheet-materials" className="textarea compact-textarea" value={jobsheetDraft.materialsUsed} onChange={(event) => setJobsheetDraft((current) => ({ ...current, materialsUsed: event.target.value }))} style={{ marginTop: 8 }} />
                            </div>

                            <div className="grid-2">
                              <div>
                                <label className="kicker" htmlFor="jobsheet-client">Client / contact name</label>
                                <input id="jobsheet-client" className="text-input" value={jobsheetDraft.clientName} onChange={(event) => setJobsheetDraft((current) => ({ ...current, clientName: event.target.value }))} style={{ marginTop: 8 }} />
                              </div>
                              <div className="checkbox-card">
                                <label className="checkbox-label">
                                  <input checked={jobsheetDraft.followUpRequired} onChange={(event) => setJobsheetDraft((current) => ({ ...current, followUpRequired: event.target.checked }))} type="checkbox" />
                                  Follow-up visit required
                                </label>
                              </div>
                            </div>

                            <div>
                              <label className="kicker" htmlFor="jobsheet-follow-up">Follow-up notes</label>
                              <textarea id="jobsheet-follow-up" className="textarea compact-textarea" value={jobsheetDraft.followUpNotes} onChange={(event) => setJobsheetDraft((current) => ({ ...current, followUpNotes: event.target.value }))} style={{ marginTop: 8 }} />
                            </div>

                            <div className="button-row">
                              <button className="primary-button" disabled={isSavingJobsheet} onClick={createJobsheet} type="button">
                                {isSavingJobsheet ? "Saving..." : "Save jobsheet"}
                              </button>
                              <span className="muted">This will also add a visit entry to the site history.</span>
                            </div>
                          </div>
                        </div>

                        <div className="card large-card">
                          <SectionHead title="Jobsheets in this folder" subtitle="The newest jobsheets appear here first" action={<Badge tone="green">{selectedFolderJobsheets.length} total</Badge>} />
                          <div className="item-list">
                            {selectedFolderJobsheets.length ? (
                              selectedFolderJobsheets.map((jobsheet) => (
                                <div className="item-card" key={jobsheet.id}>
                                  <div className="section-head" style={{ marginBottom: 10 }}>
                                    <div>
                                      <h3>{jobsheet.title}</h3>
                                      <p className="muted" style={{ marginTop: 6 }}>
                                        {jobsheet.engineer_name ?? "Unknown engineer"} · {formatDateTime(jobsheet.created_at)}
                                      </p>
                                    </div>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                      <Badge tone={jobsheet.follow_up_required ? "amber" : "green"}>
                                        {jobsheet.follow_up_required ? "Follow-up needed" : "Complete"}
                                      </Badge>
                                      <button className="secondary-button" onClick={() => openJobsheetPdf(jobsheet.id)} type="button">
                                        Export PDF
                                      </button>
                                    </div>
                                  </div>
                                  <p>{jobsheet.work_summary ?? "No summary added."}</p>
                                  <div className="badge-row" style={{ marginTop: 12 }}>
                                    {jobsheet.materials_used ? <Badge tone="slate">Materials logged</Badge> : null}
                                    {jobsheet.client_name ? <Badge tone="purple">{jobsheet.client_name}</Badge> : null}
                                    {(jobsheetPhotoCounts.get(jobsheet.id) ?? 0) > 0 ? <Badge tone="blue">{jobsheetPhotoCounts.get(jobsheet.id) ?? 0} photo{(jobsheetPhotoCounts.get(jobsheet.id) ?? 0) === 1 ? "" : "s"}</Badge> : null}
                                  </div>
                                  {jobsheet.follow_up_notes ? <p className="muted" style={{ marginTop: 12 }}>Follow-up: {jobsheet.follow_up_notes}</p> : null}
                                </div>
                              ))
                            ) : (
                              <div className="empty-state">No in-app jobsheets yet for this site. Create the first one from the panel beside this list.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : selectedFolder ? (
                      <div className="card large-card">
                        <SectionHead title={selectedFolder.name} subtitle={folderDescription(selectedFolder.slug, selectedFolder.name)} action={<Badge tone={folderTone(selectedFolder.slug)}>{folderCounts.get(selectedFolder.id) ?? 0} linked items</Badge>} />
                        <div className="grid-2">
                          <div className="soft-panel">
                            <p style={{ fontWeight: 700 }}>Related work</p>
                            <div className="item-list" style={{ marginTop: 12 }}>
                              {relatedFolderJobs.length ? (
                                relatedFolderJobs.slice(0, 4).map((job) => (
                                  <div className="item-card" key={job.id}>
                                    <p style={{ fontWeight: 700 }}>{job.title}</p>
                                    <p className="muted" style={{ marginTop: 6 }}>{job.job_number} · {job.customer_name}</p>
                                  </div>
                                ))
                              ) : (
                                <div className="empty-state">No live jobs are currently grouped under this folder.</div>
                              )}
                            </div>
                          </div>

                          <div className="soft-panel">
                            <p style={{ fontWeight: 700 }}>Related history</p>
                            <div className="item-list" style={{ marginTop: 12 }}>
                              {relatedFolderVisits.length ? (
                                relatedFolderVisits.slice(0, 4).map((visit) => (
                                  <div className="item-card" key={visit.id}>
                                    <p style={{ fontWeight: 700 }}>{visit.title}</p>
                                    <p className="muted" style={{ marginTop: 6 }}>{visit.visit_type} · {formatDateTime(visit.visit_date)}</p>
                                  </div>
                                ))
                              ) : (
                                <div className="empty-state">This folder is ready to collect files, photos and notes as you build up the site record.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {selectedFolder ? (
                      <div className="card large-card">
                        <SectionHead
                          title={`${selectedFolder.name} photos`}
                          subtitle="The newest uploaded images for this folder appear first."
                          action={<Badge tone={folderTone(selectedFolder.slug)}>{selectedFolderImages.length} total</Badge>}
                        />
                        <div className="image-grid">
                          {selectedFolderImages.length ? (
                            selectedFolderImages.slice(0, 8).map((image) => (
                              <div className="soft-panel" key={image.id}>
                                <div className="image-frame">
                                  {image.image_url ? <img alt={image.caption ?? "Site image"} src={image.image_url} /> : <span className="muted">No image</span>}
                                </div>
                                <div className="badge-row" style={{ marginTop: 10 }}>
                                  <Badge tone={photoTagTone(image.tag)}>{image.tag ?? "general"}</Badge>
                                  {image.jobsheet_id ? <Badge tone="green">Linked jobsheet</Badge> : null}
                                </div>
                                <p style={{ fontWeight: 700, marginTop: 10 }}>{image.caption ?? image.file_name ?? "Untitled image"}</p>
                                <p className="muted" style={{ marginTop: 6 }}>
                                  {image.uploaded_by_name ?? "Unknown"} · {formatDateTime(image.created_at)}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="empty-state">No photos have been uploaded to this folder yet.</div>
                          )}
                        </div>
                      </div>
                    ) : null}

                    <div className="grid-2">
                      <div className="card large-card">
                        <SectionHead title="Previous visits & reports" subtitle="A clean history engineers can use on site" />
                        <div className="item-list">
                          {selectedSite.visits.length ? (
                            selectedSite.visits.slice(0, 8).map((visit) => (
                              <div className="item-card" key={visit.id}>
                                <div className="section-head" style={{ marginBottom: 10 }}>
                                  <div>
                                    <h3>{visit.title}</h3>
                                    <p className="muted" style={{ marginTop: 6 }}>{formatDateTime(visit.visit_date)}</p>
                                  </div>
                                  <Badge tone={visit.visit_type.toLowerCase() === "jobsheet" ? "green" : "slate"}>{visit.visit_type}</Badge>
                                </div>
                                <p className="muted">{visit.summary ?? "No visit summary saved."}</p>
                              </div>
                            ))
                          ) : (
                            <div className="empty-state">No site history yet.</div>
                          )}
                        </div>
                      </div>

                      <div className="card large-card">
                        <SectionHead title="Site images" subtitle="Latest photos across all folders for this site" action={<Badge tone="blue">{selectedSite.images.length} total</Badge>} />
                        <div className="image-grid">
                          {selectedSite.images.length ? (
                            selectedSite.images.slice(0, 6).map((image) => {
                              const imageFolder = selectedSite.folders.find((folder) => folder.id === image.folder_id);
                              return (
                                <div className="soft-panel" key={image.id}>
                                  <div className="image-frame">
                                    {image.image_url ? <img alt={image.caption ?? "Site image"} src={image.image_url} /> : <span className="muted">No image</span>}
                                  </div>
                                  <div className="badge-row" style={{ marginTop: 10 }}>
                                    {imageFolder ? <Badge tone={folderTone(imageFolder.slug)}>{imageFolder.name}</Badge> : null}
                                    <Badge tone={photoTagTone(image.tag)}>{image.tag ?? "general"}</Badge>
                                  </div>
                                  <p style={{ fontWeight: 700, marginTop: 10 }}>{image.caption ?? image.file_name ?? "Untitled image"}</p>
                                  <p className="muted" style={{ marginTop: 6 }}>
                                    {image.uploaded_by_name ?? "Unknown"} · {formatDateTime(image.created_at)}
                                  </p>
                                </div>
                              );
                            })
                          ) : (
                            <div className="empty-state">No images saved for this site yet.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">No sites have been set up yet.</div>
                )}
              </div>
            </div>
          ) : null}

          {view === "chat" ? (
            <div className="grid-split">
              <div>
                <SectionHead title="Team chat" subtitle="A WhatsApp-style feed that stays inside the app" />
                <div className="thread-picker">
                  {threads.map((thread) => (
                    <button className={`selectable-card ${selectedThread?.id === thread.id ? "active" : ""}`} key={thread.id} onClick={() => setSelectedThreadId(thread.id)} type="button">
                      <p style={{ fontWeight: 700 }}>{thread.name}</p>
                      <p className="muted" style={{ marginTop: 6 }}>{thread.directors_only ? "Directors only" : "Visible to the team"}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card large-card">
                <SectionHead title={selectedThread?.name ?? "Thread"} subtitle="Fast updates, handovers and site notes without leaving the app" action={<Badge tone={selectedThread?.directors_only ? "purple" : "blue"}>{selectedThread?.directors_only ? "Private" : "Live"}</Badge>} />
                {chatError ? <div className="banner">{chatError}</div> : null}
                <div className="chat-window">
                  {selectedMessages.length ? (
                    selectedMessages.map((message) => {
                      const own = message.author_name === initialData.currentUser.full_name;
                      return (
                        <div className={`chat-bubble ${own ? "own" : ""}`} key={message.id}>
                          <div className="chat-meta">
                            <strong>{message.author_name ?? "Unknown"}</strong>
                            <span>{formatDateTime(message.created_at)}</span>
                          </div>
                          <p>{message.body}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-state">No messages in this thread yet.</div>
                  )}
                </div>

                <div className="button-row" style={{ marginTop: 16 }}>
                  <input className="text-input" value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Write a message" />
                  <button className="primary-button" disabled={isSending || !messageDraft.trim()} onClick={sendMessage} type="button">
                    {isSending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {view === "customers" ? (
            <div className="grid-3">
              {initialData.customers.map((customer) => (
                <div className="card large-card" key={customer.id}>
                  <div className="section-head">
                    <div>
                      <h3>{customer.name}</h3>
                      <p className="muted" style={{ marginTop: 6 }}>{customer.primary_contact ?? "No contact saved"}</p>
                    </div>
                    <Badge tone="blue">{sites.filter((site) => site.customer_name === customer.name).length} sites</Badge>
                  </div>
                  <div className="item-list">
                    <p className="muted">{customer.phone ?? "No phone number"}</p>
                    <p className="muted">{customer.email ?? "No email address"}</p>
                    <p className="muted">{customer.address ?? "No address"}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {view === "invoices" ? (
            <div className="card large-card">
              <SectionHead title="Invoices & cashflow" subtitle="Commercial detail stays available but not intrusive" />
              <div className="item-list">
                {initialData.invoices.map((invoice) => (
                  <div className="item-card" key={invoice.id}>
                    <div className="section-head" style={{ marginBottom: 10 }}>
                      <div>
                        <h3>{invoice.invoice_number}</h3>
                        <p className="muted" style={{ marginTop: 6 }}>{invoice.customer_name}</p>
                      </div>
                      <Badge tone={invoice.status === "paid" ? "green" : invoice.status === "overdue" ? "red" : invoice.status === "due" ? "amber" : "slate"}>
                        {invoice.status}
                      </Badge>
                    </div>
                    <div className="badge-row">
                      <Badge tone="purple">{currency(invoice.amount_gbp)}</Badge>
                      <Badge tone="slate">Due {formatDate(invoice.due_date)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {view === "compliance" ? (
            <div className="grid-2">
              <div className="card large-card">
                <SectionHead title="Certificate queues" subtitle="Useful records that can grow later without bloating the main app" />
                <div className="item-list">
                  <div className="item-card">
                    <p style={{ fontWeight: 700 }}>Electrical certificates</p>
                    <p className="muted" style={{ marginTop: 6 }}>Use the workflow and site history to attach future EIC, EICR and minor works records.</p>
                  </div>
                  <div className="item-card">
                    <p style={{ fontWeight: 700 }}>Fire reporting</p>
                    <p className="muted" style={{ marginTop: 6 }}>Fire jobs stay visible in the same workflow but are clearly marked for the team.</p>
                  </div>
                </div>
              </div>

              <div className="card large-card">
                <SectionHead title="Worth adding next" subtitle="Practical future enhancements" />
                <div className="item-list">
                  <div className="item-card">
                    <p style={{ fontWeight: 700 }}>Photo uploads into folders</p>
                    <p className="muted" style={{ marginTop: 6 }}>The folder structure is now live, so photo uploads can be the next clean step.</p>
                  </div>
                  <div className="item-card">
                    <p style={{ fontWeight: 700 }}>Jotform sync if needed later</p>
                    <p className="muted" style={{ marginTop: 6 }}>You can keep using the in-app jobsheet builder now and add Jotform pull-through later only if it still adds value.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {view === "team" ? (
            initialData.currentUser.role === "director" ? (
              <div className="item-list">
                <div className="card large-card">
                  <SectionHead title="Team management" subtitle="Directors can rename users and switch them between director, office and engineer" action={<Badge tone="purple">Director only</Badge>} />
                  <div className="grid-split-wide">
                    <div className="soft-panel">
                      <p style={{ fontWeight: 700 }}>How to use this</p>
                      <div className="item-list" style={{ marginTop: 12 }}>
                        <p className="muted">New staff create their own account from the login screen.</p>
                        <p className="muted">Then you come here and switch them to director, office or engineer.</p>
                        <p className="muted">Your own role is locked here so you cannot accidentally remove director access.</p>
                      </div>
                    </div>
                    <div className="soft-panel">
                      <p style={{ fontWeight: 700 }}>Quick totals</p>
                      <div className="badge-row" style={{ marginTop: 12 }}>
                        <Badge tone="purple">{teamMembers.filter((member) => member.role === "director").length} directors</Badge>
                        <Badge tone="blue">{teamMembers.filter((member) => member.role === "office").length} office</Badge>
                        <Badge tone="green">{teamMembers.filter((member) => member.role === "engineer").length} engineers</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card large-card">
                  <SectionHead title="All staff" subtitle="Search by name, email or role" action={<input className="search-input" value={teamSearch} onChange={(event) => setTeamSearch(event.target.value)} placeholder="Search team members" />} />

                  {teamError ? <div className="banner">{teamError}</div> : null}
                  {teamSuccess ? <div className="banner success-banner">{teamSuccess}</div> : null}

                  <div className="item-list" style={{ marginTop: 16 }}>
                    {filteredTeamMembers.map((member) => {
                      const isCurrentUser = member.id === initialData.currentUser.id;
                      const saveDisabled = isSavingUserId === member.id || !member.full_name.trim();

                      return (
                        <div className="item-card" key={member.id}>
                          <div className="section-head">
                            <div>
                              <h3>{isCurrentUser ? `${member.full_name} (you)` : member.full_name}</h3>
                              <p className="muted" style={{ marginTop: 6 }}>{member.email ?? "No email saved"}</p>
                            </div>
                            <Badge tone={member.role === "director" ? "purple" : member.role === "office" ? "blue" : "green"}>{member.role}</Badge>
                          </div>

                          <div className="grid-2">
                            <div>
                              <label className="kicker" htmlFor={`name-${member.id}`}>Full name</label>
                              <input className="text-input" id={`name-${member.id}`} value={member.full_name} onChange={(event) => updateTeamDraft(member.id, { full_name: event.target.value })} style={{ marginTop: 8 }} />
                            </div>

                            <div>
                              <label className="kicker" htmlFor={`role-${member.id}`}>Role</label>
                              <select className="text-input" disabled={isCurrentUser} id={`role-${member.id}`} onChange={(event) => updateTeamDraft(member.id, { role: event.target.value as "director" | "office" | "engineer" })} style={{ marginTop: 8 }} value={member.role}>
                                <option value="director">director</option>
                                <option value="office">office</option>
                                <option value="engineer">engineer</option>
                              </select>
                            </div>
                          </div>

                          <div className="button-row" style={{ marginTop: 14 }}>
                            <button className="primary-button" disabled={saveDisabled} onClick={() => saveTeamMember(member.id, { full_name: member.full_name, role: member.role })} type="button">
                              {isSavingUserId === member.id ? "Saving..." : "Save changes"}
                            </button>
                            {isCurrentUser ? <span className="muted">Your own role is locked here for safety.</span> : <span className="muted">Use role changes here instead of jumping into Supabase.</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">This area is for directors only.</div>
            )
          ) : null}

          {view === "onedrive" ? (
            <div className="grid-2">
              <div className="card large-card">
                <SectionHead title="Directors-only area" subtitle="The Supabase roles are wired. The Microsoft file integration can be layered on from here." action={<Badge tone="purple">Director only</Badge>} />
                <div className="item-list">
                  <div className="item-card">
                    <p style={{ fontWeight: 700 }}>Financials</p>
                    <p className="muted" style={{ marginTop: 6 }}>Secure shortcuts or synced data can live here without exposing them to engineers or office staff.</p>
                  </div>
                  <div className="item-card">
                    <p style={{ fontWeight: 700 }}>Client archive</p>
                    <p className="muted" style={{ marginTop: 6 }}>Keep the higher-level business file structure here while operational site records stay in the cleaner day-to-day views.</p>
                  </div>
                </div>
              </div>

              <div className="card large-card">
                <SectionHead title="What this area is for" subtitle="Keep the live app simple for the wider team" />
                <div className="item-list">
                  <div className="item-card">
                    <p style={{ fontWeight: 700 }}>OneDrive integration later</p>
                    <p className="muted" style={{ marginTop: 6 }}>The role structure is already in place, so secure director-only file links can plug into this area later.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <nav className="mobile-nav">
        {mobileTabs.map((tab) => (
          <button className={`nav-item ${view === tab.key ? "active" : ""}`} key={tab.key} onClick={() => setView(tab.key)} type="button">
            {tab.label}
          </button>
        ))}
      </nav>
    </main>
  );
}
