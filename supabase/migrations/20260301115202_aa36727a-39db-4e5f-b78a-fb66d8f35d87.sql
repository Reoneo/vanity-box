
-- Enable cryptographic primitives
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Private schema for auth material
CREATE SCHEMA IF NOT EXISTS auth_private;

-- Lock down schema visibility
REVOKE ALL ON SCHEMA auth_private FROM PUBLIC;
REVOKE ALL ON SCHEMA auth_private FROM anon;
REVOKE ALL ON SCHEMA auth_private FROM authenticated;
GRANT USAGE ON SCHEMA auth_private TO service_role;

-- Enumerations
DO $$ BEGIN
  CREATE TYPE auth_private.binding_status AS ENUM ('active', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE auth_private.challenge_type AS ENUM ('wallet_bind', 'webauthn_register', 'webauthn_login');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE auth_private.binding_level AS ENUM ('passkey_wallet', 'existing_wallet_link');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Core bindings table
CREATE TABLE IF NOT EXISTS auth_private.wallet_passkey_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  iota_wallet_address text NOT NULL,
  credential_id bytea NOT NULL,
  public_key bytea NOT NULL,
  sign_count bigint NOT NULL DEFAULT 0,
  aaguid uuid,
  transports text[],
  binding_level auth_private.binding_level NOT NULL,
  origin text NOT NULL,
  rp_id text NOT NULL,
  wallet_proof_hashes jsonb NOT NULL DEFAULT '{}'::jsonb,
  status auth_private.binding_status NOT NULL DEFAULT 'active',
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  CONSTRAINT credential_id_len CHECK (octet_length(credential_id) BETWEEN 16 AND 1024),
  CONSTRAINT public_key_len CHECK (octet_length(public_key) = 33),
  CONSTRAINT rp_id_nonempty CHECK (length(rp_id) > 0),
  CONSTRAINT origin_nonempty CHECK (length(origin) > 0),
  CONSTRAINT revoked_at_when_revoked CHECK (
    (status = 'active' AND revoked_at IS NULL) OR (status = 'revoked' AND revoked_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_wallet_passkey_bindings_credential_id
  ON auth_private.wallet_passkey_bindings (credential_id);
CREATE INDEX IF NOT EXISTS ix_wallet_passkey_bindings_user
  ON auth_private.wallet_passkey_bindings (user_id);
CREATE INDEX IF NOT EXISTS ix_wallet_passkey_bindings_wallet
  ON auth_private.wallet_passkey_bindings (iota_wallet_address);
CREATE INDEX IF NOT EXISTS ix_wallet_passkey_bindings_status
  ON auth_private.wallet_passkey_bindings (status);

-- Challenges table
CREATE TABLE IF NOT EXISTS auth_private.passkey_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bind_session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  challenge_hash bytea NOT NULL,
  challenge_type auth_private.challenge_type NOT NULL,
  user_id uuid,
  iota_wallet_address text,
  expected_origin text NOT NULL,
  expected_rp_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT challenge_hash_len CHECK (octet_length(challenge_hash) = 32)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_passkey_challenges_hash_type
  ON auth_private.passkey_challenges (challenge_hash, challenge_type);
CREATE INDEX IF NOT EXISTS ix_passkey_challenges_expires
  ON auth_private.passkey_challenges (expires_at);

-- Append-only audit log
CREATE TABLE IF NOT EXISTS auth_private.auth_audit_events (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  success boolean NOT NULL,
  user_id uuid,
  iota_wallet_address text,
  credential_id bytea,
  bind_session_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Enforce append-only
CREATE OR REPLACE FUNCTION auth_private.prevent_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit table is append-only'; END; $$;

DROP TRIGGER IF EXISTS trg_audit_no_update ON auth_private.auth_audit_events;
DROP TRIGGER IF EXISTS trg_audit_no_delete ON auth_private.auth_audit_events;

CREATE TRIGGER trg_audit_no_update
BEFORE UPDATE ON auth_private.auth_audit_events
FOR EACH ROW EXECUTE FUNCTION auth_private.prevent_audit_mutation();

CREATE TRIGGER trg_audit_no_delete
BEFORE DELETE ON auth_private.auth_audit_events
FOR EACH ROW EXECUTE FUNCTION auth_private.prevent_audit_mutation();

-- Updated-at trigger
CREATE OR REPLACE FUNCTION auth_private.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_wallet_passkey_bindings_updated_at ON auth_private.wallet_passkey_bindings;
CREATE TRIGGER trg_wallet_passkey_bindings_updated_at
BEFORE UPDATE ON auth_private.wallet_passkey_bindings
FOR EACH ROW EXECUTE FUNCTION auth_private.set_updated_at();

-- Atomic challenge consumption
CREATE OR REPLACE FUNCTION auth_private.consume_challenge(
  p_challenge_hash bytea,
  p_challenge_type auth_private.challenge_type,
  p_bind_session_id uuid,
  p_expected_origin text,
  p_expected_rp_id text
) RETURNS auth_private.passkey_challenges
LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth_private AS $$
DECLARE v_row auth_private.passkey_challenges;
BEGIN
  UPDATE auth_private.passkey_challenges
     SET used_at = now()
   WHERE challenge_hash = p_challenge_hash
     AND challenge_type = p_challenge_type
     AND bind_session_id = p_bind_session_id
     AND expected_origin = p_expected_origin
     AND expected_rp_id = p_expected_rp_id
     AND used_at IS NULL
     AND expires_at > now()
  RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'challenge invalid/expired/used' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_row;
END; $$;

-- Revoke binding
CREATE OR REPLACE FUNCTION auth_private.revoke_binding(
  p_binding_id uuid,
  p_reason text,
  p_actor jsonb DEFAULT '{}'::jsonb
) RETURNS auth_private.wallet_passkey_bindings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth_private AS $$
DECLARE v_row auth_private.wallet_passkey_bindings;
BEGIN
  UPDATE auth_private.wallet_passkey_bindings
     SET status = 'revoked',
         revoked_at = now(),
         wallet_proof_hashes = jsonb_set(wallet_proof_hashes, '{revoked_reason}', to_jsonb(p_reason), true)
   WHERE id = p_binding_id AND status = 'active'
  RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'binding not found or already revoked' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO auth_private.auth_audit_events(event_type, success, user_id, iota_wallet_address, credential_id, metadata)
  VALUES ('binding_revoked', true, v_row.user_id, v_row.iota_wallet_address, v_row.credential_id,
          jsonb_build_object('actor', p_actor, 'reason', p_reason));
  RETURN v_row;
END; $$;

-- Enable RLS
ALTER TABLE auth_private.wallet_passkey_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_private.passkey_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_private.auth_audit_events ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY service_role_all_bindings ON auth_private.wallet_passkey_bindings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_challenges ON auth_private.passkey_challenges
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_insert_audit ON auth_private.auth_audit_events
  FOR INSERT TO service_role WITH CHECK (true);

-- Privilege hardening
REVOKE ALL ON ALL TABLES IN SCHEMA auth_private FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA auth_private FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA auth_private FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON auth_private.wallet_passkey_bindings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_private.passkey_challenges TO service_role;
GRANT SELECT, INSERT ON auth_private.auth_audit_events TO service_role;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA auth_private FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_private.consume_challenge(bytea, auth_private.challenge_type, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION auth_private.revoke_binding(uuid, text, jsonb) TO service_role;

-- Grant sequence usage for audit log
GRANT USAGE ON ALL SEQUENCES IN SCHEMA auth_private TO service_role;
