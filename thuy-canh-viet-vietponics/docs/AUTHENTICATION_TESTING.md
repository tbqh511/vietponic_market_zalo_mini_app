# Authentication Integration Testing Guide

## Overview
This guide provides step-by-step instructions for testing the backend authentication integration in the Zalo mini app.

## Prerequisites

1. **Backend Server**: Your Laravel backend server should be running at the URL specified in `app-config.json` (e.g., `https://vietponics.vn/api`)

2. **Authentication Endpoint**: The `/authenticate` endpoint must be implemented and accessible

3. **Zalo Mini App**: Your mini app should be configured with proper Zalo App ID

## Testing Steps

### 1. Configure API URL

Verify that `app-config.json` has the correct API URL:

```json
{
  "template": {
    "apiUrl": "https://vietponics.vn/api"
  }
}
```

### 2. Start the Development Server

```bash
npm install
npm start
```

### 3. Test Authentication Flow

When you open the mini app, the following should happen automatically:

1. **Access Token Retrieval**: App gets Zalo access token
2. **Backend Authentication**: Token is sent to `POST /authenticate`
3. **JWT Storage**: JWT token is stored in localStorage
4. **User Info Display**: User profile information appears

### 4. Verify JWT Token Storage

Open browser DevTools (if testing in browser) and check:

```javascript
localStorage.getItem('jwt_token')
// Should return the JWT token string
```

### 5. Verify Authenticated Requests

Check network requests in DevTools:

- All API requests should include header: `Authorization: Bearer ${jwt_token}`
- Requests to `/products`, `/categories`, etc. should be authenticated

### 6. Test Fallback Behavior

To test the fallback to local authentication:

1. Temporarily disable the backend `/authenticate` endpoint
2. Reload the app
3. The app should still work using local Zalo SDK authentication

### 7. Test User Information

Verify that user information is displayed correctly:

- Navigate to Profile page
- User name should match backend data
- Phone number (if available) should be displayed
- Email should be shown

## Debugging

### Enable Debug Mode

Set debug flag in browser console:

```javascript
localStorage.setItem('DEBUG_API', '1')
```

This will enable detailed logging of API requests.

### Check Authentication Errors

Look for these in the browser console:

- "No access token available" - Zalo SDK not providing token
- "Authentication failed" - Backend rejected the token
- "Failed to authenticate with server" - Network or server error

### Verify Backend Response

The backend `/authenticate` endpoint should return:

```json
{
  "error": false,
  "message": "Authentication successful",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "user@example.com",
      "profile": "https://avatar-url.com/avatar.jpg",
      "mobile": "0912345678"
    }
  }
}
```

## Common Issues

### Issue 1: "No access token available"

**Cause**: Zalo SDK not initialized or user hasn't granted permissions

**Solution**: 
- Ensure mini app is opened in Zalo environment
- Check if user has granted necessary permissions
- In development, test in browser with Zalo Mini App DevTools

### Issue 2: "Authentication failed"

**Cause**: Backend rejected the Zalo access token

**Solution**:
- Verify backend Zalo API configuration
- Check if Zalo API endpoint is accessible from backend
- Ensure access token is passed correctly to Zalo API

### Issue 3: Requests not authenticated

**Cause**: JWT token not being added to requests

**Solution**:
- Check if token is stored: `localStorage.getItem('jwt_token')`
- Verify `request.ts` is importing and using the token
- Clear localStorage and re-authenticate

## Success Criteria

✅ User can open the app without errors
✅ User profile information is displayed correctly
✅ JWT token is stored in localStorage
✅ All API requests include Authorization header
✅ Products and categories load successfully
✅ Fallback to local authentication works when backend is unavailable

## Next Steps

After successful testing:

1. Deploy the mini app to Zalo
2. Test in production environment
3. Monitor authentication success rate
4. Set up error tracking for authentication failures
