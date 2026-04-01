import { redirect } from "next/navigation";
import { loadFieldOpsData, requireUserId } from "@/lib/data";
import FieldOpsShell from "@/components/fieldops-shell";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const userId = await requireUserId();

  if (!userId) {
    redirect("/login");
  }

  const data = await loadFieldOpsData(userId);

  return <FieldOpsShell initialData={data} />;
}
