"use client";

import {useEffect,useRef,useState} from "react";
import {api} from "../lib/api";

type AlertItem={id:string;type:string;symbol:string;message:string;time:string};

function symbolOf(r:any){
  return String(r?.Ticker??r?.Symbol??r?.symbol??r?.ticker??"").trim().toUpperCase();
}
function typeOf(r:any){
  return String(r?.type??r?.Type??r?.event_type??r?.category??r?.alert_type??"").trim().toUpperCase();
}
function timeOf(r:any){
  return String(r?.timestamp??r?.time??r?.created_at??r?.createdAt??"").replace("T"," ").slice(0,19);
}
function extract(x:any){
  if(Array.isArray(x))return x;
  if(Array.isArray(x?.events))return x.events;
  if(Array.isArray(x?.alerts))return x.alerts;
  if(Array.isArray(x?.items))return x.items;
  if(Array.isArray(x?.data))return x.data;
  return [];
}

export default function AlertWatcher(){
  const seen=useRef<Set<string>>(new Set());
  const initialized=useRef(false);
  const [toast,setToast]=useState<AlertItem|null>(null);

  useEffect(()=>{
    function save(item:AlertItem){
      try{
        const old=JSON.parse(localStorage.getItem("midas-alert-feed")||"[]");
        const next=[item,...old].slice(0,50);
        localStorage.setItem("midas-alert-feed",JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("midas-alert",{detail:item}));
      }catch{}
    }

    async function sound(){
      try{
        if(localStorage.getItem("midas-alert-sound")==="off")return;
        const Ctx=window.AudioContext||(window as any).webkitAudioContext;
        if(!Ctx)return;
        const ctx=new Ctx();
        await ctx.resume();
        const now=ctx.currentTime;
        const master=ctx.createGain();
        master.gain.value=.11;
        master.connect(ctx.destination);
        [880,1175,1568].forEach((f,i)=>{
          const o=ctx.createOscillator(),g=ctx.createGain(),t=now+i*.11;
          o.type="sine";o.frequency.value=f;
          g.gain.setValueAtTime(.0001,t);
          g.gain.exponentialRampToValueAtTime(.6,t+.025);
          g.gain.exponentialRampToValueAtTime(.0001,t+.42);
          o.connect(g);g.connect(master);o.start(t);o.stop(t+.45);
        });
        window.setTimeout(()=>ctx.close(),1200);
      }catch{}
    }

    async function desktop(item:AlertItem){
      try{
        if(localStorage.getItem("midas-alert-desktop")==="off")return;
        if(!("Notification" in window))return;
        let p=Notification.permission;
        if(p!=="granted")return; // permission is requested from Alerts page
        new Notification(`MIDAS — ${item.type}`,{
          body:item.message,
          tag:`midas-${item.id}`,
          renotify:true
        });
      }catch{}
    }

    async function emit(item:AlertItem){
      setToast(item);
      window.setTimeout(()=>setToast(null),6000);
      save(item);
      void sound();
      void desktop(item);
    }

    async function poll(){
      const discovered:AlertItem[]=[];

      // Existing backend alert store: this is the source for Dual Leadership.
      try{
        const raw=await api<any>("/api/alerts");
        for(const r of extract(raw)){
          const type=typeOf(r);
          const symbol=symbolOf(r);
          const upper=`${type} ${String(r?.message??r?.msg??r?.description??"")}`.toUpperCase();
          if(!upper.includes("DUAL")&&!upper.includes("CONFLUENCE")&&!upper.includes("HIGH"))continue;
          discovered.push({
            id:String(r?.id??r?.event_id??`${type}|${symbol}|${timeOf(r)}`),
            type:upper.includes("DUAL")?"DUAL LEADERSHIP":upper.includes("CONFLUENCE")||upper.includes("HIGH")?"HIGH CONVICTION":type||"ALERT",
            symbol,
            message:String(r?.message??r?.msg??r?.description??`${symbol} ${type}`),
            time:timeOf(r)||new Date().toLocaleTimeString()
          });
        }
      }catch{}

      // Confluence feed: detect new first entries.
      try{
        const raw=await api<any>("/api/confluence");
        const rows=Array.isArray(raw?.rows)?raw.rows:Array.isArray(raw?.data)?raw.data:[];
        const current=new Set(rows.map(symbolOf).filter(Boolean));

        if(!initialized.current){
          for(const s of current)seen.current.add(`HC|${s}`);
        }else{
          for(const s of current){
            const key=`HC|${s}`;
            if(!seen.current.has(key)){
              discovered.push({
                id:`${key}|${Date.now()}`,
                type:"HIGH CONVICTION",
                symbol:s,
                message:`${s} entered High Conviction`,
                time:new Date().toLocaleTimeString()
              });
              seen.current.add(key);
            }
          }
        }

        for(const key of [...seen.current]){
          if(key.startsWith("HC|")&&!current.has(key.slice(3)))seen.current.delete(key);
        }
      }catch{}

      initialized.current=true;

      for(const item of discovered){
        const dedupe=`EVENT|${item.id}`;
        if(seen.current.has(dedupe))continue;
        seen.current.add(dedupe);
        await emit(item);
      }
    }

    poll();
    const id=window.setInterval(poll,10000);
    return()=>window.clearInterval(id);
  },[]);

  if(!toast)return null;

  return (
    <div className={`global-alert-toast ${toast.type.includes("DUAL")?"dual":"high"}`}>
      <strong>{toast.type.includes("DUAL")?"⚡":"🔥"} {toast.type}</strong>
      <span>{toast.message}</span>
    </div>
  );
}
