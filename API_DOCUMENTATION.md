# Geofence API Documentation

This API provides endpoints for managing geofences (play spaces) in the NextAG application. All endpoints return JSON responses and use standard HTTP status codes.

## Base URL
```
http://localhost:3000/api/geofences
```

## Authentication
Currently, the API uses Supabase for data storage. Authentication will be added in future versions.

## Endpoints

### 1. Get All Geofences
**GET** `/api/geofences`

Retrieves all geofences from the database.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "geofences": [
    {
      "id": "uuid-string",
      "name": "Central Park Playground",
      "center": {
        "lat": 40.7829,
        "lng": -73.9654
      },
      "radius": 100,
      "color": "#FF4444",
      "isActive": true,
      "isInside": false,
      "created": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 2. Create New Geofence
**POST** `/api/geofences`

Creates a new geofence.

**Request Body:**
```json
{
  "name": "New Play Space",
  "center": {
    "lat": 40.7829,
    "lng": -73.9654
  },
  "radius": 100,
  "color": "#FF4444"
}
```

**Required Fields:**
- `name`: String - Name of the geofence
- `center`: Object with `lat` and `lng` coordinates
- `radius`: Number - Radius in feet

**Optional Fields:**
- `color`: String - Hex color code (default: "#FF4444")

**Response:**
```json
{
  "success": true,
  "geofence": {
    "id": "uuid-string",
    "name": "New Play Space",
    "center": {
      "lat": 40.7829,
      "lng": -73.9654
    },
    "radius": 100,
    "color": "#FF4444",
    "isActive": true,
    "isInside": false,
    "created": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. Get Specific Geofence
**GET** `/api/geofences/{id}`

Retrieves a specific geofence by ID.

**Response:**
```json
{
  "success": true,
  "geofence": {
    "id": "uuid-string",
    "name": "Central Park Playground",
    "center": {
      "lat": 40.7829,
      "lng": -73.9654
    },
    "radius": 100,
    "color": "#FF4444",
    "isActive": true,
    "isInside": false,
    "created": "2024-01-15T10:30:00.000Z"
  }
}
```

### 4. Update Geofence
**PUT** `/api/geofences/{id}`

Updates an existing geofence.

**Request Body:**
```json
{
  "name": "Updated Play Space",
  "center": {
    "lat": 40.7829,
    "lng": -73.9654
  },
  "radius": 150,
  "color": "#00FF00",
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "geofence": {
    "id": "uuid-string",
    "name": "Updated Play Space",
    "center": {
      "lat": 40.7829,
      "lng": -73.9654
    },
    "radius": 150,
    "color": "#00FF00",
    "isActive": true,
    "isInside": false,
    "created": "2024-01-15T10:30:00.000Z"
  }
}
```

### 5. Delete Geofence
**DELETE** `/api/geofences/{id}`

Deletes a geofence by ID.

**Response:**
```json
{
  "success": true,
  "message": "Geofence deleted successfully"
}
```

### 6. Check Location Against Geofences
**POST** `/api/geofences/check`

Checks if a specific location is inside any active geofences.

**Request Body:**
```json
{
  "lat": 40.7829,
  "lng": -73.9654
}
```

**Response:**
```json
{
  "success": true,
  "location": {
    "lat": 40.7829,
    "lng": -73.9654
  },
  "totalGeofences": 5,
  "insideGeofences": 2,
  "geofences": [
    {
      "id": "uuid-string",
      "name": "Central Park Playground",
      "center": {
        "lat": 40.7829,
        "lng": -73.9654
      },
      "radius": 100,
      "color": "#FF4444",
      "isActive": true,
      "isInside": false,
      "created": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

## Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "error": "Missing required fields: name, center (lat/lng), radius"
}
```

**404 Not Found:**
```json
{
  "error": "Geofence not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to fetch geofences",
  "details": "Database connection error"
}
```

## Data Types

### Geofence Object
```typescript
interface Geofence {
  id: string;
  name: string;
  center: {
    lat: number;
    lng: number;
  };
  radius: number; // in feet
  color: string; // hex color code
  isActive: boolean;
  isInside: boolean;
  created: string; // ISO date string
}
```

### Location Object
```typescript
interface Location {
  lat: number;
  lng: number;
}
```

## Usage Examples

### JavaScript/TypeScript
```javascript
// Get all geofences
const response = await fetch('/api/geofences');
const data = await response.json();

// Create a new geofence
const newGeofence = await fetch('/api/geofences', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'My Play Space',
    center: { lat: 40.7829, lng: -73.9654 },
    radius: 100,
    color: '#FF4444'
  })
});

// Check if location is inside any geofences
const checkLocation = await fetch('/api/geofences/check', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    lat: 40.7829,
    lng: -73.9654
  })
});
```

### cURL
```bash
# Get all geofences
curl -X GET http://localhost:3000/api/geofences

# Create a new geofence
curl -X POST http://localhost:3000/api/geofences \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Play Space",
    "center": {"lat": 40.7829, "lng": -73.9654},
    "radius": 100,
    "color": "#FF4444"
  }'

# Check location
curl -X POST http://localhost:3000/api/geofences/check \
  -H "Content-Type: application/json" \
  -d '{"lat": 40.7829, "lng": -73.9654}'
```

## Notes

- All coordinates use the WGS84 coordinate system (latitude/longitude)
- Radius values are stored in feet but converted to meters for distance calculations
- The API automatically generates UUIDs for new geofences
- All timestamps are in ISO 8601 format
- The `isInside` field is managed by the application logic and indicates whether the current user is inside this geofence 