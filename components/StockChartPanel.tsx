"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function StockChartPanel({ symbol }: { symbol: string }) {
  const [daily, setDaily] = useState<any[]>([]);
  const [intraday, setIntraday] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.all([
      api<any>(`/api/market/stocks/${encodeURIComponent(symbol)}/history?period=30d&interval=1d`),
      api<any>(`/api/market/stocks/${encodeURIComponent(symbol)}/history?period=2d&interval=5m`)
    ])
      .then(([d, i]) => {
        if (live) {
          setDaily(d.data || []);
          setIntraday(i.data || []);
        }
      })
      .catch(() => {})
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [symbol]);

  return (
    <div className="chart-grid" style={{ display: 'flex', gap: '20px', height: '100%' }}>
      <Chart title={`${symbol} · 30D DAILY`} rows={daily} loading={loading} />
      <Chart title={`${symbol} · 2D · 5 MIN`} rows={intraday} loading={loading} />
    </div>
  );
}

function Chart({ title, rows, loading }: { title: string; rows: any[]; loading: boolean }) {
  const W = 760, H = 280, pad = 32;
  
  // State for interactive Zoom and Pan
  const [vb, setVb] = useState({ x: 0, y: 0, w: W, h: H });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // Reset view if data changes
  useEffect(() => { setVb({ x: 0, y: 0, w: W, h: H }); }, [rows]);

  if (loading) return (
    <div className="chartbox" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="paneltitle">{title}</div>
      <div className="chart-loading" style={{ margin: 'auto', opacity: 0.5 }}>Loading price history…</div>
    </div>
  );

  if (!rows.length) return (
    <div className="chartbox" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="paneltitle">{title}</div>
      <div className="chart-loading" style={{ margin: 'auto', opacity: 0.5 }}>No price data available.</div>
    </div>
  );

  // Math for candles
  const vals = rows.flatMap(r => [Number(r.low), Number(r.high)]).filter(Number.isFinite);
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  const x = (i: number) => pad + (i / (Math.max(rows.length - 1, 1))) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / range) * (H - pad * 2);
  const step = Math.max(1, Math.floor(rows.length / 90));
  const path = rows.filter((_, i) => i % step === 0).map((r, i) => `${i ? 'L' : 'M'} ${x(rows.indexOf(r)).toFixed(1)} ${y(Number(r.close)).toFixed(1)}`).join(' ');

  // Zoom (Scroll)
  const onWheel = (e: React.WheelEvent) => {
    // Capture values synchronously BEFORE setting state
    const zoom = e.deltaY > 0 ? 1.1 : 0.9;
    const currentTarget = e.currentTarget as SVGSVGElement;
    const rect = currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;

    setVb(prev => {
      const nw = Math.min(W * 2, Math.max(W * 0.1, prev.w * zoom));
      const nh = Math.min(H * 2, Math.max(H * 0.1, prev.h * zoom));
      return { x: prev.x + (prev.w - nw) * relX, y: prev.y + (prev.h - nh) * relY, w: nw, h: nh };
    });
  };

  // Pan (Click & Drag)
  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    // Capture values synchronously BEFORE setting state
    const currentTarget = e.currentTarget as SVGSVGElement;
    const rect = currentTarget.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    setVb(p => {
      const dx = (lastPos.x - clientX) * (p.w / rect.width);
      const dy = (lastPos.y - clientY) * (p.h / rect.height);
      return { ...p, x: p.x + dx, y: p.y + dy };
    });
    
    setLastPos({ x: clientX, y: clientY });
  };

  return (
    <div className="chartbox" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      <div className="paneltitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 10px 0' }}>
        <span style={{ fontWeight: 'bold' }}>{title}</span>
        <div>
          <span style={{ fontSize: '10px', opacity: 0.5, marginRight: '12px' }}>SCROLL = ZOOM | DRAG = PAN | DBL-CLICK = RESET</span>
          <span className="muted" style={{ opacity: 0.7, fontSize: '12px' }}>{rows.length} candles</span>
        </div>
      </div>

      <svg
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="price-svg"
        role="img"
        aria-label={title}
        style={{ flex: 1, width: '100%', height: '100%', cursor: isDragging ? 'grabbing' : 'crosshair', touchAction: 'none' }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => setIsDragging(false)}
        onPointerCancel={() => setIsDragging(false)}
        onDoubleClick={() => setVb({ x: 0, y: 0, w: W, h: H })} // Double click resets the view!
      >
        <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} className="chart-axis" stroke="rgba(128,128,128,0.3)" />
        <line x1={pad} x2={pad} y1={pad} y2={H - pad} className="chart-axis" stroke="rgba(128,128,128,0.3)" />
        
        <path d={path} className="price-line" fill="none" stroke="rgba(128,128,128,0.2)" />
        
        {rows.filter((_, i) => i % step === 0).map((r, i) => {
          const o = Number(r.open), c = Number(r.close), hi = Number(r.high), lo = Number(r.low);
          const xx = x(i * step), bodyY = y(Math.max(o, c)), bodyH = Math.max(2, Math.abs(y(o) - y(c)));
          const isUp = c >= o;
          
          return (
            <g key={i}>
              <line x1={xx} x2={xx} y1={y(hi)} y2={y(lo)} stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth="1" />
              <rect x={xx - 2.5} y={bodyY} width="5" height={bodyH} fill={isUp ? "#22c55e" : "#ef4444"} />
            </g>
          );
        })}
      </svg>

    </div>
  );
}