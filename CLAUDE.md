# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A Smart Inventory Management System (IMS) using RFID to track inbound and outbound warehouse processes. It is a monorepo with three independent subsystems:

- `backend/` — Node.js + Express REST API backed by MongoDB (Mongoose).
- `frontend/` — React + TypeScript + Vite single-page app (Ant Design, Ag-Grid, Chart.js).
- `iot/` — ESP32 firmware (PlatformIO/Arduino) driving two MFRC522 RFID readers.

Data flows: RFID readers POST tag scans to the backend → backend mutates parcels/inventory in MongoDB → frontend reads via REST and live SSE streams.

## Commands

### Backend (`cd backend`)
- Node version: `20.9.0` (see `.nvmrc`).
- `npm install` — install dependencies.
- `npm start` — runs the **main API** (`server.js`) under nodemon. There is no lint, build, or test script.
- The **IoT ingestion server** (`index.js`) is a *separate* Express app on hardcoded port `3000` and must be launched manually: `node index.js` (or `npx nodemon index.js`). It is not covered by `npm start`.

### Frontend (`cd frontend`)
- `npm run dev` — Vite dev server.
- `npm run build` — type-checks then builds (`tsc && vite build`).
- `npm run lint` — ESLint over `ts,tsx` with `--max-warnings 0` (warnings fail).
- `npm run preview` — preview the production build.

### IoT (`cd iot`)
- Requires PlatformIO. `pio run` builds; `pio run -t upload` flashes; `pio device monitor` (baud 115200) reads serial. Target board: `esp-wrover-kit` (ESP32).

There is no test runner in any subsystem.

## Backend Architecture

### Two separate servers
- `server.js` — the customer-facing API. Mounts every router under the `process.env.ENDPOINT` prefix (e.g. `/api/v1`). `authRouter`, `streamRouter`, and `debugRouter` are mounted **before** `authenticateJWT`, so they are public; every router after the `app.use(authenticateJWT)` line is JWT-protected.
- `index.js` — the IoT ingestion server, port `3000`, mounts only `iot.routes` under `/iot`. It applies `requestTimeLogger` (writes per-request timing logs to `logs/time_logs/`). RFID hardware talks to this server, not to `server.js`.

Both call `connectDB()` from `db/connect.js`, which guards against duplicate connections via an `isConnected` flag.

### Request layering
Routes (`routes/*.routes.js`) → controllers (`controllers/*.controller.js`) → Mongoose models (`models/*.model.js`). Routes are thin; all logic lives in controllers. Services (`services/upc.js`) wrap external calls — here, UPCItemDB barcode lookups via `fetchUPCData`.

### Auth model (important conventions)
- `middleware/auth.js`:
  - `authenticateJWT` reads the token from `req.body.token`, the raw `Authorization` header (no `Bearer ` prefix), or `x-access-token`. It rejects users whose decoded `status === "pending"`.
  - `enableRoleAccess(roles)` is a role-gating middleware factory; `auth.controller.js` also exports an `authenticateManagerMiddleware` used to guard `/users` admin routes.
- **Passwords are Base64-encoded, NOT hashed** (`Buffer.from(password).toString("base64")` in `auth.controller.js`), despite the `// Hashed password` comment in the model. Match this scheme when touching auth; do not assume bcrypt.
- SSE endpoints cannot send headers, so they authenticate via a `token` **query parameter** instead of the header (see `stream.controller.js`).

### Server-Sent Events (SSE)
`stream.controller.js` (mounted at `/stream/*`) keeps in-memory arrays of connected clients and broadcasts via module-level `setInterval` loops every `STREAM_TIME_INTERVAL` (5000 ms — bump it locally to avoid constant DB polling). Streams: `/stream/dashboard` (totals + low/recent inventory), `/stream/inventory/:id` (single product by barcode), `/stream/outbound` (the currently `activated` pallet and its parcels). The IoT server has its own separate `/iot/inbound-stream`.

### Data model relationships
All models use a custom timestamp convention: explicit `datetimecreated`/`datetimeupdated` Date fields mapped via Mongoose `timestamps: { createdAt, updatedAt }`. Models are defined with the `mongoose.model.X || mongoose.model("X", schema)` idiom to avoid recompilation errors.

