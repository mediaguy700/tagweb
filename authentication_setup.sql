-- =====================================================
-- NextAG Authentication System Setup
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SESSIONS TABLE (for tracking login sessions)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- LOGIN ATTEMPTS TABLE (for security)
-- =====================================================

CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL,
    ip_address INET NOT NULL,
    success BOOLEAN NOT NULL,
    attempt_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT
);

-- =====================================================
-- PASSWORD RESET TOKENS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Sessions table indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active);

-- Login attempts indexes
CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempt_time);

-- Password reset tokens indexes
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON password_reset_tokens(expires_at);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUTHENTICATION FUNCTIONS
-- =====================================================

-- Function to register a new user
CREATE OR REPLACE FUNCTION register_user(
    p_username VARCHAR(50),
    p_email VARCHAR(255),
    p_password VARCHAR(255),
    p_first_name VARCHAR(100) DEFAULT NULL,
    p_last_name VARCHAR(100) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_result JSON;
BEGIN
    -- Check if username already exists
    IF EXISTS (SELECT 1 FROM users WHERE username = p_username) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Username already exists'
        );
    END IF;

    -- Check if email already exists
    IF p_email IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Email already exists'
        );
    END IF;

    -- Insert new user
    INSERT INTO users (username, email, password_hash, first_name, last_name)
    VALUES (p_username, p_email, crypt(p_password, gen_salt('bf')), p_first_name, p_last_name)
    RETURNING id INTO v_user_id;

    -- Return success response
    SELECT json_build_object(
        'success', true,
        'user_id', v_user_id,
        'message', 'User registered successfully'
    ) INTO v_result;

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Registration failed: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to authenticate user login
CREATE OR REPLACE FUNCTION authenticate_user(
    p_username VARCHAR(50),
    p_password VARCHAR(255),
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_user_record RECORD;
    v_session_token VARCHAR(255);
    v_refresh_token VARCHAR(255);
    v_result JSON;
    v_failed_attempts INTEGER;
BEGIN
    -- Check for too many failed attempts (last 15 minutes)
    SELECT COUNT(*) INTO v_failed_attempts
    FROM login_attempts
    WHERE username = p_username 
    AND ip_address = p_ip_address 
    AND success = false 
    AND attempt_time > NOW() - INTERVAL '15 minutes';

    IF v_failed_attempts >= 5 THEN
        -- Log failed attempt
        INSERT INTO login_attempts (username, ip_address, success, user_agent)
        VALUES (p_username, p_ip_address, false, p_user_agent);

        RETURN json_build_object(
            'success', false,
            'error', 'Too many failed attempts. Please try again later.'
        );
    END IF;

    -- Get user record
    SELECT * INTO v_user_record
    FROM users
    WHERE username = p_username AND is_active = true;

    -- Check if user exists and password is correct
    IF v_user_record IS NULL OR NOT (crypt(p_password, v_user_record.password_hash) = v_user_record.password_hash) THEN
        -- Log failed attempt
        INSERT INTO login_attempts (username, ip_address, success, user_agent)
        VALUES (p_username, p_ip_address, false, p_user_agent);

        RETURN json_build_object(
            'success', false,
            'error', 'Invalid username or password'
        );
    END IF;

    -- Generate tokens
    v_session_token := encode(gen_random_bytes(32), 'base64');
    v_refresh_token := encode(gen_random_bytes(32), 'base64');

    -- Deactivate old sessions for this user
    UPDATE user_sessions 
    SET is_active = false 
    WHERE user_id = v_user_record.id AND is_active = true;

    -- Create new session
    INSERT INTO user_sessions (user_id, session_token, refresh_token, ip_address, user_agent, expires_at)
    VALUES (
        v_user_record.id,
        v_session_token,
        v_refresh_token,
        p_ip_address,
        p_user_agent,
        NOW() + INTERVAL '24 hours'
    );

    -- Update last login
    UPDATE users 
    SET last_login = NOW() 
    WHERE id = v_user_record.id;

    -- Log successful attempt
    INSERT INTO login_attempts (username, ip_address, success, user_agent)
    VALUES (p_username, p_ip_address, true, p_user_agent);

    -- Return success response
    SELECT json_build_object(
        'success', true,
        'session_token', v_session_token,
        'refresh_token', v_refresh_token,
        'user', json_build_object(
            'id', v_user_record.id,
            'username', v_user_record.username,
            'email', v_user_record.email,
            'first_name', v_user_record.first_name,
            'last_name', v_user_record.last_name,
            'is_verified', v_user_record.is_verified
        ),
        'expires_at', NOW() + INTERVAL '24 hours'
    ) INTO v_result;

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Authentication failed: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate session token
CREATE OR REPLACE FUNCTION validate_session(p_session_token VARCHAR(255))
RETURNS JSON AS $$
DECLARE
    v_session_record RECORD;
    v_user_record RECORD;
    v_result JSON;
BEGIN
    -- Get session record
    SELECT s.*, u.username, u.email, u.first_name, u.last_name, u.is_verified, u.is_active as user_active
    INTO v_session_record
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.session_token = p_session_token 
    AND s.is_active = true 
    AND s.expires_at > NOW();

    -- Check if session exists and is valid
    IF v_session_record IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid or expired session'
        );
    END IF;

    -- Check if user is still active
    IF NOT v_session_record.user_active THEN
        -- Deactivate session
        UPDATE user_sessions 
        SET is_active = false 
        WHERE session_token = p_session_token;

        RETURN json_build_object(
            'success', false,
            'error', 'User account is deactivated'
        );
    END IF;

    -- Return user info
    SELECT json_build_object(
        'success', true,
        'user', json_build_object(
            'id', v_session_record.user_id,
            'username', v_session_record.username,
            'email', v_session_record.email,
            'first_name', v_session_record.first_name,
            'last_name', v_session_record.last_name,
            'is_verified', v_session_record.is_verified
        ),
        'session', json_build_object(
            'id', v_session_record.id,
            'expires_at', v_session_record.expires_at
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to logout user
CREATE OR REPLACE FUNCTION logout_user(p_session_token VARCHAR(255))
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Deactivate session
    UPDATE user_sessions 
    SET is_active = false 
    WHERE session_token = p_session_token;

    IF FOUND THEN
        SELECT json_build_object(
            'success', true,
            'message', 'Logged out successfully'
        ) INTO v_result;
    ELSE
        SELECT json_build_object(
            'success', false,
            'error', 'Session not found'
        ) INTO v_result;
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh session token
CREATE OR REPLACE FUNCTION refresh_session(p_refresh_token VARCHAR(255))
RETURNS JSON AS $$
DECLARE
    v_session_record RECORD;
    v_new_session_token VARCHAR(255);
    v_new_refresh_token VARCHAR(255);
    v_result JSON;
BEGIN
    -- Get session record
    SELECT * INTO v_session_record
    FROM user_sessions
    WHERE refresh_token = p_refresh_token 
    AND is_active = true 
    AND expires_at > NOW();

    -- Check if refresh token is valid
    IF v_session_record IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid or expired refresh token'
        );
    END IF;

    -- Generate new tokens
    v_new_session_token := encode(gen_random_bytes(32), 'base64');
    v_new_refresh_token := encode(gen_random_bytes(32), 'base64');

    -- Update session with new tokens
    UPDATE user_sessions 
    SET 
        session_token = v_new_session_token,
        refresh_token = v_new_refresh_token,
        expires_at = NOW() + INTERVAL '24 hours',
        updated_at = NOW()
    WHERE id = v_session_record.id;

    -- Return new tokens
    SELECT json_build_object(
        'success', true,
        'session_token', v_new_session_token,
        'refresh_token', v_new_refresh_token,
        'expires_at', NOW() + INTERVAL '24 hours'
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to change password
CREATE OR REPLACE FUNCTION change_password(
    p_user_id UUID,
    p_current_password VARCHAR(255),
    p_new_password VARCHAR(255)
)
RETURNS JSON AS $$
DECLARE
    v_user_record RECORD;
    v_result JSON;
BEGIN
    -- Get user record
    SELECT * INTO v_user_record
    FROM users
    WHERE id = p_user_id AND is_active = true;

    -- Check if user exists
    IF v_user_record IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;

    -- Verify current password
    IF NOT (crypt(p_current_password, v_user_record.password_hash) = v_user_record.password_hash) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Current password is incorrect'
        );
    END IF;

    -- Update password
    UPDATE users 
    SET 
        password_hash = crypt(p_new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Deactivate all sessions for this user (force re-login)
    UPDATE user_sessions 
    SET is_active = false 
    WHERE user_id = p_user_id;

    SELECT json_build_object(
        'success', true,
        'message', 'Password changed successfully. Please log in again.'
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CLEANUP FUNCTIONS
-- =====================================================

-- Function to clean up expired sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE user_sessions 
    SET is_active = false 
    WHERE expires_at < NOW() AND is_active = true;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old login attempts (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM login_attempts 
    WHERE attempt_time < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired password reset tokens
CREATE OR REPLACE FUNCTION cleanup_expired_reset_tokens()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM password_reset_tokens 
    WHERE expires_at < NOW() OR used = true;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert a test user (password: 'password123')
-- INSERT INTO users (username, email, password_hash, first_name, last_name, is_verified)
-- VALUES (
--     'testuser',
--     'test@example.com',
--     crypt('password123', gen_salt('bf')),
--     'Test',
--     'User',
--     true
-- );

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Sessions are private to the user
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Login attempts are read-only for security
CREATE POLICY "Login attempts are read-only" ON login_attempts
    FOR SELECT USING (true);

-- Password reset tokens are private
CREATE POLICY "Users can view own reset tokens" ON password_reset_tokens
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE users IS 'User accounts for NextAG application';
COMMENT ON TABLE user_sessions IS 'Active user sessions for authentication';
COMMENT ON TABLE login_attempts IS 'Login attempt history for security monitoring';
COMMENT ON TABLE password_reset_tokens IS 'Temporary tokens for password reset functionality';

COMMENT ON FUNCTION register_user IS 'Register a new user account';
COMMENT ON FUNCTION authenticate_user IS 'Authenticate user login and create session';
COMMENT ON FUNCTION validate_session IS 'Validate session token and return user info';
COMMENT ON FUNCTION logout_user IS 'Logout user by deactivating session';
COMMENT ON FUNCTION refresh_session IS 'Refresh session token using refresh token';
COMMENT ON FUNCTION change_password IS 'Change user password with current password verification'; 