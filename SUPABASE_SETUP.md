# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key

## 2. Environment Variables

Create a `.env.local` file in the root directory with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://nxqkpakohiopztlljuck.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here

# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

## 3. Database Schema

Run this SQL in your Supabase SQL editor:

```sql
-- Create areas table
CREATE TABLE areas (
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
CREATE POLICY "Allow all operations" ON areas FOR ALL USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_areas_updated_at 
    BEFORE UPDATE ON areas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

## 4. Features

Once set up, the app will:
- ✅ Load areas from Supabase on startup
- ✅ Create new areas in the database
- ✅ Update area status (active/inactive) in the database
- ✅ Delete areas from the database
- ✅ Real-time sync between UI and database
- ✅ Persist area data across sessions 