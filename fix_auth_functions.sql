-- Fix authenticate_user function to include is_active in response
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

    -- Return success response with is_active field
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
            'is_verified', v_user_record.is_verified,
            'is_active', v_user_record.is_active
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

-- Fix validate_session function to include is_active in response
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

    -- Return user info with is_active field
    SELECT json_build_object(
        'success', true,
        'user', json_build_object(
            'id', v_session_record.user_id,
            'username', v_session_record.username,
            'email', v_session_record.email,
            'first_name', v_session_record.first_name,
            'last_name', v_session_record.last_name,
            'is_verified', v_session_record.is_verified,
            'is_active', v_session_record.user_active
        ),
        'session', json_build_object(
            'id', v_session_record.id,
            'expires_at', v_session_record.expires_at
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update register_user function to set is_active = TRUE by default
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

    -- Insert new user with is_active = TRUE
    INSERT INTO users (username, email, password_hash, first_name, last_name, is_active)
    VALUES (p_username, p_email, crypt(p_password, gen_salt('bf')), p_first_name, p_last_name, TRUE)
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

-- Update all existing users to be active
UPDATE users 
SET is_active = TRUE 
WHERE is_active IS NULL OR is_active = FALSE;

-- Verify the updates
SELECT 'Updated users count:' as info, COUNT(*) as count FROM users WHERE is_active = TRUE; 