# Sakhi Seva Order Desk V4 — corrected Shopify-connected build

This version fixes the earlier deployment/authentication architecture.

## Architecture
- Shopify app distribution: `SingleMerchant` (Partner Dashboard custom app)
- Shopify App Proxy: `/apps/sakhi-order-desk` -> app `/proxy`
- Shopify OAuth/session authentication via `@shopify/shopify-app-react-router`
- Prisma session storage using PostgreSQL
- Password-protected internal Order Desk
- Server-side Shopify Admin GraphQL access
- Creates one Draft Order with multiple existing Shopify variants and/or custom/offline line items
- Supports shipping and fixed order-level discounts

## Render environment variables
Required:
- `SHOPIFY_API_KEY` = Shopify Client ID
- `SHOPIFY_API_SECRET` = Shopify Client Secret
- `SHOPIFY_APP_URL` = Render HTTPS URL, no trailing slash
- `SCOPES` = `write_draft_orders,read_draft_orders,read_customers,read_products,write_app_proxy`
- `ORDER_DESK_PASSWORD` = your private Order Desk password
- `SESSION_SECRET` = long random secret
- `SHOPIFY_APP_HANDLE` = `sakhi-seva-order-desk`
- `DATABASE_URL` = Render Postgres connection string
- `NODE_ENV` = `production`

## Render commands
Build: `npm run build`
Start: `npm run start`

The package runs Prisma generate before build and Prisma db push before start.

## Shopify Dev Dashboard
Set the app URL to the Render URL.
Set the app proxy to:
- Prefix: `apps`
- Subpath: `sakhi-order-desk`
- Proxy URL: `https://YOUR-RENDER-URL/proxy`

For authentication, the app reserves `/auth/*` and the auth route calls `authenticate.admin`.

## Database
Render Free Postgres is suitable for a temporary test only; it expires after 30 days. Use a paid Postgres database for production.
