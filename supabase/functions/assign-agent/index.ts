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
    const { phone_id, agent_id, phonenumber_id, user_id } = await req.json();

    if (!phone_id || !phonenumber_id || !user_id) {
      throw new Error('Missing required fields: phone_id, phonenumber_id, user_id');
    }

    console.log('Assigning agent:', { phone_id, agent_id, phonenumber_id, user_id });

    // Update phone number assignment in Eleven Labs
    const elevenlabsResponse = await fetch(`https://api.elevenlabs.io/v1/convai/phone-numbers/${phonenumber_id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY') ?? '',
      },
      body: JSON.stringify({
        agent_id: agent_id || null
      }),
    });

    if (!elevenlabsResponse.ok) {
      const error = await elevenlabsResponse.text();
      console.error('11labs API error:', error);
      throw new Error(`11labs API error: ${error}`);
    }

    // Use service role for DB update
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update phone number in database
    const { data, error } = await supabaseAdmin
      .from('phone_numbers')
      .update({ assigned_agent: agent_id || null })
      .eq('id', phone_id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('Agent assignment successful:', data);

    return new Response(JSON.stringify({ 
      success: true, 
      data 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in assign-agent function:', error);
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