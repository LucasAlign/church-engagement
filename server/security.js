import crypto from 'node:crypto';
import { z } from 'zod';

const id = z.string().min(1).max(160).regex(/^[A-Za-z0-9_.:-]+$/);
const scalar = z.union([z.string().max(20_000), z.number().finite(), z.boolean(), z.null()]);
const jsonValue = z.lazy(() => z.union([
  scalar,
  z.array(jsonValue).max(1_000),
  z.record(z.string().max(100), jsonValue),
]));

const requiredFields = {
  churches: ['name'], contacts: ['name'], tasks: ['title'], users: ['name'],
  advocates: ['name'], connections: ['name'], notableCongregants: ['name'],
};

export function validateRecord(collection, urlId, candidate) {
  const parsed = z.record(z.string().max(100), jsonValue).safeParse(candidate);
  if (!parsed.success) return { ok: false, error: 'Record contains invalid or oversized fields' };
  if (id.safeParse(parsed.data.id).success === false || parsed.data.id !== urlId) {
    return { ok: false, error: 'Record body and URL id must match' };
  }
  if (Object.keys(parsed.data).length > 100) return { ok: false, error: 'Record has too many fields' };
  for (const field of requiredFields[collection] || []) {
    if (typeof parsed.data[field] !== 'string' || !parsed.data[field].trim()) {
      return { ok: false, error: `${field} is required` };
    }
  }
  return { ok: true, data: parsed.data };
}

function safeEqual(actual, expected) {
  const left = Buffer.from(actual || '');
  const right = Buffer.from(expected || '');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function createAuthMiddleware(env = process.env) {
  const mode = env.AUTH_MODE || (env.NODE_ENV === 'production' ? 'required' : 'none');
  if (mode === 'none') {
    if (env.NODE_ENV === 'production') throw new Error('AUTH_MODE=none is forbidden in production');
    return (_request, _response, next) => next();
  }
  if (mode === 'bearer') {
    if (!env.API_AUTH_TOKEN || env.API_AUTH_TOKEN.length < 32) {
      throw new Error('API_AUTH_TOKEN must contain at least 32 characters');
    }
    return (request, response, next) => {
      const [scheme, token] = String(request.headers.authorization || '').split(' ');
      if (scheme !== 'Bearer' || !safeEqual(token, env.API_AUTH_TOKEN)) {
        return response.status(401).json({ error: 'Authentication required' });
      }
      return next();
    };
  }
  if (mode === 'proxy') {
    const header = String(env.AUTH_USER_HEADER || 'x-authenticated-user-id').toLowerCase();
    return (request, response, next) => request.get(header)
      ? next()
      : response.status(401).json({ error: 'Authentication required' });
  }
  throw new Error('Set AUTH_MODE to none, bearer, or proxy');
}
