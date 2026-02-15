/**
 * Core messaging hook — manages identity registration, conversations,
 * message send/receive, and E2EE key lifecycle.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { callEdge } from "@/lib/supaInvoke";
import { supabase } from "@/integrations/supabase/client";
import {
  generateKeypair,
  keypairToB64,
  keypairFromB64,
  encryptForRecipients,
  decryptFromEnvelope,
  sha256Hex,
  type EncryptedPayload,
  type E2EEKeypair,
} from "@/lib/crypto/e2ee";
import { saveDeviceKeys, loadDeviceKeys } from "@/lib/crypto/keyVault";

export interface MessagingIdentity {
  id: string;
  wallet_address: string;
  domain_name: string;
  domain_type: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Conversation {
  conversation_id: string;
  conversation_type: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  members: Array<{
    identity_id: string;
    domain_name: string;
    display_name: string | null;
    avatar_url: string | null;
  }>;
  last_message?: {
    sent_at: string;
    preview: string; // decrypted preview (truncated)
  };
}

export interface DecryptedMessage {
  message_id: string;
  sender_domain: string;
  sender_avatar: string | null;
  sent_at: string;
  text: string;
  isOwn: boolean;
  notarized: boolean;
}

export function useMessaging(walletAddress: string | null, domain: string | null) {
  const [identity, setIdentity] = useState<MessagingIdentity | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const keypairRef = useRef<E2EEKeypair | null>(null);
  const deviceIdRef = useRef<string | null>(null);

  // Initialise or restore device keys
  useEffect(() => {
    if (!domain) return;
    const stored = loadDeviceKeys(domain);
    if (stored) {
      keypairRef.current = keypairFromB64(stored.publicKeyB64, stored.privateKeyB64);
      deviceIdRef.current = stored.deviceId;
      setIsRegistered(true);
    }
  }, [domain]);

  // Register identity + device with edge function
  const register = useCallback(async () => {
    if (!walletAddress || !domain) return;
    setIsLoading(true);
    try {
      // Generate new device keypair if none exists
      if (!keypairRef.current) {
        keypairRef.current = await generateKeypair();
      }
      const { publicKeyB64, privateKeyB64 } = keypairToB64(keypairRef.current);

      const result = await callEdge<{
        identity: MessagingIdentity;
        device_id: string;
      }>("register-messaging-identity", {
        wallet_address: walletAddress,
        domain_name: domain,
        domain_type: domain.endsWith(".iota") ? "iota" : domain.endsWith(".eth") ? "eth" : domain.endsWith(".box") ? "box" : "other",
        device_pubkey: publicKeyB64,
      });

      deviceIdRef.current = result.device_id;
      setIdentity(result.identity);
      setIsRegistered(true);

      // Save keys locally
      saveDeviceKeys({
        publicKeyB64,
        privateKeyB64,
        deviceId: result.device_id,
        domain,
      });
    } catch (err) {
      console.error("Failed to register messaging identity:", err);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, domain]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!walletAddress || !domain) return;
    try {
      const result = await callEdge<{ conversations: Conversation[] }>(
        "get-messaging-conversations",
        { wallet_address: walletAddress, domain_name: domain }
      );
      setConversations(result.conversations || []);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, [walletAddress, domain]);

  // Start a new conversation with a domain
  const startConversation = useCallback(
    async (recipientDomain: string): Promise<string | null> => {
      if (!walletAddress || !domain) return null;
      try {
        const result = await callEdge<{ conversation_id: string }>(
          "start-messaging-conversation",
          {
            sender_wallet: walletAddress,
            sender_domain: domain,
            recipient_domain: recipientDomain,
          }
        );
        await fetchConversations();
        return result.conversation_id;
      } catch (err) {
        console.error("Failed to start conversation:", err);
        return null;
      }
    },
    [walletAddress, domain, fetchConversations]
  );

  // Send an encrypted message
  const sendMessage = useCallback(
    async (conversationId: string, text: string) => {
      if (!keypairRef.current || !deviceIdRef.current || !walletAddress || !domain) return;
      try {
        // Get recipient device public keys
        const recipientData = await callEdge<{
          devices: Array<{ device_id: string; device_pubkey: string }>;
        }>("get-conversation-devices", {
          conversation_id: conversationId,
          wallet_address: walletAddress,
        });

        const plaintext = new TextEncoder().encode(JSON.stringify({ text }));

        // Ensure sender device is always in the recipient list
        const devicesFromApi = Array.isArray(recipientData?.devices) ? recipientData.devices : [];
        const { publicKeyB64: selfPubKeyB64 } = keypairToB64(keypairRef.current);
        const hasSelf = devicesFromApi.some((d) => d.device_id === deviceIdRef.current);
        const devicesWithSelf = hasSelf
          ? devicesFromApi
          : [...devicesFromApi, { device_id: deviceIdRef.current!, device_pubkey: selfPubKeyB64 }];

        // De-dupe by device_id
        const seen = new Map<string, string>();
        for (const d of devicesWithSelf) {
          if (d?.device_id && d?.device_pubkey) seen.set(d.device_id, d.device_pubkey);
        }

        const allDevices = Array.from(seen.entries()).map(([deviceId, pubkey]) => ({
          deviceId,
          x25519PubKey: new Uint8Array(atob(pubkey).split("").map((c) => c.charCodeAt(0))),
        }));

        if (allDevices.length === 0) throw new Error("No recipient devices available");

        const { payload, envelopes } = await encryptForRecipients(
          plaintext,
          allDevices
        );

        await callEdge("send-encrypted-message", {
          conversation_id: conversationId,
          sender_wallet: walletAddress,
          sender_domain: domain,
          sender_device_id: deviceIdRef.current,
          payload,
          envelopes,
        });

        // Fetch updated messages
        await fetchMessages(conversationId);
      } catch (err) {
        console.error("Failed to send message:", err);
        throw err;
      }
    },
    [walletAddress, domain]
  );

  // Fetch and decrypt messages for a conversation
  const fetchMessages = useCallback(
    async (conversationId: string) => {
      if (!keypairRef.current || !deviceIdRef.current || !domain) return;
      try {
        const result = await callEdge<{
          messages: Array<{
            message_id: string;
            sender_domain: string;
            sender_avatar: string | null;
            sent_at: string;
            ciphertext: string;
            nonce: string;
            ad: string | null;
            cipher_suite: string;
            wrapped_msg_key: string | null;
            notarized: boolean;
          }>;
        }>("get-encrypted-messages", {
          conversation_id: conversationId,
          device_id: deviceIdRef.current,
          wallet_address: walletAddress,
        });

        const decrypted: DecryptedMessage[] = [];
        for (const msg of result.messages) {
          if (!msg.wrapped_msg_key) {
            // No envelope for this device — can't decrypt
            decrypted.push({
              message_id: msg.message_id,
              sender_domain: msg.sender_domain,
              sender_avatar: msg.sender_avatar,
              sent_at: msg.sent_at,
              text: "[Unable to decrypt on this device]",
              isOwn: msg.sender_domain === domain,
              notarized: msg.notarized,
            });
            continue;
          }

          try {
            const payload: EncryptedPayload = {
              cipherSuite: "xchacha20poly1305",
              nonceB64: msg.nonce,
              adB64: msg.ad || btoa("{}"),
              ciphertextB64: msg.ciphertext,
            };
            const plainBytes = await decryptFromEnvelope(
              payload,
              msg.wrapped_msg_key,
              keypairRef.current!
            );
            const parsed = JSON.parse(new TextDecoder().decode(plainBytes));
            decrypted.push({
              message_id: msg.message_id,
              sender_domain: msg.sender_domain,
              sender_avatar: msg.sender_avatar,
              sent_at: msg.sent_at,
              text: parsed.text || "",
              isOwn: msg.sender_domain === domain,
              notarized: msg.notarized,
            });
          } catch {
            decrypted.push({
              message_id: msg.message_id,
              sender_domain: msg.sender_domain,
              sender_avatar: msg.sender_avatar,
              sent_at: msg.sent_at,
              text: "[Decryption failed]",
              isOwn: msg.sender_domain === domain,
              notarized: msg.notarized,
            });
          }
        }

        setMessages(decrypted);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    },
    [walletAddress, domain]
  );

  // Set active conversation and load messages
  const openConversation = useCallback(
    async (conversationId: string) => {
      setActiveConversation(conversationId);
      await fetchMessages(conversationId);
    },
    [fetchMessages]
  );

  // Subscribe to realtime message updates
  useEffect(() => {
    if (!activeConversation || !deviceIdRef.current) return;

    const channel = supabase
      .channel(`messages:${activeConversation}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messaging_messages",
          filter: `conversation_id=eq.${activeConversation}`,
        },
        () => {
          fetchMessages(activeConversation);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation, fetchMessages]);

  return {
    identity,
    isRegistered,
    isLoading,
    conversations,
    activeConversation,
    messages,
    register,
    fetchConversations,
    startConversation,
    sendMessage,
    openConversation,
    setActiveConversation,
  };
}
