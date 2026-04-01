import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(...args: any[]) {
          const [cookiesToSet, headers] = args as [CookieToSet[] | undefined, Headers | Record<string, string | string[]> | undefined];

          cookiesToSet?.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({ request });

          cookiesToSet?.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });

          if (headers instanceof Headers) {
            headers.forEach((value, key) => {
              supabaseResponse.headers.set(key, value);
            });
          } else if (headers && typeof headers === "object") {
            Object.entries(headers).forEach(([key, value]) => {
              supabaseResponse.headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
            });
          }
        },
      },
    }
  );

  await supabase.auth.getClaims();

  return supabaseResponse;
}
