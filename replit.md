# Overview

Flock is a church engagement CRM for Keystone Family Alliance.

# System Architecture

- Frontend: React 18, Vite, React Router
- Backend: Express REST API
- Database: Replit-managed Neon PostgreSQL via `DATABASE_URL`
- Client data: in-memory cache hydrated from `/api/data`
- Persistence: write-through `PUT /api/data/:collection/:id`

# Replit Provisioning

- Add a PostgreSQL database before running the full stack.
- Provision Replit Auth through Agent.
- Protect all `/api` endpoints server-side after Auth is provisioned.
- Keep persistence behind the same-origin Express API.

# Verification

Run `npm run check` after changes.
