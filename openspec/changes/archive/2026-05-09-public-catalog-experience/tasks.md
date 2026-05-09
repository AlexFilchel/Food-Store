# Tasks: public-catalog-experience

## 1. Backend public catalog API

- [x] 1.1 Add public product schemas that expose only customer-safe fields.
- [x] 1.2 Add repository/service support for public sellable filters: non-deleted, active, available and `stock_quantity > 0`.
- [x] 1.3 Add public list endpoint under `/api/v1/catalog/products` with `page`, `size`, `search` and `category_id`.
- [x] 1.4 Add public detail endpoint under `/api/v1/catalog/products/{product_id_or_slug}` returning not-found for non-sellable products.
- [x] 1.5 Register the public catalog router in the API router without auth dependencies.

## 2. Backend verification

- [x] 2.1 Test anonymous public listing succeeds and uses canonical pagination.
- [x] 2.2 Test inactive, unavailable, soft-deleted and out-of-stock products are hidden from public listing/detail.
- [x] 2.3 Test search and category filters return only matching sellable products.
- [x] 2.4 Test missing/non-sellable detail returns canonical not-found error.

## 3. Frontend public catalog data layer

- [x] 3.1 Add public catalog TypeScript types separate from admin product mutation types.
- [x] 3.2 Add public catalog API client using `/api/v1/catalog/products`.
- [x] 3.3 Add TanStack Query keys/hooks for public list and detail queries.

## 4. Frontend public catalog UI

- [x] 4.1 Replace the home placeholder with a public catalog page.
- [x] 4.2 Render product cards with name, price, categories and link/action to detail.
- [x] 4.3 Add search/category filter controls and keep requests pagination-compatible.
- [x] 4.4 Add loading, error and empty states for the catalog list.
- [x] 4.5 Add public product detail route/page reachable without authentication.
- [x] 4.6 Render product detail with description, price, categories and ingredients/removability.
- [x] 4.7 Handle not-found detail responses with stable UI fallback.

## 5. Frontend verification

- [x] 5.1 Test anonymous home renders public catalog without auth redirect.
- [x] 5.2 Test list loading/error/empty/success states.
- [x] 5.3 Test filters update the public catalog query.
- [x] 5.4 Test product detail success and not-found states.

## 6. OPSX closure readiness

- [x] 6.1 Confirm proposal, design, spec and tasks match the implemented behavior.
- [x] 6.2 Run targeted backend and frontend tests for the change.
- [x] 6.3 Verify `openspec status --change public-catalog-experience --json` has no missing required artifacts.
