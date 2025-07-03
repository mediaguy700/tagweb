# Mobile Geofence API Documentation

This document explains how mobile devices can interact with the geofence system via REST API endpoints.

## Base URL
```
http://localhost:3000/api/geofences
```

## Authentication
Currently, the API is public and doesn't require authentication. In production, you should implement proper authentication.

## Endpoints

### 1. Get All Geofences

**GET** `/api/geofences`

Fetches all geofence locations from the database.

#### Query Parameters
- `active` (boolean, optional): Filter to show only active geofences
- `limit` (integer, optional): Number of geofences to return (default: 100, max: 1000)
- `offset` (integer, optional): Number of geofences to skip for pagination (default: 0)

#### Example Requests

```bash
# Get all geofences
GET /api/geofences

# Get only active geofences
GET /api/geofences?active=true

# Get first 10 geofences
GET /api/geofences?limit=10

# Get geofences 20-29 (pagination)
GET /api/geofences?limit=10&offset=20

# Get active geofences with pagination
GET /api/geofences?active=true&limit=50&offset=0
```

#### Response Format

```json
{
  "success": true,
  "data": {
    "geofences": [
      {
        "id": "uuid-string",
        "name": "Playground Area",
        "center": {
          "lat": 33.184426,
          "lng": -96.906617
        },
        "radius": 50,
        "color": "#FF4444",
        "isActive": true,
        "isInside": false,
        "created": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 25,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    },
    "filters": {
      "activeOnly": false
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Create New Geofence

**POST** `/api/geofences`

Creates a new geofence location.

#### Request Body

```json
{
  "name": "New Playground",
  "center": {
    "lat": 33.184426,
    "lng": -96.906617
  },
  "radius": 50,
  "color": "#FF4444"
}
```

#### Required Fields
- `name`: String - Name of the geofence
- `center`: Object with `lat` and `lng` coordinates
- `radius`: Number - Radius in feet

#### Optional Fields
- `color`: String - Hex color code (default: "#FF4444")

#### Response Format

```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "name": "New Playground",
    "center": {
      "lat": 33.184426,
      "lng": -96.906617
    },
    "radius": 50,
    "color": "#FF4444",
    "isActive": true,
    "isInside": false,
    "created": "2024-01-15T10:30:00.000Z"
  },
  "message": "Geofence created successfully"
}
```

## Mobile Implementation Examples

### iOS (Swift)

```swift
import Foundation

struct Geofence: Codable {
    let id: String
    let name: String
    let center: Center
    let radius: Int
    let color: String
    let isActive: Bool
    let isInside: Bool
    let created: String
    
    struct Center: Codable {
        let lat: Double
        let lng: Double
    }
}

struct GeofenceResponse: Codable {
    let success: Bool
    let data: GeofenceData
    
    struct GeofenceData: Codable {
        let geofences: [Geofence]
        let pagination: Pagination
        
        struct Pagination: Codable {
            let total: Int
            let limit: Int
            let offset: Int
            let hasMore: Bool
        }
    }
}

class GeofenceAPI {
    private let baseURL = "http://localhost:3000/api/geofences"
    
    func fetchGeofences(activeOnly: Bool = false, limit: Int = 100, offset: Int = 0) async throws -> [Geofence] {
        var components = URLComponents(string: baseURL)!
        components.queryItems = [
            URLQueryItem(name: "active", value: activeOnly ? "true" : "false"),
            URLQueryItem(name: "limit", value: String(limit)),
            URLQueryItem(name: "offset", value: String(offset))
        ]
        
        let request = URLRequest(url: components.url!)
        let (data, _) = try await URLSession.shared.data(for: request)
        
        let response = try JSONDecoder().decode(GeofenceResponse.self, from: data)
        return response.data.geofences
    }
    
    func createGeofence(name: String, lat: Double, lng: Double, radius: Int, color: String = "#FF4444") async throws -> Geofence {
        let geofenceData = [
            "name": name,
            "center": ["lat": lat, "lng": lng],
            "radius": radius,
            "color": color
        ] as [String : Any]
        
        var request = URLRequest(url: URL(string: baseURL)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: geofenceData)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        
        let response = try JSONDecoder().decode(GeofenceResponse.self, from: data)
        return response.data.geofences.first!
    }
}
```

### Android (Kotlin)

```kotlin
import retrofit2.http.*
import retrofit2.Response

data class Geofence(
    val id: String,
    val name: String,
    val center: Center,
    val radius: Int,
    val color: String,
    val isActive: Boolean,
    val isInside: Boolean,
    val created: String
) {
    data class Center(
        val lat: Double,
        val lng: Double
    )
}

data class GeofenceResponse(
    val success: Boolean,
    val data: GeofenceData
) {
    data class GeofenceData(
        val geofences: List<Geofence>,
        val pagination: Pagination
    ) {
        data class Pagination(
            val total: Int,
            val limit: Int,
            val offset: Int,
            val hasMore: Boolean
        )
    }
}

