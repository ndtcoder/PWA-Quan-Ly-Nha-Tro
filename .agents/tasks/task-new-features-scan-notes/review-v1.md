# Contract scan upload, notes field, Google OAuth, and full Vietnamese localization

This change bundles several features: a contract scan PDF upload workflow (Supabase Storage upload via new backend endpoint, frontend file picker in the contract form, and view button on detail page), a `notes` text field added to renter and staff profiles (backend model + service + frontend form/display), Google OAuth sign-in with an organization onboarding flow, a rewrite of the auth dependency from local JWT decode to Supabase `auth.get_user()`, and a comprehensive Vietnamese localization pass across all frontend pages. The change also replaces WeasyPrint with fpdf2 for PDF generation, defensive-wraps notifications endpoints, and introduces lazy-loading via React `Suspense`.

Watch for:
- `handleActivate` bypasses the mutation error handling path — scan upload or contract activation failure is an unhandled promise rejection **(confirmed)**.
- The notifications router silently swallows all exceptions from mark-read operations, which could mask data corruption or auth failures **(confirmed)**.
- Dashboard error message lacks Vietnamese diacritics ("Khong the tai du lieu") while all surrounding text uses proper diacritics **(confirmed)**.

## High-level view

The contract scan upload follows the same Storage pattern as the existing ID photo upload: upload bytes to a bucket path, get the public URL, persist it on the record. The backend is solid; the frontend upload-on-save logic has an error handling gap in the "activate" path where the call chain isn't wrapped in try/catch.

The notes field is a straightforward column addition across models, services, and forms. The backend includes it in create/read paths, the frontend adds a textarea section and a display tab. No migration friction — `IF NOT EXISTS` guards the column additions.

Google OAuth is wired through Supabase's OAuth flow, landing on `/auth/callback` which calls a new `/auth/google` backend endpoint to create or fetch the profile and organization. The auth dependency has been rewritten from local JWT decode to server-side verification via `supabase.auth.get_user()`, which makes it algorithm-agnostic.

The Vietnamese localization is extensive and mostly consistent. One stray unaccented string in the dashboard error state stands out.

<details>
<summary>Issues (5)</summary>

1. **Unhandled rejection in handleActivate** — `handleActivate` calls `createContract`, `uploadContractScan`, and `activateContract` sequentially with `await` but the function is an async event handler with no try/catch. If any call throws (network error, 502 from Storage), the user gets no feedback and gets an unhandled promise rejection. Wrap in try/catch and show error toast or use the mutation pattern.
2. **Notifications mark-read silently swallows errors** — The `except Exception: pass` on both `mark_all_read` and `mark_by_ids` means any failure (auth issue, database constraint violation, network failure) returns success to the client. At minimum log the exception.
3. **Dashboard error missing diacritics** — Error message reads "Khong the tai du lieu" while it should be "Không thể tải dữ liệu" to match the rest of the app's Vietnamese text.
4. **Scan upload has no file-type validation on the backend** — The endpoint accepts any `UploadFile` and blindly stores it with a `.pdf` path. A non-PDF file would be stored with `.pdf` extension. Validate `content_type` or file signature.
5. **`_ensure_unique_slug` unbounded loop** — If slug generation collides indefinitely (unlikely but possible in adversarial conditions), this loops forever. Add a max-iteration guard.

</details>

<details>
<summary>Details</summary>

## Scan upload error handling gap in ContractFormPage

The `handleSaveDraft` path uses `createContractMutation.mutate(data)` whose `onSuccess` callback awaits the scan upload. If `uploadContractScan` fails there, the error propagates within the mutation callback and TanStack Query captures it — the user sees the mutation error state. So far acceptable.

The `handleActivate` path is different. It's a raw `async` function called directly from a button's `onClick`:

```tsx
const handleActivate = async () => {
  const data: ContractCreate = { unit_id: selectedUnitId, renter_id: selectedRenterId, ...contractDetails };
  const contract = await createContract(data);
  if (scanFile) {
    await uploadContractScan(contract.id, scanFile);
  }
  await activateContract(contract.id);
  navigate(`/contracts/${contract.id}`);
};
```

If `uploadContractScan` throws (502 from bucket missing, network error), the rejection is unhandled. The contract already exists in draft at that point, so the user is left with a half-created contract, no navigation, and a console error. The same applies if `activateContract` fails — the contract and scan exist but it stays in draft with no feedback.

The fix is either wrapping in try/catch with user-facing error state, or converting this to a mutation with `onError`.

## Notifications endpoint blanket exception suppression

The notifications router now catches all exceptions and returns success:

```python
@router.patch("/mark-read")
async def mark_notifications_read(...):
    if request.all:
        try:
            supabase.table("notifications").update(...).execute()
        except Exception:
            pass
        return {"message": "All notifications marked as read"}
```

If the notifications table doesn't exist (the original crash this was fixing), returning `{"count": 0}` for reads is a reasonable graceful degradation. But for write operations (mark-read), silently succeeding when the operation fails means the UI will show notifications as read while they remain unread in the database. The user experience degrades silently — they'll keep seeing the same "unread" notifications on next load. At minimum, the exception should be logged.

## Vietnamese localization consistency gap

All pages have been translated with proper Vietnamese diacritics: "Đang tải...", "Chưa có hợp đồng nào.", "Hợp đồng mới", etc. The dashboard error state is the outlier:

```tsx
<p className="text-red-600">Khong the tai du lieu</p>
```

This should be "Không thể tải dữ liệu" — the only visible string in the entire diff that's missing its diacritics.

## Scan upload lacks file type validation

The backend endpoint accepts any `UploadFile`:

