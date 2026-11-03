/*
# Create configurations and alert status tables

1. New Tables
- `anomaly_configurations`: named detection configurations. Columns: `id` (uuid, primary key), `name` (text, unique, required), `config` (jsonb, the threshold/sensitivity/severity settings), `created_at`, `updated_at`.
- `alert_status_overrides`: the saved status of each alert. Columns: `alert_id` (text, primary key), `status` (text: open, acknowledged, or resolved), `updated_at`.

2. Security
- Row level security is enabled on both tables.
- The app has no sign-in, so the anon and authenticated roles get read and write access. The data is intentionally shared across the team using this tool.

3. Important notes
- Configuration names are unique. Saving under an existing name updates that configuration.
- Alert status rows are keyed by the alert identifier that the backend will provide.
*/

CREATE TABLE IF NOT EXISTS anomaly_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_status_overrides (
  alert_id text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('open', 'acknowledged', 'resolved')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE anomaly_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_status_overrides ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON anomaly_configurations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alert_status_overrides TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_configurations" ON anomaly_configurations;
CREATE POLICY "anon_select_configurations" ON anomaly_configurations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_configurations" ON anomaly_configurations;
CREATE POLICY "anon_insert_configurations" ON anomaly_configurations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_configurations" ON anomaly_configurations;
CREATE POLICY "anon_update_configurations" ON anomaly_configurations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_configurations" ON anomaly_configurations;
CREATE POLICY "anon_delete_configurations" ON anomaly_configurations FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_alert_status" ON alert_status_overrides;
CREATE POLICY "anon_select_alert_status" ON alert_status_overrides FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_alert_status" ON alert_status_overrides;
CREATE POLICY "anon_insert_alert_status" ON alert_status_overrides FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_alert_status" ON alert_status_overrides;
CREATE POLICY "anon_update_alert_status" ON alert_status_overrides FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_alert_status" ON alert_status_overrides;
CREATE POLICY "anon_delete_alert_status" ON alert_status_overrides FOR DELETE
  TO anon, authenticated USING (true);
