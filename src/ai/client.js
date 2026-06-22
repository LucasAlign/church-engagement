// client.js — the single seam every Arlo model call goes through.
//
// Phase 1: there is no API key in the browser, so callModel() resolves the
// provided `stub()` — a deterministic function that builds a realistic result
// from the real mock DB. The whole UX runs with no secret and no network.
//
// LATER (Phase 3): point VITE_ARLO_ENDPOINT at a Supabase Edge Function and
// callModel() POSTs to it instead. The function holds the Anthropic key
// server-side and calls Claude with the same { model, system, messages } shape
// assembled here. Swapping Phase 1 → Phase 3 is this file only; arlo.js, the
// context builders, and the UI never change.

// Model routing is decided per-action in arlo.js and passed through here, so the
// coordinator never picks a model — the surface does.
export const MODELS = {
  // Frequent, well-scoped work: capture, summaries, daily brief, drafts.
  HAIKU: 'claude-haiku-4-5',
  // Cross-church judgement: portfolio coaching (wired in Phase 2).
  OPUS: 'claude-opus-4-8',
};

const ENDPOINT = import.meta.env?.VITE_ARLO_ENDPOINT;

// callModel({ model, system, messages, stub })
//   model    — one of MODELS.*
//   system   — system prompt string (sent to the Edge Function in Phase 3)
//   messages — [{ role, content }] (sent to the Edge Function in Phase 3)
//   stub     — () => result, used until the Edge Function is wired up
// Returns whatever the action's stub/Edge Function produces (string or object).
export async function callModel({ model, system, messages, stub }) {
  if (!ENDPOINT) {
    // Phase 1 path — deterministic, key-free. Kept async so callers already
    // await it and nothing changes when the real call lands.
    return stub();
  }

  // Phase 3 path — the Edge Function owns the key and calls Claude.
  // For Haiku tasks it will use a single message; for Opus coaching it will
  // enable adaptive thinking. None of that leaks into the client.
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, system, messages }),
  });
  if (!res.ok) throw new Error(`Arlo request failed (${res.status})`);
  return res.json();
}