Core entities and links:
- `Product` — a SKU keyed by `barcode`; `upc_data` is a **JSON string** (stringified UPCItemDB response), so callers must `JSON.parse` it.
- `Parcel` — a physical unit of a product; refs `warehouse`, `product`, optional `shelf` and `pallet`; `status` ∈ `in_warehouse | on_shelf | loaded_on_pallet | out_for_delivery | delivered | archived`.
- `Inventory` — per-product aggregate `parcel_quantity`; incremented/decremented as parcels move (see inbound/outbound flow below).
- `RFID` — maps a physical tag `id` to a `ref_id`/`ref_object` (`Product` or `Parcel`).
- `Pallet` — refs an `OutletOrder`; `status` ∈ `activated | out_for_delivery | deactivated`. Only one pallet is `activated` at a time and it receives outbound scans.
- `OutletOrder` — refs a `User` (outlet) and holds a `products[]` array of `{product, quantity}`; `status` ∈ `pending | accepted | processed | out_for_delivery | delivered | rejected`.
- `User` — `role` ∈ `manager | staff | outlet | supplier`; `status` ∈ `pending | accepted | rejected`. New signups are `pending` until a manager verifies them.
- Also: `Warehouse`, `Shelf`, `Inbound`, `History`.

### RFID inbound/outbound flow (`controllers/iot.controller.js`)
- **Inbound** (`POST /iot/inbound`): if the scanned `tagID` already exists → routes to `updateInventory` (status transition, adjusts `Inventory.parcel_quantity`). If new → looks up the staged `Inbound.barcode_input`, finds/creates the `Product` (auto-creating it from UPCItemDB and a zeroed `Inventory` if unseen), creates a `Parcel` + `RFID` tag, and increments `parcel_quantity`.
- **Outbound** (`POST /iot/outbound`): finds the tag's `Parcel`, attaches it to the single `activated` `Pallet`, sets parcel status to `loaded_on_pallet`.
- The barcode to associate with the *next* inbound scan is staged separately via the main API's `/inbound/barcode-input` (frontend `InboundPage`).

## Frontend Architecture

- Entry `main.tsx` wraps `App` in `BrowserRouter` → `AuthProvider`. `App.tsx` is the router and renders **completely different route trees by role**: `manager`/`staff` get the warehouse dashboard set; `outlet` gets the ordering set. Unauthenticated or `pending`/`rejected` users see the combined Login/Signup screen.
- `Auth.tsx` exposes `useAuth()` (a React context) with `currentUser`, `login`, `signup`, `logout`, `loading`. On mount it restores the session by reading the `token` from `localStorage` and calling `User.getCurrent()`.
- `src/api/index.ts` is the single API layer (Axios). **The base URL is hardcoded** to the deployed backend `https://ims-be.onrender.com/api/v1` — change it here to point at a local backend. The Axios instance reads the auth token from `localStorage` and sends it as the `Authorization` header. Domain calls are grouped into static-method classes: `User`, `OutletOrder`, `Pallet`, `Parcel`, plus standalone functions for inbound/products/auth.
- Path aliases `@` → `/src` and `@components` → `/src/components` (`vite.config.ts`).
- `vercel.json` adds an SPA rewrite (all paths → `/`); the app deploys to Vercel.

## IoT Firmware (`iot/src/main.cpp`)

Single-file Arduino sketch. Two MFRC522 readers (inbound on SS pin 5 / RST 22, outbound on SS 4 / RST 21) plus status LEDs. On scan it builds a JSON body `{ sensor, role, value: { tagID } }` and POSTs to `/iot/inbound` or `/iot/outbound` on the IoT server. **WiFi SSID/password and the backend `SERVER_ADDRESS`/`SERVER_PORT` are hardcoded** near the top of the file and must be edited for a new network/host. Library deps (`ArduinoJson`, `MFRC522`) are pinned in `platformio.ini`.

## Configuration / Gotchas

- Backend env vars (loaded via `dotenv`, `.env` is gitignored): `MONGODB_URL`, `JWT_KEY`, `PORT`, `ENDPOINT` (the route prefix, e.g. `/api/v1`). Missing `MONGODB_URL` throws on startup.
- `DEFAULT_WAREHOUSE_ID = "650041c789d9fbf5b33516ca"` is hardcoded in both `backend/controllers/iot.controller.js` and `frontend/src/api/index.ts` — keep them in sync.
- Error logs go to `logs/` (gitignored) via Winston (`debug/debug.js`); each log call creates a new timestamped file.
