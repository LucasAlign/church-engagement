// client.js — the single seam every Karen model call goes through.
//
// Today there is no API key in the browser, so callModel() resolves the
// provided stub() — a deterministic function that builds a realistic result
// from the live db. The whole assistant runs with no secret and no network.
//
// LATER: point VITE_KAREN_ENDPOINT at a serverless function (e.g. a Supabase
// Edge Function or a Vercel API route) and callModel() POSTs to it instead.
// That function holds the Anthropic key server-side and calls Claude with the
// same { model, system, messages } shape assembled here. Swapping stub → live
// is this file only; context.js, karen.js, and the UI never change.

// Routing is decided per-action in karen.js and passed through here, so the
// coordinator never picks a model — the surface does.
export const MODELS = {
  FAST: 'gpt-4o-mini', // frequent, scoped work: capture, summaries, brief, drafts
  SMART: 'gpt-4o',     // cross-church judgement: portfolio coaching
};

const ENDPOINT = import.meta.env?.VITE_KAREN_ENDPOINT;

// callModel({ model, system, messages, stub })
//   model    — one of MODELS.*
//   system   — system prompt (sent to the endpoint when one is configured)
//   messages — [{ role, content }] (sent to the endpoint)
//   stub     — () => result, used until the endpoint is wired up
export async function callModel({ model, system, messages, stub, local }) {
  // `local: true` forces the deterministic stub even when the endpoint is live
  // (used for interaction capture — a rule-based parse, no need to spend a call).
  if (local || !ENDPOINT) {
    return stub();
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, system, messages }),
  });
  if (!res.ok) throw new Error(`Karen request failed (${res.status})`);
  return res.json();
}
