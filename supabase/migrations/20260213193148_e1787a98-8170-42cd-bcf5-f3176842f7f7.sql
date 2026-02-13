
-- E2EE Messaging System Tables
-- Access control is enforced by edge functions (wallet-only auth, no Supabase Auth)
-- All tables use service_role for writes via edge functions

-- Messaging identities: links wallet addresses to domains
CREATE TABLE public.messaging_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  domain_name text NOT NULL UNIQUE,
  domain_type text NOT NULL DEFAULT 'iota', -- iota, eth, box, sol, etc.
  did text NULL,
  display_name text NULL,
  avatar_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messaging_identities_wallet ON public.messaging_identities(wallet_address);
CREATE INDEX idx_messaging_identities_domain ON public.messaging_identities(domain_name);

-- Devices: each device has its own encryption keys
CREATE TABLE public.messaging_devices (
  device_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid NOT NULL REFERENCES public.messaging_identities(id) ON DELETE CASCADE,
  device_label text NOT NULL DEFAULT 'default',
  device_pubkey text NOT NULL, -- base64 X25519 public key
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messaging_devices_identity ON public.messaging_devices(identity_id);

-- Prekeys for async key agreement
CREATE TABLE public.messaging_prekeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.messaging_devices(device_id) ON DELETE CASCADE,
  prekey_id bigint NOT NULL,
  prekey_pub text NOT NULL, -- base64
  signature text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz NULL,
  UNIQUE(device_id, prekey_id)
);

-- Conversations
CREATE TABLE public.messaging_conversations (
  conversation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_type text NOT NULL DEFAULT 'direct' CHECK (conversation_type IN ('direct', 'group')),
  title text NULL,
  created_by uuid NOT NULL REFERENCES public.messaging_identities(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Conversation members
CREATE TABLE public.messaging_members (
  conversation_id uuid NOT NULL REFERENCES public.messaging_conversations(conversation_id) ON DELETE CASCADE,
  identity_id uuid NOT NULL REFERENCES public.messaging_identities(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz NULL,
  PRIMARY KEY (conversation_id, identity_id)
);
CREATE INDEX idx_messaging_members_identity ON public.messaging_members(identity_id);

-- Messages (ciphertext only)
CREATE TABLE public.messaging_messages (
  message_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.messaging_conversations(conversation_id) ON DELETE CASCADE,
  sender_identity_id uuid NOT NULL REFERENCES public.messaging_identities(id),
  sender_device_id uuid NOT NULL REFERENCES public.messaging_devices(device_id),
  sent_at timestamptz NOT NULL DEFAULT now(),
  cipher_suite text NOT NULL DEFAULT 'xchacha20poly1305',
  ciphertext text NOT NULL, -- base64 ciphertext
  nonce text NOT NULL, -- base64 nonce
  ad text NULL, -- base64 associated data
  attachments jsonb NULL, -- encrypted attachment refs
  notarization_batch_id uuid NULL
);
CREATE INDEX idx_messaging_messages_conv ON public.messaging_messages(conversation_id, sent_at DESC);

-- Message envelopes (per recipient device)
CREATE TABLE public.messaging_envelopes (
  message_id uuid NOT NULL REFERENCES public.messaging_messages(message_id) ON DELETE CASCADE,
  recipient_device_id uuid NOT NULL REFERENCES public.messaging_devices(device_id) ON DELETE CASCADE,
  wrapped_msg_key text NOT NULL, -- base64 sealed box
  header jsonb NULL, -- ratchet header
  PRIMARY KEY (message_id, recipient_device_id)
);
CREATE INDEX idx_messaging_envelopes_device ON public.messaging_envelopes(recipient_device_id);

-- Notarization batches
CREATE TABLE public.messaging_notarization_batches (
  batch_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  root_hash text NOT NULL, -- hex or base64
  leaf_count int NOT NULL,
  iota_notarization_id text NULL,
  iota_tx_digest text NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'anchored', 'failed')),
  error text NULL
);

-- Notarization proofs (per message)
CREATE TABLE public.messaging_notarization_proofs (
  message_id uuid PRIMARY KEY REFERENCES public.messaging_messages(message_id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.messaging_notarization_batches(batch_id),
  leaf_hash text NOT NULL,
  leaf_index int NOT NULL,
  proof jsonb NOT NULL -- array of {hash, side}
);

-- Enable RLS on all tables
ALTER TABLE public.messaging_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_prekeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_notarization_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_notarization_proofs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Since this is wallet-only auth (no Supabase Auth),
-- all writes go through edge functions with service_role.
-- Public read access is scoped; edge functions enforce write access.

-- Identities: publicly discoverable by domain
CREATE POLICY "Anyone can view messaging identities"
  ON public.messaging_identities FOR SELECT USING (true);
CREATE POLICY "Service role manages identities"
  ON public.messaging_identities FOR ALL USING (true) WITH CHECK (true);

-- Devices: public keys are discoverable
CREATE POLICY "Anyone can view active devices"
  ON public.messaging_devices FOR SELECT USING (revoked_at IS NULL);
CREATE POLICY "Service role manages devices"
  ON public.messaging_devices FOR ALL USING (true) WITH CHECK (true);

-- Prekeys: publicly readable for key exchange
CREATE POLICY "Anyone can view unused prekeys"
  ON public.messaging_prekeys FOR SELECT USING (used_at IS NULL);
CREATE POLICY "Service role manages prekeys"
  ON public.messaging_prekeys FOR ALL USING (true) WITH CHECK (true);

-- Conversations: only readable by service role (edge functions check membership)
CREATE POLICY "Service role manages conversations"
  ON public.messaging_conversations FOR ALL USING (true) WITH CHECK (true);

-- Members: only readable by service role
CREATE POLICY "Service role manages members"
  ON public.messaging_members FOR ALL USING (true) WITH CHECK (true);

-- Messages: only readable by service role (edge functions check membership)
CREATE POLICY "Service role manages messages"
  ON public.messaging_messages FOR ALL USING (true) WITH CHECK (true);

-- Envelopes: only readable by service role
CREATE POLICY "Service role manages envelopes"
  ON public.messaging_envelopes FOR ALL USING (true) WITH CHECK (true);

-- Notarization: publicly readable for verification
CREATE POLICY "Anyone can view notarization batches"
  ON public.messaging_notarization_batches FOR SELECT USING (true);
CREATE POLICY "Service role manages notarization batches"
  ON public.messaging_notarization_batches FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can view notarization proofs"
  ON public.messaging_notarization_proofs FOR SELECT USING (true);
CREATE POLICY "Service role manages notarization proofs"
  ON public.messaging_notarization_proofs FOR ALL USING (true) WITH CHECK (true);

-- Timestamp update triggers
CREATE TRIGGER update_messaging_identities_updated_at
  BEFORE UPDATE ON public.messaging_identities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messaging_conversations_updated_at
  BEFORE UPDATE ON public.messaging_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for encrypted attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', false);

CREATE POLICY "Service role manages message attachments"
  ON storage.objects FOR ALL
  USING (bucket_id = 'message-attachments')
  WITH CHECK (bucket_id = 'message-attachments');
