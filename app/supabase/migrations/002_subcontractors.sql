CREATE TABLE subcontractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  specialty text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- seed a few
INSERT INTO subcontractors (name, contact_name, phone, email, specialty) VALUES
  ('Austin Pro Roofing', 'Mike Chen', '(512) 555-0201', 'mike@austinproroofing.com', 'Roofing'),
  ('Hill Country HVAC', 'Sara Diaz', '(512) 555-0202', 'sara@hchvac.com', 'HVAC'),
  ('Lone Star Plumbing', 'Tom Bauer', '(512) 555-0203', 'tom@lsplumbing.com', 'Plumbing'),
  ('Texas Tile Works', 'Rosa Kim', '(512) 555-0204', 'rosa@texastile.com', 'Tile & Stone');
