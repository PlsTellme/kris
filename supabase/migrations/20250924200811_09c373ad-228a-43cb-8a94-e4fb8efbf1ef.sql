-- Drop existing call_logs table and recreate with new structure
DROP TABLE IF EXISTS public.call_logs CASCADE;

-- Create new call_logs table without user_id and agent_name
CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  elevenlabs_agent_id TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  call_timestamp_unix BIGINT NOT NULL DEFAULT extract(epoch from now()),
  transcript TEXT,
  caller_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Create policies based on agent ownership
-- Users can view call logs for their own agents only
CREATE POLICY "Users can view call logs for their agents" 
ON public.call_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.agents 
    WHERE agents.elevenlabs_agent_id = call_logs.elevenlabs_agent_id 
    AND agents.user_id = auth.uid()
  )
);

-- Users can insert call logs for their own agents only
CREATE POLICY "Users can insert call logs for their agents" 
ON public.call_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agents 
    WHERE agents.elevenlabs_agent_id = call_logs.elevenlabs_agent_id 
    AND agents.user_id = auth.uid()
  )
);

-- Users can update call logs for their own agents only
CREATE POLICY "Users can update call logs for their agents" 
ON public.call_logs 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.agents 
    WHERE agents.elevenlabs_agent_id = call_logs.elevenlabs_agent_id 
    AND agents.user_id = auth.uid()
  )
);

-- Users can delete call logs for their own agents only
CREATE POLICY "Users can delete call logs for their agents" 
ON public.call_logs 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.agents 
    WHERE agents.elevenlabs_agent_id = call_logs.elevenlabs_agent_id 
    AND agents.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_call_logs_updated_at
BEFORE UPDATE ON public.call_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_call_logs_elevenlabs_agent_id ON public.call_logs(elevenlabs_agent_id);
CREATE INDEX idx_call_logs_timestamp_unix ON public.call_logs(call_timestamp_unix DESC);