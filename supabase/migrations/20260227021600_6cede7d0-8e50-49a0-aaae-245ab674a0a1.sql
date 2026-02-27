-- Passkey bindings: maps IOTA wallet address to a WebAuthn credential
CREATE TABLE public.wallet_passkey_bindings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  iota_wallet_address TEXT NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  sign_count INTEGER NOT NULL DEFAULT 0,
  rp_id TEXT NOT NULL DEFAULT 'vanity.box',
  wallet_proof_signature TEXT NOT NULL,
  wallet_proof_message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_passkey_bindings_wallet ON public.wallet_passkey_bindings (iota_wallet_address);
CREATE INDEX idx_passkey_bindings_credential ON public.wallet_passkey_bindings (credential_id);

ALTER TABLE public.wallet_passkey_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active bindings" ON public.wallet_passkey_bindings FOR SELECT USING (status = 'active');
CREATE POLICY "Service role can insert bindings" ON public.wallet_passkey_bindings FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update bindings" ON public.wallet_passkey_bindings FOR UPDATE USING (true);

-- Ephemeral challenges for wallet bind + webauthn registration/login
CREATE TABLE public.passkey_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge TEXT NOT NULL UNIQUE,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('wallet_bind', 'webauthn_register', 'webauthn_login')),
  iota_wallet_address TEXT,
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_passkey_challenges_challenge ON public.passkey_challenges (challenge);
CREATE INDEX idx_passkey_challenges_expires ON public.passkey_challenges (expires_at);

ALTER TABLE public.passkey_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage challenges" ON public.passkey_challenges FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_passkey_bindings_updated_at BEFORE UPDATE ON public.wallet_passkey_bindings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();