import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const RedirectRepairPanel: React.FC = () => {
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairResults, setRepairResults] = useState<{
    total: number;
    successful: number;
    failed: number;
    errors: any[];
    successes: any[];
  } | null>(null);

  const handleRepairAll = async () => {
    try {
      setIsRepairing(true);
      setRepairResults(null);
      
      toast.info('Starting redirect repair for all domains...');

      const { data, error } = await supabase.functions.invoke('repair-domain-redirects');

      if (error) {
        console.error('[RedirectRepair] Error:', error);
        toast.error('Failed to repair redirects');
        return;
      }

      if (data?.ok && data.results) {
        setRepairResults(data.results);
        
        if (data.results.failed > 0) {
          toast.warning(
            `Repair completed: ${data.results.successful} successful, ${data.results.failed} failed`
          );
        } else {
          toast.success(`All ${data.results.successful} domains repaired successfully!`);
        }
      } else {
        toast.error(data?.error || 'Failed to repair redirects');
      }
    } catch (err) {
      console.error('[RedirectRepair] Exception:', err);
      toast.error('Failed to repair redirects');
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Redirect Repair Tool
        </CardTitle>
        <CardDescription>
          Repair vanity.box redirects for all minted domains
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This tool will check all minted domains and set up redirects to vanity.box profiles
            for any domains that don't have them configured.
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleRepairAll}
          disabled={isRepairing}
          className="w-full"
        >
          {isRepairing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Repairing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Repair All Redirects
            </>
          )}
        </Button>

        {repairResults && (
          <div className="space-y-3 pt-4 border-t">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center p-2 bg-muted rounded">
                <div className="font-semibold">{repairResults.total}</div>
                <div className="text-muted-foreground text-xs">Total</div>
              </div>
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <div className="font-semibold text-green-600 dark:text-green-400">
                  {repairResults.successful}
                </div>
                <div className="text-muted-foreground text-xs">Successful</div>
              </div>
              <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                <div className="font-semibold text-red-600 dark:text-red-400">
                  {repairResults.failed}
                </div>
                <div className="text-muted-foreground text-xs">Failed</div>
              </div>
            </div>

            {repairResults.successes.length > 0 && (
              <div className="space-y-1">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Successful Repairs
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {repairResults.successes.slice(0, 10).map((success: any, i: number) => (
                    <div
                      key={i}
                      className="text-xs p-2 bg-green-50 dark:bg-green-900/10 rounded"
                    >
                      <div className="font-mono">{success.domain}</div>
                      {success.contenthash && (
                        <div className="text-muted-foreground truncate">
                          {success.contenthash}
                        </div>
                      )}
                    </div>
                  ))}
                  {repairResults.successes.length > 10 && (
                    <div className="text-xs text-muted-foreground text-center">
                      ... and {repairResults.successes.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {repairResults.errors.length > 0 && (
              <div className="space-y-1">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  Failed Repairs
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {repairResults.errors.slice(0, 10).map((error: any, i: number) => (
                    <div
                      key={i}
                      className="text-xs p-2 bg-red-50 dark:bg-red-900/10 rounded"
                    >
                      <div className="font-mono">{error.domain}</div>
                      <div className="text-muted-foreground">{error.error}</div>
                    </div>
                  ))}
                  {repairResults.errors.length > 10 && (
                    <div className="text-xs text-muted-foreground text-center">
                      ... and {repairResults.errors.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
