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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { name, voice_id, first_message, prompt } = await req.json();

    console.log('Creating agent with data:', { name, voice_id, first_message, prompt });

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
              prompt: prompt,
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
              description: "Extrahiere das Transkript des Anrufes in folgendem Format: KI: \"\", Anrufer: \"\""
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

    // Get current user
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Save agent to database
    const { data: agentData, error: agentError } = await supabaseClient
      .from('agents')
      .insert({
        user_id: user.id,
        name: name,
        voice_type: voice_id,
        first_message: first_message,
        prompt: prompt,
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