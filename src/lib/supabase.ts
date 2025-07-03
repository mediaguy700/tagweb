import { createClient } from '@supabase/supabase-js'

// Define the Area interface
export interface Area {
  id: string;
  name: string;
  center: {
    lat: number;
    lng: number;
  };
  radius: number;
  color: string;
  isActive: boolean;
  isInside: boolean;
  created: Date;
}

// Define a basic Database type for Supabase
interface Database {
  public: {
    Tables: {
      areas: {
        Row: {
          id: string;
          name: string;
          center_lat: number;
          center_lng: number;
          radius: number;
          color: string;
          is_active: boolean;
          created_at: string;
        };
      };
    };
  };
}

console.log('Supabase Client Debug:', {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  keyPresent: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
  envUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  envKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Present' : 'Missing'
})

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Type for database area
export interface DatabaseArea {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius: number;
  color: string;
  is_active: boolean;
  created_at: string;
}

// Convert database area to app area
export function databaseToArea(dbArea: DatabaseArea): Area {
  return {
    id: dbArea.id,
    name: dbArea.name,
    center: {
      lat: dbArea.center_lat,
      lng: dbArea.center_lng
    },
    radius: dbArea.radius,
    color: dbArea.color,
    isActive: dbArea.is_active,
    isInside: false,
    created: new Date(dbArea.created_at)
  };
}

// Convert app area to database area
export function areaToDatabase(area: Area): Omit<DatabaseArea, 'id' | 'created_at'> {
  return {
    name: area.name,
    center_lat: area.center.lat,
    center_lng: area.center.lng,
    radius: area.radius,
    color: area.color,
    is_active: area.isActive
  };
} 