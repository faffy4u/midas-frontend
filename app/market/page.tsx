"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { api } from "../../lib/api";
import StockChartPanel from "../../components/StockChartPanel";

function tvUrl(symbol:string){ return `https://www.tradingview.com/chart/?symbol=NSE%3A${encodeURIComponent(String(symbol||"").trim().toUpperCase().replace(/&/g,"_").replace(/-/g,"_"))}`; }
function symOf(r:any){return String(r?.Symbol||r?.symbol||r?.ticker||"").trim().toUpperCase()}
function pctOf(r:any){return Number(r?.PctChange??r?.change_pct??r?.pct_change??0)||0}
function numericValue(r:any){ const raw=r?.Volume??r?.volume??r?.Value??r?.value; const n=Number(String(raw??"").replace(/,/g,"")); return Number.isFinite(n)?n:0; }
function formatCr(r:any, prefix:string) { const n = numericValue(r); if (n === 0) return "—"; return `${prefix} ${(n / 10000000).toFixed(2)} Cr`; }

type SortMode = "Rank" | "Gainers" | "Losers";

const fetcher = async (url: string) => { const res = await api<any>(url); return res?.data || res?.rows || res || []; };

export default function Market(){
  const [selected, setSelected]=useState<string>("");
  const [sortMode, setSortMode]=useState<SortMode>("Rank");

  const { data: v = [] } = useSWR("/api/market/activity?index_type=volume", fetcher, { refreshInterval: 300000 });
  const { data: a = [] } = useSWR("/api/market/activity?index_type=value", fetcher, { refreshInterval: 300000 });

  const getSortedTop10 = (data: any[]) => {
    let sorted = [...data];
    if (sortMode === "Gainers") sorted.sort((x, y) => pctOf(y) - pctOf(x));
    else if (sortMode === "Losers") sorted.sort((x, y) => pctOf(x) - pctOf(y));
    return sorted.slice(0, 10);
  };

  const volumeTop10 = useMemo(() => getSortedTop10(v), [v, sortMode]);
  const valueTop10 = useMemo(() => getSortedTop10(a), [a, sortMode]);

  const dualLeaders = useMemo(() => {
    const valSymbols = new Set(valueTop10.map(symOf).filter(Boolean));
    const commonSymbols = new Set(volumeTop10.map(symOf).filter(s => s && valSymbols.has(s)));
    return volumeTop10.filter(r => commonSymbols.has(symOf(r)));
  }, [volumeTop10, valueTop10]);

  const renderListCard = (item: any, index: number, prefix: string) => {
    const sym = symOf(item); const pct = pctOf(item); const isUp = pct >= 0; const isDual = dualLeaders.some(d => symOf(d) === sym);
    return (
      <div key={sym + index} onClick={() => setSelected(sym)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', marginBottom: '12px', borderRadius: '8px',
          border: isUp ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(239,68,68,0.4)',
          backgroundColor: isUp ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          cursor: 'pointer', transition: 'transform 0.1s ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <div style={{ fontWeight: 'bold', color: 'inherit', fontSize: '15px' }}>
          <span style={{ marginRight: '6px', opacity: 0.5, fontSize: '13px' }}>#{index + 1}</span>
          {isDual && <span style={{ marginRight: '4px' }}>🔥</span>} {sym}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: isUp ? '#16a34a' : '#dc2626', fontWeight: '900', fontSize: '15px' }}>{isUp ? '+' : ''}{pct.toFixed(2)}%</div>
          <div style={{ opacity: 0.6, fontSize: '11px', marginTop: '2px', fontWeight: '600' }}>{formatCr(item, prefix)}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="page" style={{ padding: '30px', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: 'inherit', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🔥</span> Market Activity Equities (NSE)
          </h1>
          <p style={{ color: '#8b5cf6', fontSize: '13px', margin: '0 0 24px 0', fontWeight: '500', opacity: 0.8 }}>Top 10 by Volume & Top 10 by Value • Refreshes seamlessly • 🔥 = common to both lists • Click a stock to open its TradingView chart</p>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '40px' }}>
            {(["Rank", "Gainers", "Losers"] as SortMode[]).map((mode) => (
              <button key={mode} onClick={() => setSortMode(mode)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s ease', fontWeight: '600', fontSize: '14px',
                  border: mode === sortMode ? '2px solid #8b5cf6' : '1px solid rgba(128,128,128,0.2)',
                  backgroundColor: mode === sortMode ? '#8b5cf6' : 'transparent',
                  color: mode === sortMode ? '#ffffff' : 'inherit'
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ textAlign: 'center', color: 'inherit', fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><span>📊</span> Top 10 by Volume</h2>
            <div>{volumeTop10.map((item, i) => renderListCard(item, i, 'Vol:'))}</div>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ textAlign: 'center', color: 'inherit', fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><span>🔥</span> Dual Leader</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {dualLeaders.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5, fontWeight: '500' }}>No Dual Leaders Currently</div> : (
                dualLeaders.map((item) => {
                  const sym = symOf(item); const pct = pctOf(item); const isUp = pct >= 0;
                  return (
                    <div key={sym + '-dual'} onClick={() => setSelected(sym)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', borderRadius: '12px',
                        border: '2px solid rgba(251, 146, 60, 0.5)', backgroundColor: 'rgba(251, 146, 60, 0.1)',
                        cursor: 'pointer', transition: 'transform 0.1s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <div style={{ color: '#ea580c', fontWeight: 'bold', fontSize: '12px', letterSpacing: '1px', marginBottom: '12px', textTransform: 'uppercase' }}>🔥 Common 🔥</div>
                      <div style={{ color: '#3b82f6', fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>{sym}</div>
                      <div style={{ color: isUp ? '#16a34a' : '#dc2626', fontSize: '20px', fontWeight: 'bold' }}>{isUp ? '+' : ''}{pct.toFixed(2)}%</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ textAlign: 'center', color: 'inherit', fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><span>💰</span> Top 10 by Value</h2>
            <div>{valueTop10.map((item, i) => renderListCard(item, i, '₹:'))}</div>
          </div>
        </div>

        {selected && (
          <div className="panel" style={{ marginTop: '40px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(128,128,128,0.2)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(128,128,128,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', color: 'inherit' }}>{selected}</h3>
                <a href={tvUrl(selected)} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#3b82f6', textDecoration: 'none', fontWeight: 'bold' }}>↗ Open in TradingView</a>
              </div>
              <button onClick={() => setSelected("")} style={{ background: 'rgba(128,128,128,0.1)', border: 'none', padding: '6px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', color: 'inherit' }}>CLOSE CHART</button>
            </div>
            <div style={{ padding: '24px' }}><StockChartPanel symbol={selected} /></div>
          </div>
        )}
      </div>
    </div>
  );
}