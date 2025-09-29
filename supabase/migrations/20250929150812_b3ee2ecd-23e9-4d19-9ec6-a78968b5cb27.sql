-- Create tables for the application
CREATE TABLE public.agents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  prompt text,
  voice_type text,
  first_message text,
  phone_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  elevenlabs_agent_id text,
  email text,
  CONSTRAINT agents_pkey PRIMARY KEY (id),
  CONSTRAINT agents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.call_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  elevenlabs_agent_id text NOT NULL,
  duration integer NOT NULL DEFAULT 0,
  call_timestamp_unix bigint NOT NULL DEFAULT EXTRACT(epoch FROM now()),
  transcript text,
  caller_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  Verbrauch integer,
  Zusammenfassung text,
  Erfolgreich boolean,
  CONSTRAINT call_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.phone_numbers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone_number text NOT NULL,
  phonenumber_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_agent uuid,
  CONSTRAINT phone_numbers_pkey PRIMARY KEY (id),
  CONSTRAINT phone_numbers_assigned_agent_fkey FOREIGN KEY (assigned_agent) REFERENCES public.agents(id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  full_name text,
  subscription_type text NOT NULL DEFAULT 'free'::text CHECK (subscription_type = ANY (ARRAY['free'::text, 'premium'::text])),
  minutes_used integer NOT NULL DEFAULT 0,
  minutes_limit integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_premium boolean NOT NULL DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.prompt_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT prompt_templates_pkey PRIMARY KEY (id)
);

CREATE TABLE public.voices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  voice_id text NOT NULL UNIQUE,
  gender text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT voices_pkey PRIMARY KEY (id)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for agents
CREATE POLICY "Users can view their own agents" ON public.agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own agents" ON public.agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own agents" ON public.agents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own agents" ON public.agents FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for call_logs (users can see logs for their agents)
CREATE POLICY "Users can view logs for their agents" ON public.call_logs FOR SELECT USING (
  elevenlabs_agent_id IN (
    SELECT elevenlabs_agent_id FROM public.agents WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Allow inserts for call logs" ON public.call_logs FOR INSERT WITH CHECK (true);

-- Create RLS policies for phone_numbers
CREATE POLICY "Users can view their own phone numbers" ON public.phone_numbers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own phone numbers" ON public.phone_numbers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own phone numbers" ON public.phone_numbers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own phone numbers" ON public.phone_numbers FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for prompt_templates (public read access for all users)
CREATE POLICY "All users can view prompt templates" ON public.prompt_templates FOR SELECT USING (true);

-- Create RLS policies for voices (public read access for all users)
CREATE POLICY "All users can view voices" ON public.voices FOR SELECT USING (true);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_call_logs_updated_at BEFORE UPDATE ON public.call_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_phone_numbers_updated_at BEFORE UPDATE ON public.phone_numbers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_prompt_templates_updated_at BEFORE UPDATE ON public.prompt_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default voices
INSERT INTO public.voices (name, voice_id, gender) VALUES
('Sarah', 'pNInz6obpgDQGcFmaJgB', 'female'),
('Michael', '21m00Tcm4TlvDq8ikWAM', 'male'),
('Emma', 'EXAVITQu4vr4xnSDxMaL', 'female'),
('David', 'AZnzlk1XvdvUeBnXmlld', 'male'),
('Lisa', 'ThT5KcBeYPX3keUQqHPh', 'female');

-- Insert default prompt templates
INSERT INTO public.prompt_templates (name, title, content) VALUES
('customer_service', 'Kundenservice', 'Du bist ein freundlicher Kundenservice-Mitarbeiter. Hilf dem Kunden bei seinen Anliegen und beantworte seine Fragen höflich und professionell.'),
('appointment_booking', 'Terminbuchung', 'Du bist ein Assistent für Terminbuchungen. Hilf Kunden dabei, Termine zu vereinbaren und verwalte den Kalender effizient.'),
('sales_assistant', 'Verkaufsassistent', 'Du bist ein Verkaufsassistent. Informiere Kunden über unsere Produkte und Dienstleistungen und unterstütze sie beim Kaufprozess.');