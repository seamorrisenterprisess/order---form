CREATE TABLE order_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  job_name text,
  work_description text,
  scope_reason text,
  subcontractor_name text,
  markup_pct numeric(5,2) DEFAULT 20,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
