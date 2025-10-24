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
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vanitybox.app';
  
  const title = username 
    ? `${displayName || username} - Vanity.box` 
    : 'Vanity.box - Premium Web3 Identity';
  
  const desc = description || `View ${displayName || username} on Vanity.box`;
  const currentUrl = username 
    ? `${origin}/${username}` 
    : origin;
  
  const ogImageUrl = username 
    ? `${origin}/api/og?username=${encodeURIComponent(username)}${displayName ? `&displayName=${encodeURIComponent(displayName)}` : ''}${avatar ? `&avatar=${encodeURIComponent(avatar)}` : ''}${banner ? `&banner=${encodeURIComponent(banner)}` : ''}`
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
