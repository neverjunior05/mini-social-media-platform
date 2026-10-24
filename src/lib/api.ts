import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth";
import { RateLimitError } from "./rateLimit";

/** Wraps a route handler with uniform error handling. */
export function handler<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
      if (err instanceof RateLimitError) return NextResponse.json({ error: err.message }, { status: 429 });
      if (err instanceof ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
      if (err instanceof ApiError) return NextResponse.json({ error: err.message }, { status: err.status });
      console.error(err);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export const json = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);

/** Basic CSRF defense: mutation requests must come from our own origin (plus same-site cookies). */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("host");
  if (host && !origin.endsWith(host)) throw new ApiError("Cross-origin request blocked", 403);
}
