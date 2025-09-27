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
    const { agent_id, name, voice_id, first_message, prompt, elevenlabs_agent_id, user_id, email } = await req.json();

    if (!agent_id || !name || !voice_id || !prompt || !elevenlabs_agent_id || !user_id) {
      throw new Error('Missing required fields');
    }

    console.log('Updating agent with data:', { agent_id, name, voice_id, first_message, prompt, elevenlabs_agent_id, user_id, email });

    // Replace {{email}} placeholder in prompt
    const processedPrompt = prompt.replace(/\{\{email\}\}/g, email || 'false');

    // Append email information to prompt automatically (hidden from user)
    const finalPrompt = processedPrompt + (email ? `\n\nEmail-Adresse für Transkripte: ${email}` : '');

    // Update agent in 11labs
    const elevenlabsResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${elevenlabs_agent_id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY') ?? '',
      },
      body: JSON.stringify({
        name: name,
        conversation_config: {
          agent: {
            language: "de",
            first_message: first_message || "Hallo, wie kann ich Ihnen helfen?",
            prompt: {
              prompt: finalPrompt,
              llm: "gpt-4.1"
            }
          },
          tts: {
            model_id: "eleven_flash_v2_5",
            voice_id: voice_id,
            stability: 0.7,
            similarity_boost: 0.7,
            speed: 0.96
          }
        },
        platform_settings: {
          data_collection: {
            Transkript: {
              type: "string",
              description: "Extrahiere das Transkript des Anrufes in folgendem Format: KI: \"\", Anrufer: \"\"."
            },
            Zusammenfassung: {
              type: "string",
              description: "Erstelle eine prägnante 2-3 Zeilen Zusammenfassung des Kundenanliegens und der wichtigsten Gesprächsinhalte."
            },
            Erfolgreich: {
              type: "boolean",
              description: "Bewerte ob der Call erfolgreich war (true/false). Erfolgreich bedeutet: Kundenanliegen wurde verstanden und angemessen bearbeitet, Kunde wirkte zufrieden."
            },
            Email: {
              type: "string",
              description: "Erfasse die Email für die Weiterleitung. Du findest sie hier: (email). Gib NUR die EMail aus."
            }
          }
        }
      }),
    });

    if (!elevenlabsResponse.ok) {
      const error = await elevenlabsResponse.text();
      console.error('11labs API error:', error);
      throw new Error(`11labs API error: ${error}`);
    }

    // Use service role for DB update (bypass RLS safely inside server)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update agent in database
    const { data: agentData, error: agentError } = await supabaseAdmin
      .from('agents')
      .update({
        name: name,
        voice_type: voice_id,
        first_message: first_message,
        prompt: prompt,
        email: email
      })
      .eq('id', agent_id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (agentError) {
      console.error('Database error:', agentError);
      throw new Error(`Database error: ${agentError.message}`);
    }

    console.log('Agent updated successfully:', agentData);

    return new Response(JSON.stringify({ 
      success: true, 
      agent: agentData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in update-agent function:', error);
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