-- Add assigned_agent column to phone_numbers table
ALTER TABLE public.phone_numbers ADD COLUMN assigned_agent UUID REFERENCES public.agents(id) ON DELETE SET NULL;