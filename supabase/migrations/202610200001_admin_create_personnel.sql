-- Migration: 202610200001_admin_create_personnel.sql
-- Function to allow admin to create personnel auth account + profile + role in one step

-- 1. Ensure profiles table has all required columns for School QA Center
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS id UUID,
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS position VARCHAR(100) DEFAULT 'ครูผู้สอน',
  ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'กลุ่มงานวิชาการ',
  ADD COLUMN IF NOT EXISTS school_id UUID,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Sync id from user_id if user_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id') THEN
    UPDATE public.profiles SET id = user_id WHERE id IS NULL AND user_id IS NOT NULL;
  END IF;
END $$;

-- Ensure id constraint exists on profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_key' OR (conname = 'profiles_pkey' AND conrelid = 'public.profiles'::regclass)
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_key UNIQUE (id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Clean up all existing overloaded signatures of admin_create_personnel safely
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure AS func_signature
        FROM pg_proc
        WHERE proname = 'admin_create_personnel'
          AND pronamespace = 'public'::regnamespace
    ) LOOP
        EXECUTE 'DROP FUNCTION ' || r.func_signature || ' CASCADE';
    END LOOP;
END $$;

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

    -- Safely convert p_school_id to UUID if valid
    IF p_school_id IS NOT NULL AND p_school_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        IF EXISTS (SELECT 1 FROM public.schools WHERE id = p_school_id::uuid) THEN
            valid_school_uuid := p_school_id::uuid;
        END IF;
    END IF;

    -- If no valid school_id passed or found, look up the existing school in schools table
    IF valid_school_uuid IS NULL THEN
        SELECT id INTO valid_school_uuid FROM public.schools LIMIT 1;
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

    -- 3. Upsert profiles (Supports both 'id' and 'user_id' schemas resiliently)
    BEGIN
        EXECUTE '
            INSERT INTO public.profiles (id, full_name, position, department, school_id)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                position = EXCLUDED.position,
                department = EXCLUDED.department,
                school_id = EXCLUDED.school_id
        ' USING new_user_id, p_full_name, COALESCE(p_position, 'ครูผู้สอน'), COALESCE(p_department, 'กลุ่มงานวิชาการ'), valid_school_uuid;
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            -- Fallback if table only has user_id or display_name
            EXECUTE '
                INSERT INTO public.profiles (user_id, display_name, email)
                VALUES ($1, $2, $3)
                ON CONFLICT DO NOTHING
            ' USING new_user_id, p_full_name, clean_email;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END;

    -- 4. Upsert user_roles
    IF valid_school_uuid IS NOT NULL THEN
        INSERT INTO public.user_roles (
            user_id,
            school_id,
            role
        ) VALUES (
            new_user_id,
            valid_school_uuid,
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

-- Grant execution permission unambiguously
GRANT EXECUTE ON FUNCTION public.admin_create_personnel(text, text, text, text, text, text, text) TO anon, authenticated, service_role;
