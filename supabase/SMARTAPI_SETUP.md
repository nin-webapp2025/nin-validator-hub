# Smart API VTU setup

The airtime/data integration keeps provider credentials and wholesale pricing on the backend.

## 1. Configure Edge Function secrets

Set these in Supabase Dashboard under **Project Settings > Edge Functions > Secrets**:

- `SMARTAPI_API_KEY`: the current Smart API production key
- `SMARTAPI_PIN`: the production transaction PIN from the Smart API account
- `SMARTAPI_WEBHOOK_TOKEN`: a long random value used only by the webhook URL
- `JOB_WORKER_TOKEN`: a separate long random value used to authorize background-worker runs

Add the same `JOB_WORKER_TOKEN` value to the GitHub repository's Actions secrets so the scheduled reconciliation workflow can invoke the worker.

Rotate the API key that previously appeared in `src/components/dashboard/api-doc.md`; removing it from the current file does not remove it from Git history.

## 2. Apply the database migration

Apply these migrations before deploying the updated functions:

1. `supabase/migrations/20260706_add_smartapi_vtu.sql`
2. `supabase/migrations/20260707_add_smartapi_product_import.sql`
3. `supabase/migrations/20260708_seed_smartapi_data_prices.sql`

The seed migration imports the data-plan IDs from the supplied Smart API plan list and the cost prices from `Your Selling Price.docx`, then sets every data-plan `retail_price` at a 4% markup.

## 3. Add products and retail prices

If Smart API updates its data plans later, copy the current JSON result from **Smart API > Developer's API > List of Plan IDs** or call:

```text
POST https://sabuss.com/vtu/api/plans/{SMARTAPI_API_KEY}
pin={SMARTAPI_PIN}
category=data
```

Then import the returned JSON with a 4% markup:

```sql
select public.admin_import_smartapi_data_products(
  $plans$
  [
    {"plan_id":"3","name":"MTN SME 1GB - 7 Days","amount":"REPLACE_PROVIDER_AMOUNT"}
  ]
  $plans$::jsonb,
  1.04
);
```

The import function reads `plan_id`, `name`, and `amount`, stores `amount` as the hidden provider cost, and sets `retail_price` to `amount * 1.04`.

Data example (replace every example value):

```sql
insert into public.vtu_products (
  category, network, name, provider_plan_id, provider_cost, retail_price, sort_order
) values (
  'data', 'MTN', 'MTN Data Bundle', 'REPLACE_PLAN_ID', 0.00, 0.01, 10
);
```

`retail_price` must be greater than `provider_cost`, which protects the configured margin.

Airtime example (replace every example value):

```sql
insert into public.vtu_products (
  category, network, name, provider_plan_id, provider_cost,
  fee_percent, fee_flat, min_amount, max_amount, sort_order
) values (
  'airtime', 'MTN', 'MTN Airtime', 'REPLACE_PLAN_ID', 0,
  4, 0, 50, 50000, 10
);
```

The example charges a 4% service fee. Replace the airtime `provider_plan_id` values with the real Smart API airtime plan IDs before going live.

## 4. Configure the provider webhook

Set the Smart API webhook URL to:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/smartapi-webhook?token=YOUR_SMARTAPI_WEBHOOK_TOKEN
```

Webhook payloads trigger an authenticated provider query. They do not directly mark a transaction successful or reversed.
