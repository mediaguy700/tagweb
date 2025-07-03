# NextAG Authentication System Documentation

This document outlines the complete authentication system for the NextAG application, including database setup, API endpoints, and usage examples.

## 🗄️ Database Setup

### **Step 1: Run the SQL Setup**
Execute the `authentication_setup.sql` file in your Supabase SQL editor to create all necessary tables and functions.

### **Tables Created:**
- `users` - User accounts
- `user_sessions` - Active login sessions
- `login_attempts` - Security monitoring
- `password_reset_tokens` - Password reset functionality

### **Functions Created:**
- `register_user()` - User registration
- `authenticate_user()` - User login
- `validate_session()` - Session validation
- `logout_user()` - User logout
- `refresh_session()` - Token refresh
- `change_password()` - Password change

## 🔐 API Endpoints

### **1. User Registration**
**POST** `/api/auth/register`

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "securepassword123",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user_id": "uuid-string"
}
```

### **2. User Login**
**POST** `/api/auth/login`

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "uuid-string",
    "username": "johndoe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "is_verified": false
  },
  "expires_at": "2024-01-15T22:14:34.467Z"
}
```

**Cookies Set:**
- `session_token` - HTTP-only cookie (24 hours)
- `refresh_token` - HTTP-only cookie (7 days)

### **3. Check Authentication Status**
**GET** `/api/auth/me`

**Response (Authenticated):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-string",
    "username": "johndoe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "is_verified": false
  },
  "session": {
    "id": "session-uuid",
    "expires_at": "2024-01-15T22:14:34.467Z"
  }
}
```

**Response (Not Authenticated):**
```json
{
  "error": "No active session found"
}
```

### **4. User Logout**
**POST** `/api/auth/logout`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## 🛠️ Frontend Integration

### **Authentication Utilities**
Import the authentication functions:

```typescript
import { 
  checkAuth, 
  loginUser, 
  registerUser, 
  logoutUser, 
  type User, 
  type AuthResponse 
} from '@/lib/auth';
```

### **Check Authentication Status**
```typescript
// Check if user is logged in
const authStatus = await checkAuth();
if (authStatus.success) {
  console.log('User is authenticated:', authStatus.user);
} else {
  console.log('User is not authenticated:', authStatus.error);
}
```

### **User Login**
```typescript
// Login user
const loginResult = await loginUser('johndoe', 'password123');
if (loginResult.success) {
  console.log('Login successful:', loginResult.user);
  // Redirect to dashboard
} else {
  console.log('Login failed:', loginResult.error);
}
```

### **User Registration**
```typescript
// Register new user
const registerResult = await registerUser(
  'newuser',
  'password123',
  'newuser@example.com',
  'New',
  'User'
);
if (registerResult.success) {
  console.log('Registration successful');
} else {
  console.log('Registration failed:', registerResult.error);
}
```

### **User Logout**
```typescript
// Logout user
const logoutResult = await logoutUser();
if (logoutResult.success) {
  console.log('Logout successful');
  // Redirect to login page
} else {
  console.log('Logout failed:', logoutResult.error);
}
```

## 🔒 Security Features

### **Password Security**
- Passwords are hashed using bcrypt with salt
- Minimum 8 characters required
- Secure password storage in database

### **Session Management**
- Session tokens expire after 24 hours
- Refresh tokens expire after 7 days
- HTTP-only cookies prevent XSS attacks
- Automatic session cleanup

### **Brute Force Protection**
- Maximum 5 failed login attempts per 15 minutes per IP
- Failed attempts are logged for security monitoring
- Automatic cleanup of old login attempts

### **Row Level Security (RLS)**
- Users can only access their own data
- Sessions are private to each user
- Secure data isolation

## 📊 Database Functions

### **Registration Function**
```sql
SELECT register_user(
  'username',
  'email@example.com',
  'password',
  'First',
  'Last'
);
```

### **Authentication Function**
```sql
SELECT authenticate_user(
  'username',
  'password',
  '192.168.1.1',
  'Mozilla/5.0...'
);
```

### **Session Validation**
```sql
SELECT validate_session('session-token-here');
```

### **Logout Function**
```sql
SELECT logout_user('session-token-here');
```

## 🧹 Maintenance Functions

### **Cleanup Expired Sessions**
```sql
SELECT cleanup_expired_sessions();
```

### **Cleanup Old Login Attempts**
```sql
SELECT cleanup_old_login_attempts();
```

### **Cleanup Expired Reset Tokens**
```sql
SELECT cleanup_expired_reset_tokens();
```

## 🔄 Usage Examples

### **Complete Login Flow**
```typescript
// 1. Check if user is already authenticated
const authStatus = await checkAuth();
if (authStatus.success) {
  // User is already logged in
  console.log('Welcome back,', authStatus.user?.username);
  return;
}

// 2. Show login form and handle submission
const handleLogin = async (username: string, password: string) => {
  const result = await loginUser(username, password);
  if (result.success) {
    console.log('Login successful!');
    // Redirect to dashboard
  } else {
    console.error('Login failed:', result.error);
  }
};
```

### **Protected Route Component**
```typescript
'use client';
import { useEffect, useState } from 'react';
import { checkAuth, type User } from '@/lib/auth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const authStatus = await checkAuth();
      if (authStatus.success && authStatus.user) {
        setUser(authStatus.user);
      } else {
        // Redirect to login
        window.location.href = '/signin';
      }
      setLoading(false);
    };

    verifyAuth();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div>
      <header>
        <p>Welcome, {user.username}!</p>
        <button onClick={() => logoutUser()}>Logout</button>
      </header>
      {children}
    </div>
  );
}
```

### **Login Component**
```typescript
'use client';
import { useState } from 'react';
import { loginUser } from '@/lib/auth';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = await loginUser(username, password);
    if (result.success) {
      // Redirect to dashboard
      window.location.href = '/';
    } else {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Login</button>
    </form>
  );
}
```

## 🚀 Testing the System

### **1. Create Test User**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User"
  }'
```

### **2. Login Test User**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }' \
  -c cookies.txt
```

### **3. Check Authentication**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -b cookies.txt
```

### **4. Logout**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

## 📝 Notes

- All passwords are securely hashed using bcrypt
- Session tokens are automatically managed via HTTP-only cookies
- Failed login attempts are logged for security monitoring
- The system includes automatic cleanup functions for expired data
- Row Level Security (RLS) ensures data privacy
- All API responses include consistent error handling

This authentication system provides a secure, scalable foundation for user management in your NextAG application! 