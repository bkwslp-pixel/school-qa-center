// Types for School QA Center (โรงเรียนเทศบาล ๑ บ้านกลาง)

export type UserRoleType = "admin" | "school_leadership" | "teacher" | "external_evaluator";
export type LoadState = "loading" | "live" | "mock" | "error";

export interface School {
  id: string;
  code?: string | null;
  name: string;
  affiliation?: string | null;
  district?: string | null;
  province?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  logo_url?: string | null;
}

export interface AcademicYear {
  id: string;
  school_id: string;
  year: string;
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
}

export interface EducationLevel {
  id: number;
  code: string;
  name_th: string;
  sort_order: number;
}

export interface Standard {
  id: string;
  framework_version_id?: string;
  education_level_id?: number;
  code: string;
  title_th: string;
  description?: string | null;
  sort_order: number;
}

export interface Indicator {
  id: string;
  standard_id: string;
  code: string;
  title_th: string;
  description?: string | null;
  target_score?: number;
  weight?: number;
  sort_order?: number;
  // Joined or calculated fields
  evaluation_score?: number | null;
  quality_level?: string | null;
  evidence_count?: number;
  responsible_person?: string;
  status?: "not_started" | "pending_review" | "completed";
}

export interface Task {
  id: string;
  school_id?: string;
  indicator_id?: string | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  title: string;
  description?: string | null;
  status: "pending" | "in_progress" | "submitted" | "completed";
  priority: "low" | "normal" | "high" | "urgent";
  due_at: string | null;
  created_at?: string;
}

export interface EvidenceRecord {
  id: string;
  school_id?: string;
  title: string;
  description?: string | null;
  evidence_type: "document" | "image" | "link" | "drive_file";
  file_path?: string | null;
  external_url?: string | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  academic_year?: string | null;
  status: "draft" | "active" | "archived";
  uploader_id?: string | null;
  uploader_name?: string | null;
  indicator_code?: string | null;
  created_at: string;
}

export interface Evaluation {
  id: string;
  evaluation_cycle_id: string;
  indicator_id: string;
  evaluator_id?: string | null;
  self_score: number;
  evaluated_score?: number | null;
  level_quality: string;
  strengths?: string | null;
  weaknesses?: string | null;
  improvement_plan?: string | null;
  status: "draft" | "submitted" | "verified" | "approved";
  evaluated_at?: string | null;
}

export interface Profile {
  id: string;
  school_id?: string | null;
  full_name: string;
  position?: string | null;
  department?: string | null;
  phone?: string | null;
  role?: UserRoleType;
}
