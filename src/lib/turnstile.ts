const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verifies a Cloudflare Turnstile response token server-side.
 * Returns true if the token is valid.
 *
 * In development, if TURNSTILE_SECRET_KEY is not set, verification is skipped
 * so the app works without Cloudflare credentials locally.
 */
export async function verifyTurnstile(token: string | undefined | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Skip verification in development when no key is configured
  if (!secret) {
    return process.env.NODE_ENV === "development";
  }

  if (!token) return false;

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });

    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}
