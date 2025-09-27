import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { call_log_id, elevenlabs_agent_id, duration_seconds } = await req.json();

    if (!call_log_id || !elevenlabs_agent_id || !duration_seconds) {
      throw new Error('Missing required fields');
    }

    console.log('Processing billing for call:', { call_log_id, elevenlabs_agent_id, duration_seconds });

    // Use service role for DB operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get agent and user info
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('user_id, name')
      .eq('elevenlabs_agent_id', elevenlabs_agent_id)
      .single();

    if (agentError || !agent) {
      throw new Error(`Agent not found: ${agentError?.message}`);
    }

    // Calculate minutes to deduct (round up)
    const minutesToDeduct = Math.ceil(duration_seconds / 60);

    // Get current profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('minutes_used, minutes_limit, username, full_name')
      .eq('user_id', agent.user_id)
      .single();

    if (profileError || !profile) {
      throw new Error(`Profile not found: ${profileError?.message}`);
    }

    // Update minutes used
    const newMinutesUsed = profile.minutes_used + minutesToDeduct;
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ minutes_used: newMinutesUsed })
      .eq('user_id', agent.user_id);

    if (updateError) {
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    // Check if user went into negative balance
    const remainingMinutes = profile.minutes_limit - newMinutesUsed;
    
    console.log('Billing processed:', {
      user_id: agent.user_id,
      minutesToDeduct,
      newMinutesUsed,
      remainingMinutes
    });

    // If negative balance, send notification email
    if (remainingMinutes < 0 && profile.minutes_limit - profile.minutes_used >= 0) {
      // Only send email when going from positive to negative balance
      console.log('User went into negative balance, sending notification');
      
      // Here you could add email sending logic using Resend or similar service
      // For now, just log the event
      console.log(`Email notification needed for user ${agent.user_id}: ${Math.abs(remainingMinutes)} minutes over limit`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      minutesDeducted: minutesToDeduct,
      remainingMinutes: remainingMinutes,
      overLimit: remainingMinutes < 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-call-billing function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});