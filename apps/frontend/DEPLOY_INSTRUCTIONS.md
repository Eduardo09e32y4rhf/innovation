# Deployment Instructions for Innovation SaaS Foundation

This frontend is based on the **Vercel Subscription Payments Starter**, which provides a robust foundation with Supabase (Auth & DB) and Stripe (Payments).

## 1. Supabase Setup (Database & Auth)

1.  Create a new project at [Supabase](https://supabase.com).
2.  Go to **Settings > API** in your Supabase project.
3.  Copy the following values:
    *   **Project URL** -> `NEXT_PUBLIC_SUPABASE_URL`
    *   **anon public** key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   **service_role** key -> `SUPABASE_SERVICE_ROLE_KEY` (Keep this secret!)
4.  Go to **SQL Editor** in Supabase and run the content of `schema.sql` (found in this directory) to set up the database tables (products, prices, subscriptions, etc.).
5.  Go to **Authentication > URL Configuration** and set your Site URL (the Render URL, e.g., `https://innovation-frontend.onrender.com`).
6.  Add `https://innovation-frontend.onrender.com/**` to the **Redirect URLs**.

## 2. Stripe Setup (Payments)

1.  Create a [Stripe](https://stripe.com) account.
2.  Go to **Developers > API keys**.
3.  Copy:
    *   **Publishable key** -> `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
    *   **Secret key** -> `STRIPE_SECRET_KEY`
4.  Go to **Developers > Webhooks** and add an endpoint.
    *   **Endpoint URL**: `https://innovation-frontend.onrender.com/api/webhooks`
    *   **Events**: Select all events (or at least `product.*`, `price.*`, `checkout.session.*`, `customer.subscription.*`).
5.  Copy the **Signing secret** -> `STRIPE_WEBHOOK_SECRET`.

## 3. Render Configuration

In your Render Dashboard for the `innovation-frontend` service, verify the Environment Variables are present (added via Blueprint) and populate them with the values obtained above.

*   `NEXT_PUBLIC_SUPABASE_URL`
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
*   `SUPABASE_SERVICE_ROLE_KEY`
*   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
*   `STRIPE_SECRET_KEY`
*   `STRIPE_WEBHOOK_SECRET`
*   `NEXT_PUBLIC_SITE_URL` (Your Render frontend URL)

Once these are set, the application will be fully functional with Auth and Payments!
