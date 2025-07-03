import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nxqkpakohiopztlljuck.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54cWtwYWtvaGlvcHp0bGxqdWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNDE3OTgsImV4cCI6MjA2NjgxNzc5OH0.tpyAfSAqegKAfPEsN4rSf62cAxym60eaHvpuolag_LM'

console.log('Supabase Client Debug:', {
  url: supabaseUrl,
  keyPresent: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length,
  envUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  envKey: process.env.NEXT_PUBLIC_SUPABASE_KEY ? 'Present' : 'Missing'
})

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface DatabaseArea {
  id: string
  name: string
  center_lat: number
  center_lng: number
  radius: number
  color: string
  is_active: boolean
  is_inside: boolean
  created_at: string
  updated_at: string
}

// Convert between app Area and database Area
export const areaToDatabase = (area: any) => ({
  id: area.id,
  name: area.name,
  center_lat: area.center.lat,
  center_lng: area.center.lng,
  radius: area.radius,
  color: area.color,
  is_active: area.isActive,
  is_inside: area.isInside,
  created_at: area.created.toISOString(),
  updated_at: new Date().toISOString()
})

export const databaseToArea = (dbArea: DatabaseArea) => ({
  id: dbArea.id,
  name: dbArea.name,
  center: {
    lat: dbArea.center_lat,
    lng: dbArea.center_lng
  },
  radius: dbArea.radius,
  color: dbArea.color,
  isActive: dbArea.is_active,
  isInside: dbArea.is_inside,
  created: new Date(dbArea.created_at)
}) 