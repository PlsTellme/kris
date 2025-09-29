import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json();
    console.log(`[DEBUG] Batch call started for user: ${user.id}`);

    // Add lead IDs and user info to recipients
    if (requestBody.recipients && Array.isArray(requestBody.recipients)) {
      requestBody.recipients.forEach((recipient: any) => {
        if (!recipient.conversation_initiation_client_data) {
          recipient.conversation_initiation_client_data = {};
        }
        if (!recipient.conversation_initiation_client_data.dynamic_variables) {
          recipient.conversation_initiation_client_data.dynamic_variables = {};
        }
        
        const leadId = crypto.randomUUID();
        recipient.conversation_initiation_client_data.dynamic_variables.lead_id = leadId;
        recipient.conversation_initiation_client_data.dynamic_variables.user_id = user.id;
      });
    }

    // Call ElevenLabs API with the exact format expected
    const elevenLabsBody = {
      call_name: requestBody.call_name,
      agent_id: requestBody.agent_id,
      agent_phone_number_id: requestBody.agent_phone_number_id,
      scheduled_time_unix: Math.floor(Date.now() / 1000),
      recipients: requestBody.recipients
    };

    const response = await fetch("https://api.elevenlabs.io/v1/convai/batch-calling/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": Deno.env.get('ELEVENLABS_API_KEY')!
      },
      body: JSON.stringify(elevenLabsBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${errorText}`);
    }

    const batchMeta = await response.json();
    const batchid = batchMeta.id;
    const callname = batchMeta.name;
    const created_at_unix = batchMeta.created_at_unix || Math.floor(Date.now() / 1000);

    console.log("[DEBUG] ElevenLabs Batch-ID received:", batchid);

    // Save batch call info
    const { error: batchError } = await supabaseClient
      .from('batch_calls')
      .insert({
        batchid,
        callname,
        user_id: user.id,
        status: 'in_progress'
      });

    if (batchError) {
      console.error("Error saving batch call:", batchError);
      throw new Error("Failed to save batch call");
    }

    // Save pending leads
    if (requestBody.recipients && Array.isArray(requestBody.recipients)) {
      const pendingLeads = requestBody.recipients.map((recipient: any) => {
        const vars = recipient.conversation_initiation_client_data?.dynamic_variables || {};
        return {
          lead_id: vars.lead_id,
          batchid,
          user_id: user.id,
          vorname: vars.vorname || null,
          nachname: vars.nachname || null,
          firma: vars.firma || null,
          nummer: vars.nummer || null,
          call_name: vars.call_name || null,
          status: 'pending'
        };
      });

      const { error: leadsError } = await supabaseClient
        .from('pending_leads')
        .insert(pendingLeads);

      if (leadsError) {
        console.error("Error saving pending leads:", leadsError);
        throw new Error("Failed to save pending leads");
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Batch call successfully started",
      batchid
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in start-batch-call:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});