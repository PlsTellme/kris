import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Make outbound call via Eleven Labs
    const elevenlabsResponse = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY') ?? '',
      },
      body: JSON.stringify({
        agent_id: agent_id,
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