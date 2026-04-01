"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

function messagePath(message: string) {
  return `/login?message=${encodeURIComponent(message)}`;
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect(messagePath("Enter your email and password."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(messagePath(error.message));
  }

  redirect("/");
}

export async function signup(formData: FormData) {
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!fullName || !email || !password) {
    redirect(messagePath("Name, email and password are all required."));
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/`,
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    redirect(messagePath(error.message));
  }

  redirect(messagePath("Account created. If email confirmation is enabled in Supabase, confirm your email before signing in."));
}
