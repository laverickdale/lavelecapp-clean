import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/login");
  }

  return (
    <>
      {children}
      <form action={signOut} style={{ position: "fixed", top: 14, right: 14, zIndex: 30 }}>
        <button className="secondary-button" type="submit">
          Sign out
        </button>
      </form>
    </>
  );
}
