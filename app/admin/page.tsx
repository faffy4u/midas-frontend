"use client";
import {useEffect,useState} from "react"; import {api} from "../../lib/api";
export default function Admin(){const[health,setHealth]=useState<any>(null),[msg,setMsg]=useState("");
async function run(path:string){try{const d=await api<any>(path,{method:"POST"});setMsg(JSON.stringify(d))}catch(e){setMsg("Request failed — login/admin permission may be required.")}}
useEffect(()=>{api<any>("/api/system/health").then(setHealth).catch(()=>setHealth(null))},[]);
return <div className="page"><div className="eyebrow">SYSTEM CONTROL</div><h1>Admin Console</h1><p className="lead">Operational controls remain behind the FastAPI admin authorization layer.</p>
<div className="admin-grid"><div className="panel"><div className="paneltitle">SYSTEM HEALTH</div><div className="healthrow"><b>{health?.status||"UNKNOWN"}</b><span>{health?.service||"MIDAS API"}</span></div></div>
<div className="panel"><div className="paneltitle">OPERATIONS</div><button className="control" onClick={()=>run("/api/system/maintenance/true")}>ENABLE MAINTENANCE</button><button className="control" onClick={()=>run("/api/system/maintenance/false")}>DISABLE MAINTENANCE</button><button className="control" onClick={()=>run("/api/system/fetch-pause/true")}>PAUSE FETCH</button><button className="control" onClick={()=>run("/api/system/fetch-pause/false")}>RESUME FETCH</button></div></div>
{msg&&<div className="notice">{msg}</div>}</div>}