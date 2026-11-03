# Anomaly Monitor

A professional infrastructure anomaly-monitoring dashboard built with React, TypeScript, Vite, Tailwind CSS, and Recharts.

## Overview

Anomaly Monitor lets you upload telemetry CSV data, explore it visually, run threshold-based and statistical anomaly detection, manage alerts, and review historical detection results — all within a dark, professional dashboard interface.

## Pages

1. **Overview** — Headline stats, charts (metric activity, normal vs anomalous, severity distribution, detection activity), recent alerts and detections.
2. **Data Ingestion** — Drag-and-drop CSV upload with preview, column mapping (timestamp, metric, entity, optional label), and ingestion summary.
3. **Telemetry** — Filterable telemetry records table with interactive time-series chart.
4. **Historical Analysis** — Three tabs (telemetry, generic detection, advanced detection history) with filters and CSV export.
5. **Anomaly Detection** — Generic threshold detection and advanced statistical methods (z-score, rolling z-score, multivariate) with results and evaluation.
6. **Alerts** — Alert management with summary cards, filters, acknowledge/resolve actions, and detail view.
7. **Configuration** — Named configuration management with metric thresholds, statistical settings, and severity boundaries. Saved in SQLite through the FastAPI backend.

## Backend Connection

The frontend connects to a FastAPI backend via the `VITE_BACKEND_URL` environment variable. When this variable is empty, every backend-dependent page shows a "Backend not connected" state.

### Setup

1. Copy `.env.example` to `.env` (or edit the existing `.env`).
2. Set `VITE_BACKEND_URL` to your FastAPI server address:
   ```
   VITE_BACKEND_URL=http://127.0.0.1:8000
   ```
3. Restart the dev server or rebuild.

### Expected API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/overview` | Dashboard summary data |
| GET | `/api/v1/catalog` | Available metrics and entities |
| GET | `/api/v1/telemetry` | Telemetry records with filters |
| POST | `/api/v1/ingestion/csv` | Upload CSV (multipart form) |
| POST | `/api/v1/detection/generic` | Run threshold-based detection |
| POST | `/api/v1/detection/advanced` | Run statistical detection |
| GET | `/api/v1/detection/generic/results` | Historical generic detection results |
| GET | `/api/v1/detection/advanced/results` | Historical advanced detection results |
| GET | `/api/v1/alerts` | List alerts |
| POST | `/api/v1/alerts/{id}/acknowledge` | Acknowledge an alert |
| POST | `/api/v1/alerts/{id}/resolve` | Resolve an alert |
| POST | `/api/v1/configurations` | Save configuration to backend |
| GET | `/api/v1/configurations` | List saved configurations |
| GET | `/api/v1/configurations/{name}` | Load configuration from backend |
| DELETE | `/api/v1/configurations/{name}` | Delete saved configuration |
| GET | `/api/v1/datasets` | List uploaded datasets |
| GET | `/api/v1/datasets/{id}` | Get dataset metadata |
| GET | `/api/v1/datasets/{id}/preview` | Preview dataset records |
| GET | `/api/v1/datasets/{id}/quality` | Get dataset quality metrics |
| DELETE | `/api/v1/datasets/{id}` | Delete one dataset and associated data |
| POST | `/api/v1/datasets/delete` | Delete multiple datasets and associated data |
| GET | `/api/v1/export/telemetry` | Export telemetry as CSV |
| GET | `/api/v1/export/detection/generic` | Export generic detection results as CSV |
| GET | `/api/v1/export/detection/advanced` | Export advanced detection results as CSV |

### CSV Upload Contract

`POST /api/v1/ingestion/csv` accepts multipart form data with:
- `file` — the CSV file
- `timestamp_column` — name of the timestamp column
- `metric_columns` — one or more metric column names (repeated form field)
- `entity_column` — name of the entity ID column
- `label_column` (optional) — name of the ground-truth label column

Configuration saves, loads, deletes, and alert lifecycle changes are persisted by the FastAPI backend in SQLite. No Supabase credentials are required.

## Development

```bash
npm run dev      # Start dev server
npm run build    # Typecheck + production build
npm run typecheck # Type check only
npm run lint     # ESLint
```
