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
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Multi-Chain Activity</h3>
      </div>
      
      <div className="space-y-4">
        {sortedChains.map((chain) => {
          const percentage = (chain.totalTransactions / maxTx) * 100;
          
          return (
            <div key={chain.chainKey} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{chain.chain}</span>
                <span className="text-muted-foreground">
                  {chain.totalTransactions} tx
                </span>
              </div>
              
              <div className="relative h-3 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${percentage}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Activity</span>
          <span className="font-semibold text-foreground">
            {chains.reduce((sum, c) => sum + c.totalTransactions, 0)} transactions
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-muted-foreground">Active Chains</span>
          <span className="font-semibold text-foreground">
            {chains.length} {chains.length === 1 ? 'network' : 'networks'}
          </span>
        </div>
      </div>
    </Card>
  );
};
