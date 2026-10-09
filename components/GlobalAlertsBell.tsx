"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {Bell, X} from "lucide-react";

type AlertItem={id:string;type:string;symbol:string;message:string;time:string};

export default function GlobalAlertsBell(){
  const [open,setOpen]=useState(false);
  const [items,setItems]=useState<AlertItem[]>([]);

  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem("midas-alert-feed")||"[]");
      setItems(Array.isArray(raw)?raw.slice(0,30):[]);
    }catch{setItems([])}
  }

  useEffect(()=>{
    load();
    const onAlert=()=>load();
    window.addEventListener("midas-alert",onAlert);
    return()=>window.removeEventListener("midas-alert",onAlert);
  },[]);

  function clear(){
    localStorage.removeItem("midas-alert-feed");
    setItems([]);
  }

  return (
    <div className="global-alert-bell">
      <button
        className={`global-alert-bell-btn ${open?"active":""}`}
        onClick={()=>{setOpen(v=>!v);load()}}
        title="Open MIDAS alerts"
        aria-label="Open MIDAS alerts"
      >
        <Bell size={18}/>
        {items.length>0&&<span className="global-alert-count">{Math.min(items.length,99)}</span>}
      </button>

      {open&&(
        <div className="global-alert-panel">
          <div className="global-alert-panel-head">
            <div>
              <div className="eyebrow">LIVE ALERTS</div>
              <b>MIDAS ALERTS</b>
            </div>
            <div className="global-alert-panel-actions">
              {items.length>0&&<button onClick={clear}>CLEAR</button>}
              <button onClick={()=>setOpen(false)} aria-label="Close alerts"><X size={16}/></button>
            </div>
          </div>

          {!items.length ? (
            <div className="global-alert-empty">No alerts yet today.</div>
          ) : (
            <div className="global-alert-list">
              {items.map((item,i)=>(
                <div className="global-alert-item" key={`${item.id}-${i}`}>
                  <div className={`global-alert-type ${item.type.includes("DUAL")?"dual":"high"}`}>
                    {item.type.includes("DUAL")?"⚡":"🔥"} {item.type}
                  </div>
                  <div className="global-alert-symbol">{item.symbol||"—"}</div>
                  <div className="global-alert-message">{item.message}</div>
                  <div className="global-alert-time">{item.time||"—"}</div>
                </div>
              ))}
            </div>
          )}

          <Link href="/alerts" className="global-alert-view" onClick={()=>setOpen(false)}>
            OPEN ALERTS PAGE →
          </Link>
        </div>
      )}
    </div>
  );
}
