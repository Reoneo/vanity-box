
-- RPC wrappers so edge functions can interact with auth_private schema via service_role

-- Insert a challenge
CREATE OR REPLACE FUNCTION public.passkey_insert_challenge(
  p_bind_session_id uuid,
  p_challenge_hash bytea,
  p_challenge_type text,
  p_iota_wallet_address text,
  p_expected_origin text,
  p_expected_rp_id text,
  p_expires_at timestamptz,
  p_user_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth_private, public AS $$
BEGIN
  INSERT INTO auth_private.passkey_challenges (
    bind_session_id, challenge_hash, challenge_type,
    iota_wallet_address, expected_origin, expected_rp_id,
    expires_at, user_id
  ) VALUES (
    p_bind_session_id, p_challenge_hash, p_challenge_type::auth_private.challenge_type,
    p_iota_wallet_address, p_expected_origin, p_expected_rp_id,
    p_expires_at, p_user_id
  );
END; $$;

-- Consume a challenge (atomic single-use)
CREATE OR REPLACE FUNCTION public.passkey_consume_challenge(
  p_challenge_hash bytea,
  p_challenge_type text,
  p_bind_session_id uuid,
  p_expected_origin text,
  p_expected_rp_id text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth_private, public AS $$
DECLARE v_row auth_private.passkey_challenges;
BEGIN
  UPDATE auth_private.passkey_challenges
     SET used_at = now()
   WHERE challenge_hash = p_challenge_hash
     AND challenge_type = p_challenge_type::auth_private.challenge_type
     AND bind_session_id = p_bind_session_id
     AND expected_origin = p_expected_origin
     AND expected_rp_id = p_expected_rp_id
     AND used_at IS NULL
     AND expires_at > now()
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'challenge invalid/expired/used' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'bind_session_id', v_row.bind_session_id,
    'user_id', v_row.user_id,
    'iota_wallet_address', v_row.iota_wallet_address
  );
END; $$;

-- Insert a binding
CREATE OR REPLACE FUNCTION public.passkey_insert_binding(
  p_user_id uuid,
  p_iota_wallet_address text,
  p_credential_id bytea,
  p_public_key bytea,
  p_sign_count bigint,
  p_binding_level text,
  p_origin text,
  p_rp_id text,
  p_wallet_proof_hashes jsonb DEFAULT '{}'::jsonb,
  p_aaguid uuid DEFAULT NULL,
  p_transports text[] DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth_private, public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO auth_private.wallet_passkey_bindings (
    user_id, iota_wallet_address, credential_id, public_key,
    sign_count, binding_level, origin, rp_id,
    wallet_proof_hashes, aaguid, transports
  ) VALUES (
    p_user_id, p_iota_wallet_address, p_credential_id, p_public_key,
    p_sign_count, p_binding_level::auth_private.binding_level, p_origin, p_rp_id,
    p_wallet_proof_hashes, p_aaguid, p_transports
  ) RETURNING id INTO v_id;

  -- Audit
  INSERT INTO auth_private.auth_audit_events (event_type, success, user_id, iota_wallet_address, credential_id, metadata)
  VALUES ('passkey_registered', true, p_user_id, p_iota_wallet_address, p_credential_id,
          jsonb_build_object('binding_level', p_binding_level));

  RETURN v_id;
END; $$;

-- Write audit event
CREATE OR REPLACE FUNCTION public.passkey_audit(
  p_event_type text,
  p_success boolean,
  p_user_id uuid DEFAULT NULL,
  p_iota_wallet_address text DEFAULT NULL,
  p_credential_id bytea DEFAULT NULL,
  p_bind_session_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth_private, public AS $$
BEGIN
  INSERT INTO auth_private.auth_audit_events (
    event_type, success, user_id, iota_wallet_address,
    credential_id, bind_session_id, metadata
  ) VALUES (
    p_event_type, p_success, p_user_id, p_iota_wallet_address,
    p_credential_id, p_bind_session_id, p_metadata
  );
END; $$;

-- Get active bindings for a wallet address
CREATE OR REPLACE FUNCTION public.passkey_get_bindings(
  p_iota_wallet_address text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth_private, public AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'user_id', b.user_id,
    'iota_wallet_address', b.iota_wallet_address,
    'credential_id', encode(b.credential_id, 'base64'),
    'public_key', encode(b.public_key, 'base64'),
    'sign_count', b.sign_count,
    'binding_level', b.binding_level,
    'origin', b.origin,
    'rp_id', b.rp_id,
    'status', b.status,
    'created_at', b.created_at,
    'last_used_at', b.last_used_at
  )), '[]'::jsonb)
  INTO v_result
  FROM auth_private.wallet_passkey_bindings b
  WHERE b.iota_wallet_address = p_iota_wallet_address
    AND b.status = 'active';

  RETURN v_result;
END; $$;

-- Update sign count + last_used_at for login
CREATE OR REPLACE FUNCTION public.passkey_update_sign_count(
  p_credential_id bytea,
  p_new_sign_count bigint
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth_private, public AS $$
DECLARE v_row auth_private.wallet_passkey_bindings;
BEGIN
  UPDATE auth_private.wallet_passkey_bindings
     SET sign_count = p_new_sign_count,
         last_used_at = now()
   WHERE credential_id = p_credential_id
     AND status = 'active'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'binding not found' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'user_id', v_row.user_id,
    'iota_wallet_address', v_row.iota_wallet_address,
    'sign_count', v_row.sign_count,
    'public_key', encode(v_row.public_key, 'base64'),
    'binding_level', v_row.binding_level
  );
END; $$;

-- Revoke a binding
CREATE OR REPLACE FUNCTION public.passkey_revoke_binding(
  p_binding_id uuid,
  p_reason text,
  p_actor jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth_private, public AS $$
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
END; $$;

-- Restrict these functions to service_role only
REVOKE EXECUTE ON FUNCTION public.passkey_insert_challenge FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.passkey_insert_challenge TO service_role;

REVOKE EXECUTE ON FUNCTION public.passkey_consume_challenge FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.passkey_consume_challenge TO service_role;

REVOKE EXECUTE ON FUNCTION public.passkey_insert_binding FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.passkey_insert_binding TO service_role;

REVOKE EXECUTE ON FUNCTION public.passkey_audit FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.passkey_audit TO service_role;

REVOKE EXECUTE ON FUNCTION public.passkey_get_bindings FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.passkey_get_bindings TO service_role;

REVOKE EXECUTE ON FUNCTION public.passkey_update_sign_count FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.passkey_update_sign_count TO service_role;

REVOKE EXECUTE ON FUNCTION public.passkey_revoke_binding FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.passkey_revoke_binding TO service_role;
