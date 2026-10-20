-- Migration: 202610200001_admin_create_personnel.sql
-- Function to allow admin to create personnel auth account + profile + role in one step

CREATE OR REPLACE FUNCTION public.admin_create_personnel(
    p_email text,
    p_password text,
    p_full_name text,
    p_position text DEFAULT 'ครูผู้สอน',
    p_department text DEFAULT 'กลุ่มสาระการเรียนรู้',
    p_role text DEFAULT 'teacher',
    p_school_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    new_user_id uuid;
    clean_email text;
BEGIN
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

    new_user_id := gen_random_uuid();

    -- 1. Create auth user with confirmed email and hashed password
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

    -- 2. Create identity record for GoTrue authentication
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
            new_user_id::text,
            new_user_id,
            json_build_object('sub', new_user_id::text, 'email', clean_email)::jsonb,
            'email',
            clean_email,
            now(),
            now(),
            now()
        );
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            INSERT INTO auth.identities (
                id,
                user_id,
                identity_data,
                provider,
                last_sign_in_at,
                created_at,
                updated_at
            ) VALUES (
                new_user_id::text,
                new_user_id,
                json_build_object('sub', new_user_id::text, 'email', clean_email)::jsonb,
                'email',
                now(),
                now(),
                now()
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END;

    -- 3. Upsert profiles
    INSERT INTO public.profiles (
        id,
        full_name,
        position,
        department,
        school_id
    ) VALUES (
        new_user_id,
        p_full_name,
        COALESCE(p_position, 'ครูผู้สอน'),
        COALESCE(p_department, 'กลุ่มสาระการเรียนรู้'),
        p_school_id
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        position = EXCLUDED.position,
        department = EXCLUDED.department,
        school_id = EXCLUDED.school_id;

    -- 4. Upsert user_roles
    IF p_school_id IS NOT NULL THEN
        INSERT INTO public.user_roles (
            user_id,
            school_id,
            role
        ) VALUES (
            new_user_id,
            p_school_id,
            COALESCE(p_role, 'teacher')
        )
        ON CONFLICT (user_id, school_id, role) DO NOTHING;
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

-- Grant execution permission
GRANT EXECUTE ON FUNCTION public.admin_create_personnel TO anon, authenticated, service_role;
