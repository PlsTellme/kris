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

    const { batchid } = await req.json();

    if (!batchid) {
      return new Response(JSON.stringify({ error: 'Batch ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[DEBUG] Fetching results for batch: ${batchid}`);

    // Fetch batch results from ElevenLabs API
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/batch-calling/${batchid}`, {
      method: 'GET',
      headers: {
        'xi-api-key': elevenLabsApiKey!,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('ElevenLabs API error:', response.status, await response.text());
      return new Response(JSON.stringify({ error: 'Failed to fetch batch results from ElevenLabs' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const batchData = await response.json();
    console.log(`[DEBUG] Batch data received:`, JSON.stringify(batchData, null, 2));

    // Process and store the results
    if (batchData.recipients && Array.isArray(batchData.recipients)) {
      console.log(`[DEBUG] Processing ${batchData.recipients.length} recipients`);
      
      for (const recipient of batchData.recipients) {
        // Check if this call result already exists
        const { data: existingCall } = await supabaseClient
          .from('batch_call_answers')
          .select('id')
          .eq('user_id', user.id)
          .eq('batchid', batchid)
          .eq('lead_id', recipient.conversation_initiation_client_data?.dynamic_variables?.lead_id || recipient.id)
          .maybeSingle();

        // Use UPSERT instead of INSERT to prevent duplicates and complement missing data
        let callDetails = null;
        if (recipient.conversation_id) {
          try {
            const callResponse = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${recipient.conversation_id}`, {
              headers: {
                'xi-api-key': elevenLabsApiKey!,
                'Content-Type': 'application/json',
              }
            });
            
            if (callResponse.ok) {
              callDetails = await callResponse.json();
              console.log(`[DEBUG] Call details for ${recipient.conversation_id}:`, JSON.stringify(callDetails, null, 2));
            }
          } catch (err) {
            console.error('Error fetching call details:', err);
          }
        }

        // Determine call status
        let callStatus = recipient.status || 'unknown';
        if (callDetails?.metadata?.termination_reason) {
          const termination = callDetails.metadata.termination_reason;
          if (termination.includes('no_answer') || termination.includes('voicemail_detection')) {
            callStatus = 'no_answer';
          } else if (termination.includes('error') || termination.includes('failed')) {
            callStatus = 'failed';
          } else if (callDetails.status === 'done') {
            callStatus = 'success';
          }
        }

        const callData = {
          user_id: user.id,
          batchid: batchid,
          callname: batchData.name || 'Unknown',
          lead_id: recipient.conversation_initiation_client_data?.dynamic_variables?.lead_id || recipient.id,
          nummer: recipient.phone_number,
          vorname: recipient.conversation_initiation_client_data?.dynamic_variables?.vorname || '',
          nachname: recipient.conversation_initiation_client_data?.dynamic_variables?.nachname || '',
          firma: recipient.conversation_initiation_client_data?.dynamic_variables?.firma || '',
          call_status: callStatus,
          anrufdauer: callDetails?.metadata?.call_duration_secs || 0,
          zeitpunkt: callDetails?.metadata?.accepted_time_unix_secs || recipient.updated_at_unix || Math.floor(Date.now() / 1000),
          transcript: callDetails?.transcript ? callDetails.transcript.map((msg: any) => `${msg.role}: ${msg.message}`).join(' --- ') : null,
          answers: callDetails?.analysis?.data_collection_results ? {
            answer_1: callDetails.analysis.data_collection_results.answer_1?.value || null,
            answer_2: callDetails.analysis.data_collection_results.answer_2?.value || null,
            answer_3: callDetails.analysis.data_collection_results.answer_3?.value || null,
            answer_4: callDetails.analysis.data_collection_results.answer_4?.value || null,
            answer_5: callDetails.analysis.data_collection_results.answer_5?.value || null
          } : null,
        };

        console.log(`[DEBUG] Upserting data for recipient: ${recipient.id}`);

        // UPSERT to complement missing data without overwriting correct webhook data
        const { error: upsertError } = await supabaseClient
          .from('batch_call_answers')
          .upsert(callData, {
            onConflict: 'user_id,batchid,lead_id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error('Error upserting call result:', upsertError);
        } else {
          console.log(`[DEBUG] Successfully upserted call result for recipient: ${recipient.id}`);
        }

        // Update pending lead status if exists
        await supabaseClient
          .from('pending_leads')
          .update({ status: 'completed' })
          .eq('batchid', batchid)
          .eq('lead_id', callData.lead_id);
      }

      // Update batch status if completed
      if (batchData.status === 'completed') {
        await supabaseClient
          .from('batch_calls')
          .update({ status: 'completed' })
          .eq('batchid', batchid)
          .eq('user_id', user.id);

        // Clean up pending leads
        await supabaseClient
          .from('pending_leads')
          .delete()
          .eq('batchid', batchid)
          .eq('user_id', user.id);

        console.log(`[DEBUG] Batch ${batchid} marked as completed`);
      }
    }

    // Return the fresh results
    const { data: answers, error } = await supabaseClient
      .from('batch_call_answers')
      .select('*')
      .eq('user_id', user.id)
      .eq('batchid', batchid)
      .order('zeitpunkt', { ascending: false });

    if (error) {
      console.error('Error fetching updated batch answers:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch updated batch answers' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get final batch status from database
    const { data: batchStatus } = await supabaseClient
      .from('batch_calls')
      .select('status')
      .eq('batchid', batchid)
      .eq('user_id', user.id)
      .maybeSingle();

    return new Response(JSON.stringify({
      success: true,
      data: answers,
      batch_info: {
        status: batchStatus?.status || batchData.status || 'unknown',
        total_calls: batchData.recipients?.length || answers?.length || 0,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-batch-results:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});