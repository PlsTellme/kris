-- Add boolean premium column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT false;

-- Update existing premium users based on subscription_type
UPDATE public.profiles 
SET is_premium = true 
WHERE subscription_type = 'premium';

-- Keep the subscription_type column for backward compatibility for now