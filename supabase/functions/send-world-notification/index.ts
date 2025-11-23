import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress, senderAddress, message } = await req.json();

    const WORLD_API_KEY = Deno.env.get('WORLD_API_KEY');
    const APP_ID = 'app_ed7e61cb0c52630464178eed59e3fbdd';

    if (!WORLD_API_KEY) {
      throw new Error('WORLD_API_KEY not configured');
    }

    // Send notification to World App
    const response = await fetch(
      "https://developer.worldcoin.org/api/v2/minikit/send-notification",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WORLD_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: APP_ID,
          wallet_addresses: [walletAddress],
          localisations: [
            {
              language: "en",
              title: "💬 New Message",
              message: `You have a new message from ${senderAddress.slice(0, 6)}...${senderAddress.slice(-4)}`,
            },
          ],
          mini_app_path: `worldapp://mini-app?app_id=${APP_ID}&path=/inbox`,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('World API error:', errorText);
      throw new Error(`Failed to send notification: ${response.status}`);
    }

    const data = await response.json();
    console.log('Notification sent:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
