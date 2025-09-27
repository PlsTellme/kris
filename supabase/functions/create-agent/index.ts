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
    const { name, voice_id, first_message, prompt, user_id, email } = await req.json();

    if (!name || !voice_id || !prompt || !user_id) {
      throw new Error('Missing required fields: name, voice_id, prompt, user_id');
    }

    console.log('Creating agent with data:', { name, voice_id, first_message, prompt, user_id, email });

    // Replace {{email}} placeholder in prompt
    const processedPrompt = prompt.replace(/\{\{email\}\}/g, email || 'false');

    // Append email information to prompt automatically (hidden from user)
    const finalPrompt = processedPrompt + (email ? `\n\nEmail-Adresse für Transkripte: ${email}` : '');

    // Create agent in 11labs
    const elevenlabsResponse = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
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
          },
          asr: {
            quality: "high",
            user_input_audio_format: "ulaw_8000"
          },
          audio: {
            output_format: "ulaw_8000"
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
        },
        workspace_overrides: {
          webhooks: {
            post_call_webhook_id: "wsec_4c2fd8eb219c6c5347f40f41b380b4ca2270df5db7ecec892f0a642ee6bcf355"
          }
        }
      }),
    });

    if (!elevenlabsResponse.ok) {
      const error = await elevenlabsResponse.text();
      console.error('11labs API error:', error);
      throw new Error(`11labs API error: ${error}`);
    }

    const elevenlabsData = await elevenlabsResponse.json();
    console.log('11labs response:', elevenlabsData);

    // Use service role for DB insert (bypass RLS safely inside server)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Save agent to database
    const { data: agentData, error: agentError } = await supabaseAdmin
      .from('agents')
      .insert({
        user_id: user_id,
        name: name,
        voice_type: voice_id,
        first_message: first_message,
        prompt: prompt,
        email: email,
        elevenlabs_agent_id: elevenlabsData.agent_id
      })
      .select()
      .single();

    if (agentError) {
      console.error('Database error:', agentError);
      throw new Error(`Database error: ${agentError.message}`);
    }

    console.log('Agent created successfully:', agentData);

    return new Response(JSON.stringify({ 
      success: true, 
      agent: agentData,
      elevenlabs_agent_id: elevenlabsData.agent_id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-agent function:', error);
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