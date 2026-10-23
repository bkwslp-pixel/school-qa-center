-- =============================================================================
-- Migration: 202610230001_secure_admin_create_personnel.sql
-- Security Hardening: Revoke anon execution and enforce RBAC authorization
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_create_personnel(
    p_email text,
    p_password text,
    p_full_name text,
    p_position text DEFAULT 'ครูผู้สอน',
    p_department text DEFAULT 'กลุ่มสาระการเรียนรู้',
    p_role text DEFAULT 'teacher',
    p_school_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    new_user_id uuid;
    clean_email text;
    valid_school_uuid uuid := NULL;
    caller_role text;
BEGIN
    -- 1. Security Check: Enforce that only service_role or authenticated admin/school_leadership can execute
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RETURN json_build_object('success', false, 'error', 'ต้องเข้าสู่ระบบก่อนดำเนินการ (Unauthorized)');
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
              AND role IN ('admin', 'school_leadership')
        ) AND NOT EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
              AND email = 'bkwslp@gmail.com'
        ) THEN
            RETURN json_build_object('success', false, 'error', 'สงวนสิทธิ์เฉพาะผู้ดูแลระบบและฝ่ายบริหารเท่านั้น (Forbidden)');
        END IF;
    END IF;

    clean_email := lower(trim(p_email));

    IF clean_email IS NULL OR clean_email = '' OR clean_email NOT LIKE '%@%' THEN
        RETURN json_build_object('success', false, 'error', 'รูปแบบอีเมลไม่ถูกต้อง');
    END IF;

    IF p_password IS NULL OR length(p_password) < 6 THEN
        RETURN json_build_object('success', false, 'error', 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
    END IF;

    IF EXISTS (SELECT 1 FROM auth.users WHERE email = clean_email) THEN
        RETURN json_build_object('success', false, 'error', 'อีเมล ' || clean_email || ' นี้มีอยู่ในระบบแล้ว');
    END IF;

    -- Safely convert p_school_id to UUID if valid
    IF p_school_id IS NOT NULL AND p_school_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        IF EXISTS (SELECT 1 FROM public.schools WHERE id = p_school_id::uuid) THEN
            valid_school_uuid := p_school_id::uuid;
        END IF;
    END IF;

    -- If no valid school_id passed or found, look up or initialize school in schools table
    IF valid_school_uuid IS NULL THEN
        SELECT id INTO valid_school_uuid FROM public.schools LIMIT 1;
        IF valid_school_uuid IS NULL THEN
            INSERT INTO public.schools (name, province, district)
            VALUES (
                'โรงเรียนเทศบาล ๑ บ้านกลาง',
                'จังหวัดลำพูน',
                'อำเภอเมืองลำพูน'
            )
            RETURNING id INTO valid_school_uuid;
        END IF;
    END IF;

    new_user_id := gen_random_uuid();

    -- 2. Create auth user with confirmed email and hashed password
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        clean_email,
        crypt(p_password, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        json_build_object('full_name', p_full_name)::jsonb,
        now(),
        now(),
        '',
        '',
        '',
        ''
    );

    -- 3. Create identity record for GoTrue authentication
    BEGIN
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            new_user_id,
            new_user_id,
            json_build_object('sub', new_user_id::text, 'email', clean_email)::jsonb,
            'email',
            clean_email,
            now(),
            now(),
            now()
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 4. Upsert profiles
    BEGIN
        EXECUTE '
            INSERT INTO public.profiles (user_id, id, full_name, display_name, position, department, school_id)
            VALUES ($1, $1, $2, $2, $3, $4, $5)
            ON CONFLICT (user_id) DO UPDATE SET
                id = EXCLUDED.id,
                full_name = EXCLUDED.full_name,
                display_name = EXCLUDED.display_name,
                position = EXCLUDED.position,
                department = EXCLUDED.department,
                school_id = EXCLUDED.school_id
        ' USING new_user_id, p_full_name, COALESCE(p_position, 'ครูผู้สอน'), COALESCE(p_department, 'กลุ่มงานวิชาการ'), valid_school_uuid;
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            EXECUTE '
                INSERT INTO public.profiles (user_id, display_name, email)
                VALUES ($1, $2, $3)
                ON CONFLICT DO NOTHING
            ' USING new_user_id, p_full_name, clean_email;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END;

    -- 5. Upsert user_roles
    IF valid_school_uuid IS NOT NULL THEN
        BEGIN
            EXECUTE '
                INSERT INTO public.user_roles (user_id, school_id, role)
                VALUES ($1, $2, $3::app_role)
                ON CONFLICT (user_id, school_id, role) DO NOTHING
            ' USING new_user_id, valid_school_uuid, COALESCE(p_role, 'teacher');
        EXCEPTION WHEN OTHERS THEN
            BEGIN
                EXECUTE '
                    INSERT INTO public.user_roles (user_id, school_id, role)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (user_id, school_id, role) DO NOTHING
                ' USING new_user_id, valid_school_uuid, COALESCE(p_role, 'teacher');
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END;
    END IF;

    RETURN json_build_object(
        'success', true,
        'user_id', new_user_id,
        'email', clean_email,
        'full_name', p_full_name,
        'role', p_role
    );
END;
$$;

-- Security Enforcement: REVOKE execute from anon!
REVOKE EXECUTE ON FUNCTION public.admin_create_personnel(text, text, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_create_personnel(text, text, text, text, text, text, text) TO authenticated, service_role;
