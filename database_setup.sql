-- Create areas table for geofencing app
-- Copy and paste this into your Supabase SQL Editor

-- Create areas table
CREATE TABLE IF NOT EXISTS areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  radius INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT '#FF4444',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_inside BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for demo purposes)
-- In production, you should implement proper authentication
DROP POLICY IF EXISTS "Allow all operations" ON areas;
CREATE POLICY "Allow all operations" ON areas FOR ALL USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_areas_updated_at ON areas;
CREATE TRIGGER update_areas_updated_at 
    BEFORE UPDATE ON areas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert a test area (optional)
INSERT INTO areas (name, center_lat, center_lng, radius, color) 
VALUES ('Test Area', 37.7749, -122.4194, 100, '#FF4444')
ON CONFLICT DO NOTHING;

-- Verify the table was created
SELECT * FROM areas LIMIT 5; 