"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  type ChatMessage,
  type ChatThread,
  type FieldOpsData,
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

function SectionHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
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

export default function FieldOpsShell({ initialData }: { initialData: FieldOpsData }) {
  const [view, setView] = useState<View>("dashboard");
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState(initialData.jobs);
  const [threads] = useState(initialData.threads);
  const [selectedSiteId, setSelectedSiteId] = useState(initialData.sites[0]?.id ?? "");
  const [selectedThreadId, setSelectedThreadId] = useState(initialData.threads[0]?.id ?? "");
  const [messagesByThread, setMessagesByThread] = useState<Record<string, ChatMessage[]>>(initialData.initialMessages);
  const [messageDraft, setMessageDraft] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState<string | null>(null);

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

  const selectedSite = useMemo(
    () => initialData.sites.find((site) => site.id === selectedSiteId) ?? initialData.sites[0],
    [initialData.sites, selectedSiteId]
  );

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? threads[0],
    [selectedThreadId, threads]
  );

  const selectedMessages = useMemo(() => {
    if (!selectedThreadId) return [];
    return messagesByThread[selectedThreadId] ?? [];
  }, [messagesByThread, selectedThreadId]);

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
          site: initialData.sites.find((site) => site.id === job.site_id)?.name ?? job.customer_name,
          tone: stageTone(job.stage),
        };

        grouped.set(label, [...(grouped.get(label) ?? []), item]);
      });

    return Array.from(grouped.entries()).map(([label, items]) => ({ label, items })).slice(0, 4);
  }, [initialData.sites, jobs]);

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

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <div className="brand-mark">⚡</div>
          <div>
            <p className="eyebrow">FieldOps Pro</p>
            <h1>Electrical Ops</h1>
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
            Engineers see site files, diary and chat. Office staff unlock invoices and workflow controls. Directors also see the secure OneDrive area.
          </p>
        </div>

        <nav className="nav-list">
          {visibleNav.map((item) => (
            <button
              className={`nav-item ${view === item.key ? "active" : ""}`}
              key={item.key}
              onClick={() => setView(item.key)}
              type="button"
            >
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
            Clean workflow, site history and team chat first. Extra detail can grow later without overwhelming the team.
          </p>
        </div>
      </aside>

      <section className="content-shell">
        <header className="topbar">
          <div>
            <p className="muted">Field service control centre</p>
            <h2>Run quotes, jobs, sites and chat in one place</h2>
          </div>
          <div className="topbar-actions">
            <input
              className="search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search jobs, customers, engineers"
            />
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
                        <Badge tone="blue">{initialData.sites.reduce((total, site) => total + site.visits.length, 0)}</Badge>
                      </div>
                      <p style={{ fontWeight: 700, marginTop: 10 }}>Previous visits on file</p>
                      <p className="muted" style={{ marginTop: 6 }}>Engineers can open a site and immediately see history, reports and image notes.</p>
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
                  <SectionHead title="Site files" subtitle="Previous visits, jobsheets, reports and photos in one place" action={<button className="secondary-button" onClick={() => setView("sites")} type="button">Open sites</button>} />
                  <div className="item-list">
                    {initialData.sites.slice(0, 3).map((site) => (
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
                          <Badge tone="blue">{site.visits.length} visits</Badge>
                          <Badge tone="purple">{site.images.length} images</Badge>
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
                        <button
                          className="primary-button"
                          disabled={finalStage || isAdvancing === job.id}
                          onClick={() => advanceStage(job.id)}
                          type="button"
                        >
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
                  {initialData.sites.map((site) => (
                    <button
                      className={`selectable-card ${selectedSite?.id === site.id ? "active" : ""}`}
                      key={site.id}
                      onClick={() => setSelectedSiteId(site.id)}
                      type="button"
                    >
                      <p style={{ fontWeight: 700 }}>{site.name}</p>
                      <p className="muted" style={{ marginTop: 6 }}>{site.customer_name}</p>
                      <div className="badge-row" style={{ marginTop: 10 }}>
                        <Badge tone="blue">{site.visits.length} visits</Badge>
                        <Badge tone="purple">{site.images.length} images</Badge>
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
                          <p className="kicker">History</p>
                          <p style={{ marginTop: 8, fontWeight: 700 }}>{selectedSite.visits.length} visits</p>
                        </div>
                        <div className="small-box">
                          <p className="kicker">Images</p>
                          <p style={{ marginTop: 8, fontWeight: 700 }}>{selectedSite.images.length} items</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid-2">
                      <div className="card large-card">
                        <SectionHead title="Previous visits & jobsheets" subtitle="A clean history engineers can use on site" />
                        <div className="item-list">
                          {selectedSite.visits.length ? (
                            selectedSite.visits.slice(0, 8).map((visit) => (
                              <div className="item-card" key={visit.id}>
                                <div className="section-head" style={{ marginBottom: 8 }}>
                                  <div>
                                    <p style={{ fontWeight: 700 }}>{visit.title}</p>
                                    <p className="muted" style={{ marginTop: 6 }}>
                                      {formatDateTime(visit.visit_date)}
                                    </p>
                                  </div>
                                  <Badge tone="slate">{visit.visit_type}</Badge>
                                </div>
                                <p className="muted">{visit.summary ?? "No summary saved."}</p>
                              </div>
                            ))
                          ) : (
                            <div className="empty-state">No visit history saved for this site yet.</div>
                          )}
                        </div>
                      </div>

                      <div className="card large-card">
                        <SectionHead title="Site images" subtitle="Photos and visual notes attached to the site" />
                        {selectedSite.images.length ? (
                          <div className="image-grid">
                            {selectedSite.images.slice(0, 6).map((image) => (
                              <div className="soft-panel" key={image.id}>
                                <div className="image-frame">
                                  {image.image_url ? <img alt={image.caption ?? "Site image"} src={image.image_url} /> : <span className="muted">No preview</span>}
                                </div>
                                <p style={{ marginTop: 10, fontWeight: 700 }}>{image.caption ?? "Untitled image"}</p>
                                <p className="muted" style={{ marginTop: 6 }}>
                                  {image.uploaded_by_name ?? "Unknown"} · {formatDate(image.created_at)}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="empty-state">No images saved for this site yet.</div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">No site records found yet.</div>
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
                    <button
                      className={`selectable-card ${selectedThread?.id === thread.id ? "active" : ""}`}
                      key={thread.id}
                      onClick={() => setSelectedThreadId(thread.id)}
                      type="button"
                    >
                      <p style={{ fontWeight: 700 }}>{thread.name}</p>
                      <p className="muted" style={{ marginTop: 6 }}>
                        {thread.directors_only ? "Directors only" : "Visible to the team"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card large-card">
                <SectionHead
                  title={selectedThread?.name ?? "Thread"}
                  subtitle={selectedThread?.directors_only ? "Private director thread" : "Live team conversation"}
                  action={<Badge tone={selectedThread?.directors_only ? "purple" : "blue"}>{selectedThread?.directors_only ? "Private" : "Live"}</Badge>}
                />
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
                    <div className="empty-state">No messages yet in this thread.</div>
                  )}
                </div>
                <div className="divider" />
                <div className="form-stack">
                  <textarea
                    className="textarea"
                    onChange={(event) => setMessageDraft(event.target.value)}
                    placeholder="Write a message for the team"
                    value={messageDraft}
                  />
                  <div className="button-row">
                    <button className="primary-button" disabled={isSending} onClick={sendMessage} type="button">
                      {isSending ? "Sending..." : "Send message"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {view === "customers" ? (
            <div className="card large-card">
              <SectionHead title="Customers" subtitle="A simple CRM layer without crowding the core screens" />
              <div className="grid-3">
                {initialData.customers.map((customer) => (
                  <div className="item-card" key={customer.id}>
                    <h3>{customer.name}</h3>
                    <p className="muted" style={{ marginTop: 6 }}>{customer.primary_contact ?? "No primary contact"}</p>
                    <div className="divider" />
                    <div className="item-list">
                      <p className="muted">Phone: {customer.phone ?? "Not added"}</p>
                      <p className="muted">Email: {customer.email ?? "Not added"}</p>
                      <p className="muted">Address: {customer.address ?? "Not added"}</p>
                    </div>
                  </div>
                ))}
              </div>
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
                    <p className="muted" style={{ marginTop: 6 }}>Use the workflow and site visit history to attach future EIC, EICR and minor works records.</p>
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
                    <p style={{ fontWeight: 700 }}>Site image uploads</p>
                    <p className="muted" style={{ marginTop: 6 }}>Add Supabase Storage when you want engineers to capture photos directly in the app.</p>
                  </div>
                  <div className="item-card">
                    <p style={{ fontWeight: 700 }}>Reminders & expiry dates</p>
                    <p className="muted" style={{ marginTop: 6 }}>Vehicle, calibration and compliance reminders can layer in later without changing the clean main flow.</p>
                  </div>
                </div>
              </div>
            </div>
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
                    <p className="muted" style={{ marginTop: 6 }}>Use Microsoft Graph later if you want actual OneDrive browsing from inside the app.</p>
                  </div>
                </div>
              </div>

              <div className="card large-card">
                <SectionHead title="Why this is separate" subtitle="Keeps the everyday app simple for the wider team" />
                <div className="empty-state">
                  This section is intentionally light in the deployable package. The role-based gate is real, while the Graph integration is the next safe extension.
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <nav className="mobile-nav">
          {mobileTabs.map((tab) => (
            <button className={view === tab.key ? "active" : ""} key={tab.key} onClick={() => setView(tab.key)} type="button">
              {tab.label}
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}
