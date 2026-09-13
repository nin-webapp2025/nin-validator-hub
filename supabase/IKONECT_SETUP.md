# Ikonect payment setup

The airtime, mobile data, TV, and electricity payment integration uses Ikonect as the upstream provider. Keep provider credentials only in Supabase Edge Function secrets.

## 1. Configure secrets

Set these in Supabase Dashboard under **Project Settings > Edge Functions > Secrets**:

- `IKONECT_API_KEY`
- `IKONECT_API_SECRET`

Keep existing `JOB_WORKER_TOKEN` configured for background jobs. Retired provider secrets and webhook setup are no longer required for the active VTU flow.

## 2. Apply migration

Apply:

```text
supabase/migrations/20260912_add_ikonect_bill_payments.sql
```

This migration:

- enables `airtime`, `data`, `tv`, and `electricity` product categories
- enables `airtime_purchase`, `data_purchase`, `tv_purchase`, and `electricity_purchase` wallet operations
- seeds Ikonect airtime and electricity provider rows
- adds live-catalog purchase preparation for Ikonect mobile data
- keeps `admin_import_ikonect_data_products(jsonb, numeric)` as an optional fallback for stored data plans
- limits product listing/quoting to active Ikonect products

## 3. Mobile data plans

No admin import is required for mobile data. The app loads data bundles through the Edge Function action below, which calls Ikonect's live `GET /dataplans/` endpoint and applies the standard 4% markup server-side:

```json
{
  "action": "vtu_data_catalog",
  "network": "mtn"
}
```

Purchases should use the returned `provider_plan_id`:

```json
{
  "action": "vtu_data",
  "provider_plan_id": "PLAN_ID_FROM_CATALOG",
  "phone": "08012345678"
}
```

The backend reloads the Ikonect catalog during purchase, confirms the current provider cost, applies the 4% markup, charges the wallet, and then submits the Ikonect data request.

If you later want a stored fallback catalog, fetch Ikonect's catalog and import it as an admin:

```sql
select public.admin_import_ikonect_data_products(
  $json$
  { "dataPlans": [] }
  $json$::jsonb,
  1.04
);
```

The standard data pricing rule is a 4% markup over Ikonect cost.

## 4. TV plans

Ikonect's public API reference documents `POST /tv/`, but does not expose a TV plan catalog endpoint. Add TV rows to `public.vtu_products` once plan IDs and prices are available:

```sql
insert into public.vtu_products (
  provider, category, network, name, provider_plan_id,
  provider_cost, retail_price, fee_percent, fee_flat,
  min_amount, max_amount, is_active, sort_order, updated_at
) values (
  'ikonect', 'tv', 'dstv', 'DStv Example Plan', '6',
  0, 1, 0, 0,
  null, null, true, 10, now()
);
```

Set `provider_cost` to the Ikonect cost and `retail_price` to your selling price.
