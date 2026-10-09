"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { api } from "../../lib/api";
import StockChartPanel from "../../components/StockChartPanel";
import { Flame, Zap } from "lucide-react";

type Row = Record<string, any>;

function num(v: any) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function pctValue(r: Row) { return num(r.PctChange ?? r["% Change"] ?? r.change_pct); }
function symbolOf(r: Row) { return String(r?.Ticker ?? r?.Symbol ?? r?.symbol ?? r?.ticker ?? "").trim().toUpperCase(); }
function cleanTime(v: any) { return String(v ?? "").replace("T", " ").slice(0, 19); }

const fetcher = async (url: string) => { 
  const d = await api<any>(url); 
  return Array.isArray(d?.rows) ? d.rows : (d?.data || []); 
};

export default function Confluence() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState("");
  const [filterTab, setFilterTab] = useState<"Rank" | "Gainers" | "Losers">("Rank");
  const [fireMode, setFireMode] = useState(false);

  // Background Data Fetching
  const { data: incoming = [], isLoading } = useSWR("/api/confluence", fetcher, { refreshInterval: 60000 });
  const { data: rawSectors = [] } = useSWR("/api/market/sectors", fetcher, { refreshInterval: 60000 });

  // Process unique signals
  const rows = useMemo(() => {
    const unique: Row[] = []; const seen = new Set<string>();
    for (const r of incoming) {
      const s = symbolOf(r); 
      if (!s || seen.has(s)) continue; 
      seen.add(s); unique.push(r);
    }
    return unique;
  }, [incoming]);

  // Determine Top 3 & Bottom 3 Sectors for FIRE MODE
  const extremeSectors = useMemo(() => {
    const sectors = Array.isArray(rawSectors) ? rawSectors : [];
    const ranked = sectors.map((r: any) => ({
      name: String(r?.Sector ?? r?.sector ?? r?.Symbol ?? r?.symbol ?? "").trim().toUpperCase(),
      pct: Number(r?.PctChange ?? r?.change_pct ?? r?.Change ?? r?.pct_change ?? 0) || 0
    })).sort((a, b) => b.pct - a.pct);

    const extremes = new Set<string>();
    if (ranked.length > 0) {
      ranked.slice(0, 3).forEach(s => extremes.add(s.name));
      ranked.slice(-3).forEach(s => extremes.add(s.name));
    }
    return extremes;
  }, [rawSectors]);

  // Apply Search, Tabs, and FIRE MODE
  const filtered = useMemo(() => {
    let base = rows.filter(r => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
    
    if (fireMode && extremeSectors.size > 0) {
      base = base.filter(r => {
        const sName = String(r.Sector || r.sector || "").trim().toUpperCase();
        return extremeSectors.has(sName) || extremeSectors.has(`NIFTY ${sName}`);
      });
    }

    if (filterTab === "Gainers") {
      base = base.filter(r => pctValue(r) > 0).sort((a, b) => pctValue(b) - pctValue(a));
    } else if (filterTab === "Losers") {
      base = base.filter(r => pctValue(r) < 0).sort((a, b) => pctValue(a) - pctValue(b));
    } else {
      base = base.sort((a, b) => num(a.Rank ?? 0) - num(b.Rank ?? 0));
    }
    return base;
  }, [rows, q, filterTab, fireMode, extremeSectors]);

  // Auto-select first item if nothing is selected
  useEffect(() => {
    if (!selected && filtered.length > 0) setSelected(symbolOf(filtered[0]));
  }, [filtered, selected]);

  const selectedData = rows.find(r => symbolOf(r) === selected);

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: 0, margin: 0, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* HEADER - FULL WIDTH */}
      <div style={{ width: '100%', padding: '24px 32px', margin: 0, borderBottom: '1px solid rgba(128,128,128,0.2)', backgroundColor: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, boxSizing: 'border-box' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#6366f1', letterSpacing: '1.2px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} fill="#6366f1" /> MIDAS CONFLUENCE RADAR
          </div>
          <h1 style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: '900', color: 'inherit' }}>High-Conviction Signals</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.6, fontWeight: '600' }}>Auto-generated intraday watchlist • Filtered by the active Confluence Engine</p>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, width: '100%', overflow: 'hidden' }}>
        
        {/* LEFT SIDEBAR: WATCHLIST (FIXED WIDTH, EXTREME LEFT) */}
        <div style={{ width: '360px', minWidth: '360px', borderRight: '1px solid rgba(128,128,128,0.2)', display: 'flex', flexDirection: 'column', backgroundColor: 'transparent' }}>
            
            <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📋 Watchlist
                  </h2>
                  
                  {/* FIRE MODE TOGGLE */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setFireMode(!fireMode)}>
                    <div style={{ width: '36px', height: '20px', borderRadius: '12px', backgroundColor: fireMode ? '#ef4444' : 'rgba(128,128,128,0.3)', position: 'relative', transition: 'background 0.2s' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: fireMode ? '#fff' : '#cbd5e1', position: 'absolute', top: '2px', left: fireMode ? '18px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: fireMode ? '#ef4444' : 'inherit', opacity: fireMode ? 1 : 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Flame size={14} fill={fireMode ? "#ef4444" : "none"} /> Fire Mode
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', marginBottom: '16px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(128,128,128,0.2)', backgroundColor: 'transparent' }}>
                    {(["Rank", "Gainers", "Losers"] as const).map(tab => (
                        <button key={tab} onClick={() => setFilterTab(tab)}
                            style={{
                                flex: 1, padding: '10px 0', border: 'none',
                                background: filterTab === tab ? '#6366f1' : 'transparent',
                                color: filterTab === tab ? '#ffffff' : 'inherit',
                                opacity: filterTab === tab ? 1 : 0.7,
                                cursor: 'pointer',
                                fontSize: '13px', fontWeight: filterTab === tab ? '800' : '600', transition: 'all 0.15s ease'
                            }}>
                            {tab}
                        </button>
                    ))}
                </div>

                <input type="text" placeholder="Search ticker or sector..." value={q} onChange={e => setQ(e.target.value)} 
                       style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(128,128,128,0.3)', backgroundColor: 'transparent', color: 'inherit', fontSize: '13px', fontWeight: '600', boxSizing: 'border-box', outline: 'none' }} />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {isLoading && <div style={{ opacity: 0.5, textAlign: 'center', padding: '20px', fontWeight: '600' }}>Loading signals...</div>}
                {!isLoading && filtered.length === 0 && <div style={{ opacity: 0.5, textAlign: 'center', padding: '20px', fontWeight: '600' }}>No matching signals found.</div>}
                
                {filtered.map((r, i) => {
                    const sym = symbolOf(r); const pct = pctValue(r); const signal = String(r.Signal ?? r.Signals ?? r.signal ?? "—"); const sector = String(r.Sector ?? r.sector ?? "—");
                    const isSelected = selected === sym; const isUp = pct >= 0;
                    
                    return (
                        <div key={`${sym}-${i}`} onClick={() => setSelected(sym)}
                            style={{
                                padding: '16px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.1s ease-in-out',
                                backgroundColor: isSelected ? (isUp ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)') : 'transparent',
                                border: isSelected ? (isUp ? '1.5px solid rgba(34, 197, 94, 0.5)' : '1.5px solid rgba(239, 68, 68, 0.5)') : '1.5px solid rgba(128,128,128,0.1)',
                            }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: '900', color: 'inherit', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ opacity: 0.5, fontSize: '11px' }}>#{r.Rank ?? i + 1}</span> {sym}
                                </div>
                                <div style={{ color: isUp ? '#22c55e' : '#ef4444', fontWeight: '900', fontSize: '14px' }}>
                                    {isUp ? '+' : ''}{pct.toFixed(2)}%
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                <div style={{ fontSize: '11px', opacity: 0.6, fontWeight: '700', textTransform: 'uppercase' }}>
                                    {signal} <span style={{ opacity: 0.5, margin: '0 4px' }}>|</span> {sector}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* RIGHT AREA: MASSIVE EDGE-TO-EDGE CHARTS */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'transparent' }}>
            {selected && selectedData ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                    
                    {/* CHART HEADER PANEL */}
                    <div style={{ padding: '20px 32px', borderBottom: '1px solid rgba(128,128,128,0.2)', backgroundColor: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '900', color: 'inherit', letterSpacing: '-0.5px' }}>{selected}</h2>
                            <span style={{ padding: '4px 12px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', borderRadius: '6px', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}>
                                {selectedData.Signal ?? selectedData.signal ?? "SIGNAL"}
                            </span>
                            <span style={{ fontSize: '14px', opacity: 0.6, fontWeight: '800', textTransform: 'uppercase' }}>
                                {selectedData.Sector ?? selectedData.sector ?? "SECTOR"}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                            <span style={{ fontSize: '22px', fontWeight: '900', color: pctValue(selectedData) >= 0 ? '#22c55e' : '#ef4444' }}>
                                {pctValue(selectedData) > 0 ? '+' : ''}{pctValue(selectedData).toFixed(2)}%
                            </span>
                            <span style={{ fontSize: '24px', fontWeight: '900', color: 'inherit' }}>
                                ₹{typeof selectedData.Price === "number" ? selectedData.Price.toLocaleString("en-IN", {maximumFractionDigits:2}) : String(selectedData.Price ?? selectedData.price ?? selectedData.Close ?? "—")}
                            </span>
                        </div>
                    </div>
                    
                    {/* CHART CONTAINER - FLEX 1 TO FILL ALL REMAINING SPACE */}
                    <div style={{ flex: 1, padding: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ flex: 1, backgroundColor: 'transparent', borderRadius: '12px', border: '1px solid rgba(128,128,128,0.2)', overflow: 'hidden', position: 'relative' }}>
                            <StockChartPanel symbol={selected} />
                        </div>
                    </div>

                </div>
            ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, fontSize: '18px', fontWeight: '800' }}>
                    Select a signal from the watchlist to view charts
                </div>
            )}
        </div>
      </div>
    </div>
  );
}