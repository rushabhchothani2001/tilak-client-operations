# tilak-client-operations

React frontend for **Tilak Industries** — order taking, manufacturing status tracking, customer details and user logins for a corrugated box business.

Built with React 18, TypeScript, Vite and React Router.

## Modules

| Module | Who can use it | What it does |
| --- | --- | --- |
| Order Taking | Admin | Place orders: customer, size (L × W × H), 3/5 ply, printed (4-color / single color) or plain, inside paper top & fluted (e.g. `120/150/160`), laminated, quantity, expected delivery date |
| Manufacturing | Admin, Worker | Update production status; record produced quantity at "Ready for Shipment". Customer details are never shown here |
| Customers | Admin | Name, company, phone, helpline phone, GST number, address |
| Users | Admin | Create admin/worker logins, reset passwords, disable accounts |

## Requirements

This app needs the **Tilak Industries API server** (Node.js + Express + MongoDB) running. In development, Vite forwards every `/api` request to `http://localhost:5000` (see `vite.config.ts`).

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Type-check only |

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | Base URL of the API. Leave as default when the API is served from the same origin (or through the dev proxy) |

Login sessions use an httpOnly cookie, so the app and API should be served from the same site.

## Deployment (Vercel)

`vercel.json` forwards every `/api/*` request to the API on Render and sends all other paths to `index.html` (so page refreshes work). If the API's Render URL changes, update the `destination` in `vercel.json`.

Full steps for Vercel, Render and MongoDB Atlas are in the server repo's [DEPLOYMENT.md](https://github.com/rushabhchothani2001/tilak-server-oprations/blob/main/DEPLOYMENT.md).

## Project structure

```
src/
├── api/          typed fetch client for the API
├── auth/         login state and role-based route guards
├── components/   layout, form controls, badges, order spec list, status timeline
├── lib/          labels, formatting helpers, data-loading hook
└── pages/
    ├── LoginPage.tsx
    ├── orders/         order list, new order form, order detail
    ├── manufacturing/  worker order list + status update screen
    ├── customers/      customer list + add/edit form
    └── users/          user list + add/edit form
```
