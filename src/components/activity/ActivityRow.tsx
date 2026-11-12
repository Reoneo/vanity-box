import { formatDistanceToNow } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, ExternalLink, Repeat } from "lucide-react";
import type { ReactNode } from "react";
import { transactionUsdValue } from '@/lib/activityValue';

type Props = {
  tx: any;
  chainIcon: ReactNode;
  iotaIcon: string;
  ethIcon: string;
  tokens?: any[];
};

const short = (a?: string | null) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || "");
const fmtQty = (n: number) => {
  if (!isFinite(n)) return "0";
  if (n === 0) return "0";
  if (n >= 1e9) return n.toExponential(2);
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumSignificantDigits: 4 });
};
const chainLabel = (c?: string) => {
  const l = (c || "").toLowerCase();
  const m: Record<string, string> = { eth: "Ethereum", ethereum: "Ethereum", iota: "IOTA", world: "World Chain", worldchain: "World Chain", base: "Base", optimism: "Optimism", arbitrum: "Arbitrum", polygon: "Polygon", linea: "Linea", scroll: "Scroll" };
  return m[l] || (c ? c.charAt(0).toUpperCase() + c.slice(1) : "");
};

export function ActivityRow({ tx, chainIcon, iotaIcon, ethIcon, tokens = [] }: Props) {
  const usdValue = transactionUsdValue(tx, tokens);
  const isIota = (tx.chain || "").toLowerCase() === "iota";
  const when = tx.minedAt || tx.timestamp;
  const typeRaw = String(tx.type || "transaction").toLowerCase();
  const transfers: any[] = Array.isArray(tx.transfers) && tx.transfers.length
    ? tx.transfers
    : tx.amount && Number(tx.amount) > 0
      ? [{ type: typeRaw === "send" ? "out" : "in", quantity: Number(tx.amount), symbol: tx.symbol || "IOTA", icon: isIota ? iotaIcon : null }]
      : [];
  const dir = typeRaw === "receive" || (transfers.length && transfers.every((t) => t.type === "in"))
    ? "in"
    : typeRaw === "send" || (transfers.length && transfers.every((t) => t.type === "out"))
      ? "out"
      : "other";
  const main = transfers[0];
  const mainIcon = main?.icon || (main?.symbol?.toUpperCase() === "IOTA" ? iotaIcon : main?.symbol?.toUpperCase() === "ETH" ? ethIcon : null) || (isIota ? iotaIcon : !main && /^(eth|ethereum)$/i.test(tx.chain || "") ? ethIcon : null);
  const counterparty = dir === "in" ? tx.sentFrom || tx.from : tx.sentTo || tx.to;
  const feeVal = Number(tx.fee?.value ?? tx.fee ?? 0);
  const feeSym = tx.fee?.symbol || (isIota ? "IOTA" : "ETH");
  const url = tx.explorerUrl || (isIota && tx.hash ? `https://explorer.iota.org/txblock/${tx.hash}` : null);
  const failed = tx.status === "failed" || tx.status === "failure";
  const title = typeRaw === "receive" ? "Received" : typeRaw === "send" ? "Sent" : typeRaw.replace(/([a-z])([A-Z])/g, "$1 $2");
  const DirIcon = dir === "in" ? ArrowDownLeft : dir === "out" ? ArrowUpRight : Repeat;
  const dirColor = dir === "in" ? "bg-green-500 text-white" : dir === "out" ? "bg-red-500 text-white" : "bg-[#D4AF37] text-black";

  return (
    <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[#D4AF37]/20 hover:border-[#D4AF37]/40 transition-all">
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 flex-shrink-0">
          {mainIcon ? (
            <img src={mainIcon} alt={main?.symbol || "Token"} className="w-10 h-10 rounded-full object-cover bg-background" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-xs font-bold text-foreground">
              {(main?.symbol || "?").slice(0, 3).toUpperCase()}
            </div>
          )}
          <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-background ${dirColor}`}>
            <DirIcon className="w-2.5 h-2.5" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-foreground truncate capitalize">
              {title}{failed && <span className="ml-1.5 text-xs text-red-500 normal-case">(failed)</span>}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {when ? formatDistanceToNow(new Date(when), { addSuffix: true }) : ""}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <div className="min-w-0 truncate">
              {transfers.length ? transfers.slice(0, 2).map((t, i) => (
                <span key={i} className={`font-medium ${t.type === "in" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {i > 0 && <span className="text-muted-foreground"> · </span>}
                  {t.type === "in" ? "+" : "−"}{fmtQty(Number(t.quantity))} {t.symbol}
                </span>
              )) : <span className="text-muted-foreground">Contract interaction</span>}
              {transfers.length > 2 && <span className="text-muted-foreground"> +{transfers.length - 2}</span>}
            </div>
            <span className="flex items-center gap-1 text-[11px] uppercase font-medium text-muted-foreground flex-shrink-0">
              {chainIcon}
              {chainLabel(tx.chain)}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-[#D4AF37]/10 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        <span className="col-span-2 text-sm font-medium text-foreground" title="Estimate using current token prices, not the price at the transaction time">
          {usdValue === null ? 'USD value unavailable' : `≈ ${usdValue.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} USD`}
        </span>
        {counterparty && <span className="truncate">{dir === "in" ? "From" : "To"}: <span className="font-mono">{short(counterparty)}</span></span>}
        {feeVal > 0 && <span className="truncate">Fee: {fmtQty(feeVal)} {feeSym}</span>}
        {when && <span className="truncate">{new Date(when).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>}
        {tx.hash && (
          url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="truncate inline-flex items-center gap-1 font-mono hover:text-[#D4AF37]">
              {short(tx.hash)} <ExternalLink className="w-3 h-3" />
            </a>
          ) : <span className="truncate font-mono">{short(tx.hash)}</span>
        )}
      </div>
    </div>
  );
}
