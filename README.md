# Invoice Supa

This project wraps your existing invoicing app in a Vite + React shell and adds Supabase authentication plus cloud sync.

## 1) Install
```bash
npm install
```

## 2) Add your Supabase keys
Copy `.env.example` to `.env` and fill in:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 3) Create the database table
Open the SQL Editor in Supabase and run:

- `supabase/schema.sql`

## 4) Enable email sign-in
In Supabase:
- Authentication -> Providers
- enable Email

## 5) Run the app
```bash
npm run dev
```

## How sync works
- The original app still uses localStorage internally.
- This wrapper signs the user in with Supabase.
- After sign-in, the app automatically syncs the five localStorage data blocks to the `app_state` table:
  - settings
  - clients
  - items
  - invoices
  - estimates

## Notes
- First sign-in:
  - if cloud data exists, it is pulled into localStorage
  - otherwise the current local data is pushed to Supabase
- The top bar lets you force a pull or push.
