// FA-ONLINE â€” FÃºtbol Ajedrez con multijugador online via Supabase
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// â”€â”€ Supabase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SUPABASE_URL = "https://hfompifwdshfspdmkwfk.supabase.co";
const SUPABASE_KEY = "sb_publishable_mlqt3MhnZq5HVR2EtL1sRQ_0plbb04V";
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// â”€â”€ Constantes del juego â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const COLS=11,ROWS=17,CX=5,CY=8;
const TEAM_A="A",TEAM_B="B";
const GOAL_COLS=[4,5,6],SMALL_COLS=[3,4,5,6,7],LARGE_COLS=[2,3,4,5,6,7,8];
const TOP_GOAL=0,BOT_GOAL=16;
const TOP_LARGE=[1,2,3,4],BOT_LARGE=[12,13,14,15];
const TOP_SMALL=[1,2],BOT_SMALL=[14,15];
const A_ROWS=[1,2,3,4,5,6,7],B_ROWS=[9,10,11,12,13,14,15];
const PMOVE={P:1,R:3,T:4,C:null};
const PNAME={P:"Portero",R:"Reyna",T:"Torre",C:"Caballo"};
const PCOL={P:"#fbbf24",R:"#f87171",T:"#60a5fa",C:"#34d399"};
const PSHAPE={P:"6px",R:"6px",T:"3px",C:"50%"};
const KDIRS=[[3,1],[3,-1],[-3,1],[-3,-1],[1,3],[1,-3],[-1,3],[-1,-3]];
const COL_LABELS=["A","B","C","D","E","F","G","H","I","J","K"];
const CW8=[[-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1]];
const FORMATIONS=[
  {label:"4-1-1",T:4,C:1,R:1},{label:"3-2-1",T:3,C:2,R:1},
  {label:"3-1-2",T:3,C:1,R:2},{label:"2-3-1",T:2,C:3,R:1},
  {label:"2-2-2",T:2,C:2,R:2},{label:"2-1-3",T:2,C:1,R:3},
  {label:"1-3-2",T:1,C:3,R:2},{label:"1-2-3",T:1,C:2,R:3},
];

// â”€â”€ Utilidades â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const inB=(r,c)=>r>=0&&r<ROWS&&c>=0&&c<COLS;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sg=x=>x>0?1:x<0?-1:0;
const pat=(ps,r,c)=>ps.find(p=>p.row===r&&p.col===c)||null;
const inTL=(r,c)=>TOP_LARGE.includes(r)&&LARGE_COLS.includes(c);
const inBL=(r,c)=>BOT_LARGE.includes(r)&&LARGE_COLS.includes(c);
const inTS=(r,c)=>TOP_SMALL.includes(r)&&SMALL_COLS.includes(c);
const inBS=(r,c)=>BOT_SMALL.includes(r)&&SMALL_COLS.includes(c);

function cellBg(r,c){
  if((r===TOP_GOAL||r===BOT_GOAL)&&GOAL_COLS.includes(c))return"#163d22";
  if(inTS(r,c)||inBS(r,c))return"#1a5c2e";
  if(inTL(r,c)||inBL(r,c))return"#1e6835";
  return(r+c)%2===0?"#236b38":"#207032";
}

function spreadCols(n,lo,hi){
  if(n===0)return[];
  if(n===1)return[Math.round((lo+hi)/2)];
  return Array.from({length:n},(_,i)=>Math.round(lo+i*(hi-lo)/(n-1)));
}

let _uid=0;
function colsByCount(n){
  if(n===1)return[5];
  if(n===2)return[2,8];
  if(n===3)return[3,5,7];
  if(n===4)return[1,3,7,9];
  return spreadCols(n,1,9);
}

function defaultPieces(fm,team,kickWinner){
  const isA=team===TEAM_A;
  const ps=[];
  ps.push({id:++_uid,team,type:"P",row:isA?1:15,col:5,hasBall:false});
  colsByCount(fm.T).forEach(c=>ps.push({id:++_uid,team,type:"T",row:isA?2:14,col:c,hasBall:false}));
  colsByCount(fm.C).forEach(c=>ps.push({id:++_uid,team,type:"C",row:isA?5:12,col:c,hasBall:false}));
  colsByCount(fm.R).forEach(c=>ps.push({id:++_uid,team,type:"R",row:isA?6:10,col:c,hasBall:false}));
  if(kickWinner===team){
    const ri=ps.findIndex(p=>p.type==="R");
    if(ri>=0){ps[ri].row=CY;ps[ri].col=CX;ps[ri].hasBall=true;}
  }
  return ps;
}
function buildAll(fmA,fmB,kw){return[...defaultPieces(fmA,TEAM_A,kw),...defaultPieces(fmB,TEAM_B,kw)];}

