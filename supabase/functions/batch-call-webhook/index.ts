import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== WEBHOOK REQUEST RECEIVED ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const webhookSecret = Deno.env.get('ELEVENLABS_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('ELEVENLABS_WEBHOOK_SECRET not found');
      return new Response('Internal server error', { status: 500, headers: corsHeaders });
    }

    // Get request body
    const body = await req.text();
    console.log("[DEBUG] Raw webhook body:", body);

    // Check signature with multiple possible header variants
    const signatureHeader = req.headers.get('xi-signature') || 
                           req.headers.get('elevenlabs-signature') || 
                           req.headers.get('x-elevenlabs-signature') || 
                           req.headers.get('signature');
    
    console.log("[DEBUG] Signature header found:", signatureHeader);

    if (!signatureHeader) {
      console.error('No signature header found. Available headers:', Object.fromEntries(req.headers.entries()));
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    // Try both signature formats: direct hash and structured format
    let isValidSignature = false;
    
    // Try direct hash comparison first
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(body);
      const key = encoder.encode(webhookSecret);
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
      const expectedSignature = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      console.log("[DEBUG] Direct hash - Expected:", expectedSignature);
      console.log("[DEBUG] Direct hash - Received:", signatureHeader);
      
      if (signatureHeader === expectedSignature) {
        isValidSignature = true;
      }
    } catch (err) {
      console.log("[DEBUG] Direct hash validation failed:", err);
    }

    // Try structured format (t=timestamp,v0=signature)
    if (!isValidSignature && signatureHeader.includes(',')) {
      try {
        const headers = signatureHeader.split(',');
        const timestamp = headers.find(e => e.startsWith('t='))?.substring(2);
        const signature = headers.find(e => e.startsWith('v0='))?.substring(3);
        
        if (timestamp && signature) {
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(webhookSecret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
          );

          const sigData = encoder.encode(`${timestamp}.${body}`);
          const digest = await crypto.subtle.sign("HMAC", key, sigData);
          const digestArray = new Uint8Array(digest);
          const expectedSignature = Array.from(digestArray)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          
          console.log("[DEBUG] Structured format - Expected:", expectedSignature);
          console.log("[DEBUG] Structured format - Received:", signature);
          
          if (expectedSignature === signature) {
            isValidSignature = true;
          }
        }
      } catch (err) {
        console.log("[DEBUG] Structured format validation failed:", err);
      }
    }

    if (!isValidSignature) {
      console.error('Invalid signature. Body length:', body.length);
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    console.log("[DEBUG] Signature validation successful");

    // Parse webhook payload
    let webhookData;
    try {
      webhookData = JSON.parse(body);
      console.log("[DEBUG] Parsed webhook data:", JSON.stringify(webhookData, null, 2));
    } catch (err) {
      console.error('Invalid JSON payload:', err);
      return new Response('Bad Request', { status: 400, headers: corsHeaders });
    }

    // Handle different event types - be more permissive
    const eventType = webhookData.event_type || webhookData.type;
    console.log("[DEBUG] Event type:", eventType);

    if (!['post_call_transcription', 'post_call_analysis', 'call_ended', 'conversation_completed', 'call_completed'].includes(eventType)) {
      console.log("[DEBUG] Ignoring event type:", eventType);
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Extract call data
    const callData = extractCallData(webhookData);
    console.log("[DEBUG] Extracted call data:", JSON.stringify(callData, null, 2));

    if (!callData.lead_id || !callData.batchid) {
      console.error('Missing required fields: lead_id or batchid');
      return new Response('Bad Request', { status: 400, headers: corsHeaders });
    }

    // Find user from pending_leads
    const { data: pendingLead, error: leadError } = await supabaseClient
      .from('pending_leads')
      .select('user_id')
      .eq('batchid', callData.batchid)
      .eq('lead_id', callData.lead_id)
      .maybeSingle();

    if (leadError) {
      console.error('Error finding pending lead:', leadError);
      return new Response('Internal server error', { status: 500, headers: corsHeaders });
    }

    if (!pendingLead) {
      console.error('Pending lead not found for batchid:', callData.batchid, 'lead_id:', callData.lead_id);
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    }

    // Upsert call answer with extracted data
    const answerData = {
      user_id: pendingLead.user_id,
      batchid: callData.batchid,
      lead_id: callData.lead_id,
      vorname: callData.vorname,
      nachname: callData.nachname,
      firma: callData.firma,
      nummer: callData.nummer,
      callname: callData.callname,
      zeitpunkt: callData.zeitpunkt,
      anrufdauer: callData.anrufdauer,
      transcript: callData.transcript,
      answers: callData.answers,
      call_status: callData.call_status,
    };

    console.log("[DEBUG] Upserting answer data:", JSON.stringify(answerData, null, 2));

    const { error: upsertError } = await supabaseClient
      .from('batch_call_answers')
      .upsert(answerData, {
        onConflict: 'user_id,batchid,lead_id',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('Error upserting call answer:', upsertError);
      return new Response('Internal server error', { status: 500, headers: corsHeaders });
    }

    console.log("[DEBUG] Successfully upserted call answer");

    // Update pending lead status
    const { error: updateLeadError } = await supabaseClient
      .from('pending_leads')
      .update({ status: 'completed' })
      .eq('batchid', callData.batchid)
      .eq('lead_id', callData.lead_id);

    if (updateLeadError) {
      console.error('Error updating pending lead:', updateLeadError);
    }

    // Check if all leads in batch are completed
    const { data: remainingLeads, error: remainingError } = await supabaseClient
      .from('pending_leads')
      .select('id')
      .eq('batchid', callData.batchid)
      .eq('status', 'pending');

    if (!remainingError && remainingLeads && remainingLeads.length === 0) {
      console.log("[DEBUG] All leads completed, updating batch status");
      
      // Update batch status to completed
      const { error: batchUpdateError } = await supabaseClient
        .from('batch_calls')
        .update({ status: 'completed' })
        .eq('batchid', callData.batchid);

      if (batchUpdateError) {
        console.error('Error updating batch status:', batchUpdateError);
      }

      // Clean up completed pending leads
      const { error: cleanupError } = await supabaseClient
        .from('pending_leads')
        .delete()
        .eq('batchid', callData.batchid);

      if (cleanupError) {
        console.error('Error cleaning up pending leads:', cleanupError);
      }
    }

    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error("Unexpected error in webhook:", err);
    return new Response(JSON.stringify({ error: "Server error in webhook" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractCallData(webhookData: any) {
  console.log("[DEBUG] Extracting call data from webhook");

  // Handle both direct webhook format and nested data format
  const convo = webhookData.data || webhookData;
  
  // Extract basic info with multiple fallback paths
  const leadId = convo.conversation_id || 
                convo.lead_id || 
                convo.id ||
                convo.conversation_initiation_client_data?.dynamic_variables?.lead_id;
  
  const batchId = convo.metadata?.batch_call?.batch_call_id || 
                 convo.batch_id || 
                 convo.batchid ||
                 webhookData.batch_id ||
                 webhookData.batchid;
  
  // Extract dynamic variables if available
  const dynamicVars = convo.conversation_initiation_client_data?.dynamic_variables || 
                     convo.dynamic_variables || 
                     convo.client_data?.dynamic_variables || 
                     webhookData.dynamic_variables || {};

  // Extract metadata
  const metadata = convo.metadata || webhookData.metadata || {};
  
  // Extract transcript
  let transcript = null;
  const transcriptArray = convo.transcript || webhookData.transcript;
  if (transcriptArray && Array.isArray(transcriptArray)) {
    transcript = transcriptArray
      .filter((msg: any) => msg.message && msg.message.trim())
      .map((msg: any) => `${msg.role}: ${msg.message}`)
      .join(' --- ');
  }

  // Extract answers from analysis
  let answers = null;
  const analysis = convo.analysis || webhookData.analysis;
  if (analysis?.data_collection_results) {
    const results = analysis.data_collection_results;
    answers = {
      answer_1: results.answer_1?.value || null,
      answer_2: results.answer_2?.value || null,
      answer_3: results.answer_3?.value || null,
      answer_4: results.answer_4?.value || null,
      answer_5: results.answer_5?.value || null,
    };
  }

  // Determine call status
  let callStatus = 'success';
  const terminationReason = metadata.termination_reason || convo.termination_reason;
  const status = convo.status || webhookData.status;
  
  if (terminationReason) {
    if (terminationReason.includes('no_answer') || 
        terminationReason.includes('declined') ||
        terminationReason.includes('voicemail_detection')) {
      callStatus = 'no_answer';
    } else if (terminationReason.includes('error') || 
               terminationReason.includes('failed')) {
      callStatus = 'failed';
    }
  }
  
  if (status !== "done" && status !== "completed") {
    callStatus = 'failed';
  }

  // Extract timing - prefer accepted_time, fallback to ended_time or updated_at
  const zeitpunkt = metadata.accepted_time_unix_secs || 
                   metadata.ended_time_unix_secs || 
                   convo.updated_at_unix || 
                   webhookData.updated_at_unix ||
                   Math.floor(Date.now() / 1000);

  // Extract duration
  const anrufdauer = metadata.call_duration_secs || 
                    convo.call_duration_secs || 
                    webhookData.call_duration_secs || 
                    0;

  const result = {
    lead_id: leadId,
    batchid: batchId,
    vorname: dynamicVars.vorname || '',
    nachname: dynamicVars.nachname || '',
    firma: dynamicVars.firma || '',
    nummer: dynamicVars.nummer || convo.caller_phone_number || webhookData.caller_phone_number || '',
    callname: dynamicVars.callname || dynamicVars.call_name || '',
    zeitpunkt,
    anrufdauer,
    transcript,
    answers,
    call_status: callStatus,
  };

  console.log("[DEBUG] Extracted result:", JSON.stringify(result, null, 2));
  return result;
}

function flattenTranscript(transcriptArray: any[]) {
  if (!Array.isArray(transcriptArray)) return "";
  return transcriptArray
    .filter(msg => typeof msg.message === 'string' && msg.message.trim() !== "")
    .map(msg => `${msg.role}: ${msg.message.trim()}`)
    .join(' --- ');
}