```python
@router.post("/{contract_id}/upload-scan")
async def upload_scan(
    contract_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    file_bytes = await file.read()
    return contract_service.upload_scan_pdf(...)
```

The frontend restricts to `.pdf` via the `accept` attribute, but the backend doesn't validate `file.content_type`. An API consumer (or a modified client) could upload a `.exe` that gets stored at `{org_id}/scans/{contract_id}_scan.pdf`. Since these URLs are public (via `get_public_url`), this is a vector for serving malicious content under a trusted domain. A simple `if file.content_type != "application/pdf"` guard would close this.

## Scan upload in the mutation `onSuccess` callback

The `createContractMutation`'s `onSuccess` is:

```tsx
onSuccess: async (contract) => {
  if (scanFile) {
    await uploadContractScan(contract.id, scanFile);
  }
  navigate(`/contracts/${contract.id}`);
},
```

This is the "save draft" path. The scan upload happens inside `onSuccess`, so if it fails, the behavior depends on TanStack Query's handling of async `onSuccess` callbacks. In TanStack Query v5, if `onSuccess` throws, the mutation transitions to error state, which is acceptable. But the navigation won't happen and the user stays on the form with the contract already created — a subsequent retry would create a duplicate contract. Consider checking if scan upload failed and still navigating (the scan can be uploaded later from the detail page).

## `_ensure_unique_slug` lacks iteration bound

```python
def _ensure_unique_slug(supabase, base_slug: str) -> str:
    slug = base_slug
    counter = 1
    while True:
        existing = supabase.table("organizations").select("id").eq("slug", slug).execute()
        if not existing.data:
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1
```

In practice this will rarely iterate more than a few times. But there's no upper bound — if something goes wrong (e.g., the query always returns data due to a bug), this loops forever and blocks the request thread. Adding `if counter > 100: raise` would make it fail safely.

</details>

<details>
<summary>Files changed</summary>

| File | Change |
|------|--------|
| `backend/migrations/004_new_features.sql` | New migration adding `scan_pdf_url`, `notes` columns |
| `backend/app/models/contract.py` | Add `scan_pdf_url` to `ContractResponse` |
| `backend/app/models/renter.py` | Add `notes` to create/update/detail models |
| `backend/app/models/staff.py` | Add `notes` to `StaffResponse` |
| `backend/app/services/contract_service.py` | Rewrite PDF generation with fpdf2, add `upload_scan_pdf`, include `scan_pdf_url` in enrich |
| `backend/app/services/renter_service.py` | Include notes in create/detail, wrap upload in try/except |
| `backend/app/services/staff_service.py` | Include notes in list output |
| `backend/app/routers/contracts.py` | Add `POST /{id}/upload-scan` endpoint |
| `backend/app/routers/notifications.py` | Wrap all queries in try/except |
| `backend/app/routers/staff.py` | Fix invitation data (remove nonexistent columns, add token/expires_at) |
| `backend/app/routers/auth.py` | Add Google OAuth endpoint |
| `backend/app/routers/organizations.py` | New org management endpoints |
| `backend/app/dependencies.py` | Rewrite auth from local JWT decode to `supabase.auth.get_user()` |
| `backend/app/services/auth_service.py` | Add Google auth flow, remove `email`/`invited_by` from profile inserts, unique slug generation |
| `backend/app/services/organization_service.py` | New org CRUD service |
| `backend/app/models/auth.py` | Add Google auth request/response models |
| `backend/app/models/organization.py` | New org models |
| `backend/app/config.py` | Add `GOOGLE_CLIENT_ID` |
| `backend/app/main.py` | Register organizations router |
| `frontend/src/types/contract.ts` | Add `scan_pdf_url` |
| `frontend/src/types/renter.ts` | Add `notes` to all interfaces |
| `frontend/src/types/task.ts` | Add `notes` to `StaffMember` |
| `frontend/src/api/contracts.ts` | Add `uploadContractScan` function |
| `frontend/src/api/auth.ts` | Add Google auth API functions |
| `frontend/src/api/organizations.ts` | New org API client |
| `frontend/src/api/client.ts` | Remove auto-redirect on 401 |
| `frontend/src/lib/supabase.ts` | New Supabase client instance |
| `frontend/src/App.tsx` | Lazy loading, new routes (auth/callback, org setup, org settings) |
| `frontend/src/pages/contracts/ContractFormPage.tsx` | Add scan file upload input in step 4 |
| `frontend/src/pages/contracts/ContractDetailPage.tsx` | Add "Xem hợp đồng Scan" button |
| `frontend/src/pages/renters/RenterFormPage.tsx` | Add notes textarea section |
| `frontend/src/pages/renters/RenterDetailPage.tsx` | Display notes in tab |
| `frontend/src/pages/staff/StaffListPage.tsx` | Add notes column, Vietnamese role labels |
| `frontend/src/pages/auth/LoginPage.tsx` | Add Google sign-in button, Vietnamese labels |
| `frontend/src/pages/auth/RegisterPage.tsx` | Add Google sign-up button, Vietnamese labels |
| `frontend/src/pages/auth/AuthCallbackPage.tsx` | New OAuth callback handler |
| `frontend/src/pages/onboarding/OrganizationSetupPage.tsx` | New org setup page |
| `frontend/src/pages/settings/OrganizationSettingsPage.tsx` | New org settings page |
| `frontend/src/pages/DashboardPage.tsx` | Live data queries, Vietnamese labels |
| `frontend/src/components/layout/*` | Vietnamese localization |
| All other `frontend/src/pages/**` | Vietnamese localization pass |
| `PRD_RentalManagement_SaaS.md` | Document new features |

Full diff: `git diff main` (93 files, +3015 -980 lines)

</details>
