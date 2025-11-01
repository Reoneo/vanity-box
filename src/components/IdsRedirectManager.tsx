import React, { useState } from "react";
import { fullEnsName, vanityProfileUrl } from "@/lib/ensRedirect/profile";
import { setCustomRedirect, setDefaultVanityRedirect, SetRedirectResponse } from "@/lib/ensRedirect/service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Props = {
  parentDomain: string;
  subname: string;
  currentRedirectUrl?: string | null;
};

export default function IdsRedirectManager({ 
  parentDomain, 
  subname, 
  currentRedirectUrl 
}: Props) {
  const [customUrl, setCustomUrl] = useState<string>(currentRedirectUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [lastResult, setLastResult] = useState<SetRedirectResponse | null>(null);

  // Extract just the subdomain label (e.g., "test321" from "test321.30315.eth")
  const subnameLabel = subname.toLowerCase().replace(`.${parentDomain.toLowerCase()}`, '').trim();
  
  const name = fullEnsName(subnameLabel, parentDomain);
  const defaultUrl = vanityProfileUrl(subnameLabel, parentDomain);

  async function handleReset() {
    setIsSaving(true);
    setLastResult(null);
    try {
      const result = await setDefaultVanityRedirect(parentDomain, subnameLabel);
      
      if (result.success && result.url) {
        setCustomUrl(result.url);
        setLastResult(result);
        toast({
          title: "Reset to default",
          description: `Now redirecting to ${result.url}`,
        });
      } else {
        throw new Error(result.error || "Failed to reset redirect");
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to reset redirect",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setLastResult(null);
    try {
      const result = await setCustomRedirect(parentDomain, subnameLabel, customUrl.trim());
      
      if (result.success && result.url) {
        setLastResult(result);
        toast({
          title: "Redirect updated",
          description: `Now redirecting to ${result.url}`,
        });
      } else {
        throw new Error(result.error || "Failed to update redirect");
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to update redirect",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Redirect Settings for {name}</CardTitle>
        <CardDescription>
          Control where <code className="text-xs bg-muted px-1 py-0.5 rounded">{name}.eth.limo</code> and ENS-aware apps will send visitors.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Success Feedback */}
        {lastResult && lastResult.success && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-green-900 dark:text-green-100">
              ✅ Redirect Updated Successfully
            </p>
            <div className="text-xs space-y-1 text-green-800 dark:text-green-200">
              <p>
                <strong>IPFS CID:</strong> <span className="font-mono">{lastResult.cid}</span>
                {lastResult.provider && <span className="ml-2 text-green-600 dark:text-green-400">via {lastResult.provider}</span>}
              </p>
              {lastResult.ethLimoUrl && (
                <p>
                  <strong>ENS Gateway:</strong>{" "}
                  <a 
                    href={lastResult.ethLimoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-mono text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    {lastResult.ethLimoUrl}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              )}
              {lastResult.verificationUrls && lastResult.verificationUrls.length > 0 && (
                <div>
                  <strong>Verify IPFS:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    {lastResult.verificationUrls.map((url, idx) => (
                      <li key={idx}>
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                        >
                          {url}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Default Vanity Profile */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div>
            <div className="font-medium text-sm mb-1">Default Vanity Profile</div>
            <div className="text-sm text-muted-foreground break-all font-mono">
              {defaultUrl}
            </div>
          </div>
          <Button 
            onClick={handleReset} 
            disabled={isSaving}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
        </div>

        {/* Custom URL */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="customUrl">Custom Destination (HTTPS)</Label>
            <Input 
              id="customUrl" 
              placeholder="https://your-site.example/page"
              value={customUrl} 
              onChange={(e) => setCustomUrl(e.target.value)}
              disabled={isSaving}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !customUrl.trim()}
            >
              Save Custom Link
            </Button>
            
            <a 
              className="text-sm underline flex items-center gap-1 hover:text-primary" 
              href={`https://${name}.eth.limo`} 
              target="_blank" 
              rel="noreferrer"
            >
              Test {name}.eth.limo
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          Free to update anytime. Changes are instant at gateways like <code className="bg-muted px-1 py-0.5 rounded">*.eth.limo</code>.
        </div>
      </CardContent>
    </Card>
  );
}
