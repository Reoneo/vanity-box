import { Helmet } from 'react-helmet-async';

interface DynamicMetaTagsProps {
  username?: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  banner?: string;
}

export const DynamicMetaTags: React.FC<DynamicMetaTagsProps> = ({
  username,
  displayName,
  description,
  avatar,
  banner,
}) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vanity.box';
  const supabaseUrl = 'https://nttbfocahntuwqtsgpfr.supabase.co';
  
  const title = username 
    ? `${displayName || username} - Vanity.box` 
    : 'Vanity.box - Web3 Digital Identity';
  
  const desc = description || `View ${displayName || username}'s Web3 identity on Vanity.box`;
  const currentUrl = username 
    ? `${origin}/${username}` 
    : origin;
  
  // Use edge function to generate dynamic OG image
  const ogImageUrl = username 
    ? `${supabaseUrl}/functions/v1/og-image?username=${encodeURIComponent(username)}${displayName ? `&displayName=${encodeURIComponent(displayName)}` : ''}${avatar ? `&avatar=${encodeURIComponent(avatar)}` : ''}${banner ? `&banner=${encodeURIComponent(banner)}` : ''}`
    : `${origin}/vanity-meta-image.jpeg`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={desc} />
      
      {/* Open Graph */}
      <meta property="og:type" content="profile" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImageUrl} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={currentUrl} />
    </Helmet>
  );
};
