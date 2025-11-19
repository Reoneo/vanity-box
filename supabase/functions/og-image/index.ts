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
    const url = new URL(req.url);
    const username = url.searchParams.get('username');
    const avatar = url.searchParams.get('avatar');
    const banner = url.searchParams.get('banner');
    const displayName = url.searchParams.get('displayName');
    
    if (!username) {
      throw new Error('Username is required');
    }

    // Create SVG for the OG image
    const width = 1200;
    const height = 630;
    
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#2d2d2d;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#D4AF37;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#F7E06C;stop-opacity:1" />
          </linearGradient>
          <clipPath id="avatarClip">
            <circle cx="600" cy="250" r="100"/>
          </clipPath>
        </defs>
        
        <!-- Background -->
        <rect width="${width}" height="${height}" fill="url(#bg)"/>
        
        <!-- Banner (if available) -->
        ${banner ? `
          <image href="${banner}" x="0" y="0" width="${width}" height="300" preserveAspectRatio="xMidYMid slice" opacity="0.4"/>
          <rect x="0" y="0" width="${width}" height="300" fill="url(#bg)" opacity="0.6"/>
        ` : `
          <!-- Default banner pattern -->
          <defs>
            <pattern id="defaultPattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <rect width="100" height="100" fill="#2d2d2d"/>
              <path d="M 0 50 L 50 0 L 100 50 L 50 100 Z" fill="#3d3d3d" opacity="0.5"/>
            </pattern>
          </defs>
          <rect x="0" y="0" width="${width}" height="300" fill="url(#defaultPattern)" opacity="0.6"/>
        `}
        
        <!-- Avatar -->
        ${avatar ? `
          <g>
            <!-- Glow effect -->
            <circle cx="600" cy="250" r="110" fill="url(#gold)" opacity="0.3"/>
            <circle cx="600" cy="250" r="105" fill="#D4AF37" opacity="0.5"/>
            <!-- Avatar image -->
            <image href="${avatar}" x="500" y="150" width="200" height="200" clip-path="url(#avatarClip)"/>
            <!-- Border -->
            <circle cx="600" cy="250" r="100" fill="none" stroke="url(#gold)" stroke-width="4"/>
          </g>
        ` : `
          <!-- Fallback avatar -->
          <circle cx="600" cy="250" r="100" fill="#2d2d2d"/>
          <circle cx="600" cy="250" r="100" fill="none" stroke="url(#gold)" stroke-width="4"/>
          <text x="600" y="280" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="#D4AF37" text-anchor="middle">
            ${(displayName || username).charAt(0).toUpperCase()}
          </text>
        `}
        
        <!-- Display Name -->
        <text x="600" y="420" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle">
          ${displayName || username}
        </text>
        
        <!-- Username -->
        ${displayName && displayName !== username ? `
          <text x="600" y="470" font-family="monospace" font-size="28" fill="#D4AF37" text-anchor="middle">
            ${username}
          </text>
        ` : ''}
        
        <!-- Vanity.box logo at bottom left -->
        <g transform="translate(40, 550)">
          <!-- V with Ethereum icon -->
          <path d="M 0 0 L 20 60 L 40 0 L 35 0 L 20 45 L 5 0 Z" fill="#D4AF37"/>
          <path d="M 20 15 L 15 30 L 25 30 Z" fill="#1a1a1a"/>
          <path d="M 20 30 L 15 45 L 25 45 Z" fill="#2d2d2d"/>
          
          <!-- VANITY.BOX text -->
          <text x="50" y="45" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#D4AF37">
            VANITY.BOX
          </text>
        </g>
      </svg>
    `;

    return new Response(svg, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
