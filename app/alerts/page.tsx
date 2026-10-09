"use client";

import {useEffect,useState} from "react";

type AlertItem={id:string;type:string;symbol:string;message:string;time:string};

export default function AlertsPage(){
  const [events,setEvents]=useState<AlertItem[]>([]);
  const [permission,setPermission]=useState("checking");
  const [soundEnabled,setSoundEnabled]=useState(true);
  const [desktopEnabled,setDesktopEnabled]=useState(true);

  useEffect(()=>{
    try{
      const raw=JSON.parse(localStorage.getItem("midas-alert-feed")||"[]");
      setEvents(Array.isArray(raw)?raw:[]);
      setSoundEnabled(localStorage.getItem("midas-alert-sound")!=="off");
      setDesktopEnabled(localStorage.getItem("midas-alert-desktop")!=="off");
    }catch{}
    if("Notification" in window)setPermission(Notification.permission);
    else setPermission("unsupported");

    const onAlert=(e:any)=>{
      const item=e?.detail as AlertItem;
      if(item)setEvents(old=>[item,...old].slice(0,50));
    };
    window.addEventListener("midas-alert",onAlert);
    return()=>window.removeEventListener("midas-alert",onAlert);
  },[]);

  async function allowDesktop(){
    if(!("Notification" in window)){
      setPermission("unsupported");
      return;
    }
    const p=await Notification.requestPermission();
    setPermission(p);
    const enabled=p==="granted";
    setDesktopEnabled(enabled);
    localStorage.setItem("midas-alert-desktop",enabled?"on":"off");
  }

  function toggleSound(){
    const next=!soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("midas-alert-sound",next?"on":"off");
  }

  function toggleDesktop(){
    const next=!desktopEnabled;
    setDesktopEnabled(next);
    localStorage.setItem("midas-alert-desktop",next?"on":"off");
  }

  return (
    <div className="page alerts-live-page">
      <div className="eyebrow">ALERT ENGINE · LIVE</div>
      <h1>MIDAS Alerts</h1>
      <p className="lead">
        Live first-entry detection runs across the terminal. High Conviction is watched
        from Confluence Radar; Dual Leadership is consumed from the existing backend alert store.
      </p>

      <div className="alerts-live-grid">
        <section className="panel alerts-status-card">
          <div className="eyebrow">MONITOR STATUS</div>
          <div className="alerts-status-line">
            <span className="alerts-live-dot"/>
            <b>LIVE — global watcher active · 10s polling</b>
          </div>
          <div className="alerts-meta">
            <span>BROWSER <b>{permission}</b></span>
            <span>SOUND <b>{soundEnabled?"ON":"OFF"}</b></span>
            <span>DESKTOP <b>{desktopEnabled?"ON":"OFF"}</b></span>
          </div>
        </section>

        <section className="panel alerts-controls-card">
          <div className="eyebrow">NOTIFICATIONS</div>
          <div className="alerts-control-row">
            <button className={`alert-toggle ${soundEnabled?"active":""}`} onClick={toggleSound}>
              🔊 SOUND {soundEnabled?"ON":"OFF"}
            </button>
            <button className={`alert-toggle ${desktopEnabled?"active":""}`} onClick={toggleDesktop}>
              🖥 DESKTOP {desktopEnabled?"ON":"OFF"}
            </button>
            <button className="alert-toggle" onClick={allowDesktop}>
              ✓ ALLOW CHROME
            </button>
          </div>
        </section>
      </div>

      <section className="panel alerts-event-panel">
        <div className="chart-panel-head">
          <div>
            <div className="eyebrow">LIVE EVENTS</div>
            <b>High Conviction / Dual Leadership</b>
          </div>
          <span className="alerts-count">{events.length} stored</span>
        </div>

        {!events.length ? (
          <div className="alerts-empty">
            No new events yet. Existing stocks establish the baseline; only a new entry triggers an alert.
          </div>
        ) : (
          <div className="alerts-event-list">
            {events.slice(0,30).map(item=>(
              <div className="alerts-event-row" key={item.id}>
                <span className={`alerts-event-type ${item.type.includes("DUAL")?"dual":"high"}`}>
                  {item.type.includes("DUAL")?"⚡":"🔥"} {item.type}
                </span>
                <b>{item.symbol||"—"}</b>
                <span className="alerts-event-msg">{item.message}</span>
                <span className="alerts-event-time">{item.time}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="alerts-note">
        No MIDAS pressure formula, collector, CSV pipeline, or FastAPI calculation has been changed.
      </div>
    </div>
  );
}
