/**
 * Hook for signing messages with the connected EVM wallet (wagmi).
 * Used to prove wallet ownership before sensitive operations.
 */
import { useCallback } from "react";
import { useSignMessage, useAccount } from "wagmi";

export function useWalletSign() {
  const { signMessageAsync } = useSignMessage();
  const { address } = useAccount();

  const signForOperation = useCallback(
    async (
      operation: string,
      params: Record<string, string>
    ): Promise<{ signature: string; timestamp: number; message: string }> => {
      const timestamp = Date.now();
      const message = [
        operation,
        ...Object.entries(params).map(([k, v]) => `${k}: ${v}`),
        `Timestamp: ${timestamp}`,
      ].join("\n");

      const signature = await signMessageAsync({ message, account: address! });
      return { signature, timestamp, message };
    },
    [signMessageAsync, address]
  );

  return { signForOperation };
}
