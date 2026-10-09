"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { api } from "../../lib/api";
import {
  ResponsiveContainer, LineChart as ReLineChart, Line, BarChart as ReBarChart, Bar,
  XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, Cell
} from "recharts";

type Row = Record<string, any>;

function n(v: any, fallback = 0) { const x = Number(v); return Number.isFinite(x) ? x : fallback }
function fmt(v: any, d = 1) { const x = Number(v); return Number.isFinite(x) ? x.toFixed(d) : "—" }
function signed(v: any, d = 1) { const x = Number(v); return Number.isFinite(x) ? `${x >= 0 ? "+" : ""}${x.toFixed(d)}` : "—" }
function tone(v: number) { return v > 0 ? "up" : v < 0 ? "down" : "flat" }
function timeStr(t: any) { return String(t || "").substring(0, 5); }

const fetcher = async (url: string) => {
  const res = await api<any>(url);
  return res;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #d1d5db', padding: '10px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', borderRadius: '4px', minWidth: '120px' }}>
        <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '6px', marginBottom: '6px', fontWeight: 'bold', color: '#6b7280', fontSize: '12px' }}>{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ color: p.color || p.stroke || p.fill || '#374151', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '3px', backgroundColor: p.color || p.stroke || p.fill }}></span>
            <span>{p.name} :</span><span>{typeof p.value === 'number' && !Number.isInteger(p.value) ? p.value.toFixed(2) : p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function LineChart({ rows, field, title, min, max, zero = false, colorMode = "pressure" }: any) {
  if (!rows || rows.length === 0) return <div className="breadth-chart-empty">Waiting for history…</div>;
  const latest = n(rows[rows.length - 1]?.[field], 0);
  const lineColor = colorMode === "ad" ? (latest >= 1 ? "#10b981" : "#ef4444") : (latest >= 0 ? "#10b981" : "#ef4444");
  const chartData = rows.map((r: Row) => ({ time: timeStr(r.time), [field]: n(r[field], null) }));

  return (
    <div className="breadth-chart" style={{ height: '280px', display: 'flex', flexDirection: 'column' }}>
      <div className="breadth-chart-title"><span>{title}</span><b className={tone(latest)}>{signed(latest, field === "ad_ratio" ? 2 : 1)}</b></div>
      <div style={{ flex: 1, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ReLineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} minTickGap={30} tickMargin={10} axisLine={false} tickLine={false} />
            <YAxis domain={[min ?? 'auto', max ?? 'auto']} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#374151', strokeWidth: 1, strokeDasharray: '4 4' }} />
            {zero && <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1} />}
            <Line type="monotone" dataKey={field} name={title} stroke={lineColor} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
          </ReLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AdvanceDeclineChart({ rows }: { rows: Row[] }) {
  if (!rows || rows.length === 0) return null;
  const chartData = rows.map(r => ({ time: timeStr(r.time), Adv: n(r.advancing, 0), Dec: n(r.declining, 0), Unch: n(r.unchanged, 0) }));

  return (
    <div className="breadth-chart" style={{ height: '280px', display: 'flex', flexDirection: 'column' }}>
      <div className="breadth-chart-title">
        <span>ADVANCE / DECLINE</span>
        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontWeight: 'bold' }}>
          <span style={{ color: '#10b981' }}>— Adv</span><span style={{ color: '#ef4444' }}>— Dec</span><span style={{ color: '#94a3b8' }}>- - Unch</span>
        </div>
      </div>
      <div style={{ flex: 1, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ReLineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} minTickGap={30} tickMargin={10} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#374151', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Line type="monotone" dataKey="Adv" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="Dec" stroke="#ef4444" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="Unch" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
          </ReLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function NetAdvancesChart({ rows }: { rows: Row[] }) {
  if (!rows || rows.length === 0) return null;
  const latest = n(rows[rows.length - 1]?.net_advances, 0);
  const chartData = rows.map(r => ({ time: timeStr(r.time), net_advances: n(r.net_advances, 0) }));

  return (
    <div className="breadth-chart" style={{ height: '280px', display: 'flex', flexDirection: 'column' }}>
      <div className="breadth-chart-title"><span>NET ADVANCES</span><b className={tone(latest)}>{signed(latest, 0)}</b></div>
      <div style={{ flex: 1, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} minTickGap={30} tickMargin={10} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <ReferenceLine y={0} stroke="#4b5563" strokeWidth={1.5} />
            <Bar dataKey="net_advances" name="Net Advances" isAnimationActive={false}>
              {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.net_advances >= 0 ? '#10b981' : '#ef4444'} />)}
            </Bar>
          </ReBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DualParticipationChart({ rows }: { rows: Row[] }) {
  if (!rows || rows.length === 0) return null;
  const chartData = rows.map(r => ({ time: timeStr(r.time), Up: n(r.stocks_up_pct, 0), Down: n(r.stocks_down_pct, 0) }));

  return (
    <div className="breadth-chart" style={{ height: '280px', display: 'flex', flexDirection: 'column' }}>
      <div className="breadth-chart-title">
        <span>STOCK PARTICIPATION %</span>
        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontWeight: 'bold' }}>
          <span style={{ color: '#10b981' }}>— UP</span><span style={{ color: '#ef4444' }}>— DOWN</span>
        </div>
      </div>
      <div style={{ flex: 1, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ReLineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} minTickGap={30} tickMargin={10} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#374151', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <ReferenceLine y={50} stroke="#d1d5db" strokeWidth={1} strokeDasharray="3 3" />
            <Line type="monotone" dataKey="Up" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="Down" stroke="#ef4444" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
          </ReLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Breadth() {
  const { data: currentData } = useSWR("/api/intraday-pressure/current", fetcher, { refreshInterval: 60000 });
  const { data: timelineData } = useSWR("/api/intraday-pressure/timeline", fetcher, { refreshInterval: 60000 });

  const current = currentData?.data ?? currentData;
  const timeline = currentData?.timeline ?? timelineData?.data ?? timelineData ?? [];

  const rows = useMemo(() => [...timeline].filter(r => r?.time || r?.timestamp), [timeline]);
  const last = current ?? rows[rows.length - 1] ?? {};
  const vibe = String(last.market_vibe ?? "NEUTRAL");
  const rating = String(last.overall_rating ?? "NEUTRAL");
  const momentum = String(last.momentum ?? "—");
  const character = String(last.market_character ?? "—");
  const composite = n(last.composite_score, 0);
  const adv = n(last.adv ?? last.advancing);
  const dec = n(last.dec ?? last.declining);
  const unc = n(last.unchanged);
  const rawRatio = n(last.tv_ad_ratio ?? last.ad_ratio, NaN); const ratio = Number.isFinite(rawRatio) && rawRatio > 0 ? rawRatio : (dec > 0 ? adv / dec : 0);
  const net = n(last.tv_net_advances ?? last.net_advances);
  const updated = String(last.timestamp ?? "").replace("T", " ").slice(0, 19);

  return <div className="page breadth-page">
    <div className="breadth-head">
      <div>
        <div className="eyebrow">INTRADAY INTERNALS · ENGINE V3</div>
        <h1>Market Breadth</h1>
        <p className="lead">Follow the market from the opening print to the latest pressure snapshot.</p>
      </div>
    </div>

    <div className={`breadth-vibe breadth-vibe-hero ${vibe.toLowerCase()}`}>
      <strong>● {vibe} MARKET VIBE</strong>
      <span>{rating} · {momentum}</span>
    </div>

    <div className="breadth-kpis">
      <Kpi label="COMPOSITE PRESSURE" value={signed(composite)} cls={tone(composite)} />
      <Kpi label="ADVANCES" value={adv} cls="up" />
      <Kpi label="DECLINES" value={dec} cls="down" />
      <Kpi label="A / D RATIO" value={fmt(ratio, 2)} cls={ratio >= 1 ? "up" : "down"} />
      <Kpi label="NET ADVANCES" value={signed(net, 0)} cls={tone(net)} />
      <Kpi label="UNCHANGED" value={unc} cls="flat" />
    </div>

    <div className="breadth-ad-bar">
      <div className="ad-fill" style={{ width: `${adv + dec ? Math.max(0, Math.min(100, adv / (adv + dec) * 100)) : 50}%` }} />
      <div className="ad-label"><b>{adv} ADV</b><span>{adv + dec ? ((adv / (adv + dec)) * 100).toFixed(1) : "0"}% of classified</span><b>{dec} DEC</b></div>
    </div>

    <div className="breadth-status-row">
      <span>MARKET CHARACTER <b>{character}</b></span>
      <span>PRESSURE <b className={tone(composite)}>{signed(composite)}</b></span>
      <span>15M Δ <b className={tone(n(last.pressure_change_recent_15m))}>{signed(last.pressure_change_recent_15m)}</b></span>
      <span>ACCELERATION <b className={tone(n(last.pressure_acceleration))}>{signed(last.pressure_acceleration)}</b></span>
      <span>UPDATED <b>{updated || "—"}</b></span>
    </div>

    <section className="breadth-section">
      <div className="breadth-section-head"><h2>INTRADAY MARKET PROGRESSION</h2><span>Seamless background refresh</span></div>
      <div className="breadth-chart-grid">
        <LineChart rows={rows} field="composite_score" title="COMPOSITE PRESSURE" min={-100} max={100} zero />
        <AdvanceDeclineChart rows={rows} />
        <LineChart rows={rows} field="breadth_score" title="BREADTH PRESSURE" min={-100} max={100} zero />
        <LineChart rows={rows} field="sector_score" title="SECTOR PRESSURE" min={-100} max={100} zero />
        <LineChart rows={rows} field="stock_score" title="STOCK PARTICIPATION PRESSURE" min={-100} max={100} zero />
        <NetAdvancesChart rows={rows} />
        <LineChart rows={rows.map(r => ({ ...r, ad_ratio: (n(r.ad_ratio, NaN) > 0 ? n(r.ad_ratio, NaN) : (n(r.declining) > 0 ? n(r.advancing) / n(r.declining) : NaN)) }))} field="ad_ratio" title="A / D RATIO" min={0.5} zero={false} colorMode="ad" />
        <DualParticipationChart rows={rows} />
      </div>
    </section>

    <section className="breadth-section timeline-section">
      <div className="breadth-section-head"><h2>INTRADAY DECISION TIMELINE</h2></div>
      <div className="timeline-wrap">
        <table className="breadth-timeline">
          <thead><tr><th>TIME</th><th>COMPOSITE</th><th>RATING</th><th>MOMENTUM</th><th>CHARACTER</th><th>BREADTH</th><th>SECTOR</th><th>STOCKS</th><th>ADV</th><th>DEC</th><th>A/D</th><th>NET A-D</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>
            <td>{timeStr(r.time) ?? "—"}</td>
            <td className={tone(n(r.composite_score))}>{signed(r.composite_score)}</td>
            <td>{r.overall_rating ?? "—"}</td>
            <td>{r.momentum ?? "—"}</td>
            <td>{r.market_character ?? "—"}</td>
            <td className={tone(n(r.breadth_score))}>{signed(r.breadth_score)}</td>
            <td className={tone(n(r.sector_score))}>{signed(r.sector_score)}</td>
            <td className={tone(n(r.stock_score))}>{signed(r.stock_score)}</td>
            <td>{n(r.advancing)}</td><td>{n(r.declining)}</td>
            <td className={(n(r.ad_ratio, NaN) > 0 ? n(r.ad_ratio, NaN) : (n(r.declining) > 0 ? n(r.advancing) / n(r.declining) : 0)) >= 1 ? "up" : "down"}>{fmt(n(r.ad_ratio, NaN) > 0 ? n(r.ad_ratio, NaN) : (n(r.declining) > 0 ? n(r.advancing) / n(r.declining) : 0), 2)}</td>
            <td className={tone(n(r.net_advances))}>{signed(r.net_advances, 0)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </div>
}

function Kpi({ label, value, cls }: { label: string, value: any, cls: string }) {
  return <div className="breadth-kpi"><span>{label}</span><strong className={cls}>{value}</strong></div>
}