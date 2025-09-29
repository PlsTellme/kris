-- Create batch_calls table for batch metadata
CREATE TABLE public.batch_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batchid TEXT NOT NULL UNIQUE,
  callname TEXT,
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create batch_call_answers table for individual call results
CREATE TABLE public.batch_call_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vorname TEXT,
  nachname TEXT,
  firma TEXT,
  nummer TEXT,
  batchid TEXT NOT NULL,
  zeitpunkt BIGINT NOT NULL,
  anrufdauer INTEGER,
  transcript TEXT,
  callname TEXT,
  answers JSONB,
  call_status TEXT DEFAULT 'success',
  lead_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pending_leads table for batch status tracking
CREATE TABLE public.pending_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id TEXT NOT NULL UNIQUE,
  batchid TEXT NOT NULL,
  user_id UUID NOT NULL,
  vorname TEXT,
  nachname TEXT,
  firma TEXT,
  nummer TEXT,
  call_name TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.batch_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_call_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for batch_calls
CREATE POLICY "Users can view their own batch calls" 
ON public.batch_calls 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own batch calls" 
ON public.batch_calls 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own batch calls" 
ON public.batch_calls 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own batch calls" 
ON public.batch_calls 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for batch_call_answers
CREATE POLICY "Users can view their own batch call answers" 
ON public.batch_call_answers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own batch call answers" 
ON public.batch_call_answers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for pending_leads
CREATE POLICY "Users can view their own pending leads" 
ON public.pending_leads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pending leads" 
ON public.pending_leads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending leads" 
ON public.pending_leads 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending leads" 
ON public.pending_leads 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_batch_calls_user_id ON public.batch_calls(user_id);
CREATE INDEX idx_batch_calls_batchid ON public.batch_calls(batchid);
CREATE INDEX idx_batch_call_answers_user_id ON public.batch_call_answers(user_id);
CREATE INDEX idx_batch_call_answers_batchid ON public.batch_call_answers(batchid);
CREATE INDEX idx_pending_leads_user_id ON public.pending_leads(user_id);
CREATE INDEX idx_pending_leads_batchid ON public.pending_leads(batchid);
CREATE INDEX idx_pending_leads_status ON public.pending_leads(status);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_batch_calls_updated_at
BEFORE UPDATE ON public.batch_calls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_batch_call_answers_updated_at
BEFORE UPDATE ON public.batch_call_answers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();