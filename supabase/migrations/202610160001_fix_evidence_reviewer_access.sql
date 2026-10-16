-- Align evidence reads with the assigned review cycle.
-- This policy correction was applied to the Supabase project on 2026-10-16.
ALTER POLICY evidence_read_members_or_assigned_reviewer
ON public.evidence_records
USING (
  is_school_member(school_id)
  OR EXISTS (
    SELECT 1
    FROM public.evidence_links AS el
    WHERE el.evidence_id = evidence_records.id
      AND el.evaluation_cycle_id IS NOT NULL
      AND can_review_cycle(el.evaluation_cycle_id)
  )
);