data class CreateGeofenceRequest(
    val name: String,
    val center: Geofence.Center,
    val radius: Int,
    val color: String = "#FF4444"
)

interface GeofenceAPI {
    @GET("api/geofences")
    suspend fun getGeofences(
        @Query("active") activeOnly: Boolean = false,
        @Query("limit") limit: Int = 100,
        @Query("offset") offset: Int = 0
    ): Response<GeofenceResponse>
    
    @POST("api/geofences")
    suspend fun createGeofence(
        @Body request: CreateGeofenceRequest
    ): Response<GeofenceResponse>
}

class GeofenceService {
    private val api: GeofenceAPI = // Initialize with Retrofit
    
    suspend fun fetchGeofences(activeOnly: Boolean = false, limit: Int = 100, offset: Int = 0): List<Geofence> {
        val response = api.getGeofences(activeOnly, limit, offset)
        if (response.isSuccessful) {
            return response.body()?.data?.geofences ?: emptyList()
        } else {
            throw Exception("Failed to fetch geofences: ${response.code()}")
        }
    }
    
    suspend fun createGeofence(name: String, lat: Double, lng: Double, radius: Int, color: String = "#FF4444"): Geofence {
        val request = CreateGeofenceRequest(
            name = name,
            center = Geofence.Center(lat, lng),
            radius = radius,
            color = color
        )
        
        val response = api.createGeofence(request)
        if (response.isSuccessful) {
            return response.body()?.data?.geofences?.first() 
                ?: throw Exception("No geofence returned")
        } else {
            throw Exception("Failed to create geofence: ${response.code()}")
        }
    }
}
```

### React Native (JavaScript)

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/geofences';

class GeofenceAPI {
  static async fetchGeofences(options = {}) {
    const { activeOnly = false, limit = 100, offset = 0 } = options;
    
    try {
      const response = await axios.get(API_BASE_URL, {
        params: {
          active: activeOnly,
          limit,
          offset
        }
      });
      
      return response.data.data.geofences;
    } catch (error) {
      console.error('Error fetching geofences:', error);
      throw error;
    }
  }
  
  static async createGeofence(geofenceData) {
    const { name, center, radius, color = '#FF4444' } = geofenceData;
    
    try {
      const response = await axios.post(API_BASE_URL, {
        name,
        center,
        radius,
        color
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Error creating geofence:', error);
      throw error;
    }
  }
}

// Usage example
const fetchAllGeofences = async () => {
  try {
    const geofences = await GeofenceAPI.fetchGeofences();
    console.log('Fetched geofences:', geofences);
    return geofences;
  } catch (error) {
    console.error('Failed to fetch geofences:', error);
  }
};

const createNewGeofence = async () => {
  try {
    const newGeofence = await GeofenceAPI.createGeofence({
      name: 'New Playground',
      center: { lat: 33.184426, lng: -96.906617 },
      radius: 50,
      color: '#FF4444'
    });
    console.log('Created geofence:', newGeofence);
    return newGeofence;
  } catch (error) {
    console.error('Failed to create geofence:', error);
  }
};
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created (for POST requests)
- `400`: Bad Request (missing or invalid parameters)
- `500`: Internal Server Error

## Best Practices

1. **Pagination**: Use pagination for large datasets to improve performance
2. **Caching**: Cache geofence data locally and refresh periodically
3. **Error Handling**: Always handle API errors gracefully
4. **Rate Limiting**: Implement appropriate rate limiting in production
5. **Authentication**: Add proper authentication for production use

## Testing

You can test the API using curl:

```bash
# Get all geofences
curl -X GET "http://localhost:3000/api/geofences"

# Get active geofences only
curl -X GET "http://localhost:3000/api/geofences?active=true"

# Create a new geofence
curl -X POST "http://localhost:3000/api/geofences" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Playground",
    "center": {"lat": 33.184426, "lng": -96.906617},
    "radius": 50,
    "color": "#FF4444"
  }'
```

## Test Results

All API endpoints have been tested and verified working:

### ✅ GET /api/geofences
- **Status**: Working
- **Response**: Returns 5 geofences
- **Format**: Proper JSON with pagination and filter info

### ✅ GET /api/geofences?active=true
- **Status**: Working
- **Response**: Returns only active geofences
- **Filter**: Correctly applies activeOnly filter

### ✅ GET /api/geofences?limit=2&offset=0
- **Status**: Working
- **Response**: Returns 2 geofences with pagination
- **Pagination**: Limit and offset working correctly

### ✅ POST /api/geofences
- **Status**: Working
- **Response**: Successfully creates new geofence
- **Validation**: Proper field validation
- **Result**: Total count increased from 4 to 5 geofences

### Current Database State
- **Total Geofences**: 5
- **All Active**: Yes
- **API Status**: Fully functional 