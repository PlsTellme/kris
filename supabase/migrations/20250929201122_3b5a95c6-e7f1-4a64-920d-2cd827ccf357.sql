-- Add unique constraint to prevent duplicate call entries
ALTER TABLE public.batch_call_answers 
ADD CONSTRAINT batch_call_answers_unique 
UNIQUE (user_id, batchid, lead_id);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_batch_call_answers_batchid_user 
ON public.batch_call_answers(batchid, user_id, zeitpunkt DESC);

CREATE INDEX IF NOT EXISTS idx_pending_leads_batchid_user_status 
ON public.pending_leads(batchid, user_id, status);

CREATE INDEX IF NOT EXISTS idx_batch_calls_user_created 
ON public.batch_calls(user_id, created_at DESC);