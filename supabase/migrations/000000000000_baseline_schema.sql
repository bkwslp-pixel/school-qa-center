-- =============================================================================
-- School QA Center — Baseline Schema Migration
-- Designed for โรงเรียนเทศบาล ๑ บ้านกลาง
-- Supports 17 core tables, Row-Level Security (RLS), and RBAC roles:
-- 'admin', 'school_leadership', 'teacher', 'external_evaluator'
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SCHOOLS
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  affiliation VARCHAR(255) DEFAULT 'สังกัดองค์กรปกครองส่วนท้องถิ่น',
  district VARCHAR(100),
  province VARCHAR(100) DEFAULT 'ลำพูน',
  address TEXT,
  phone VARCHAR(50),
  website VARCHAR(255),
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ACADEMIC YEARS
CREATE TABLE IF NOT EXISTS public.academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  year VARCHAR(10) NOT NULL, -- e.g. '2567'
  is_active BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, year)
);

-- 3. EDUCATION LEVELS
CREATE TABLE IF NOT EXISTS public.education_levels (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL, -- 'early_childhood', 'primary', 'secondary'
  name_th VARCHAR(100) NOT NULL,     -- 'ปฐมวัย', 'ประถมศึกษา', 'มัธยมศึกษา'
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ASSESSMENT FRAMEWORKS
CREATE TABLE IF NOT EXISTS public.assessment_frameworks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  title_th VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'internal', -- 'internal', 'external'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. FRAMEWORK VERSIONS
CREATE TABLE IF NOT EXISTS public.framework_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  framework_id UUID REFERENCES public.assessment_frameworks(id) ON DELETE CASCADE,
  version_code VARCHAR(20) NOT NULL,
  effective_year VARCHAR(10),
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. STANDARDS
CREATE TABLE IF NOT EXISTS public.standards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  framework_version_id UUID REFERENCES public.framework_versions(id) ON DELETE CASCADE,
  education_level_id INT REFERENCES public.education_levels(id),
  code VARCHAR(20) NOT NULL,
  title_th VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INDICATORS
CREATE TABLE IF NOT EXISTS public.indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  standard_id UUID REFERENCES public.standards(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL, -- e.g. '1.1', '1.2'
  title_th VARCHAR(255) NOT NULL,
  description TEXT,
  target_score NUMERIC(3,2) DEFAULT 4.00,
  weight NUMERIC(5,2) DEFAULT 1.00,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY, -- matches auth.users.id
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  position VARCHAR(100),
  department VARCHAR(100),
  phone VARCHAR(50),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. USER ROLES
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'admin', 'school_leadership', 'teacher', 'external_evaluator'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, school_id, role)
);

-- 10. EVALUATION CYCLES
CREATE TABLE IF NOT EXISTS public.evaluation_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
  education_level_id INT REFERENCES public.education_levels(id),
  title VARCHAR(255) NOT NULL,
  scope VARCHAR(50) DEFAULT 'internal', -- 'internal', 'external', 'both'
  status VARCHAR(50) DEFAULT 'active',  -- 'planning', 'active', 'under_review', 'completed'
  start_date DATE,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. EVALUATIONS
CREATE TABLE IF NOT EXISTS public.evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluation_cycle_id UUID REFERENCES public.evaluation_cycles(id) ON DELETE CASCADE,
  indicator_id UUID REFERENCES public.indicators(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  self_score NUMERIC(3,2), -- 1.00 to 5.00
  evaluated_score NUMERIC(3,2),
  level_quality VARCHAR(50), -- 'ดีเยี่ยม', 'ดี', 'ปานกลาง', 'กำลังพัฒนา'
  strengths TEXT,
  weaknesses TEXT,
  improvement_plan TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'verified', 'approved'
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(evaluation_cycle_id, indicator_id)
);

