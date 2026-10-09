"use client";

import "../styles/globals.css";
import {ReactNode,useEffect,useState} from "react";
import AlertWatcher from "../components/AlertWatcher";
import GlobalAlertsBell from "../components/GlobalAlertsBell";
import Link from "next/link";
import {
  Activity,Bell,CandlestickChart,Gauge,LayoutDashboard,Settings2,
  PanelLeftClose,PanelLeftOpen
} from "lucide-react";

const nav=[
  ["/","Command",LayoutDashboard],
  ["/confluence","Confluence",Gauge],
  ["/market","Market",Activity],
  ["/breadth","Breadth",CandlestickChart],
  ["/alerts","Alerts",Bell],
  ["/admin","Admin",Settings2]
] as const;

export default function RootLayout({children}:{children:ReactNode}){
  const [collapsed,setCollapsed]=useState(false);
  const [theme,setTheme]=useState<"dark"|"light">("dark");

  useEffect(()=>{
    try{
      const savedCollapse=localStorage.getItem("midas-sidebar-collapsed")==="1";
      const savedTheme=(localStorage.getItem("midas-theme") as "dark"|"light"|null)||"dark";
      setCollapsed(savedCollapse);
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme",savedTheme);
    }catch{}
  },[]);

  function toggleSidebar(){
    const next=!collapsed;
    setCollapsed(next);
    try{localStorage.setItem("midas-sidebar-collapsed",next?"1":"0")}catch{}
  }

  function setThemeMode(next:"dark"|"light"){
    setTheme(next);
    document.documentElement.setAttribute("data-theme",next);
    try{localStorage.setItem("midas-theme",next)}catch{}
  }

  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="brand"><span className="brand-dot"/> MIDAS <small>MARKET TERMINAL</small></div>
          <div className="market-state">
            <span className="pulse"/> MARKET DATA ONLINE <span className="sep"/> API <b>FASTAPI</b>
          </div>
          <div className="topbar-actions"><GlobalAlertsBell/></div>
        </header>

        <div className={`shell ${collapsed?"sidebar-collapsed":""}`}>
          <aside className={`sidebar ${collapsed?"collapsed":""}`}>
            <div className="sidebar-collapse-row">
              <button
                type="button"
                className="sidebar-collapse-btn"
                onClick={toggleSidebar}
                title={collapsed?"Show sidebar":"Hide sidebar"}
                aria-label={collapsed?"Show sidebar":"Hide sidebar"}
              >
                {collapsed?<PanelLeftOpen size={17}/>:<PanelLeftClose size={17}/>}
                {!collapsed&&<span>HIDE SIDEBAR</span>}
              </button>
            </div>

            {!collapsed&&(
              <>
                <div className="sidebar-theme">
                  <div className="sidebar-theme-label">THEME</div>
                  <div className="sidebar-theme-buttons">
                    <button type="button" className={theme==="dark"?"active":""} onClick={()=>setThemeMode("dark")}>🌙 Dark</button>
                    <button type="button" className={theme==="light"?"active":""} onClick={()=>setThemeMode("light")}>☀ Light</button>
                  </div>
                </div>
                <button type="button" className="sidebar-refresh-btn" onClick={()=>window.dispatchEvent(new Event("midas-refresh"))} title="Refresh latest CSV/API data now">
                  ↻ <span>REFRESH DATA</span>
                </button>
              </>
            )}

            {collapsed&&<button type="button" className="sidebar-refresh-icon" onClick={()=>window.dispatchEvent(new Event("midas-refresh"))} title="Refresh latest data" aria-label="Refresh latest data">↻</button>}

            <nav className="sidebar-nav">
              {nav.map(([href,label,Icon])=>(
                <Link key={href} href={href} className="navitem" title={collapsed?label:undefined}>
                  <Icon size={17}/>
                  {!collapsed&&<span>{label}</span>}
                </Link>
              ))}
            </nav>

            {!collapsed&&(
              <div className="sidefoot">STAGE 9<br/><span>TERMINAL BUILD</span></div>
            )}
          </aside>

          <main className="main">{children}</main>
          <AlertWatcher/>
        </div>
      </body>
    </html>
  );
}
