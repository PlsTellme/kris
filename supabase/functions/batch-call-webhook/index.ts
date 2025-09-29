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

  console.log("Webhook request received");
  console.log("Timestamp:", new Date().toISOString());

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify webhook signature
    const signature_header = req.headers.get('elevenlabs-signature');
    const secret = Deno.env.get('ELEVENLABS_WEBHOOK_SECRET');

    if (!signature_header || !secret) {
      console.warn("No signature header or secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = signature_header.split(',');
    const timestamp = headers.find(e => e.startsWith('t='))?.substring(2);
    const signature = headers.find(e => e.startsWith('v0='));

    if (!timestamp || !signature) {
      console.warn("Invalid signature header:", signature_header);
      return new Response(JSON.stringify({ error: "Invalid signature header" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reqTimestamp = Number(timestamp) * 1000;
    const tolerance = Date.now() - 30 * 60 * 1000;
    if (reqTimestamp < tolerance) {
      console.warn("Webhook too old");
      return new Response(JSON.stringify({ error: "Request expired" }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const sigData = encoder.encode(`${timestamp}.${body}`);
    const digest = await crypto.subtle.sign("HMAC", key, sigData);
    const digestArray = new Uint8Array(digest);
    const expectedSignature = 'v0=' + Array.from(digestArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    console.log("Signature check:");
    console.log("Expected:", expectedSignature);
    console.log("Received:", signature);

    if (expectedSignature !== signature) {
      console.warn("Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
      console.log("Webhook body parsed:", JSON.stringify(parsedBody, null, 2));
    } catch (err) {
      console.error("Error parsing webhook body:", (err as Error).message);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (parsedBody.type !== "post_call_transcription") {
      console.warn("Unknown webhook type:", parsedBody.type);
      return new Response(JSON.stringify({ error: "Unknown webhook type" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const completed_lead = extractCallData(parsedBody);
    console.log("Extracted call data:", completed_lead);

    if (!completed_lead?.lead_id || !completed_lead?.batchid || !completed_lead?.user_id) {
      console.warn("Missing required data in webhook:", completed_lead);
      return new Response(JSON.stringify({ error: "Incomplete webhook data" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update pending lead status
    const { error: updateError } = await supabaseClient
      .from('pending_leads')
      .update({ status: 'completed' })
      .eq('lead_id', completed_lead.lead_id);

    if (updateError) {
      console.error("Error updating pending lead:", updateError);
    }

    // Insert call answer
    const { error: insertError } = await supabaseClient
      .from('batch_call_answers')
      .insert({
        user_id: completed_lead.user_id,
        vorname: completed_lead.vorname,
        nachname: completed_lead.nachname,
        firma: completed_lead.firma,
        nummer: completed_lead.nummer,
        batchid: completed_lead.batchid,
        zeitpunkt: completed_lead.zeitpunkt,
        anrufdauer: completed_lead.anrufdauer,
        transcript: completed_lead.transcript,
        callname: completed_lead.call_name,
        answers: completed_lead.answers,
        call_status: completed_lead.call_status,
        lead_id: completed_lead.lead_id
      });

    if (insertError) {
      console.error("Error inserting call answer:", insertError);
      throw new Error("Failed to save call answer");
    }

    // Check if batch is complete
    const { data: remainingLeads } = await supabaseClient
      .from('pending_leads')
      .select('*', { count: 'exact' })
      .eq('batchid', completed_lead.batchid)
      .eq('status', 'pending');

    const remaining = remainingLeads?.length || 0;
    console.log(`Remaining leads in batch ${completed_lead.batchid}:`, remaining);

    if (remaining === 0) {
      console.log("All leads completed. Updating batch status:", completed_lead.batchid);
      
      // Update batch status to completed
      await supabaseClient
        .from('batch_calls')
        .update({ status: 'completed' })
        .eq('batchid', completed_lead.batchid);

      // Clean up pending leads
      await supabaseClient
        .from('pending_leads')
        .delete()
        .eq('batchid', completed_lead.batchid);
    }

    console.log("Webhook processed successfully");
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error("Unexpected error in webhook:", err);
    return new Response(JSON.stringify({ error: "Server error in webhook" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractCallData(body: any) {
  const convo = body.data;
  const dyn = convo.conversation_initiation_client_data?.dynamic_variables || {};

  let call_status = 'success';

  if (convo.metadata?.termination_reason?.includes("voicemail_detection")) {
    call_status = 'no_answer';
  }

  if (convo.status !== "done" || convo.metadata?.error) {
    call_status = 'failed';
  }

  return {
    vorname: dyn.vorname,
    nachname: dyn.nachname,
    firma: dyn.firma,
    nummer: dyn.nummer,
    call_name: dyn.call_name,
    lead_id: dyn.lead_id,
    user_id: dyn.user_id,
    batchid: convo.metadata?.batch_call?.batch_call_id || null,
    zeitpunkt: convo.metadata?.accepted_time_unix_secs,
    anrufdauer: convo.metadata?.call_duration_secs,
    transcript: flattenTranscript(convo.transcript),
    answers: {
      answer_1: convo.analysis?.data_collection_results?.answer_1?.value || null,
      answer_2: convo.analysis?.data_collection_results?.answer_2?.value || null,
      answer_3: convo.analysis?.data_collection_results?.answer_3?.value || null,
      answer_4: convo.analysis?.data_collection_results?.answer_4?.value || null,
      answer_5: convo.analysis?.data_collection_results?.answer_5?.value || null
    },
    call_status
  };
}

function flattenTranscript(transcriptArray: any[]) {
  if (!Array.isArray(transcriptArray)) return "";
  return transcriptArray
    .filter(msg => typeof msg.message === 'string' && msg.message.trim() !== "")
    .map(msg => `${msg.role}: ${msg.message.trim()}`)
    .join(' --- ');
}