import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const userAgent =
    request.headers.get("user-agent") || "unknown";

  const forwardedFor =
    request.headers.get("x-forwarded-for");

  const event = {
    // Core
    timestamp: Date.now(),
    path: request.nextUrl.pathname,
    full_url: request.nextUrl.href,
    method: request.method,

    // Client
    ip: forwardedFor?.split(",")[0].trim() || "127.0.0.1",
    user_agent: userAgent,

    // Navigation
    referer: request.headers.get("referer") || "",
    host: request.headers.get("host") || "",
    origin: request.headers.get("origin") || "",

    // Request characteristics
    content_length:
      Number(request.headers.get("content-length")) || 0,

    content_type:
      request.headers.get("content-type") || "",

    accept:
      request.headers.get("accept") || "",

    accept_language:
      request.headers.get("accept-language") || "",

    accept_encoding:
      request.headers.get("accept-encoding") || "",

    cache_control:
      request.headers.get("cache-control") || "",

    connection:
      request.headers.get("connection") || "",

    // Query information
    query_string: request.nextUrl.search,

    // Derived features
    query_param_count:
      request.nextUrl.searchParams.size,

    path_depth:
      request.nextUrl.pathname
        .split("/")
        .filter(Boolean).length,

    // Useful for drift analysis
    protocol:
      request.headers.get("x-forwarded-proto") ||
      "http",

    sec_fetch_site:
      request.headers.get("sec-fetch-site") || "",

    sec_fetch_mode:
      request.headers.get("sec-fetch-mode") || "",

    sec_fetch_dest:
      request.headers.get("sec-fetch-dest") || "",
  };

  try {
    await fetch("http://localhost:8000/traffic", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });
  } catch (err) {
    console.error("Telemetry error:", err);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|movie-assets).*)",
  ],
};