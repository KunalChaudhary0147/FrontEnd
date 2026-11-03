# Project memory

## Product intent & audience

- Infrastructure Anomaly Detection Dashboard for professional operators monitoring telemetry, investigating anomalies, managing alerts, and reviewing historical detection results.
- Audience likely includes infrastructure/SRE, data, and operations teams who need dense but readable monitoring workflows.
- Existing application is an established Anomaly Monitor; future work should extend it rather than recreate or redesign completed areas.

## Brand personality & voice

- Professional, technical, operational, and trustworthy.
- UI copy should be concise and action-oriented, especially around upload validation, backend errors, detection status, and alert workflows.
- Preserve the application’s established branding, dark navy visual identity, colors, and typography.

## Visual design & UX direction

- Dark dashboard UI with a structured workspace layout: persistent existing sidebar/navigation plus page-specific cards, tables, filters, charts, and dialogs.
- Data Ingestion uses a dedicated upload workspace containing:
  - Drag-and-drop CSV upload card with browse, replace, remove, file metadata, validation, and upload controls.
  - CSV preview with total rows/columns, column names, file information, and first 10 rows.
  - Column mapping panel supporting timestamp, entity ID, optional label, and multiple metric columns.
  - Ingestion result summary with records, metrics, entities, and date-range information when available.
- Telemetry Explorer favors filterable/paginated tables, time-series visualization, and anomalous points visually distinguished in red; support CSV export.
- Historical Analysis uses separate tabs for telemetry history, generic detection history, and advanced detection history, with filters and exports.
- Anomaly Detection separates generic and advanced workflows. Results combine summary metrics, charts, detailed tables, and evaluation metrics/confusion matrix only when ground-truth labels are present.
- Alerts uses summary status/severity cards, filter controls, an actionable table, and a details dialog. Acknowledge/resolve interactions should communicate optimistic state changes and failures clearly.
- Configuration provides threshold editing, statistical/severity controls, named configuration persistence, and shared application of loaded settings to detection pages.
- Every page and data operation needs clear loading, success, empty, and error states. Backend-disconnected states are an expected runtime condition.
- Prefer existing reusable components, Lucide icons, and established dashboard patterns over introducing new UI systems or visual styles.

## Decisions, constraints & rationale

- React + TypeScript + Vite architecture remains in place; do not create a new project or rebuild the completed Overview page.
- FastAPI backend is the source of telemetry, ingestion, detection, alerts, and configuration data. Existing API client and backend connection indicator are retained.
- Backend base URL is configured through `VITE_BACKEND_URL`; local development has used `http://127.0.0.1:8000`.
- API request/response contracts must be inspected and followed rather than inferred. CSV ingestion uses multipart upload at `/api/v1/ingestion/csv`; multiple metrics are represented as repeated `metric_columns` fields.
- Existing page wiring includes Overview, Data Ingestion, Telemetry Explorer, Historical Analysis, Anomaly Detection, Alerts, and Configuration, with shared active configuration context and toaster support.
- Detection configuration includes generic thresholds plus advanced statistical settings such as z-score, rolling-window, and multivariate parameters; loaded configurations are shared with detection workflows.
- Alert status updates persist through the backend/Supabase integration with optimistic UI and rollback on failure.
- Do not alter unrelated completed features. Preserve existing navigation, reusable components, API client, backend indicator, and dark theme.
- Current implementation has typecheck/build success, but backend availability and real API integration still need runtime verification.
- `.env.example` and README document environment/API expectations; keep them aligned with actual backend contracts.

## Open questions & assumptions

- Backend was not running during the last implementation pass; successful runtime behavior, response shapes, validation errors, and endpoint availability remain to be verified against the live FastAPI service.
- Confirm all documented endpoint paths and CSV multipart field names against the actual backend before changing client behavior.
- Validate ingestion with successful CSVs, malformed/invalid files, missing required mappings, empty CSVs, duplicate submissions, and backend validation failures.
- Verify refresh/invalidation after successful ingestion updates Overview statistics, telemetry, and historical telemetry without requiring a full reload.
- Confirm Supabase schema/auth behavior for alert persistence and named configurations in the target environment.
- Confirm responsive behavior and accessibility of dense tables, checkbox metric selection, sliders, dialogs, charts, and drag-and-drop interactions across supported viewport sizes.