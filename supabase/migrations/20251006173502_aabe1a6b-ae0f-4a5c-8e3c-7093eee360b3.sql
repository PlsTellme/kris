-- Enable RLS on batch_agents (safe if already enabled)
ALTER TABLE public.batch_agents ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy to allow users to view their own batch agents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'batch_agents' AND policyname = 'Users can view their own batch agents'
  ) THEN
    CREATE POLICY "Users can view their own batch agents"
    ON public.batch_agents
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;