import { Card } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface ChainActivity {
  chain: string;
  chainKey: string;
  totalTransactions: number;
}

interface ActivityGraphProps {
  chains: ChainActivity[];
}

export const ActivityGraph = ({ chains }: ActivityGraphProps) => {
  if (!chains || chains.length === 0) {
    return null;
  }

  // Find max transactions for scaling
  const maxTx = Math.max(...chains.map(c => c.totalTransactions));

  // Sort by transaction count
  const sortedChains = [...chains].sort((a, b) => b.totalTransactions - a.totalTransactions);

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-lg font-bold">Multi-Chain Activity</h3>
      </div>
      
      <div className="space-y-5">
        {sortedChains.map((chain) => {
          const percentage = (chain.totalTransactions / maxTx) * 100;
          
          return (
            <div key={chain.chainKey} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-sm">{chain.chain}</span>
                <span className="text-sm text-muted-foreground font-medium">
                  {chain.totalTransactions.toLocaleString()} tx
                </span>
              </div>
              
              <div className="relative h-2.5 bg-muted/40 rounded-full overflow-hidden shadow-inner">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary via-primary/90 to-primary rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${percentage}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-5 border-t border-border/50 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-medium">Total Activity</span>
          <span className="font-bold text-foreground text-base">
            {chains.reduce((sum, c) => sum + c.totalTransactions, 0).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-medium">Active Chains</span>
          <span className="font-bold text-foreground text-base">
            {chains.length} {chains.length === 1 ? 'network' : 'networks'}
          </span>
        </div>
      </div>
    </Card>
  );
};
