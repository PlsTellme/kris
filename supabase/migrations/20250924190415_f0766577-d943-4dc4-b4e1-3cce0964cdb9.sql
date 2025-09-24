-- Create phone_numbers table
CREATE TABLE public.phone_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  phonenumber_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

-- Create policies for phone_numbers
CREATE POLICY "Users can view their own phone numbers" 
ON public.phone_numbers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own phone numbers" 
ON public.phone_numbers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phone numbers" 
ON public.phone_numbers 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own phone numbers" 
ON public.phone_numbers 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create voices table
CREATE TABLE public.voices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  voice_id TEXT NOT NULL UNIQUE,
  gender TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for voices (public read access)
ALTER TABLE public.voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view voices" 
ON public.voices 
FOR SELECT 
USING (true);

-- Add elevenlabs_agent_id to agents table
ALTER TABLE public.agents ADD COLUMN elevenlabs_agent_id TEXT;

-- Add trigger for phone_numbers timestamps
CREATE TRIGGER update_phone_numbers_updated_at
BEFORE UPDATE ON public.phone_numbers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample phone number
INSERT INTO public.phone_numbers (user_id, phone_number, phonenumber_id)
VALUES ('8728fd8a-90ec-4aeb-9c1d-22780b7fb7fb', '+49 89 41435504', 'phnum_8501k5sd1rdyf7nar7xmjbhay02x');

-- Insert voice options
INSERT INTO public.voices (name, voice_id, gender) VALUES
('Männlich', 'CLrOIc4387Te6zgQGxeh', 'male'),
('Weiblich', 'ZgahlWh5FVSG7MFjZwPE', 'female');