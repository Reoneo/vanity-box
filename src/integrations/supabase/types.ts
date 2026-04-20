export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      domain_configs: {
        Row: {
          api_key_secret_name: string
          avatar_url: string | null
          created_at: string | null
          description: string | null
          display_name: string | null
          domain_name: string
          id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          api_key_secret_name: string
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          domain_name: string
          id?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          api_key_secret_name?: string
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string | null
          domain_name?: string
          id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      farcaster_signers: {
        Row: {
          created_at: string | null
          fid: number
          id: string
          public_key: string | null
          signer_uuid: string
          status: string | null
          updated_at: string | null
          world_id_hash: string
        }
        Insert: {
          created_at?: string | null
          fid: number
          id?: string
          public_key?: string | null
          signer_uuid: string
          status?: string | null
          updated_at?: string | null
          world_id_hash: string
        }
        Update: {
          created_at?: string | null
          fid?: number
          id?: string
          public_key?: string | null
          signer_uuid?: string
          status?: string | null
          updated_at?: string | null
          world_id_hash?: string
        }
        Relationships: []
      }
      iota_cross_chain_profiles: {
        Row: {
          apt_address: string | null
          avatar_url: string | null
          display_name: string | null
          evm_address: string | null
          iota_name: string
          ipfs_cid: string | null
          owner_address: string | null
          sui_address: string | null
          ton_address: string | null
          updated_at: string
        }
        Insert: {
          apt_address?: string | null
          avatar_url?: string | null
          display_name?: string | null
          evm_address?: string | null
          iota_name: string
          ipfs_cid?: string | null
          owner_address?: string | null
          sui_address?: string | null
          ton_address?: string | null
          updated_at?: string
        }
        Update: {
          apt_address?: string | null
          avatar_url?: string | null
          display_name?: string | null
          evm_address?: string | null
          iota_name?: string
          ipfs_cid?: string | null
          owner_address?: string | null
          sui_address?: string | null
          ton_address?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      iota_wallet_links: {
        Row: {
          chain: string
          evm_address: string
          holder_did: string
          iota_name: string
          issued_at: string
          updated_at: string
          vc_jwt: string | null
        }
        Insert: {
          chain?: string
          evm_address: string
          holder_did: string
          iota_name: string
          issued_at?: string
          updated_at?: string
          vc_jwt?: string | null
        }
        Update: {
          chain?: string
          evm_address?: string
          holder_did?: string
          iota_name?: string
          issued_at?: string
          updated_at?: string
          vc_jwt?: string | null
        }
        Relationships: []
      }
      messaging_conversations: {
        Row: {
          conversation_id: string
          conversation_type: string
          created_at: string
          created_by: string
          title: string | null
          updated_at: string
        }
        Insert: {
          conversation_id?: string
          conversation_type?: string
          created_at?: string
          created_by: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          conversation_type?: string
          created_at?: string
          created_by?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "messaging_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_devices: {
        Row: {
          created_at: string
          device_id: string
          device_label: string
          device_pubkey: string
          identity_id: string
          last_seen_at: string
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string
          device_label?: string
          device_pubkey: string
          identity_id: string
          last_seen_at?: string
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          device_label?: string
          device_pubkey?: string
          identity_id?: string
          last_seen_at?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messaging_devices_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "messaging_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_envelopes: {
        Row: {
          header: Json | null
          message_id: string
          recipient_device_id: string
          wrapped_msg_key: string
        }
        Insert: {
          header?: Json | null
          message_id: string
          recipient_device_id: string
          wrapped_msg_key: string
        }
        Update: {
          header?: Json | null
          message_id?: string
          recipient_device_id?: string
          wrapped_msg_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_envelopes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messaging_messages"
            referencedColumns: ["message_id"]
          },
          {
            foreignKeyName: "messaging_envelopes_recipient_device_id_fkey"
            columns: ["recipient_device_id"]
            isOneToOne: false
            referencedRelation: "messaging_devices"
            referencedColumns: ["device_id"]
          },
        ]
      }
      messaging_identities: {
        Row: {
          avatar_url: string | null
          created_at: string
          did: string | null
          display_name: string | null
          domain_name: string
          domain_type: string
          id: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          did?: string | null
          display_name?: string | null
          domain_name: string
          domain_type?: string
          id?: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          did?: string | null
          display_name?: string | null
          domain_name?: string
          domain_type?: string
          id?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      messaging_members: {
        Row: {
          conversation_id: string
          identity_id: string
          joined_at: string
          left_at: string | null
          role: string
        }
        Insert: {
          conversation_id: string
          identity_id: string
          joined_at?: string
          left_at?: string | null
          role?: string
        }
        Update: {
          conversation_id?: string
          identity_id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "messaging_conversations"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "messaging_members_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "messaging_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_messages: {
        Row: {
          ad: string | null
          attachments: Json | null
          cipher_suite: string
          ciphertext: string
          conversation_id: string
          message_id: string
          nonce: string
          notarization_batch_id: string | null
          sender_device_id: string
          sender_identity_id: string
          sent_at: string
        }
        Insert: {
          ad?: string | null
          attachments?: Json | null
          cipher_suite?: string
          ciphertext: string
          conversation_id: string
          message_id?: string
          nonce: string
          notarization_batch_id?: string | null
          sender_device_id: string
          sender_identity_id: string
          sent_at?: string
        }
        Update: {
          ad?: string | null
          attachments?: Json | null
          cipher_suite?: string
          ciphertext?: string
          conversation_id?: string
          message_id?: string
          nonce?: string
          notarization_batch_id?: string | null
          sender_device_id?: string
          sender_identity_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "messaging_conversations"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "messaging_messages_sender_device_id_fkey"
            columns: ["sender_device_id"]
            isOneToOne: false
            referencedRelation: "messaging_devices"
            referencedColumns: ["device_id"]
          },
          {
            foreignKeyName: "messaging_messages_sender_identity_id_fkey"
            columns: ["sender_identity_id"]
            isOneToOne: false
            referencedRelation: "messaging_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_notarization_batches: {
        Row: {
          batch_id: string
          created_at: string
          error: string | null
          iota_notarization_id: string | null
          iota_tx_digest: string | null
          leaf_count: number
          root_hash: string
          status: string
        }
        Insert: {
          batch_id?: string
          created_at?: string
          error?: string | null
          iota_notarization_id?: string | null
          iota_tx_digest?: string | null
          leaf_count: number
          root_hash: string
          status?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          error?: string | null
          iota_notarization_id?: string | null
          iota_tx_digest?: string | null
          leaf_count?: number
          root_hash?: string
          status?: string
        }
        Relationships: []
      }
      messaging_notarization_proofs: {
        Row: {
          batch_id: string
          leaf_hash: string
          leaf_index: number
          message_id: string
          proof: Json
        }
        Insert: {
          batch_id: string
          leaf_hash: string
          leaf_index: number
          message_id: string
          proof: Json
        }
        Update: {
          batch_id?: string
          leaf_hash?: string
          leaf_index?: number
          message_id?: string
          proof?: Json
        }
        Relationships: [
          {
            foreignKeyName: "messaging_notarization_proofs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "messaging_notarization_batches"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "messaging_notarization_proofs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "messaging_messages"
            referencedColumns: ["message_id"]
          },
        ]
      }
      messaging_prekeys: {
        Row: {
          created_at: string
          device_id: string
          id: string
          prekey_id: number
          prekey_pub: string
          signature: string | null
          used_at: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          prekey_id: number
          prekey_pub: string
          signature?: string | null
          used_at?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          prekey_id?: number
          prekey_pub?: string
          signature?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messaging_prekeys_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "messaging_devices"
            referencedColumns: ["device_id"]
          },
        ]
      }
      minted_domains: {
        Row: {
          created_at: string
          domain: string
          expiry_date: string
          full_name: string
          grace_period_end: string | null
          id: string
          is_expired: boolean
          network_fee: number | null
          payment_amount: number | null
          payment_method: string | null
          registration_date: string
          registration_months: number
          subdomain: string
          tx_hash: string | null
          updated_at: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          domain: string
          expiry_date: string
          full_name: string
          grace_period_end?: string | null
          id?: string
          is_expired?: boolean
          network_fee?: number | null
          payment_amount?: number | null
          payment_method?: string | null
          registration_date?: string
          registration_months?: number
          subdomain: string
          tx_hash?: string | null
          updated_at?: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          domain?: string
          expiry_date?: string
          full_name?: string
          grace_period_end?: string | null
          id?: string
          is_expired?: boolean
          network_fee?: number | null
          payment_amount?: number | null
          payment_method?: string | null
          registration_date?: string
          registration_months?: number
          subdomain?: string
          tx_hash?: string | null
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      payment_references: {
        Row: {
          created_at: string
          domain: string
          id: string
          payment_amount: number
          payment_method: string
          reference: string
          status: string
          subdomain: string
          transaction_id: string | null
          tx_hash: string | null
          verified_at: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          payment_amount: number
          payment_method: string
          reference: string
          status?: string
          subdomain: string
          transaction_id?: string | null
          tx_hash?: string | null
          verified_at?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          payment_amount?: number
          payment_method?: string
          reference?: string
          status?: string
          subdomain?: string
          transaction_id?: string | null
          tx_hash?: string | null
          verified_at?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      poap_tokens: {
        Row: {
          chain: string | null
          created_at: string
          event_description: string | null
          event_end_date: string | null
          event_id: number
          event_image_url: string | null
          event_name: string | null
          event_start_date: string | null
          event_year: number | null
          id: string
          owner: string | null
          token_id: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          chain?: string | null
          created_at?: string
          event_description?: string | null
          event_end_date?: string | null
          event_id: number
          event_image_url?: string | null
          event_name?: string | null
          event_start_date?: string | null
          event_year?: number | null
          id?: string
          owner?: string | null
          token_id: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          chain?: string | null
          created_at?: string
          event_description?: string | null
          event_end_date?: string | null
          event_id?: number
          event_image_url?: string | null
          event_name?: string | null
          event_start_date?: string | null
          event_year?: number | null
          id?: string
          owner?: string | null
          token_id?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      polymarket_profile_overrides: {
        Row: {
          created_at: string
          polymarket_profile_address: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          polymarket_profile_address: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          polymarket_profile_address?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      profile_notarizations: {
        Row: {
          created_at: string
          id: string
          iota_name: string
          ipfs_cid: string
          notarized_at: string
          sha256_hash: string
          updated_at: string
          version: number
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          iota_name: string
          ipfs_cid: string
          notarized_at?: string
          sha256_hash: string
          updated_at?: string
          version?: number
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          iota_name?: string
          ipfs_cid?: string
          notarized_at?: string
          sha256_hash?: string
          updated_at?: string
          version?: number
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      passkey_audit: {
        Args: {
          p_bind_session_id?: string
          p_credential_id?: string
          p_event_type: string
          p_iota_wallet_address?: string
          p_metadata?: Json
          p_success: boolean
          p_user_id?: string
        }
        Returns: undefined
      }
      passkey_consume_challenge: {
        Args: {
          p_bind_session_id: string
          p_challenge_hash: string
          p_challenge_type: string
          p_expected_origin: string
          p_expected_rp_id: string
        }
        Returns: Json
      }
      passkey_get_bindings: {
        Args: { p_iota_wallet_address: string }
        Returns: Json
      }
      passkey_insert_binding: {
        Args: {
          p_aaguid?: string
          p_binding_level: string
          p_credential_id: string
          p_iota_wallet_address: string
          p_origin: string
          p_public_key: string
          p_rp_id: string
          p_sign_count: number
          p_transports?: string[]
          p_user_id: string
          p_wallet_proof_hashes?: Json
        }
        Returns: string
      }
      passkey_insert_challenge: {
        Args: {
          p_bind_session_id: string
          p_challenge_hash: string
          p_challenge_type: string
          p_expected_origin: string
          p_expected_rp_id: string
          p_expires_at: string
          p_iota_wallet_address: string
          p_user_id?: string
        }
        Returns: undefined
      }
      passkey_revoke_binding: {
        Args: { p_actor?: Json; p_binding_id: string; p_reason: string }
        Returns: undefined
      }
      passkey_update_sign_count: {
        Args: { p_credential_id: string; p_new_sign_count: number }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
