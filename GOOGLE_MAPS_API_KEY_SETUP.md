# Google Maps API Key Setup

## Issue
The map is not loading because the Google Maps API key is invalid or restricted.

## Solution

### Step 1: Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Maps JavaScript API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Maps JavaScript API"
   - Click on it and press "Enable"
4. Create an API key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key

### Step 2: Set Up Environment Variables

1. Create a `.env.local` file in your project root (if it doesn't exist)
2. Add your API key:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### Step 3: Restart the Development Server

```bash
npm run dev
```

### Step 4: Test the Map

The map should now load properly with your location and all features working.

## Security Notes

- **Restrict the API key** to your domain for security:
  - Go to the API key settings in Google Cloud Console
  - Add your domain (e.g., `localhost:3000` for development)
  - This prevents unauthorized usage

## Troubleshooting

- If you still see errors, check the browser console for specific error messages
- Make sure the Maps JavaScript API is enabled in your Google Cloud project
- Verify the API key is correctly copied to the `.env.local` file
- Restart the development server after adding the environment variable

## Cost

- Google Maps API has a generous free tier (usually sufficient for development and small projects)
- Monitor usage in Google Cloud Console to avoid unexpected charges 