// â”€â”€ LÃ³gica de movimiento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getMoves(piece,pieces,advUsed,ball){
  const{type,team,row,col,hasBall}=piece;
  const moves=[];
  if(type==="C"){
    for(const[dr,dc]of KDIRS){
      const nr=row+dr,nc=col+dc;
      if(!inB(nr,nc)||nr===0||nr===ROWS-1)continue;
      const o=pat(pieces,nr,nc);
      if(o&&o.team===team)continue;
      if(o&&o.type==="P"&&o.team!==team){
        const inL=team===TEAM_A?inBL(nr,nc):inTL(nr,nc);
        if(inL)continue;
      }
      const adr=Math.abs(dr),adc=Math.abs(dc),sdr=sg(dr),sdc=sg(dc);
      let porterBlock=false;
      for(let s=1;s<adr;s++){const op=pat(pieces,row+sdr*s,col);if(op&&op.type==="P"){porterBlock=true;break;}}
      if(!porterBlock){const ca=pat(pieces,row+dr,col);if(ca&&ca.type==="P")porterBlock=true;}
      if(!porterBlock){for(let s=1;s<adc;s++){const op=pat(pieces,row,col+sdc*s);if(op&&op.type==="P"){porterBlock=true;break;}}}
      if(!porterBlock){const cb=pat(pieces,row,col+dc);if(cb&&cb.type==="P")porterBlock=true;}
      if(porterBlock)continue;
      let stealPath=false;
      if(ball){
        const br=ball.row,bc=ball.col;
        const ballPiece=pat(pieces,br,bc);
        const ballIsOwnTeam=ballPiece&&ballPiece.team===team;
        if(!ballIsOwnTeam){
          if(!stealPath){
            for(let s=1;s<=adr&&!stealPath;s++){if(br===row+sdr*s&&bc===col)stealPath=true;}
            for(let s=1;s<adc&&!stealPath;s++){if(br===row+dr&&bc===col+sdc*s)stealPath=true;}
          }
          if(!stealPath){
            for(let s=1;s<=adc&&!stealPath;s++){if(br===row&&bc===col+sdc*s)stealPath=true;}
            for(let s=1;s<adr&&!stealPath;s++){if(br===row+sdr*s&&bc===col+dc)stealPath=true;}
          }
        }
      }
      const stealDest=!!(o&&ball&&o.row===ball.row&&o.col===ball.col&&o.team!==team);
      moves.push({row:nr,col:nc,steal:stealDest||stealPath,stealPath});
    }
    return moves;
  }
  let max=PMOVE[type];
  if(hasBall){
    if(type==="R"||type==="T")max=3;
    else max=Math.max(1,max-advUsed-1);
  }
  const dirs=type==="T"?[[0,1],[0,-1],[1,0],[-1,0]]:[[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
  for(const[dr,dc]of dirs){
    for(let s=1;s<=max;s++){
      const nr=clamp(row+dr*s,1,ROWS-2),nc=clamp(col+dc*s,0,COLS-1);
      const o=pat(pieces,nr,nc);
      const isBallHere=!!(ball&&ball.row===nr&&ball.col===nc);
      if(o){
        if(o.team!==team&&isBallHere)moves.push({row:nr,col:nc,steal:true,stealPath:false});
        break;
      }
      if(isBallHere&&!hasBall){
        const ballOwner=pat(pieces,nr,nc);
        if(!ballOwner||ballOwner.team!==team)moves.push({row:nr,col:nc,steal:true,stealPath:false});
        break;
      }
      moves.push({row:nr,col:nc,steal:false,stealPath:false});
      if(row+dr*s!==nr||col+dc*s!==nc)break;
    }
  }
  return moves;
}

function getShots(piece,pieces,team){
  const{type,row,col}=piece;
  const maxD=type==="P"?10:5;
  const oppGoalRow=team===TEAM_A?BOT_GOAL:TOP_GOAL;
  const ownGoalRow=team===TEAM_A?TOP_GOAL:BOT_GOAL;
  const dirs=[[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
  const out=[];
  for(const[dr,dc]of dirs){
    for(let s=1;s<=maxD;s++){
      const nr=row+dr*s,nc=col+dc*s;
      if(!inB(nr,nc))break;
      const isGoalCell=(nr===oppGoalRow||nr===ownGoalRow)&&GOAL_COLS.includes(nc);
      const o=pat(pieces,nr,nc);
      if(o){
        if(type==="P"){
          const oppSmall=o.type==="P"&&o.team!==team&&(team===TEAM_A?inBS(nr,nc):inTS(nr,nc));
          if(oppSmall)break;
          if(isGoalCell){out.push({row:nr,col:nc,isGoal:true,isOwn:o.team===team});break;}
          continue;
        }
        out.push({row:nr,col:nc,isGoal:isGoalCell,isOwn:o.team===team,targetId:o.id});
        break;
      }
      if((nr===0||nr===ROWS-1)&&!isGoalCell)break;
      out.push({row:nr,col:nc,isGoal:isGoalCell,isOwn:false});
      if(nr===0||nr===ROWS-1)break;
    }
  }
  return out;
}

// â”€â”€ Iconos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ICONS_CHESS={P:"â™š",R:"â™›",T:"â™œ",C:"â™ž"};

function MedievalIcon({type,team,size}){
  const isA=team===TEAM_A;
  const main=isA?"#3b82f6":"#ef4444";
  const light=isA?"#bfdbfe":"#fecaca";
  const s=size;
  if(type==="P")return(<svg width={s} height={s} viewBox="0 0 32 32"><rect x={2} y={2} width={28} height={28} rx={4} fill={isA?"#1e3a5f":"#5f1e1e"}/><ellipse cx={16} cy={14} rx={9} ry={10} fill={main}/><rect x={7} y={10} width={18} height={3} rx={1} fill={light}/><rect x={12} y={13} width={8} height={8} rx={1} fill={isA?"#1e3a5f":"#5f1e1e"}/><rect x={14} y={8} width={4} height={4} rx={1} fill={light}/></svg>);
  if(type==="T")return(<svg width={s} height={s} viewBox="0 0 32 32"><rect x={2} y={2} width={28} height={28} rx={4} fill={isA?"#1e3a5f":"#5f1e1e"}/><path d="M16 4 L26 8 L26 18 Q26 26 16 29 Q6 26 6 18 L6 8 Z" fill={main}/><path d="M16 7 L23 10 L23 18 Q23 24 16 27 Q9 24 9 18 L9 10 Z" fill={light} opacity="0.3"/><line x1={16} y1={8} x2={16} y2={26} stroke={light} strokeWidth={1.5}/><line x1={8} y1={14} x2={24} y2={14} stroke={light} strokeWidth={1.5}/></svg>);
  if(type==="C")return(<svg width={s} height={s} viewBox="0 0 32 32"><rect x={2} y={2} width={28} height={28} rx={14} fill={isA?"#1e3a5f":"#5f1e1e"}/><path d="M10 26 L10 18 Q10 10 16 8 Q20 6 22 10 L20 12 Q22 14 20 16 L18 14 Q16 16 16 20 L14 20 L14 26 Z" fill={main}/><circle cx={20} cy={11} r={1.5} fill={light}/><path d="M10 18 Q8 18 8 22 L12 22" fill={light} opacity="0.5"/></svg>);
  if(type==="R")return(<svg width={s} height={s} viewBox="0 0 32 32"><rect x={2} y={2} width={28} height={28} rx={4} fill={isA?"#1e3a5f":"#5f1e1e"}/><rect x={15} y={3} width={3} height={20} rx={1} fill={light}/><rect x={15} y={3} width={3} height={20} rx={1} fill={main} opacity="0.6"/><rect x={8} y={16} width={16} height={3} rx={1} fill={main}/><ellipse cx={16.5} cy={26} rx={3} ry={3} fill={main}/><polygon points="16,3 15,8 17,8" fill={light}/></svg>);
  return null;
}

function PieceIcon({type,team,size=32,iconSet="chess"}){
  const isA=team===TEAM_A;
  const bg=isA?"#1e40af":"#991b1b";
  const fg=isA?"#bfdbfe":"#fecaca";
  const border=isA?"#3b82f6":"#ef4444";
  if(iconSet==="chess"){
    return(<div style={{width:size,height:size,borderRadius:type==="C"?"50%":type==="T"?"4px":"6px",background:`linear-gradient(135deg,${bg},${bg}cc)`,border:`2px solid ${border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.55,lineHeight:1,color:fg,userSelect:"none",filter:"drop-shadow(0 1px 3px rgba(0,0,0,0.6))"}}>{ICONS_CHESS[type]}</div>);
  }
  return <MedievalIcon type={type} team={team} size={size}/>;
}

// â”€â”€ SVG del campo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FieldSVG({CS}){
  const W=COLS*CS,H=ROWS*CS,mx=W/2;
  const s1="rgba(255,255,255,0.55)",s2="rgba(255,255,255,0.75)";
  const arcR=2.2*CS,tSy=3.5*CS,tLBot=5*CS,bSy=13.5*CS,bLTop=12*CS;
  const tA=Math.acos((tLBot-tSy)/arcR),tX1=mx-arcR*Math.sin(tA),tX2=mx+arcR*Math.sin(tA);
  const bA=Math.acos((bSy-bLTop)/arcR),bX1=mx-arcR*Math.sin(bA),bX2=mx+arcR*Math.sin(bA);
  return(
    <svg width={W} height={H} style={{position:"absolute",top:0,left:0,pointerEvents:"none",zIndex:5}}>
      <rect x={1} y={CS} width={W-2} height={H-2*CS} fill="none" stroke={s2} strokeWidth={2}/>
      <line x1={0} y1={H/2} x2={W} y2={H/2} stroke={s1} strokeWidth={1.5}/>
      <circle cx={mx} cy={H/2} r={CS*1.8} fill="none" stroke={s1} strokeWidth={1.5}/>
      <rect x={4*CS} y={0} width={3*CS} height={CS} fill="rgba(0,0,0,0.4)" stroke={s2} strokeWidth={2}/>
      <rect x={3*CS} y={CS} width={5*CS} height={2*CS} fill="none" stroke={s1} strokeWidth={1.5}/>
      <rect x={2*CS} y={CS} width={7*CS} height={4*CS} fill="none" stroke={s1} strokeWidth={1.5}/>
      <path d={`M ${tX1} ${tLBot} A ${arcR} ${arcR} 0 0 1 ${tX2} ${tLBot}`} fill="none" stroke={s1} strokeWidth={1.5}/>
      <rect x={4*CS} y={16*CS} width={3*CS} height={CS} fill="rgba(0,0,0,0.4)" stroke={s2} strokeWidth={2}/>
      <rect x={3*CS} y={14*CS} width={5*CS} height={2*CS} fill="none" stroke={s1} strokeWidth={1.5}/>
      <rect x={2*CS} y={12*CS} width={7*CS} height={4*CS} fill="none" stroke={s1} strokeWidth={1.5}/>
      <path d={`M ${bX1} ${bLTop} A ${arcR} ${arcR} 0 0 0 ${bX2} ${bLTop}`} fill="none" stroke={s1} strokeWidth={1.5}/>
    </svg>
  );
}

function FieldWithLabels({CS,children}){
  return(
    <div style={{display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex"}}>
        <div style={{position:"relative"}}>{children}</div>
        <div style={{display:"flex",flexDirection:"column",marginLeft:3}}>
          {Array.from({length:ROWS},(_,i)=>(
            <div key={i} style={{height:CS,width:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"rgba(255,255,255,0.35)",fontFamily:"monospace"}}>{i+1}</div>
          ))}
        </div>
      </div>
      <div style={{display:"flex",marginTop:2}}>
        {COL_LABELS.map(l=>(<div key={l} style={{width:CS,textAlign:"center",fontSize:8,color:"rgba(255,255,255,0.35)",fontFamily:"monospace"}}>{l}</div>))}
      </div>
    </div>
  );
}

function Fold({title,children,defaultOpen=false}){
  const[open,setOpen]=useState(defaultOpen);
  return(
    <div style={{background:"#0f1c2e",border:"1px solid #1f2937",borderRadius:8,overflow:"hidden"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 11px",cursor:"pointer",userSelect:"none"}}>
        <span style={{fontSize:9,color:"#6b7280",letterSpacing:2,fontWeight:700}}>{title}</span>
        <span style={{fontSize:9,color:"#374151",display:"inline-block",transform:open?"rotate(180deg)":"none"}}>â–¼</span>
      </div>
      {open&&<div style={{padding:"8px 11px 11px",borderTop:"1px solid #1f2937"}}>{children}</div>}
    </div>
  );
}

// â”€â”€ LOBBY SCREEN (Online) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LobbyScreen({onJoinGame,onBack}){
  const[mode,setMode]=useState(null); // "create" | "join"
  const[roomCode,setRoomCode]=useState("");
  const[inputCode,setInputCode]=useState("");
  const[status,setStatus]=useState("");
  const[loading,setLoading]=useState(false);

  async function createRoom(){
    setLoading(true);
    setStatus("Creando sala...");
    const code=Math.random().toString(36).substring(2,8).toUpperCase();
    const{error}=await sb.from("rooms").insert({id:code,player_a:"A",status:"waiting"});
    if(error){setStatus("Error: "+error.message);setLoading(false);return;}
    const{error:e2}=await sb.from("game_state").insert({room_id:code,state:{phase:"lobby",team:"A"}});
    if(e2){setStatus("Error: "+e2.message);setLoading(false);return;}
    setRoomCode(code);
    setStatus("Sala creada. Esperando rival...");
    setLoading(false);
    // Subscribe waiting for player B
    const channel=sb.channel("room:"+code)
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"rooms",filter:`id=eq.${code}`},payload=>{
        if(payload.new.status==="ready"){
          channel.unsubscribe();
          onJoinGame(code,"A");
        }
      }).subscribe();
  }

  async function joinRoom(){
    const code=inputCode.trim().toUpperCase();
    if(!code){setStatus("Ingresa un cÃ³digo.");return;}
    setLoading(true);
    setStatus("Buscando sala...");
    const{data,error}=await sb.from("rooms").select("*").eq("id",code).single();
    if(error||!data){setStatus("Sala no encontrada.");setLoading(false);return;}
    if(data.status!=="waiting"){setStatus("La sala ya estÃ¡ en juego.");setLoading(false);return;}
    const{error:e2}=await sb.from("rooms").update({player_b:"B",status:"ready"}).eq("id",code);
    if(e2){setStatus("Error al unirse.");setLoading(false);return;}
    setLoading(false);
    onJoinGame(code,"B");
  }

  return(
    <div style={{minHeight:"100vh",background:"#0a1628",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace",padding:20}}>
      <div style={{background:"#0f1c2e",border:"2px solid #10b981",borderRadius:18,padding:"32px 36px",width:420,boxShadow:"0 0 60px rgba(16,185,129,0.2)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:36,marginBottom:6}}>ðŸŒ</div>
          <div style={{fontSize:22,fontWeight:900,color:"white",letterSpacing:2}}>ONLINE</div>
          <div style={{fontSize:10,color:"#6b7280",marginTop:4,letterSpacing:3}}>MULTIJUGADOR EN LÃNEA</div>
        </div>

        {!mode&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <button onClick={()=>setMode("create")} style={{background:"linear-gradient(135deg,#065f46,#022c22)",border:"2px solid #10b981",borderRadius:12,color:"white",padding:"16px",cursor:"pointer",fontFamily:"monospace",fontSize:13,fontWeight:900,letterSpacing:2}}>
              âž• CREAR SALA
            </button>
            <button onClick={()=>setMode("join")} style={{background:"linear-gradient(135deg,#1e3a5f,#0a1628)",border:"2px solid #3b82f6",borderRadius:12,color:"white",padding:"16px",cursor:"pointer",fontFamily:"monospace",fontSize:13,fontWeight:900,letterSpacing:2}}>
              ðŸ”— UNIRSE A SALA
            </button>
            <button onClick={onBack} style={{background:"transparent",border:"1px solid #374151",borderRadius:10,color:"#6b7280",padding:"10px",cursor:"pointer",fontFamily:"monospace",fontSize:11}}>
              â† Volver
            </button>
          </div>
        )}

        {mode==="create"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {!roomCode?(
              <button onClick={createRoom} disabled={loading} style={{background:"linear-gradient(135deg,#065f46,#022c22)",border:"2px solid #10b981",borderRadius:12,color:"white",padding:"16px",cursor:loading?"not-allowed":"pointer",fontFamily:"monospace",fontSize:13,fontWeight:900,opacity:loading?0.7:1}}>
                {loading?"Creando...":"âœ¨ GENERAR SALA"}
              </button>
            ):(
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:10,color:"#6b7280",marginBottom:8}}>CÃ“DIGO DE SALA</div>
                <div style={{fontSize:36,fontWeight:900,color:"#10b981",letterSpacing:8,background:"#052e16",border:"2px solid #10b981",borderRadius:12,padding:"16px",marginBottom:12}}>
                  {roomCode}
                </div>
                <div style={{fontSize:10,color:"#9ca3af",marginBottom:4}}>Comparte este cÃ³digo con tu rival</div>
                <button onClick={()=>navigator.clipboard.writeText(roomCode)} style={{background:"#1f2937",border:"1px solid #374151",borderRadius:8,color:"#e5e7eb",padding:"8px 16px",cursor:"pointer",fontFamily:"monospace",fontSize:10,marginBottom:12}}>
                  ðŸ“‹ Copiar cÃ³digo
                </button>
              </div>
            )}
            {status&&<div style={{fontSize:10,color:status.includes("Error")?"#ef4444":"#6ee7b7",textAlign:"center",padding:"8px",background:"#052e16",borderRadius:8}}>{status}</div>}
            <button onClick={()=>{setMode(null);setRoomCode("");setStatus("");}} style={{background:"transparent",border:"1px solid #374151",borderRadius:10,color:"#6b7280",padding:"10px",cursor:"pointer",fontFamily:"monospace",fontSize:11}}>
              â† Volver
            </button>
          </div>
        )}

        {mode==="join"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <div style={{fontSize:10,color:"#6b7280",marginBottom:6,letterSpacing:2}}>CÃ“DIGO DE SALA</div>
              <input
                value={inputCode}
                onChange={e=>setInputCode(e.target.value.toUpperCase())}
                onKeyDown={e=>e.key==="Enter"&&joinRoom()}
                placeholder="XXXXXX"
                maxLength={6}
                style={{width:"100%",background:"#111827",border:"2px solid #374151",borderRadius:10,color:"white",padding:"12px 14px",fontFamily:"monospace",fontSize:20,fontWeight:900,letterSpacing:6,textAlign:"center",outline:"none",boxSizing:"border-box"}}
              />
            </div>
            <button onClick={joinRoom} disabled={loading} style={{background:"linear-gradient(135deg,#1e3a5f,#0a1628)",border:"2px solid #3b82f6",borderRadius:12,color:"white",padding:"14px",cursor:loading?"not-allowed":"pointer",fontFamily:"monospace",fontSize:13,fontWeight:900,opacity:loading?0.7:1}}>
              {loading?"Buscando...":"ðŸš€ UNIRSE"}
            </button>
            {status&&<div style={{fontSize:10,color:status.includes("Error")||status.includes("no encontrada")||status.includes("juego")?"#ef4444":"#6ee7b7",textAlign:"center",padding:"8px",background:"#0a1628",borderRadius:8}}>{status}</div>}
            <button onClick={()=>{setMode(null);setStatus("");}} style={{background:"transparent",border:"1px solid #374151",borderRadius:10,color:"#6b7280",padding:"10px",cursor:"pointer",fontFamily:"monospace",fontSize:11}}>
              â† Volver
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// â”€â”€ COACH SCREEN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CoachScreen({team,onConfirm}){
  const[sel,setSel]=useState(null);
  const[hov,setHov]=useState(null);
  const tc=team===TEAM_A?"#3b82f6":"#ef4444";
  return(
    <div style={{minHeight:"100vh",background:"#0a1628",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace",padding:20}}>
      <div style={{background:"#0f1c2e",border:`2px solid ${tc}`,borderRadius:18,padding:"28px 32px",width:480,boxShadow:`0 0 50px ${tc}33`}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:9,color:"#4b5563",letterSpacing:5}}>DIRECTOR TÃ‰CNICO</div>
          <div style={{fontSize:32,fontWeight:900,color:tc,letterSpacing:2,marginTop:6}}>EQUIPO {team}</div>
          <div style={{fontSize:10,color:"#6b7280",marginTop:6}}>D-M-A Â· Torre Â· Caballo Â· Reyna</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          {FORMATIONS.map(fm=>{
            const isSel=sel?.label===fm.label,isHov=hov===fm.label;
            return(
              <div key={fm.label} onClick={()=>setSel(fm)} onMouseEnter={()=>setHov(fm.label)} onMouseLeave={()=>setHov(null)}
                style={{background:isSel?tc+"22":isHov?"#1f2937":"#111827",border:`2px solid ${isSel?tc:isHov?tc+"55":"#1f2937"}`,borderRadius:12,padding:"12px 14px",cursor:"pointer",position:"relative",transition:"all 0.15s",boxShadow:isSel?`0 0 16px ${tc}44`:"none"}}>
                <div style={{fontSize:22,fontWeight:900,color:isSel?tc:isHov?"#e5e7eb":"#9ca3af",marginBottom:8}}>{fm.label}</div>
                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                  {[{t:"T",n:fm.T,c:"#60a5fa",sh:"2px"},{t:"C",n:fm.C,c:"#34d399",sh:"50%"},{t:"R",n:fm.R,c:"#f87171",sh:"4px"}].map(({t,n,c,sh})=>(
                    <div key={t} style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:8,color:"#6b7280",width:8}}>{t}</span>
                      {Array.from({length:n}).map((_,i)=><div key={i} style={{width:11,height:11,borderRadius:sh,background:isSel||isHov?c:c+"55",border:`1px solid ${c}88`}}/>)}
                    </div>
                  ))}
                </div>
                {isSel&&<div style={{position:"absolute",top:8,right:10,color:tc,fontSize:12}}>âœ“</div>}
              </div>
            );
          })}
        </div>
        <button onClick={()=>{if(sel)onConfirm(sel);}} style={{width:"100%",padding:"12px",background:sel?tc+"22":"#111827",border:`2px solid ${sel?tc:"#1f2937"}`,borderRadius:12,color:sel?"white":"#4b5563",fontSize:13,fontWeight:900,cursor:sel?"pointer":"not-allowed",fontFamily:"monospace",letterSpacing:3,transition:"all 0.2s"}}>
          {sel?`CONFIRMAR ${sel.label}`:"SELECCIONA FORMACIÃ“N"}
        </button>
      </div>
    </div>
  );
}

// â”€â”€ PLACEMENT SCREEN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PlacementScreen({fmA,fmB,kickWinner,initPiecesOverride,iconSet,onStart}){
  const CS=40;
  const[pieces,setPieces]=useState(()=>initPiecesOverride||buildAll(fmA,fmB,kickWinner));
  const[drag,setDrag]=useState(null);

  function pickPiece(p){
    if(p.team===kickWinner&&p.type==="R"&&p.row===CY&&p.col===CX)return;
    setDrag(p.id);
  }
  function dropCell(r,c){
    if(!drag)return;
    const p=pieces.find(x=>x.id===drag);if(!p)return;
    const allowed=p.team===TEAM_A?A_ROWS:B_ROWS;
    if(!allowed.includes(r))return;
    if(pieces.find(x=>x.id!==drag&&x.row===r&&x.col===c))return;
    setPieces(prev=>prev.map(x=>x.id===drag?{...x,row:r,col:c}:x));
    setDrag(null);
  }

  function renderCell(r,c){
    const piece=pat(pieces,r,c);
    const p2=pieces.find(x=>x.id===drag);
    const allowed=p2?(p2.team===TEAM_A?A_ROWS:B_ROWS):[];
    const isTarget=drag&&!piece&&allowed.includes(r);
    const isLocked=piece?.team===kickWinner&&piece?.type==="R"&&r===CY&&c===CX;
    const isDragging=drag&&piece?.id===drag;
    const bg=cellBg(r,c);
    const finalBg=isTarget?`linear-gradient(rgba(251,191,36,0.3),rgba(251,191,36,0.3)),${bg}`:bg;
    return(
      <div key={`${r}-${c}`} onClick={()=>piece?pickPiece(piece):dropCell(r,c)}
        style={{width:CS,height:CS,background:finalBg,border:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"center",cursor:isTarget?"crosshair":piece&&!isLocked?"grab":"default",position:"relative",flexShrink:0}}>
        {r===CY&&c===CX&&!piece&&<div style={{position:"absolute",width:32,height:32,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.25)",pointerEvents:"none"}}/>}
        {piece&&(
          <div style={{position:"relative",opacity:isLocked?0.7:1,transform:isDragging?"scale(1.15)":"scale(1)",transition:"transform 0.1s"}}>
            <PieceIcon type={piece.type} team={piece.team} size={CS-8} iconSet={iconSet||"chess"}/>
            {piece.hasBall&&<div style={{position:"absolute",bottom:-8,right:-8,fontSize:13,zIndex:5}}>âš½</div>}
            {isLocked&&<div style={{position:"absolute",top:-7,right:-7,fontSize:10}}>ðŸ”’</div>}
            {isDragging&&<div style={{position:"absolute",inset:-2,borderRadius:"inherit",border:"2px solid #fbbf24",boxShadow:"0 0 10px #fbbf24",pointerEvents:"none"}}/>}
          </div>
        )}
        {isTarget&&<div style={{width:8,height:8,borderRadius:"50%",background:"rgba(251,191,36,0.7)"}}/>}
      </div>
    );
  }

  return(
    <div style={{minHeight:"100vh",background:"#0a1628",display:"flex",gap:12,padding:12,fontFamily:"monospace",color:"white",overflowX:"auto",alignItems:"flex-start"}}>
      <div style={{display:"flex",flexDirection:"column",gap:10,minWidth:200}}>
        <div style={{background:"#0f1c2e",border:"2px solid #374151",borderRadius:12,padding:"14px 16px"}}>
          <div style={{fontSize:9,color:"#4b5563",letterSpacing:3,marginBottom:6}}>COLOCACIÃ“N</div>
          <div style={{fontSize:10,color:"#9ca3af",lineHeight:1.8}}>
            Click pieza â†’ click celda de tu mitad<br/>
            <span style={{color:"#fbbf24",fontSize:9}}>ðŸ”’ Reyna del saque fija al centro</span>
          </div>
        </div>
        {[TEAM_A,TEAM_B].map(team=>{
          const isA=team===TEAM_A;
          const tc=isA?"#3b82f6":"#ef4444";
          const label=isA?fmA.label:fmB.label;
          return(
            <div key={team} style={{background:"#0f1c2e",border:`2px solid ${tc}`,borderRadius:10,padding:"10px 13px"}}>
              <div style={{fontSize:10,color:tc,fontWeight:700,marginBottom:8}}>EQUIPO {team} â€” {label}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {pieces.filter(p=>p.team===team).map(p=>(
                  <div key={p.id} onClick={()=>pickPiece(p)} style={{cursor:"grab",transform:drag===p.id?"scale(1.2)":"scale(1)",transition:"transform 0.1s",boxShadow:drag===p.id?"0 0 10px #fbbf24":"none",borderRadius:PSHAPE[p.type]}}>
                    <PieceIcon type={p.type} team={p.team} size={26}/>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <button onClick={()=>onStart(pieces)} style={{width:"100%",padding:"12px",background:"#064e3b",border:"2px solid #10b981",borderRadius:12,color:"white",fontSize:12,fontWeight:900,cursor:"pointer",fontFamily:"monospace",letterSpacing:3}}>
          âš½ COMENZAR
        </button>
      </div>
      <FieldWithLabels CS={CS}>
        <div style={{position:"relative",border:"3px solid #1f6b3d",borderRadius:4,overflow:"hidden",boxShadow:"0 0 30px rgba(0,150,60,0.3)"}}>
          <FieldSVG CS={CS}/>
          <div style={{display:"grid",gridTemplateColumns:`repeat(${COLS},${CS}px)`,gridTemplateRows:`repeat(${ROWS},${CS}px)`,position:"relative",zIndex:2}}>
            {Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>renderCell(r,c)))}
          </div>
        </div>
      </FieldWithLabels>
    </div>
  );
}

// â”€â”€ MODE SCREEN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ModeScreen({onMode}){
  return(
    <div style={{minHeight:"100vh",background:"#0a1628",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>
      <div style={{background:"#0f1c2e",border:"2px solid #374151",borderRadius:20,padding:"40px 48px",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:8}}>âš½</div>
        <div style={{fontSize:28,fontWeight:900,color:"white",marginBottom:4,letterSpacing:2}}>FÃšTBOL AJEDREZ</div>
        <div style={{fontSize:11,color:"#6b7280",marginBottom:36,letterSpacing:3}}>ELIGE MODO DE JUEGO</div>
        <div style={{display:"flex",gap:12,flexDirection:"column"}}>
          <div style={{display:"flex",gap:12}}>
            <button onClick={()=>onMode("cpu")} style={{flex:1,background:"linear-gradient(135deg,#065f46,#022c22)",border:"2px solid #10b981",borderRadius:14,color:"white",padding:"20px 0",cursor:"pointer",fontFamily:"monospace",transition:"all 0.2s"}}>
              <div style={{fontSize:28,marginBottom:6}}>ðŸ¤–</div>
              <div style={{fontSize:13,fontWeight:900,letterSpacing:2}}>1 vs CPU</div>
              <div style={{fontSize:9,color:"#6ee7b7",marginTop:4}}>TÃº vs IA</div>
            </button>
            <button onClick={()=>onMode("pvp")} style={{flex:1,background:"linear-gradient(135deg,#1e3a5f,#0a1628)",border:"2px solid #3b82f6",borderRadius:14,color:"white",padding:"20px 0",cursor:"pointer",fontFamily:"monospace",transition:"all 0.2s"}}>
              <div style={{fontSize:28,marginBottom:6}}>ðŸ‘¥</div>
              <div style={{fontSize:13,fontWeight:900,letterSpacing:2}}>1 vs 1</div>
              <div style={{fontSize:9,color:"#93c5fd",marginTop:4}}>Mismo dispositivo</div>
            </button>
          </div>
          <button onClick={()=>onMode("online")} style={{width:"100%",background:"linear-gradient(135deg,#2d1b69,#0a1628)",border:"2px solid #7c3aed",borderRadius:14,color:"white",padding:"20px 0",cursor:"pointer",fontFamily:"monospace",transition:"all 0.2s"}}>
            <div style={{fontSize:28,marginBottom:6}}>ðŸŒ</div>
            <div style={{fontSize:13,fontWeight:900,letterSpacing:2}}>ONLINE</div>
            <div style={{fontSize:9,color:"#c4b5fd",marginTop:4}}>Jugar en lÃ­nea Â· Supabase Realtime</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ ONLINE WAITING SCREEN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function WaitingForOpponentScreen({roomCode,myTeam,gameState,fmA,fmB}){
  const[dots,setDots]=useState(".");
  useEffect(()=>{
    const t=setInterval(()=>setDots(d=>d.length>=3?".":""+d+"."),500);
    return()=>clearInterval(t);
  },[]);
  const bothReady=gameState?.fmA&&gameState?.fmB;
  return(
    <div style={{minHeight:"100vh",background:"#0a1628",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>
      <div style={{background:"#0f1c2e",border:"2px solid #7c3aed",borderRadius:18,padding:"40px",textAlign:"center",maxWidth:400}}>
        <div style={{fontSize:40,marginBottom:12}}>â³</div>
        <div style={{fontSize:18,fontWeight:900,color:"white",marginBottom:8}}>
          {bothReady?"Â¡Listo para jugar!":"Esperando rival"+dots}
        </div>
        <div style={{fontSize:10,color:"#6b7280",marginBottom:20}}>
          Sala: <span style={{color:"#7c3aed",fontWeight:900,letterSpacing:3}}>{roomCode}</span>
        </div>
        <div style={{fontSize:10,color:"#9ca3af"}}>
          Eres el <span style={{color:myTeam===TEAM_A?"#3b82f6":"#ef4444",fontWeight:700}}>Equipo {myTeam}</span>
          {myTeam===TEAM_A?" (Azul Â· arriba)":" (Rojo Â· abajo)"}
        </div>
        {!bothReady&&(
          <div style={{marginTop:16,fontSize:9,color:"#4b5563"}}>
            Comparte el cÃ³digo con tu rival para que se una
          </div>
        )}
      </div>
    </div>
  );
}

// â”€â”€ ONLINE GAME BOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OnlineGameBoard({roomCode,myTeam,fmA,fmB,initPieces,kickWinner,onRestart}){
  const[pieces,setPieces]=useState(initPieces);
  const[curTeam,setCurTeam]=useState(kickWinner);
  const[ball,setBall]=useState({row:CY,col:CX});
  const[sel,setSel]=useState(null);
  const[clickCt,setClickCt]=useState(0);
  const[moves,setMoves]=useState([]);
  const[shots,setShots]=useState([]);
  const[adv,setAdv]=useState(0);
  const[bonus,setBonus]=useState(false);
  const[stealerId,setStealerId]=useState(null);
  const[kickoff,setKickoff]=useState(true);
  const[log,setLog]=useState(["âš½ Equipo A saca."]);
  const[score,setScore]=useState({A:0,B:0});
  const[over,setOver]=useState(false);
  const[iconSet,setIconSet]=useState("chess");
  const[opponentOnline,setOpponentOnline]=useState(true);
  const[syncing,setSyncing]=useState(false);
  const isMyTurn=curTeam===myTeam;
  const CS=40;

  const lg=m=>setLog(p=>[m,...p].slice(0,30));

  // â”€â”€ Publish state to Supabase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const publishState=useCallback(async(newState)=>{
    setSyncing(true);
    await sb.from("game_state").upsert({room_id:roomCode,state:newState,updated_at:new Date().toISOString()});
    setSyncing(false);
  },[roomCode]);

  // â”€â”€ Subscribe to opponent moves â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(()=>{
    const channel=sb.channel("game:"+roomCode)
      .on("postgres_changes",{event:"*",schema:"public",table:"game_state",filter:`room_id=eq.${roomCode}`},payload=>{
        const s=payload.new?.state;
        if(!s||s.movedBy===myTeam)return; // ignore own moves
        applyRemoteState(s);
      })
      .on("presence",{event:"sync"},()=>{
        const state=channel.presenceState();
        setOpponentOnline(Object.keys(state).length>=2);
      })
      .subscribe(async(status)=>{
        if(status==="SUBSCRIBED"){
          await channel.track({team:myTeam,ts:Date.now()});
        }
      });
    return()=>{sb.removeChannel(channel);};
  },[roomCode,myTeam]);

  function applyRemoteState(s){
    if(s.pieces)setPieces(s.pieces);
    if(s.ball)setBall(s.ball);
    if(s.curTeam)setCurTeam(s.curTeam);
    if(s.score)setScore(s.score);
    if(s.adv!=null)setAdv(s.adv);
    if(s.bonus!=null)setBonus(s.bonus);
    if(s.stealerId!=null)setStealerId(s.stealerId);
    if(s.over!=null)setOver(s.over);
    if(s.kickoff!=null)setKickoff(s.kickoff);
    if(s.logMsg)lg(s.logMsg);
    setSel(null);setMoves([]);setShots([]);setClickCt(0);
  }

  function nextTurn(np,nb,ns,newAdv,newBonus,newStealerId,newKickoff,logMsg){
    const nextTeam=curTeam===TEAM_A?TEAM_B:TEAM_A;
    setPieces(np);setBall(nb);setCurTeam(nextTeam);setScore(ns);
    setAdv(newAdv||0);setBonus(newBonus||false);setStealerId(newStealerId||null);
    if(newKickoff!=null)setKickoff(newKickoff);
    setSel(null);setMoves([]);setShots([]);setClickCt(0);
    if(logMsg)lg(logMsg);
    publishState({pieces:np,ball:nb,curTeam:nextTeam,score:ns,adv:newAdv||0,bonus:newBonus||false,stealerId:newStealerId||null,kickoff:newKickoff!=null?newKickoff:false,over:false,movedBy:myTeam,logMsg});
  }

  function bumpPiece(ps,dest,pid,attackDr,attackDc){
    const{row,col}=dest;
    const awayDr=attackDr!=null?-sg(attackDr):dest.team===TEAM_A?1:-1;
    const awayDc=attackDc!=null?-sg(attackDc):0;
    let startIdx=0;let bestDot=-999;
    CW8.forEach(([r,c],i)=>{const dot=r*(awayDr||0)+c*(awayDc||0);if(dot>bestDot){bestDot=dot;startIdx=i;}});
    for(let i=0;i<8;i++){
      const[ar,ac]=CW8[(startIdx+i)%8];
      const nr=row+ar,nc=col+ac;
      if(nr<1||nr>ROWS-2||!inB(nr,nc))continue;
      if(ps.find(p=>p.row===nr&&p.col===nc&&p.id!==dest.id&&p.id!==pid))continue;
      return ps.map(p=>p.id===dest.id?{...p,row:nr,col:nc}:p);
    }
    return ps;
  }

  function execMove(pid,r,c){
    if(!isMyTurn)return;
    const piece=pieces.find(p=>p.id===pid);if(!piece)return;
    const dest=pat(pieces,r,c);
    const myBall=piece.row===ball.row&&piece.col===ball.col;
    const destBall=ball.row===r&&ball.col===c;
    const oppDest=dest&&dest.team!==piece.team;
    const moveDr=piece.type==="C"?(piece.team===TEAM_A?1:-1):sg(r-piece.row);
    const moveDc=piece.type==="C"?0:sg(c-piece.col);
    if(dest&&dest.team===piece.team){lg("ðŸš« No puedes moverte sobre un compaÃ±ero.");return;}
    if(dest&&dest.type==="P"&&oppDest){const inL=piece.team===TEAM_A?inBL(r,c):inTL(r,c);if(inL){lg("ðŸš« Portero protegido.");return;}}
    if(dest&&oppDest&&!destBall){lg("ðŸš« El rival no tiene el balÃ³n.");return;}
    const km=piece.type==="C"?getMoves({...piece,hasBall:myBall},pieces,myBall?adv:0,ball):[];
    const mf=piece.type==="C"&&km.find(m=>m.row===r&&m.col===c&&m.steal);
    const stoleAtDest=destBall&&oppDest;
    const stoleOnPath=!!(mf&&!myBall&&!destBall&&mf.stealPath);
    const freeBall=destBall&&!dest;
    const stole=(stoleAtDest||stoleOnPath||freeBall)&&!myBall;
    let np=pieces;
    if(stoleAtDest&&dest){np=bumpPiece(np,dest,pid,moveDr,moveDc);}
    np=np.map(p=>p.id===pid?{...p,row:r,col:c}:p);
    const newBall=(myBall||stole)?{row:r,col:c}:ball;
    if(stole){
      // Bonus turn â€” same team plays again
      setPieces(np);setBall(newBall);setBonus(true);setAdv(0);setStealerId(pid);
      setSel(pid);const st=np.find(p=>p.id===pid);
      if(st){const bms=getMoves({...st,hasBall:true},np,0,newBall);setMoves(bms);setClickCt(1);}
      lg("ðŸ’ª BalÃ³n tomado! Turno bonus.");
      publishState({pieces:np,ball:newBall,curTeam,score,adv:0,bonus:true,stealerId:pid,kickoff:false,over:false,movedBy:myTeam,logMsg:"ðŸ’ª BalÃ³n tomado! Turno bonus."});
      return;
    }
    const newAdv=myBall?adv+1:0;
    nextTurn(np,newBall,score,newAdv,false,null,false,"");
  }

  function execShot(cell){
    if(!isMyTurn)return;
    setSel(null);setMoves([]);setShots([]);setClickCt(0);
    if(cell.isGoal){
      const enteredAzulGoal=cell.row===TOP_GOAL&&GOAL_COLS.includes(cell.col);
      const scorer=enteredAzulGoal?TEAM_B:TEAM_A;
      const kickTeam=enteredAzulGoal?TEAM_A:TEAM_B;
      const msg=scorer!==curTeam?"ðŸ˜¬ Autogol Equipo "+curTeam+" â€” punto Equipo "+scorer:"âš½ GOOOOOL del Equipo "+scorer+"!";
      const ns={...score,[scorer]:score[scorer]+1};
      const isOver=ns[scorer]>=5;
      setScore(ns);setOver(isOver);lg(msg);
      if(isOver){lg("ðŸ† Equipo "+scorer+" campeÃ³n!");publishState({pieces,ball:cell,curTeam,score:ns,adv:0,bonus:false,stealerId:null,kickoff:false,over:true,movedBy:myTeam,logMsg:"ðŸ† Equipo "+scorer+" campeÃ³n!"});return;}
      // Reset
      const resetPs=buildAll(fmA,fmB,kickTeam);
      const nb={row:CY,col:CX};
      setPieces(resetPs);setBall(nb);setCurTeam(kickTeam);setScore(ns);setAdv(0);setBonus(false);setStealerId(null);setKickoff(true);
      publishState({pieces:resetPs,ball:nb,curTeam:kickTeam,score:ns,adv:0,bonus:false,stealerId:null,kickoff:true,over:false,movedBy:myTeam,logMsg:msg+"  Equipo "+kickTeam+" saca."});
      return;
    }
    const dest=pat(pieces,cell.row,cell.col);
    const nb={row:cell.row,col:cell.col};
    const msg=dest?"ðŸŽ¯ Tiro â†’ "+PNAME[dest.type]+" ("+(dest.team===TEAM_A?"Azul":"Rojo")+")":"ðŸŽ¯ Tiro â†’ "+COL_LABELS[cell.col]+(cell.row+1);
    nextTurn(pieces,nb,score,0,false,null,false,msg);
  }

  function selectPiece(piece){
    const hb=piece.row===ball.row&&piece.col===ball.col;
    setSel(piece.id);setClickCt(1);
    setMoves(getMoves({...piece,hasBall:hb},pieces,hb?adv:0,ball));
    setShots([]);
  }
  function activateShots(piece){
    const ss=getShots(piece,pieces,piece.team);
    setShots(ss);setMoves([]);setClickCt(2);
    lg(ss.length?"ðŸŽ¯ Elige direcciÃ³n de tiro":"âŒ Sin tiro posible.");
  }

  function clickCell(r,c){
    if(over||!isMyTurn)return;
    const cp=pat(pieces,r,c);
    const isBallCell=ball.row===r&&ball.col===c;
    if(clickCt===2){
      const sc=shots.find(s=>s.row===r&&s.col===c);
      if(sc){execShot(sc);return;}
      if(cp&&cp.id===sel){setSel(null);setMoves([]);setShots([]);setClickCt(0);return;}
      if(cp&&cp.team===curTeam){
        if(bonus&&stealerId&&cp.id!==stealerId){lg("âš ï¸ Mueve la pieza que tomÃ³ el balÃ³n.");return;}
        selectPiece(cp);return;
      }
      setSel(null);setMoves([]);setShots([]);setClickCt(0);return;
    }
    if(clickCt===1&&sel){
      if(moves.find(m=>m.row===r&&m.col===c)){execMove(sel,r,c);return;}
      if(cp&&cp.team===curTeam){
        if(cp.id===sel){
          const hb=cp.row===ball.row&&cp.col===ball.col;
          if(hb)activateShots(cp);
          else{setSel(null);setMoves([]);setClickCt(0);}
          return;
        }
        if(bonus&&stealerId&&cp.id!==stealerId){lg("âš ï¸ Mueve la pieza que tomÃ³ el balÃ³n.");return;}
        selectPiece(cp);return;
      }
      if(isBallCell&&!cp){const sp=pieces.find(p=>p.id===sel);if(sp)activateShots(sp);return;}
      setSel(null);setMoves([]);setShots([]);setClickCt(0);return;
    }
    if(cp&&cp.team===curTeam){
      if(bonus&&stealerId&&cp.id!==stealerId){lg("âš ï¸ Mueve la pieza que tomÃ³ el balÃ³n.");return;}
      if(kickoff){const bh=pieces.find(p=>p.row===ball.row&&p.col===ball.col);if(bh&&cp.id!==bh.id){lg("âš½ Saque: el portador del balÃ³n actÃºa primero.");return;}}
      selectPiece(cp);
    }
  }

  function renderCell(r,c){
    const piece=pat(pieces,r,c);
    const isBall=ball.row===r&&ball.col===c;
    const isSel=piece?.id===sel;
    const isMove=!!moves.find(m=>m.row===r&&m.col===c);
    const isShot=shots.find(s=>s.row===r&&s.col===c)||null;
    const bg=cellBg(r,c);
    const ov=isShot?(isShot.isGoal?"rgba(220,38,38,0.75)":isShot.isOwn?"rgba(37,99,235,0.65)":"rgba(234,88,12,0.6)"):isMove?"rgba(234,179,8,0.55)":isSel?"rgba(255,255,255,0.15)":"";
    const finalBg=ov?`linear-gradient(${ov},${ov}),${bg}`:bg;
    const selC=clickCt===2?"#f87171":"#fbbf24";
    const cantAct=!isMyTurn;
    return(
      <div key={`${r}-${c}`} onClick={()=>clickCell(r,c)}
        style={{width:CS,height:CS,background:finalBg,border:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"center",cursor:cantAct?"default":"pointer",position:"relative",flexShrink:0,opacity:cantAct&&piece&&piece.team!==myTeam?0.85:1}}>
        {isBall&&!piece&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:6,fontSize:22,filter:"drop-shadow(0 2px 6px rgba(0,0,0,0.8))"}}>âš½</div>}
        {isMove&&!piece&&!isBall&&<div style={{width:10,height:10,borderRadius:"50%",background:"rgba(234,179,8,0.9)",boxShadow:"0 0 6px rgba(234,179,8,0.6)"}}/>}
        {isShot&&!piece&&(isShot.isGoal
          ?<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:6,gap:1}}><div style={{fontSize:15}}>ðŸ¥…</div><div style={{width:6,height:6,borderRadius:"50%",background:"#ef4444",boxShadow:"0 0 8px #ef4444"}}/></div>
          :<div style={{width:9,height:9,borderRadius:"50%",background:"rgba(234,88,12,0.9)",boxShadow:"0 0 7px rgba(234,88,12,0.7)",zIndex:6}}/>
        )}
        {piece&&(
          <div style={{position:"relative",transform:isSel?"scale(1.12)":"scale(1)",transition:"all 0.1s"}}>
            <div style={{outline:isSel?`2px solid ${selC}`:"none",outlineOffset:2,borderRadius:PSHAPE[piece.type],boxShadow:isSel?`0 0 12px ${selC}`:"none"}}>
              <PieceIcon type={piece.type} team={piece.team} size={CS-6} iconSet={iconSet}/>
            </div>
            {isBall&&<div style={{position:"absolute",bottom:-9,right:-9,fontSize:14,zIndex:7,filter:"drop-shadow(0 1px 4px rgba(0,0,0,0.9))"}}>âš½</div>}
          </div>
        )}
      </div>
    );
  }

  const tcCur=curTeam===TEAM_A?"#3b82f6":"#ef4444";
  const myColor=myTeam===TEAM_A?"#3b82f6":"#ef4444";
  const selP=pieces.find(p=>p.id===sel);

  return(
    <div style={{minHeight:"100vh",background:"#0a1628",display:"flex",gap:12,padding:12,fontFamily:"monospace",color:"white",overflowX:"auto"}}>
      <div style={{display:"flex",flexDirection:"column",gap:8,minWidth:170}}>
        {/* Room info */}
        <div style={{background:"#0f1c2e",border:"2px solid #7c3aed",borderRadius:10,padding:"8px 12px"}}>
          <div style={{fontSize:8,color:"#7c3aed",letterSpacing:2,marginBottom:4}}>SALA ONLINE</div>
          <div style={{fontSize:14,fontWeight:900,color:"white",letterSpacing:4}}>{roomCode}</div>
          <div style={{fontSize:8,color:myColor,marginTop:2}}>TÃº: Equipo {myTeam}{myTeam===TEAM_A?" Â· Azul":" Â· Rojo"}</div>
          <div style={{display:"flex",alignItems:"center",gap:4,marginTop:3}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:opponentOnline?"#10b981":"#6b7280",boxShadow:opponentOnline?"0 0 6px #10b981":"none"}}/>
            <span style={{fontSize:8,color:opponentOnline?"#6ee7b7":"#6b7280"}}>{opponentOnline?"Rival conectado":"Esperando rival..."}</span>
          </div>
          {syncing&&<div style={{fontSize:7,color:"#7c3aed",marginTop:2}}>â†‘ sincronizando...</div>}
        </div>
        {/* Score */}
        <div style={{background:"#0f1c2e",border:"2px solid #1f2937",borderRadius:12,padding:"10px 14px",textAlign:"center"}}>
          <div style={{fontSize:8,color:"#4b5563",letterSpacing:2,marginBottom:4}}>MARCADOR</div>
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:12}}>
            <div><div style={{fontSize:8,color:"#3b82f6"}}>A</div><div style={{fontSize:28,fontWeight:900,color:"#3b82f6"}}>{score.A}</div><div style={{fontSize:7,color:"#4b5563"}}>{fmA.label}</div></div>
            <div style={{fontSize:16,color:"#1f2937"}}>â€”</div>
            <div><div style={{fontSize:8,color:"#ef4444"}}>B</div><div style={{fontSize:28,fontWeight:900,color:"#ef4444"}}>{score.B}</div><div style={{fontSize:7,color:"#4b5563"}}>{fmB.label}</div></div>
          </div>
        </div>
        {/* Turn indicator */}
        <div style={{background:isMyTurn?"#0d1e3a":"#1c1c1c",border:`2px solid ${isMyTurn?tcCur:"#374151"}`,borderRadius:10,padding:"8px 12px",textAlign:"center",transition:"all 0.3s"}}>
          <div style={{fontSize:8,color:"#6b7280",letterSpacing:2}}>TURNO</div>
          <div style={{fontSize:12,fontWeight:700,marginTop:2,color:isMyTurn?"white":"#6b7280"}}>
            {isMyTurn?"âœ… Tu turno":"â³ Esperando..."}
            {bonus&&isMyTurn&&<span style={{fontSize:8,color:"#fbbf24",marginLeft:4}}>BONUS</span>}
          </div>
          {selP&&isMyTurn&&(
            <div style={{fontSize:8,color:"#9ca3af",marginTop:3}}>
              <span style={{color:PCOL[selP.type],fontWeight:700}}>{PNAME[selP.type]}</span>
              {clickCt===1&&<div style={{color:"#fbbf24",fontSize:7,marginTop:1}}>2Â° click â†’ tiro</div>}
              {clickCt===2&&<div style={{color:"#f87171",fontSize:7,marginTop:1}}>ðŸŸ  tiro Â· ðŸ”´ gol</div>}
            </div>
          )}
        </div>
        {over&&(
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{textAlign:"center",fontSize:11,color:"#fbbf24",fontWeight:700}}>ðŸ† Equipo {score.A>=5?"A":"B"} gana!</div>
            <button onClick={onRestart} style={{background:"#78350f",border:"1px solid #f59e0b",borderRadius:6,color:"white",padding:"7px",cursor:"pointer",fontSize:10,fontFamily:"monospace",fontWeight:700,width:"100%"}}>ðŸ”„ Nueva Partida</button>
          </div>
        )}
        <div style={{display:"flex",gap:4}}>
          <button onClick={onRestart} style={{flex:1,background:"#1f2937",border:"1px solid #374151",borderRadius:6,color:"#e5e7eb",padding:"6px",cursor:"pointer",fontSize:10,fontFamily:"monospace",fontWeight:700}}>ðŸ”„</button>
          <button onClick={()=>setIconSet(s=>s==="chess"?"medieval":"chess")} style={{flex:1,background:iconSet==="medieval"?"#3b0764":"#1f2937",border:`1px solid ${iconSet==="medieval"?"#7c3aed":"#374151"}`,borderRadius:6,color:"#e5e7eb",padding:"6px",cursor:"pointer",fontSize:12,fontFamily:"monospace",fontWeight:700}}>
            {iconSet==="chess"?"âš”ï¸":"â™›"}
          </button>
        </div>
        <Fold title="CONTROLES" defaultOpen={true}>
          <div style={{fontSize:9,color:"#6b7280",lineHeight:2}}>
            <div>1 click â†’ mover</div><div>2 clicks â†’ tiro (5 celdas)</div>
            {[["#eab308","Mover"],["#ea580c","Tiro"],["#ef4444","Gol"]].map(([c,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:2,background:c}}/>{l}</div>
            ))}
          </div>
        </Fold>
        <Fold title="REGISTRO" defaultOpen={true}>
          <div style={{maxHeight:150,overflowY:"auto"}}>
            {log.map((l,i)=><div key={i} style={{fontSize:9,marginBottom:3,color:i===0?"#e5e7eb":"#6b7280",borderLeft:`2px solid ${i===0?"#10b981":"#1f2937"}`,paddingLeft:5,lineHeight:1.5}}>{l}</div>)}
          </div>
        </Fold>
      </div>
      <div>
        <div style={{textAlign:"center",fontSize:8,color:"#60a5fa",letterSpacing:3,marginBottom:4,fontWeight:700}}>EQUIPO A (AZUL) â€” PORTERÃA â†‘</div>
        <FieldWithLabels CS={CS}>
          <div style={{position:"relative",border:"3px solid #1f6b3d",borderRadius:4,overflow:"hidden",boxShadow:"0 0 30px rgba(0,150,60,0.3)"}}>
            <FieldSVG CS={CS}/>
            <div style={{display:"grid",gridTemplateColumns:`repeat(${COLS},${CS}px)`,gridTemplateRows:`repeat(${ROWS},${CS}px)`,position:"relative",zIndex:2}}>
              {Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>renderCell(r,c)))}
            </div>
          </div>
        </FieldWithLabels>
        <div style={{textAlign:"center",fontSize:8,color:"#f87171",letterSpacing:3,marginTop:4,fontWeight:700}}>EQUIPO B (ROJO) â€” PORTERÃA â†“</div>
      </div>
    </div>
  );
}

// â”€â”€ LOCAL GAME BOARD (CPU + PvP sin cambios) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function aiDecide(pieces,ball,advUsed){
  const myPs=pieces.filter(p=>p.team===TEAM_B);
  const ballP=pieces.find(p=>p.row===ball.row&&p.col===ball.col);
  const mine=ballP&&ballP.team===TEAM_B;
  if(mine){
    const shots=getShots(ballP,pieces,TEAM_B);
    const goal=shots.find(s=>s.isGoal);
    if(goal)return{action:"shot",cell:goal};
    const fwd=shots.filter(s=>s.row<ballP.row);
    if(fwd.length>0)return{action:"shot",cell:fwd.reduce((a,b)=>a.row<b.row?a:b)};
    const mvs=getMoves({...ballP,hasBall:true},pieces,advUsed,ball);
    const f2=mvs.filter(m=>m.row<ballP.row);
    const pick=f2.length>0?f2.reduce((a,b)=>a.row<b.row?a:b):mvs[0]||null;
    if(pick)return{action:"move",pid:ballP.id,row:pick.row,col:pick.col};
    if(shots.length>0)return{action:"shot",cell:shots[0]};
  }else{
    const sorted=[...myPs].sort((a,b)=>(Math.abs(a.row-ball.row)+Math.abs(a.col-ball.col))-(Math.abs(b.row-ball.row)+Math.abs(b.col-ball.col)));
    for(const p of sorted){
      const mvs=getMoves(p,pieces,0,ball);
      if(!mvs.length)continue;
      const best=mvs.slice().sort((a,b)=>(Math.abs(a.row-ball.row)+Math.abs(a.col-ball.col))-(Math.abs(b.row-ball.row)+Math.abs(b.col-ball.col)))[0];
      return{action:"move",pid:p.id,row:best.row,col:best.col};
    }
    for(const p of myPs){const mvs=getMoves(p,pieces,0,ball);if(mvs.length>0)return{action:"move",pid:p.id,row:mvs[0].row,col:mvs[0].col};}
  }
  return null;
}

function GameBoard({initPieces,kickWinner,fmA,fmB,gameMode,onRestart}){
  const[pieces,setPieces]=useState(initPieces);
  const[curTeam,setCurTeam]=useState(kickWinner);
  const[ball,setBall]=useState({row:CY,col:CX});
  const[sel,setSel]=useState(null);
  const[clickCt,setClickCt]=useState(0);
  const[moves,setMoves]=useState([]);
  const[shots,setShots]=useState([]);
  const[adv,setAdv]=useState(0);
  const[bonus,setBonus]=useState(false);
  const[stealerId,setStealerId]=useState(null);
  const[stealerDir,setStealerDir]=useState({dr:1,dc:0});
  const[kickoff,setKickoff]=useState(true);
  const[log,setLog]=useState(["âš½ Equipo A saca."]);
  const[score,setScore]=useState({A:0,B:0});
  const[over,setOver]=useState(false);
  const[aiThinking,setAiThinking]=useState(false);
  const[aiBonusTurn,setAiBonusTurn]=useState(false);
  const[history,setHistory]=useState([]);
  const[aiTrigger,setAiTrigger]=useState(0);
  const[iconSet,setIconSet]=useState("chess");
  const[repositioning,setRepositioning]=useState(false);
  const[repoPieces,setRepoPieces]=useState(null);
  const[repoKickTeam,setRepoKickTeam]=useState(null);
  const kickTeamRef=useRef(null);
  const CS=44,aiRef=useRef(null);
  const lg=m=>setLog(p=>[m,...p].slice(0,30));
  const ballP=pieces.find(p=>p.row===ball.row&&p.col===ball.col);
  const selP=pieces.find(p=>p.id===sel);
  function saveHistory(){setHistory(prev=>[...prev,{pieces,ball,curTeam,score,adv}].slice(-20));}
  function undoMove(){setHistory(prev=>{if(!prev.length)return prev;const last=prev[prev.length-1];setPieces(last.pieces);setBall(last.ball);setCurTeam(last.curTeam);setScore(last.score);setAdv(last.adv||0);setSel(null);setMoves([]);setShots([]);setClickCt(0);setBonus(false);setStealerId(null);return prev.slice(0,-1);});}
  function nextTurn(){setSel(null);setMoves([]);setShots([]);setClickCt(0);setBonus(false);setStealerId(null);setStealerDir({dr:1,dc:0});setAdv(0);setKickoff(false);setCurTeam(t=>t===TEAM_A?TEAM_B:TEAM_A);}
  function bumpPiece(ps,dest,pid,attackDr,attackDc){const{row,col}=dest;const awayDr=attackDr!=null?-sg(attackDr):dest.team===TEAM_A?1:-1;const awayDc=attackDc!=null?-sg(attackDc):0;let startIdx=0;let bestDot=-999;CW8.forEach(([r,c],i)=>{const dot=r*(awayDr||0)+c*(awayDc||0);if(dot>bestDot){bestDot=dot;startIdx=i;}});for(let i=0;i<8;i++){const[ar,ac]=CW8[(startIdx+i)%8];const nr=row+ar,nc=col+ac;if(nr<1||nr>ROWS-2||!inB(nr,nc))continue;if(ps.find(p=>p.row===nr&&p.col===nc&&p.id!==dest.id&&p.id!==pid))continue;return ps.map(p=>p.id===dest.id?{...p,row:nr,col:nc}:p);}return ps;}
  function cwSearch(ps,stId,dr,dc){const st=ps.find(p=>p.id===stId);if(!st)return ps;let startIdx=0;let bestDot=-999;CW8.forEach(([r,c],i)=>{const dot=r*dr+c*dc;if(dot>bestDot){bestDot=dot;startIdx=i;}});for(let i=0;i<8;i++){const[ar,ac]=CW8[(startIdx+i)%8];const nr=st.row+ar,nc=st.col+ac;if(nr<1||nr>ROWS-2||!inB(nr,nc))continue;if(ps.find(p=>p.id!==stId&&p.row===nr&&p.col===nc))continue;return ps.map(p=>p.id===stId?{...p,row:nr,col:nc}:p);}return ps;}
  function resetAfterGoal(kickoffTeam){const base=buildAll(fmA,fmB,kickoffTeam);const resetPieces=base.map(p=>{if(p.team!==(kickoffTeam===TEAM_A?TEAM_B:TEAM_A))return p;if(p.row===CY)return{...p,row:p.team===TEAM_A?CY-1:CY+1};return p;});kickTeamRef.current=kickoffTeam;setRepoPieces(resetPieces);setRepoKickTeam(kickoffTeam);setRepositioning(true);setSel(null);setMoves([]);setShots([]);setClickCt(0);setBonus(false);setStealerId(null);}
  function applyReposition(ps){kickTeamRef.current=repoKickTeam;setPieces(ps);setBall({row:CY,col:CX});setAdv(0);setKickoff(true);setCurTeam(repoKickTeam);setAiTrigger(t=>t+1);setRepositioning(false);setRepoPieces(null);lg("Equipo "+repoKickTeam+" saca!");}
  function execMove(pid,r,c,isAI=false){const piece=pieces.find(p=>p.id===pid);if(!piece)return;if(!isAI)saveHistory();const dest=pat(pieces,r,c);const myBall=piece.row===ball.row&&piece.col===ball.col;const destBall=ball.row===r&&ball.col===c;const oppDest=dest&&dest.team!==piece.team;const moveDr=piece.type==="C"?(piece.team===TEAM_A?1:-1):sg(r-piece.row);const moveDc=piece.type==="C"?0:sg(c-piece.col);if(dest&&dest.team===piece.team){if(!isAI)lg("ðŸš« No puedes moverte sobre un compaÃ±ero.");return;}if(dest&&dest.type==="P"&&oppDest){const inL=piece.team===TEAM_A?inBL(r,c):inTL(r,c);if(inL){if(!isAI)lg("ðŸš« Portero protegido.");return;}}if(dest&&oppDest&&!destBall){if(!isAI)lg("ðŸš« El rival no tiene el balÃ³n.");return;}const km=piece.type==="C"?getMoves({...piece,hasBall:myBall},pieces,myBall?adv:0,ball):[];const mf=piece.type==="C"&&km.find(m=>m.row===r&&m.col===c&&m.steal);const stoleAtDest=destBall&&oppDest;const stoleOnPath=!!(mf&&!myBall&&!destBall&&mf.stealPath);const freeBall=destBall&&!dest;const stole=(stoleAtDest||stoleOnPath||freeBall)&&!myBall;let np=pieces;if(stoleAtDest&&dest){np=bumpPiece(np,dest,pid,moveDr,moveDc);}np=np.map(p=>p.id===pid?{...p,row:r,col:c}:p);const newBall=(myBall||stole)?{row:r,col:c}:ball;setPieces(np);setBall(newBall);setSel(null);setMoves([]);setShots([]);setClickCt(0);if(stole){lg("ðŸ’ª BalÃ³n tomado! Turno bonus.");setBonus(true);setAdv(0);if(isAI){setStealerId(pid);setStealerDir({dr:moveDr,dc:moveDc});setAiBonusTurn(true);}else{const st=np.find(p=>p.id===pid);if(st){const bms=getMoves({...st,hasBall:true},np,0,newBall);setSel(pid);setMoves(bms);setClickCt(1);setStealerId(pid);setStealerDir({dr:moveDr,dc:moveDc});}}return;}if(myBall)setAdv(a=>a+1);else setAdv(0);setBonus(false);setStealerId(null);nextTurn();}
  function execShot(cell,isAI=false){const team=isAI?TEAM_B:curTeam;if(!isAI)saveHistory();setSel(null);setMoves([]);setShots([]);setClickCt(0);if(cell.isGoal){const enteredAzulGoal=cell.row===TOP_GOAL&&GOAL_COLS.includes(cell.col);const scorer=enteredAzulGoal?TEAM_B:TEAM_A;const kickTeam=enteredAzulGoal?TEAM_A:TEAM_B;if(scorer!==team)lg("ðŸ˜¬ Autogol Equipo "+team+" â€” punto Equipo "+scorer);else lg("âš½ GOOOOOL del Equipo "+scorer+"!");const ns={...score,[scorer]:score[scorer]+1};setScore(ns);if(ns[scorer]>=5){setOver(true);lg("ðŸ† Equipo "+scorer+" campeÃ³n!");return;}resetAfterGoal(kickTeam);return;}if((cell.row===0||cell.row===BOT_GOAL)&&!GOAL_COLS.includes(cell.col)){lg("âŒ Fuera.");return;}const dest=pat(pieces,cell.row,cell.col);setBall({row:cell.row,col:cell.col});if(dest)lg("ðŸŽ¯ Tiro â†’ "+PNAME[dest.type]);else lg("ðŸŽ¯ Tiro â†’ "+COL_LABELS[cell.col]+(cell.row+1));setAdv(0);setBonus(false);setStealerId(null);nextTurn();}
  useEffect(()=>{const activeTeam=kickTeamRef.current||curTeam;kickTeamRef.current=null;if(gameMode==="pvp"||over||activeTeam!==TEAM_B||bonus||repositioning)return;setAiThinking(true);aiRef.current=setTimeout(()=>{const r=aiDecide(pieces,ball,adv);if(r){if(r.action==="move")execMove(r.pid,r.row,r.col,true);else if(r.action==="shot")execShot(r.cell,true);}else nextTurn();setAiThinking(false);},700);return()=>clearTimeout(aiRef.current);},[curTeam,over,aiTrigger]);
  useEffect(()=>{if(!aiBonusTurn||over)return;setAiBonusTurn(false);setAiThinking(true);aiRef.current=setTimeout(()=>{const st=pieces.find(p=>p.id===stealerId);if(st){const bms=getMoves({...st,hasBall:true},pieces,0,ball);const fwd=bms.filter(m=>m.row<st.row);const pick=fwd.length>0?fwd.reduce((a,b)=>a.row<b.row?a:b):bms[0]||null;if(pick)execMove(stealerId,pick.row,pick.col,true);else nextTurn();}else nextTurn();setAiThinking(false);},700);return()=>clearTimeout(aiRef.current);},[aiBonusTurn]);
  if(repositioning&&repoPieces&&repoKickTeam)return <PlacementScreen fmA={fmA} fmB={fmB} kickWinner={repoKickTeam} initPiecesOverride={repoPieces} iconSet={iconSet} onStart={applyReposition}/>;
  function selectPiece(piece){const hb=piece.row===ball.row&&piece.col===ball.col;setSel(piece.id);setClickCt(1);setMoves(getMoves({...piece,hasBall:hb},pieces,hb?adv:0,ball));setShots([]);}
  function activateShots(piece){const ss=getShots(piece,pieces,piece.team);setShots(ss);setMoves([]);setClickCt(2);lg(ss.length?"ðŸŽ¯ Elige direcciÃ³n":"âŒ Sin tiro.");}
  function clickCell(r,c){if(over||repositioning)return;if(gameMode==="cpu"&&curTeam===TEAM_B)return;const cp=pat(pieces,r,c);const isBallCell=ball.row===r&&ball.col===c;if(clickCt===2){const sc=shots.find(s=>s.row===r&&s.col===c);if(sc){execShot(sc);return;}if(cp&&cp.id===sel){setSel(null);setMoves([]);setShots([]);setClickCt(0);return;}if(cp&&cp.team===curTeam){if(bonus&&stealerId&&cp.id!==stealerId){lg("âš ï¸ Mueve la pieza que tomÃ³ el balÃ³n.");return;}selectPiece(cp);return;}setSel(null);setMoves([]);setShots([]);setClickCt(0);return;}if(clickCt===1&&sel){if(moves.find(m=>m.row===r&&m.col===c)){execMove(sel,r,c);return;}if(cp&&cp.team===curTeam){if(cp.id===sel){const hb=cp.row===ball.row&&cp.col===ball.col;if(hb)activateShots(cp);else{setSel(null);setMoves([]);setClickCt(0);}return;}if(bonus&&stealerId&&cp.id!==stealerId){lg("âš ï¸ Mueve la pieza que tomÃ³ el balÃ³n.");return;}selectPiece(cp);return;}if(isBallCell&&!cp){const sp=pieces.find(p=>p.id===sel);if(sp)activateShots(sp);return;}setSel(null);setMoves([]);setShots([]);setClickCt(0);return;}if(cp&&cp.team===curTeam){if(bonus&&stealerId&&cp.id!==stealerId){lg("âš ï¸ Mueve la pieza que tomÃ³ el balÃ³n.");return;}if(kickoff){const bh=pieces.find(p=>p.row===ball.row&&p.col===ball.col);if(bh&&cp.id!==bh.id){lg("âš½ Saque: el portador actÃºa primero.");return;}}selectPiece(cp);}}
  function renderCell(r,c){const piece=pat(pieces,r,c);const isBall=ball.row===r&&ball.col===c;const isSel=piece?.id===sel;const isMove=!!moves.find(m=>m.row===r&&m.col===c);const isShot=shots.find(s=>s.row===r&&s.col===c)||null;const bg=cellBg(r,c);const ov=isShot?(isShot.isGoal?"rgba(220,38,38,0.75)":isShot.isOwn?"rgba(37,99,235,0.65)":"rgba(234,88,12,0.6)"):isMove?"rgba(234,179,8,0.55)":isSel?"rgba(255,255,255,0.15)":"";const finalBg=ov?`linear-gradient(${ov},${ov}),${bg}`:bg;const selC=clickCt===2?"#f87171":"#fbbf24";return(<div key={`${r}-${c}`} onClick={()=>clickCell(r,c)} style={{width:CS,height:CS,background:finalBg,border:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative",flexShrink:0}}>{isBall&&!piece&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:6,fontSize:26,filter:"drop-shadow(0 2px 6px rgba(0,0,0,0.8))"}}>âš½</div>}{isMove&&!piece&&!isBall&&<div style={{width:10,height:10,borderRadius:"50%",background:"rgba(234,179,8,0.9)",boxShadow:"0 0 6px rgba(234,179,8,0.6)"}}/>}{isShot&&!piece&&(isShot.isGoal?<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:6,gap:1}}><div style={{fontSize:15}}>ðŸ¥…</div><div style={{width:6,height:6,borderRadius:"50%",background:"#ef4444",boxShadow:"0 0 8px #ef4444"}}/></div>:<div style={{width:9,height:9,borderRadius:"50%",background:"rgba(234,88,12,0.9)",boxShadow:"0 0 7px rgba(234,88,12,0.7)",zIndex:6}}/>)}{piece&&(<div style={{position:"relative",transform:isSel?"scale(1.12)":"scale(1)",transition:"all 0.1s"}}><div style={{outline:isSel?`2px solid ${selC}`:"none",outlineOffset:2,borderRadius:PSHAPE[piece.type],boxShadow:isSel?`0 0 12px ${selC}`:"none"}}><PieceIcon type={piece.type} team={piece.team} size={CS-8} iconSet={iconSet}/></div>{isBall&&<div style={{position:"absolute",bottom:-9,right:-9,fontSize:15,zIndex:7,filter:"drop-shadow(0 1px 4px rgba(0,0,0,0.9))"}}>âš½</div>}{isShot&&isShot.isGoal&&<div style={{position:"absolute",inset:-2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,zIndex:6}}>ðŸ¥…</div>}</div>)}</div>);}
  const tcCur=curTeam===TEAM_A?"#3b82f6":"#ef4444";
  return(<div style={{minHeight:"100vh",background:"#0a1628",display:"flex",gap:12,padding:12,fontFamily:"monospace",color:"white",overflowX:"auto"}}><div style={{display:"flex",flexDirection:"column",gap:8,minWidth:165}}><div style={{background:"#0f1c2e",border:"2px solid #1f2937",borderRadius:12,padding:"10px 14px",textAlign:"center"}}><div style={{fontSize:8,color:"#4b5563",letterSpacing:2,marginBottom:4}}>MARCADOR</div><div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:12}}><div><div style={{fontSize:8,color:"#3b82f6"}}>A</div><div style={{fontSize:28,fontWeight:900,color:"#3b82f6"}}>{score.A}</div><div style={{fontSize:7,color:"#4b5563"}}>{fmA.label}</div></div><div style={{fontSize:16,color:"#1f2937"}}>â€”</div><div><div style={{fontSize:8,color:"#ef4444"}}>B</div><div style={{fontSize:28,fontWeight:900,color:"#ef4444"}}>{score.B}</div><div style={{fontSize:7,color:"#4b5563"}}>{fmB.label}</div></div></div></div><div style={{background:curTeam===TEAM_A?"#0d1e3a":"#3a0d0d",border:`2px solid ${tcCur}`,borderRadius:10,padding:"8px 12px",textAlign:"center"}}><div style={{fontSize:8,color:"#6b7280",letterSpacing:2}}>TURNO</div><div style={{fontSize:13,fontWeight:700,marginTop:2}}>{gameMode==="pvp"?(curTeam===TEAM_A?"Equipo A":"Equipo B"):(curTeam===TEAM_A?"TÃº (Azul)":"CPU (Rojo)")}{bonus&&<span style={{fontSize:8,color:"#fbbf24",marginLeft:4}}>BONUS</span>}</div>{aiThinking&&gameMode==="cpu"&&<div style={{fontSize:9,color:"#f87171",marginTop:2}}>ðŸ¤” pensando...</div>}{selP&&(gameMode==="pvp"||curTeam===TEAM_A)&&(<div style={{fontSize:8,color:"#9ca3af",marginTop:3}}><span style={{color:PCOL[selP.type],fontWeight:700}}>{PNAME[selP.type]}</span>{clickCt===1&&<div style={{color:"#fbbf24",fontSize:7,marginTop:1}}>2Â° click â†’ tiro</div>}{clickCt===2&&<div style={{color:"#f87171",fontSize:7,marginTop:1}}>ðŸŸ  tiro Â· ðŸ”´ gol Â· ðŸ”µ pase</div>}</div>)}</div>{over&&(<div style={{display:"flex",flexDirection:"column",gap:6}}><div style={{textAlign:"center",fontSize:11,color:"#fbbf24",fontWeight:700}}>ðŸ† Equipo {score.A>=5?"A":"B"} gana!</div><button onClick={onRestart} style={{background:"#78350f",border:"1px solid #f59e0b",borderRadius:6,color:"white",padding:"7px",cursor:"pointer",fontSize:10,fontFamily:"monospace",fontWeight:700,width:"100%"}}>ðŸ”„ Nueva Partida</button></div>)}<div style={{display:"flex",gap:4}}>{!over&&<button onClick={undoMove} disabled={!history.length} style={{flex:1,background:history.length?"#1f2937":"#111",border:"1px solid #374151",borderRadius:6,color:history.length?"#e5e7eb":"#4b5563",padding:"6px",cursor:history.length?"pointer":"not-allowed",fontSize:10,fontFamily:"monospace",fontWeight:700}}>â†©</button>}<button onClick={onRestart} style={{flex:1,background:"#1f2937",border:"1px solid #374151",borderRadius:6,color:"#e5e7eb",padding:"6px",cursor:"pointer",fontSize:10,fontFamily:"monospace",fontWeight:700}}>ðŸ”„</button><button onClick={()=>setIconSet(s=>s==="chess"?"medieval":"chess")} style={{flex:1,background:iconSet==="medieval"?"#3b0764":"#1f2937",border:`1px solid ${iconSet==="medieval"?"#7c3aed":"#374151"}`,borderRadius:6,color:"#e5e7eb",padding:"6px",cursor:"pointer",fontSize:12,fontFamily:"monospace",fontWeight:700}}>{iconSet==="chess"?"âš”ï¸":"â™›"}</button></div><Fold title="CONTROLES" defaultOpen={true}><div style={{fontSize:9,color:"#6b7280",lineHeight:2}}><div>1 click â†’ mover</div><div>2 clicks â†’ tiro</div>{[["#eab308","Mover"],["#ea580c","Tiro"],["#3b82f6","CompaÃ±ero"],["#ef4444","Gol"]].map(([c,l])=>(<div key={l} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:2,background:c}}/>{l}</div>))}</div></Fold><Fold title="PIEZAS"><div style={{fontSize:9,color:"#6b7280",lineHeight:2}}><div>â™š P â€” Portero Â· 1 casilla</div><div>â™› R â€” Reyna Â· 3 casillas</div><div>â™œ T â€” Torre Â· 4 recto</div><div>â™ž C â€” Caballo Â· L</div></div></Fold><Fold title="REGISTRO" defaultOpen={true}><div style={{maxHeight:150,overflowY:"auto"}}>{log.map((l,i)=><div key={i} style={{fontSize:9,marginBottom:3,color:i===0?"#e5e7eb":"#6b7280",borderLeft:`2px solid ${i===0?"#10b981":"#1f2937"}`,paddingLeft:5,lineHeight:1.5}}>{l}</div>)}</div></Fold></div><div><div style={{textAlign:"center",fontSize:8,color:"#60a5fa",letterSpacing:3,marginBottom:4,fontWeight:700}}>TÃš (AZUL) â€” PORTERÃA â†‘</div><FieldWithLabels CS={CS}><div style={{position:"relative",border:"3px solid #1f6b3d",borderRadius:4,overflow:"hidden",boxShadow:"0 0 30px rgba(0,150,60,0.3)"}}><FieldSVG CS={CS}/><div style={{display:"grid",gridTemplateColumns:`repeat(${COLS},${CS}px)`,gridTemplateRows:`repeat(${ROWS},${CS}px)`,position:"relative",zIndex:2}}>{Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>renderCell(r,c)))}</div></div></FieldWithLabels><div style={{textAlign:"center",fontSize:8,color:"#f87171",letterSpacing:3,marginTop:4,fontWeight:700}}>CPU (ROJO) â€” PORTERÃA â†“</div></div></div>);
}

// â”€â”€ ROOT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FutbolAjedrez(){
  const[phase,setPhase]=useState("MODE");
  const[fmA,setFmA]=useState(null);
  const[fmB,setFmB]=useState(null);
  const[initPieces,setInitPieces]=useState(null);
  const[gameMode,setGameMode]=useState("cpu");

  // Online state
  const[roomCode,setRoomCode]=useState(null);
  const[myTeam,setMyTeam]=useState(null);
  const[onlineGameState,setOnlineGameState]=useState(null);
  const[onlineReady,setOnlineReady]=useState(false);

  function restart(){
    setPhase("MODE");setFmA(null);setFmB(null);setInitPieces(null);
    setRoomCode(null);setMyTeam(null);setOnlineGameState(null);setOnlineReady(false);
  }

  // When two players join a room, both choose formations and confirm
  function handleOnlineJoin(code,team){
    setRoomCode(code);setMyTeam(team);setPhase("COACH_A_ONLINE");
  }

  // Online: player A picks formation for A, player B picks for B
  // We store both in Supabase then both get notified
  async function handleOnlineFormation(fm){
    const teamKey=myTeam==="A"?"fmA":"fmB";
    const{data}=await sb.from("game_state").select("state").eq("room_id",roomCode).single();
    const prev=data?.state||{};
    const newState={...prev,[teamKey]:fm,phase:"waiting_formations"};
    await sb.from("game_state").upsert({room_id:roomCode,state:newState,updated_at:new Date().toISOString()});
    setOnlineGameState(newState);
    // Check if both ready
    if(prev[myTeam==="A"?"fmB":"fmA"]){
      // Both formations set â€” go to placement
      setFmA(myTeam==="A"?fm:prev.fmA);
      setFmB(myTeam==="B"?fm:prev.fmB);
      setPhase("PLACE_ONLINE");
    } else {
      setPhase("WAITING_OPPONENT_FORMATION");
    }
  }

  // Poll for opponent formation
  useEffect(()=>{
    if(phase!=="WAITING_OPPONENT_FORMATION"||!roomCode)return;
    const channel=sb.channel("formation:"+roomCode)
      .on("postgres_changes",{event:"*",schema:"public",table:"game_state",filter:`room_id=eq.${roomCode}`},payload=>{
        const s=payload.new?.state;
        if(!s)return;
        const otherKey=myTeam==="A"?"fmB":"fmA";
        if(s[otherKey]){
          channel.unsubscribe();
          const myKey=myTeam==="A"?"fmA":"fmB";
          setFmA(s.fmA);setFmB(s.fmB);
          setPhase("PLACE_ONLINE");
        }
      }).subscribe();
    return()=>{sb.removeChannel(channel);};
  },[phase,roomCode,myTeam]);

  async function handleOnlinePlacement(ps){
    const placementKey=myTeam==="A"?"piecesA":"piecesB";
    const{data}=await sb.from("game_state").select("state").eq("room_id",roomCode).single();
    const prev=data?.state||{};
    const newState={...prev,[placementKey]:ps,phase:"waiting_placement"};
    await sb.from("game_state").upsert({room_id:roomCode,state:newState,updated_at:new Date().toISOString()});

    const otherKey=myTeam==="A"?"piecesB":"piecesA";
    if(prev[otherKey]){
      // Merge pieces from both players
      const allPieces=myTeam==="A"?[...ps,...prev[otherKey]]:[...prev[otherKey],...ps];
      setInitPieces(allPieces);
      setPhase("ONLINE_GAME");
    } else {
      setPhase("WAITING_OPPONENT_PLACEMENT");
    }
  }

  // Poll for opponent placement
  useEffect(()=>{
    if(phase!=="WAITING_OPPONENT_PLACEMENT"||!roomCode)return;
    const{data:localState}=sb.from("game_state").select("state").eq("room_id",roomCode).single();
    const channel=sb.channel("placement:"+roomCode)
      .on("postgres_changes",{event:"*",schema:"public",table:"game_state",filter:`room_id=eq.${roomCode}`},payload=>{
        const s=payload.new?.state;
        if(!s)return;
        const otherKey=myTeam==="A"?"piecesB":"piecesA";
        const myKey=myTeam==="A"?"piecesA":"piecesB";
        if(s[otherKey]&&s[myKey]){
          channel.unsubscribe();
          const allPieces=myTeam==="A"?[...s.piecesA,...s.piecesB]:[...s.piecesA,...s.piecesB];
          setInitPieces(allPieces);
          setPhase("ONLINE_GAME");
        }
      }).subscribe();
    return()=>{sb.removeChannel(channel);};
  },[phase,roomCode,myTeam]);

  if(phase==="MODE")return <ModeScreen onMode={m=>{setGameMode(m);if(m==="online")setPhase("LOBBY");else setPhase("COACH_A");}}/>;
  if(phase==="LOBBY")return <LobbyScreen onJoinGame={handleOnlineJoin} onBack={()=>setPhase("MODE")}/>;

  // Online formation flow
  if(phase==="COACH_A_ONLINE")return <CoachScreen team={myTeam} onConfirm={handleOnlineFormation}/>;
  if(phase==="WAITING_OPPONENT_FORMATION")return(
    <div style={{minHeight:"100vh",background:"#0a1628",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>
      <div style={{background:"#0f1c2e",border:"2px solid #7c3aed",borderRadius:18,padding:"40px",textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:12}}>â³</div>
        <div style={{fontSize:16,fontWeight:900,color:"white",marginBottom:8}}>Esperando formaciÃ³n rival...</div>
        <div style={{fontSize:10,color:"#6b7280"}}>Sala: <span style={{color:"#7c3aed",fontWeight:900}}>{roomCode}</span></div>
      </div>
    </div>
  );

  // Online placement â€” each player only places their own pieces
  if(phase==="PLACE_ONLINE"&&fmA&&fmB){
    const myFm=myTeam==="A"?fmA:fmB;
    const myPieces=defaultPieces(myFm,myTeam,TEAM_A);
    return(
      <div style={{minHeight:"100vh",background:"#0a1628",display:"flex",gap:12,padding:12,fontFamily:"monospace",color:"white",overflowX:"auto",alignItems:"flex-start"}}>
        <div style={{display:"flex",flexDirection:"column",gap:10,minWidth:200}}>
          <div style={{background:"#0f1c2e",border:"2px solid #7c3aed",borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontSize:9,color:"#7c3aed",letterSpacing:3,marginBottom:6}}>TU COLOCACIÃ“N</div>
            <div style={{fontSize:10,color:"#9ca3af",lineHeight:1.8}}>Coloca tus piezas en tu mitad del campo</div>
          </div>
          <button onClick={()=>handleOnlinePlacement(myPieces)} style={{width:"100%",padding:"12px",background:"#064e3b",border:"2px solid #10b981",borderRadius:12,color:"white",fontSize:12,fontWeight:900,cursor:"pointer",fontFamily:"monospace",letterSpacing:3}}>
            âš½ CONFIRMAR
          </button>
        </div>
        <FieldWithLabels CS={40}>
          <div style={{position:"relative",border:"3px solid #1f6b3d",borderRadius:4,overflow:"hidden"}}>
            <FieldSVG CS={40}/>
            <div style={{display:"grid",gridTemplateColumns:`repeat(${COLS},40px)`,gridTemplateRows:`repeat(${ROWS},40px)`,position:"relative",zIndex:2}}>
              {Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>{
                const piece=pat(myPieces,r,c);
                const bg=cellBg(r,c);
                return(<div key={`${r}-${c}`} style={{width:40,height:40,background:bg,border:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {piece&&<PieceIcon type={piece.type} team={piece.team} size={32}/>}
                </div>);
              }))}
            </div>
          </div>
        </FieldWithLabels>
      </div>
    );
  }

  if(phase==="WAITING_OPPONENT_PLACEMENT")return(
    <div style={{minHeight:"100vh",background:"#0a1628",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>
      <div style={{background:"#0f1c2e",border:"2px solid #7c3aed",borderRadius:18,padding:"40px",textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:12}}>â³</div>
        <div style={{fontSize:16,fontWeight:900,color:"white",marginBottom:8}}>Esperando que el rival coloque sus piezas...</div>
        <div style={{fontSize:10,color:"#6b7280"}}>Sala: <span style={{color:"#7c3aed",fontWeight:900}}>{roomCode}</span></div>
      </div>
    </div>
  );

  if(phase==="ONLINE_GAME"&&initPieces&&fmA&&fmB&&roomCode&&myTeam){
    return <OnlineGameBoard roomCode={roomCode} myTeam={myTeam} fmA={fmA} fmB={fmB} initPieces={initPieces} kickWinner={TEAM_A} onRestart={restart}/>;
  }

  // Local modes
  if(phase==="COACH_A")return <CoachScreen team={TEAM_A} onConfirm={fm=>{setFmA(fm);setPhase("COACH_B");}}/>;
  if(phase==="COACH_B")return <CoachScreen team={TEAM_B} onConfirm={fm=>{setFmB(fm);setPhase("PLACE");}}/>;
  if(phase==="PLACE")return <PlacementScreen fmA={fmA} fmB={fmB} kickWinner={TEAM_A} onStart={ps=>{setInitPieces(ps);setPhase("GAME");}}/>;
  if(phase==="GAME")return <GameBoard initPieces={initPieces} kickWinner={TEAM_A} fmA={fmA} fmB={fmB} gameMode={gameMode} onRestart={restart}/>;

  return <ModeScreen onMode={m=>{setGameMode(m);if(m==="online")setPhase("LOBBY");else setPhase("COACH_A");}}/>;
}

export default function App(){
  return <FutbolAjedrez key="fa-online-v1"/>;
                                     }
