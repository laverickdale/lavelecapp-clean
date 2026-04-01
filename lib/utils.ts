import { type Tone, type WorkflowStage, STAGE_TONES, WORKFLOW_STAGES } from "@/lib/types";

export function currency(value: number | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: string | null | undefined, fallback = "Not set") {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined, fallback = "Not scheduled") {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function stageTone(stage: WorkflowStage): Tone {
  return STAGE_TONES[stage] ?? "slate";
}

export function nextStage(current: WorkflowStage): WorkflowStage {
  const index = WORKFLOW_STAGES.findIndex((item) => item.key === current);
  if (index === -1) return current;
  return WORKFLOW_STAGES[Math.min(index + 1, WORKFLOW_STAGES.length - 1)].key;
}
