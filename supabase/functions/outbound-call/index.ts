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
    const { agent_id, phone_number_id, to_number } = await req.json();

    if (!agent_id || !phone_number_id || !to_number) {
      throw new Error('Missing required fields: agent_id, phone_number_id, to_number');
    }

    // Validate phone number format (+49 or +43)
    if (!to_number.match(/^\+4[39]\d{8,15}$/)) {
      throw new Error('Phone number must be in +49 or +43 format');
    }

    console.log('Starting outbound call:', { agent_id, phone_number_id, to_number });

    // Use service role for DB access to get elevenlabs_agent_id
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the elevenlabs_agent_id from database
    const { data: agentData, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('elevenlabs_agent_id')
      .eq('id', agent_id)
      .single();

    if (agentError || !agentData) {
      throw new Error(`Agent not found: ${agentError?.message || 'Unknown error'}`);
    }

    const elevenlabsAgentId = agentData.elevenlabs_agent_id;
    console.log('Using Eleven Labs agent ID:', elevenlabsAgentId);

    // Make outbound call via Eleven Labs
    const elevenlabsResponse = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY') ?? '',
      },
      body: JSON.stringify({
        agent_id: elevenlabsAgentId,
        agent_phone_number_id: phone_number_id,
        to_number: to_number
      }),
    });

    if (!elevenlabsResponse.ok) {
      const error = await elevenlabsResponse.text();
      console.error('11labs API error:', error);
      throw new Error(`11labs API error: ${error}`);
    }

    const result = await elevenlabsResponse.json();
    console.log('Outbound call started successfully:', result);

    return new Response(JSON.stringify({ 
      success: true, 
      data: result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in outbound-call function:', error);
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