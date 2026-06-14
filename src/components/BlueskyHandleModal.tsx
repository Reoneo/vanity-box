import { useEffect, useMemo, useState } from "react";
import { X, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAccount } from "wagmi";
import { useIotaWallet } from "@/contexts/IotaWalletContext";
import { supabase } from "@/integrations/supabase/client";
import blueskyIcon from "@/assets/bluesky-icon.svg";

interface BlueskyHandleModalProps {
  vanityName: string; // e.g. "mrs.vanity"
  isOpen: boolean;
  onClose: () => void;
}

export const BlueskyHandleModal = ({ vanityName, isOpen, onClose }: BlueskyHandleModalProps) => {
  const subdomain = vanityName.replace(/\.vanity$/i, "").toLowerCase();
  const handle = `${subdomain}.vanity.box`;
  const wellKnownUrl = `https://${handle}/.well-known/atproto-did`;

  const { address: ethAddress } = useAccount();
  const { iotaAddress, isConnected: iotaConnected } = useIotaWallet() as any;
  const { signForOperation } = useWalletSign();

  const [did, setDid] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load current DID
  useEffect(() => {
    if (!isOpen) return;
    setDid("");
    setLoading(true);
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("get-bluesky-did", {
          body: { vanityName },
        });
        if (data?.did) setDid(String(data.did));
      } catch (e) {
        console.warn("[BlueskyHandleModal] load failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, vanityName]);

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  const didValid = useMemo(
    () => /^did:(plc|web|key):[A-Za-z0-9._:%-]{4,256}$/.test(did.trim()),
    [did]
  );

  const handleSave = async () => {
    if (!didValid) {
      toast({ title: "Invalid DID", description: "Paste your did:plc:... value from Bluesky.", variant: "destructive" });
      return;
    }
    if (!ethAddress) {
      toast({ title: "Connect your Ethereum wallet", description: "Connect the wallet that owns this .vanity domain.", variant: "destructive" });
      return;
    }
    if (!iotaConnected || !iotaAddress) {
      toast({ title: "Connect your IOTA wallet", description: "Both wallets must be connected to save.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const timestamp = Date.now();
      const message = [
        "Bind Bluesky handle",
        `vanity: ${vanityName}`,
        `did: ${did.trim()}`,
        `iota: ${String(iotaAddress).toLowerCase()}`,
        `eth: ${ethAddress.toLowerCase()}`,
        `ts: ${timestamp}`,
      ].join("\n");

      // Use the connected EVM provider's personal_sign so the message bytes
      // match exactly what the server reconstructs.
      let signature: string;
      const eth = (window as any).ethereum;
      if (eth?.request) {
        signature = await eth.request({
          method: "personal_sign",
          params: [message, ethAddress],
        });
      } else {
        throw new Error("No EVM provider available");
      }

      const { data, error } = await supabase.functions.invoke("save-bluesky-did", {
        body: {
          vanityName,
          did: did.trim(),
          ethAddress: ethAddress.toLowerCase(),
          iotaAddress: String(iotaAddress).toLowerCase(),
          signature,
          timestamp,
        },
      });

      if (error || !data?.ok) {
        const code = data?.error || error?.message || "save_failed";
        const friendly: Record<string, string> = {
          not_owner: "This wallet does not own that .vanity domain.",
          wallet_not_linked: "Link your IOTA and Ethereum wallets first.",
          bad_signature: "Signature verification failed.",
          expired_signature: "Signature expired, please try again.",
          invalid_did: "DID format is invalid.",
        };
        throw new Error(friendly[code] || code);
      }

      toast({
        title: "Saved",
        description: `Use ${handle} in Bluesky → Change Handle → I have my own domain → Verify Text File.`,
      });
    } catch (e: any) {
      toast({ title: "Could not save", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copy = (s: string) => {
    navigator.clipboard.writeText(s).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md bg-background rounded-2xl border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1185fe]/10 flex items-center justify-center">
              <img src={blueskyIcon} alt="Bluesky" className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Use as Bluesky handle</h2>
              <p className="text-xs text-muted-foreground">{vanityName}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Your Bluesky handle will be</Label>
            <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 border border-border">
              <span className="text-sm font-mono text-foreground flex-1 truncate">{handle}</span>
              <button onClick={() => copy(handle)} className="text-muted-foreground hover:text-foreground">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="did-input" className="text-xs text-muted-foreground">
              Your Bluesky DID (from Change Handle → I have my own domain → No DNS Panel)
            </Label>
            <Input
              id="did-input"
              placeholder="did:plc:..."
              value={did}
              onChange={(e) => setDid(e.target.value)}
              disabled={loading || saving}
              className="font-mono text-sm"
            />
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading current value…
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 rounded-lg p-3 border border-border">
            <p>After saving:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Open Bluesky → Settings → Change Handle</li>
              <li>Enter <span className="font-mono">{handle}</span></li>
              <li>Tap <b>No DNS Panel</b> → <b>Verify Text File</b></li>
            </ol>
            <p className="pt-1 break-all">Served at: <span className="font-mono">{wellKnownUrl}</span></p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || loading || !didValid}
            className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold rounded-xl"
            size="lg"
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing & saving…</> : "Sign & Save"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BlueskyHandleModal;
