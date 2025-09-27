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
    const { user_id, over_limit_minutes } = await req.json();

    if (!user_id || !over_limit_minutes) {
      throw new Error('Missing required fields');
    }

    console.log('Sending balance notification:', { user_id, over_limit_minutes });

    // Use service role for DB operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user profile and email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('username, full_name')
      .eq('user_id', user_id)
      .single();

    if (profileError || !profile) {
      throw new Error(`Profile not found: ${profileError?.message}`);
    }

    // Get user email from auth.users
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    
    if (userError || !user?.user?.email) {
      throw new Error(`User email not found: ${userError?.message}`);
    }

    const userEmail = user.user.email;
    const userName = profile.full_name || profile.username || 'Kunde';

    console.log('Sending notification email to:', userEmail);

    // Here you would integrate with your email service (Resend, SendGrid, etc.)
    // For now, we'll just log the email content
    const emailContent = `
      Sehr geehrte/r ${userName},
      
      Ihr Minutenguthaben ist aufgebraucht und Sie haben ${over_limit_minutes} Minuten über Ihr Limit hinaus verbraucht.
      
      Diese zusätzlichen Minuten werden Ihnen in Rechnung gestellt.
      
      Bitte wenden Sie sich an uns, um Ihr Minutenguthaben aufzustocken.
      
      Mit freundlichen Grüßen
      Ihr Team
    `;

    console.log('Email content prepared for:', userEmail, emailContent);

    // TODO: Implement actual email sending here
    // Example with Resend:
    /*
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    await resend.emails.send({
      from: "noreply@yourdomain.com",
      to: [userEmail],
      subject: "Minutenguthaben überschritten",
      html: emailContent.replace(/\n/g, '<br>')
    });
    */

    return new Response(JSON.stringify({ 
      success: true,
      email_sent_to: userEmail,
      message: "Balance notification processed"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-balance-notification function:', error);
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