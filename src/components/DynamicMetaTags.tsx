import { Helmet } from "react-helmet-async";

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
  const origin = "https://vanity.box";
  const supabaseUrl = "https://gdjjboorqviobvvygpca.supabase.co";

  const title = username ? `${displayName || username} — Vanity ID | Web3 Profile` : "Vanity.box — Blockchain Wallet & Decentralised Web3 ID";

  const desc = description || (username
    ? `Explore ${displayName || username}'s Vanity ID: linked blockchain wallets, social links, NFTs and Web3 activity on Vanity.box.`
    : "Vanity connects blockchain wallets, readable names and digital ID profiles. Explore decentralised Web3 identity, tokens, NFTs and wallet activity.");
  const currentUrl = `${origin}${typeof window !== "undefined" ? window.location.pathname : "/"}`;

  // Use edge function to generate dynamic OG image
  // og-image resolves avatar server-side from the username, so social-preview
  // crawlers (which don't execute JS) get the correct image for any deep link.
  const ogImageUrl = username
    ? `${supabaseUrl}/functions/v1/og-image?username=${encodeURIComponent(username)}${displayName ? `&displayName=${encodeURIComponent(displayName)}` : ""}`
    : `${origin}/vanity-meta-image.jpeg`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={desc} />

      {/* Open Graph */}
      <meta property="og:type" content={username ? "profile" : "website"} />
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

    </Helmet>
  );
};
