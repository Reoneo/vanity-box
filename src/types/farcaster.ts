export interface FarcasterUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  profile?: {
    bio?: {
      text: string;
    };
  };
}

export interface FarcasterEmbed {
  url: string;
  metadata?: {
    content_type?: string;
    content_length?: number;
    image?: {
      width_px?: number;
      height_px?: number;
    };
  };
}

export interface FarcasterCast {
  hash: string;
  thread_hash: string;
  parent_hash: string | null;
  parent_author: FarcasterUser | null;
  author: FarcasterUser;
  text: string;
  timestamp: string;
  embeds: FarcasterEmbed[];
  reactions: {
    likes_count: number;
    recasts_count: number;
  };
  replies: {
    count: number;
  };
  channel: {
    id: string;
    name: string;
    image_url?: string;
  } | null;
  mentioned_profiles: FarcasterUser[];
}

export interface FarcasterFeedResponse {
  casts: FarcasterCast[];
  next: {
    cursor: string;
  } | null;
}
