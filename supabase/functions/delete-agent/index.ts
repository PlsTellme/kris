import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { agent_id, elevenlabs_agent_id, user_id } = await req.json();

    if (!agent_id || !elevenlabs_agent_id || !user_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Agent ID, ElevenLabs Agent ID und User ID sind erforderlich' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify agent belongs to user
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agent_id)
      .eq('user_id', user_id)
      .single();

    if (agentError || !agent) {
      console.error('Agent verification error:', agentError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Agent nicht gefunden oder keine Berechtigung' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Delete agent from ElevenLabs
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenlabsApiKey) {
      console.error('ElevenLabs API key not found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'ElevenLabs API-Schlüssel nicht konfiguriert' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    try {
      const deleteResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${elevenlabs_agent_id}`, {
        method: 'DELETE',
        headers: {
          'xi-api-key': elevenlabsApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error('ElevenLabs delete error:', errorText);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Fehler beim Löschen des Agenten von ElevenLabs: ${deleteResponse.status}` 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Agent successfully deleted from ElevenLabs');
    } catch (elevenlabsError) {
      console.error('ElevenLabs API error:', elevenlabsError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Fehler beim Verbinden mit ElevenLabs API' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Delete agent from database
    const { error: dbError } = await supabase
      .from('agents')
      .delete()
      .eq('id', agent_id)
      .eq('user_id', user_id);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Fehler beim Löschen des Agenten aus der Datenbank' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Agent successfully deleted from database');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Agent erfolgreich gelöscht' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Unerwarteter Fehler beim Löschen des Agenten' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});