-- 12. EVIDENCE RECORDS
CREATE TABLE IF NOT EXISTS public.evidence_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  evidence_type VARCHAR(50) DEFAULT 'document', -- 'document', 'image', 'link', 'drive_file'
  file_path TEXT,
  external_url TEXT,
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),
  academic_year VARCHAR(10),
  status VARCHAR(50) DEFAULT 'active', -- 'draft', 'active', 'archived'
  uploader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. EVIDENCE LINKS
CREATE TABLE IF NOT EXISTS public.evidence_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evidence_id UUID REFERENCES public.evidence_records(id) ON DELETE CASCADE,
  indicator_id UUID REFERENCES public.indicators(id) ON DELETE CASCADE,
  evaluation_cycle_id UUID REFERENCES public.evaluation_cycles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(evidence_id, indicator_id, evaluation_cycle_id)
);

-- 14. TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  indicator_id UUID REFERENCES public.indicators(id) ON DELETE SET NULL,
  evaluation_cycle_id UUID REFERENCES public.evaluation_cycles(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'in_progress', -- 'pending', 'in_progress', 'submitted', 'completed'
  priority VARCHAR(20) DEFAULT 'normal',    -- 'low', 'normal', 'high', 'urgent'
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. REVIEWER ACCESS
CREATE TABLE IF NOT EXISTS public.reviewer_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  evaluation_cycle_id UUID REFERENCES public.evaluation_cycles(id) ON DELETE CASCADE,
  can_edit BOOLEAN DEFAULT false,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, evaluation_cycle_id)
);

-- 16. REVIEW COMMENTS
CREATE TABLE IF NOT EXISTS public.review_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SECURITY HELPER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_school_member(check_school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND school_id = check_school_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_review_cycle(check_cycle_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reviewer_access
    WHERE user_id = auth.uid()
      AND evaluation_cycle_id = check_cycle_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.evaluation_cycles ec ON ec.school_id = ur.school_id
    WHERE ur.user_id = auth.uid()
      AND ec.id = check_cycle_id
      AND ur.role IN ('admin', 'school_leadership')
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(check_school_id UUID, check_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND (check_school_id IS NULL OR school_id = check_school_id)
      AND role = check_role
  );
$$;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) ENFORCEMENT
-- =============================================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.framework_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviewer_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Read policies for public framework tables
CREATE POLICY education_levels_read_all ON public.education_levels FOR SELECT USING (true);
CREATE POLICY frameworks_read_all ON public.assessment_frameworks FOR SELECT USING (true);
CREATE POLICY versions_read_all ON public.framework_versions FOR SELECT USING (true);
CREATE POLICY standards_read_all ON public.standards FOR SELECT USING (true);
CREATE POLICY indicators_read_all ON public.indicators FOR SELECT USING (true);

-- Schools read policy: School members or public preview
CREATE POLICY schools_read_policy ON public.schools FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Evidence records policy
CREATE POLICY evidence_read_members_or_assigned_reviewer ON public.evidence_records FOR SELECT
USING (
  is_school_member(school_id)
  OR EXISTS (
    SELECT 1 FROM public.evidence_links AS el
    WHERE el.evidence_id = evidence_records.id
      AND el.evaluation_cycle_id IS NOT NULL
      AND can_review_cycle(el.evaluation_cycle_id)
  )
);

CREATE POLICY evidence_insert_members ON public.evidence_records FOR INSERT
WITH CHECK (is_school_member(school_id));

CREATE POLICY evidence_update_members ON public.evidence_records FOR UPDATE
USING (is_school_member(school_id));

-- Tasks read & write
CREATE POLICY tasks_member_policy ON public.tasks FOR ALL
USING (is_school_member(school_id));

-- Evaluations policy
CREATE POLICY evaluations_read_policy ON public.evaluations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.evaluation_cycles ec
    WHERE ec.id = evaluations.evaluation_cycle_id
      AND (is_school_member(ec.school_id) OR can_review_cycle(ec.id))
  )
);

-- Profiles policy
CREATE POLICY profiles_read_policy ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE
USING (id = auth.uid());
