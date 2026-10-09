"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import useSWR from "swr";
import { api } from "../lib/api";
import StockChartPanel from "../components/StockChartPanel";
import { Activity, Clock3, RefreshCw, ExternalLink, Zap, Search } from "lucide-react";

type IndexQuote = { label: string; apiSymbol: string; value: number; changePct: number };

function Sparkline({ positive = true }: { positive?: boolean }) {
  const pts = positive
    ? "0,42 18,36 35,39 53,22 70,27 88,12 105,18 125,5"
    : "0,10 18,18 35,14 53,31 70,25 88,38 105,30 125,47";
  return (
    <svg style={{ width: "100%", height: "46px", overflow: "visible" }} viewBox="0 0 125 52" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={positive ? "#10b981" : "#ef4444"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function nfmt(v: number) { return Number.isFinite(v) ? v.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"; }
function pctfmt(v: number) { return Number.isFinite(v) ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "—"; }
function pctOf(r: any) { return Number(r?.PctChange ?? r?.change_pct ?? r?.Change ?? r?.pct_change ?? 0) || 0; }
function sectorName(r: any) { return String(r?.Sector ?? r?.sector ?? r?.Symbol ?? r?.symbol ?? "—"); }
function tvUrl(symbol: string) { return `https://www.tradingview.com/chart/?symbol=NSE%3A${encodeURIComponent(String(symbol || "").trim().toUpperCase().replace(/&/g, "_").replace(/-/g, "_"))}`; }

const fetcher = async (url: string) => { const res = await api<any>(url); return res?.data || res?.rows || res || []; };

export default function Home() {
  const [selectedSector, setSelectedSector] = useState("NIFTY IT");
  const [selectedStock, setSelectedStock] = useState("");
  const [sectorSearch, setSectorSearch] = useState("");

  const { data: niftyData, mutate: mutateNifty } = useSWR("/api/market/nifty?symbol=NIFTY%2050", fetcher, { refreshInterval: 15000 });
  const { data: bankData, mutate: mutateBank } = useSWR("/api/market/nifty?symbol=NIFTY%20BANK", fetcher, { refreshInterval: 15000 });
  const { data: n500Data, mutate: mutateN500 } = useSWR("/api/market/nifty?symbol=NIFTY%20500", fetcher, { refreshInterval: 15000 });
  
  const { data: rawSectors = [], mutate: mutateSectors } = useSWR("/api/market/sectors", fetcher, { refreshInterval: 30000 });
  const { data: rawAlerts = {}, mutate: mutateAlerts } = useSWR("/api/alerts/first-seen", fetcher, { refreshInterval: 20000 });

  const { data: stocks = [], isLoading: sectorLoading } = useSWR(selectedSector ? `/api/market/sectors/constituents?sector=${encodeURIComponent(selectedSector)}` : null, fetcher, { refreshInterval: 30000 });

  const refreshAll = () => { mutateNifty(); mutateBank(); mutateN500(); mutateSectors(); mutateAlerts(); };

  const nifty50 = Array.isArray(niftyData) ? niftyData[niftyData.length - 1] : niftyData;
  const bankNifty = Array.isArray(bankData) ? bankData[bankData.length - 1] : bankData;
  const nifty500 = Array.isArray(n500Data) ? n500Data[n500Data.length - 1] : n500Data;

  const quotes: IndexQuote[] = useMemo(() => [
    { label: "NIFTY 50", apiSymbol: "NIFTY 50", value: Number(nifty50?.LTP ?? nifty50?.value ?? 0), changePct: Number(nifty50?.PctChange ?? nifty50?.change_pct ?? nifty50?.change ?? 0) },
    { label: "BANK NIFTY", apiSymbol: "NIFTY BANK", value: Number(bankNifty?.LTP ?? bankNifty?.value ?? 0), changePct: Number(bankNifty?.PctChange ?? bankNifty?.change_pct ?? bankNifty?.change ?? 0) },
    { label: "NIFTY 500", apiSymbol: "NIFTY 500", value: Number(nifty500?.LTP ?? nifty500?.value ?? 0), changePct: Number(nifty500?.PctChange ?? nifty500?.change_pct ?? nifty500?.change ?? 0) },
  ], [nifty50, bankNifty, nifty500]);

  const alerts = useMemo(() => {
    if (Array.isArray(rawAlerts)) return rawAlerts;
    if (rawAlerts && typeof rawAlerts === "object") return Object.entries(rawAlerts).map(([key, timestamp]) => ({ ticker: key.split(":")[0], signal: key.split(":").slice(1).join(":"), timestamp }));
    return [];
  }, [rawAlerts]);

  // BELL AUDIO ALERT LOGIC
  const prevAlertCount = useRef(0);
  useEffect(() => {
    if (alerts.length > prevAlertCount.current && prevAlertCount.current !== 0) {
      const audio = new Audio("/bell.mp3");
      audio.volume = 1.0; 
      audio.play().catch(err => console.log("Audio blocked until user interacts", err));
    }
    prevAlertCount.current = alerts.length;
  }, [alerts.length]);

  const sectors = Array.isArray(rawSectors) ? rawSectors : [];
  const ranked = useMemo(() => sectors.map((r: any, i: number) => ({ ...r, __pct: pctOf(r), __name: sectorName(r), __i: i })).sort((a: any, b: any) => b.__pct - a.__pct), [sectors]);
  const filteredSectors = useMemo(() => (!sectorSearch ? ranked : ranked.filter((s: any) => s.__name.toLowerCase().includes(sectorSearch.toLowerCase()))), [ranked, sectorSearch]);

  const maxAbs = Math.max(1, ...ranked.map((r: any) => Math.abs(r.__pct)));
  const stockMaxAbs = Math.max(1, ...stocks.map((s: any) => Math.abs(pctOf(s))));

  return (
    <div className="page command-center-page" style={{ padding: "30px 24px", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      {/* 1280px Expanded Centered Wrapper (25% Wider) */}
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        
        {/* CENTERED MAIN HEADING */}
        <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "11px", fontWeight: "800", color: "#6366f1", letterSpacing: "1.2px", textTransform: "uppercase" }}>COMMAND CENTER · REAL-TIME RADAR</div>
            <h1 style={{ fontSize: "28px", fontWeight: "900", margin: "4px 0 0 0", color: "inherit" }}>Market Intelligence</h1>
          </div>
          <button onClick={refreshAll} style={{ position: "absolute", right: 0, display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(128,128,128,0.2)", backgroundColor: "transparent", color: "inherit", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}>
            <RefreshCw size={14} /> Refresh All
          </button>
        </div>

        <div className="panel" style={{ borderRadius: "8px", padding: "10px 16px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "14px", overflowX: "auto", border: "1px solid rgba(128,128,128,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#ea580c", fontWeight: "800", fontSize: "12px", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            <Zap size={14} /> Live Stream:
          </div>
          <div style={{ display: "flex", gap: "12px", whiteSpace: "nowrap", flex: 1 }}>
            {alerts.length ? alerts.slice(0, 8).map((a: any, i: number) => (
                <span key={i} style={{ fontSize: "12px", background: "rgba(128,128,128,0.1)", padding: "4px 10px", borderRadius: "6px", fontWeight: "600" }}>
                  <b style={{ opacity: 1 }}>{a.ticker}</b> <span style={{ opacity: 0.7 }}>{a.signal || "SIGNAL"}</span>
                </span>
              )) : <span style={{ fontSize: "12px", opacity: 0.5 }}>No active alerts detected</span>}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "20px", marginBottom: "24px" }}>
          <div className="panel" style={{ borderRadius: "10px", padding: "16px 24px", border: "1px solid rgba(128,128,128,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "11px", fontWeight: "800", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Benchmark Indices</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "10px", fontWeight: "800", color: "#16a34a", background: "rgba(22,163,74,0.1)", padding: "4px 10px", borderRadius: "20px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16a34a" }}></span> LIVE
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "16px" }}>
              {quotes.map((q) => {
                const isUp = q.changePct >= 0;
                return (
                  <div key={q.apiSymbol} style={{ background: "rgba(128,128,128,0.05)", padding: "12px 14px", borderRadius: "8px", border: "1px solid rgba(128,128,128,0.1)" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", opacity: 0.6, marginBottom: "6px" }}>{q.label}</div>
                    <div style={{ fontSize: "20px", fontWeight: "900", color: "inherit" }}>{nfmt(q.value)}</div>
                    <div style={{ fontSize: "12px", fontWeight: "800", color: isUp ? "#22c55e" : "#ef4444", marginTop: "4px" }}>{pctfmt(q.changePct)}</div>
                  </div>
                );
              })}
            </div>
            <Sparkline positive={(quotes[0]?.changePct ?? 0) >= 0} />
          </div>

          <div className="panel" style={{ borderRadius: "10px", padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", border: "1px solid rgba(128,128,128,0.2)" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: "800", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Global Activity</div>
              <div style={{ fontSize: "36px", fontWeight: "900", marginTop: "8px", color: "inherit" }}>{alerts.length}</div>
              <div style={{ fontSize: "12px", opacity: 0.6, fontWeight: "600" }}>Active detected events</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", opacity: 0.7, fontWeight: "700", paddingTop: "14px", borderTop: "1px solid rgba(128,128,128,0.1)" }}>
              <Activity size={16} color="#6366f1" /> Fast Engine · 20s
            </div>
          </div>

          <div className="panel" style={{ borderRadius: "10px", padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", border: "1px solid rgba(128,128,128,0.2)" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: "800", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Terminal Pipeline</div>
              <div style={{ fontSize: "32px", fontWeight: "900", color: "#22c55e", marginTop: "8px" }}>ONLINE</div>
              <div style={{ fontSize: "12px", opacity: 0.6, fontWeight: "600" }}>Direct FastAPI link</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", opacity: 0.7, fontWeight: "700", paddingTop: "14px", borderTop: "1px solid rgba(128,128,128,0.1)" }}>
              <Clock3 size={16} color="#22c55e" /> Low-latency feed
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
          
          {/* CENTERED & FULL-WIDTH SECTORAL HEATMAP */}
          <div className="panel" style={{ borderRadius: "10px", padding: "20px", border: "1px solid rgba(128,128,128,0.2)" }}>
            
            <div style={{ textAlign: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(128,128,128,0.1)" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "900", margin: "0 0 4px 0", color: "inherit" }}>SECTORAL HEATMAP</h2>
              <span style={{ fontSize: "12px", opacity: 0.6, fontWeight: "600" }}>{ranked.length} sectors ranked by relative momentum</span>
            </div>

            <div style={{ position: "relative", width: "100%", marginBottom: "16px" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "9px", opacity: 0.5 }} />
              <input 
                type="text" 
                placeholder="Find sector..." 
                value={sectorSearch} 
                onChange={(e) => setSectorSearch(e.target.value)} 
                style={{ width: "100%", padding: "6px 10px 6px 30px", fontSize: "12px", borderRadius: "6px", border: "1px solid rgba(128,128,128,0.3)", background: "transparent", color: "inherit", outline: "none", boxSizing: "border-box" }} 
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "800", opacity: 0.5, padding: "0 10px 8px 10px", borderBottom: "1px solid rgba(128,128,128,0.1)" }}>
              <span style={{ flex: 1, textAlign: "left" }}>SECTOR</span>
              <span style={{ width: "180px", textAlign: "center" }}>SPREAD</span>
              <span style={{ width: "65px", textAlign: "right" }}>% CHG</span>
            </div>

            <div style={{ paddingTop: "8px" }}>
              {filteredSectors.map((r: any, idx: number) => {
                const p = r.__pct; const isUp = p >= 0; const isSelected = selectedSector === r.__name;
                const barWidth = Math.min(100, (Math.abs(p) / maxAbs) * 100);
                const totalLen = filteredSectors.length;
                const isTop3 = idx < 3;
                const isBottom3 = idx >= totalLen - 3;
                const rankColor = isTop3 ? '#22c55e' : isBottom3 ? '#ef4444' : '#eab308';

                return (
                  <div key={`${r.__name}-${r.__i}`} onClick={() => { setSelectedSector(r.__name); setSelectedStock(""); }}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px",
                      padding: "6px 10px", borderRadius: "6px", margin: "3px 0", cursor: "pointer",
                      backgroundColor: isSelected ? "rgba(128, 128, 128, 0.1)" : "transparent",
                      transition: "background 0.1s ease"
                    }}
                  >
                    <div style={{ flex: 1, fontSize: "12px", fontWeight: "900", color: rankColor, display: "flex", alignItems: "center", gap: "8px", textTransform: "uppercase" }}>
                      <span style={{ fontSize: "10px", opacity: 0.6, width: "18px" }}>#{idx + 1}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.__name}</span>
                    </div>

                    <div style={{ width: "180px", height: "6px", border: "1px solid rgba(128,128,128,0.3)", position: "relative", display: "flex", overflow: "hidden" }}>
                      <div style={{ width: "50%", height: "100%", display: "flex", justifyContent: "flex-end", borderRight: "1px solid rgba(128,128,128,0.5)" }}>
                        {!isUp && <div style={{ width: `${barWidth}%`, height: "100%", background: rankColor }} />}
                      </div>
                      <div style={{ width: "50%", height: "100%", display: "flex", justifyContent: "flex-start" }}>
                        {isUp && <div style={{ width: `${barWidth}%`, height: "100%", background: rankColor }} />}
                      </div>
                    </div>

                    <div style={{ width: "65px", textAlign: "right", fontSize: "12px", fontWeight: "900", color: rankColor }}>
                      {p.toFixed(2)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel" style={{ borderRadius: "10px", padding: "20px", border: "1px solid rgba(128,128,128,0.2)" }}>
            
            <div style={{ textAlign: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(128,128,128,0.1)" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "900", margin: "0 0 6px 0", color: "inherit", textTransform: "uppercase" }}>
                {selectedSector} <span style={{ fontSize: "13px", opacity: 0.5, fontWeight: "600" }}>({stocks.length})</span>
              </h2>
              {selectedSector && <span style={{ fontSize: "10px", fontWeight: "800", opacity: 0.6, background: "rgba(128,128,128,0.1)", padding: "4px 10px", borderRadius: "4px" }}>CLICK STOCK FOR CHARTS</span>}
            </div>

            {/* Removed height constraints so it flows fully down */}
            {sectorLoading ? <div style={{ textAlign: "center", padding: "40px", opacity: 0.5, fontWeight: "600", fontSize: "13px" }}>Loading sector stocks...</div> : stocks.length === 0 ? <div style={{ textAlign: "center", padding: "40px", opacity: 0.5, fontWeight: "600", fontSize: "13px" }}>No stocks returned.</div> : (
              <div style={{ paddingRight: "0px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "800", opacity: 0.5, padding: "0 10px 8px 10px" }}>
                  <span style={{ flex: 1, textAlign: "left" }}>TICKER</span>
                  <span style={{ width: "150px", textAlign: "center", transform: "translateX(-8px)" }}>SPREAD</span>
                  <span style={{ width: "65px", textAlign: "right", paddingRight: "20px" }}>% CHG</span>
                </div>
                
                {stocks.map((s: any, idx: number) => {
                  const sym = String(s.Symbol || s.symbol || "—"); const p = pctOf(s); const isUp = p >= 0; const isSelected = selectedStock === sym;
                  const barWidth = Math.min(100, (Math.abs(p) / stockMaxAbs) * 100);
                  const totalStocks = stocks.length;
                  const isTop3 = idx < 3;
                  const isBottom3 = idx >= totalStocks - 3;
                  const rankColor = isTop3 ? '#22c55e' : isBottom3 ? '#ef4444' : '#eab308';

                  return (
                    <div key={`${sym}-${idx}`} onClick={() => setSelectedStock(sym)}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px",
                        padding: "5px 10px", borderRadius: "6px", margin: "3px 0", cursor: "pointer",
                        backgroundColor: isSelected ? "rgba(128, 128, 128, 0.1)" : "transparent",
                      }}
                    >
                      <span style={{ flex: 1, fontSize: "12px", fontWeight: "900", color: rankColor, textTransform: "uppercase" }}>{sym}</span>
                      
                      <div style={{ width: "150px", height: "6px", border: "1px solid rgba(128,128,128,0.3)", position: "relative", display: "flex", overflow: "hidden" }}>
                        <div style={{ width: "50%", height: "100%", display: "flex", justifyContent: "flex-end", borderRight: "1px solid rgba(128,128,128,0.5)" }}>
                          {!isUp && <div style={{ width: `${barWidth}%`, height: "100%", background: rankColor }} />}
                        </div>
                        <div style={{ width: "50%", height: "100%", display: "flex", justifyContent: "flex-start" }}>
                          {isUp && <div style={{ width: `${barWidth}%`, height: "100%", background: rankColor }} />}
                        </div>
                      </div>
                      
                      <span style={{ width: "65px", textAlign: "right", fontSize: "12px", fontWeight: "900", color: rankColor }}>{p.toFixed(2)}%</span>
                      <a href={tvUrl(sym)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ width: "20px", display: "flex", alignItems: "center", justifyContent: "flex-end", color: "#3b82f6" }}><ExternalLink size={14} /></a>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedStock ? (
              <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(128,128,128,0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "900", color: "inherit" }}>{selectedStock} · Mini Charts</div>
                  <button onClick={() => setSelectedStock("")} style={{ background: "rgba(128,128,128,0.1)", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", color: "inherit" }}>CLOSE</button>
                </div>
                <StockChartPanel symbol={selectedStock} />
              </div>
            ) : <div style={{ marginTop: "20px", padding: "24px", border: "1px dashed rgba(128,128,128,0.3)", borderRadius: "8px", textAlign: "center", opacity: 0.5, fontSize: "12px", fontWeight: "600" }}>Select any constituent above to view its live multi-timeframe charts</div>}
          </div>
        </div>
      </div>
    </div>
  );
}