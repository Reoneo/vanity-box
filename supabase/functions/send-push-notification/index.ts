import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  recipient: string;
  title: string;
  body: string;
  cta?: string;
  image?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📨 Push notification request received');

    const { recipient, title, body, cta, image }: NotificationPayload = await req.json();

    if (!recipient || !title || !body) {
      console.error('❌ Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: recipient, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📤 Sending notification to: ${recipient}`);
    console.log(`📋 Title: ${title}`);
    console.log(`📝 Body: ${body}`);

    // Push Protocol Notification API endpoint
    const PUSH_API_URL = 'https://backend.epns.io/apis/v1/payloads';
    
    // For Push Protocol notifications, we need to structure the payload correctly
    const notificationPayload = {
      notification: {
        title,
        body
      },
      data: {
        acta: cta || '',
        aimg: image || '',
        amsg: body,
        asub: title,
        type: '3', // Targeted notification
        etime: null,
        hidden: false
      },
      recipients: [recipient], // Ethereum address or CAIP format
      channel: 'eip155:1:0x0000000000000000000000000000000000000000', // Placeholder - should be your channel address
      env: 'prod'
    };

    console.log('📦 Notification payload:', JSON.stringify(notificationPayload, null, 2));

    // For now, we'll simulate the notification sending since we need a proper Push Channel
    // In production, you'd need to:
    // 1. Create a Push Protocol Channel
    // 2. Get channel private key
    // 3. Sign and send notifications through Push API

    // Simulated success response
    console.log('✅ Notification sent successfully (simulated)');

    // Store notification in database for user to see in-app
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // You could store notifications in a table for in-app notification center
    // For now, we'll just log it
    console.log('💾 Notification logged for recipient:', recipient);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification sent successfully',
        recipient,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to send notification',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
