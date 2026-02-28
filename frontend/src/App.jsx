import React, {useState, useEffect} from 'react'
import axios from 'axios'

function FadeIn({children}){
  const [inView,setIn]=React.useState(false);
  React.useEffect(()=>{setTimeout(()=>setIn(true),10)},[]);
  const style = {
    transition: 'opacity 280ms ease, transform 280ms ease',
    opacity: inView?1:0,
    transform: inView? 'translateY(0px)' : 'translateY(8px)'
  }
  return <div style={style}>{children}</div>
}


// Debug helper: log clicks and element under pointer
try{
  if(typeof window !== 'undefined'){
    window.addEventListener('click', function dbg(e){
      try{
        const el = document.elementFromPoint(e.clientX, e.clientY)
        console.log('DBG click', e.clientX, e.clientY, el && el.tagName, el && el.className)
      }catch(err){console.error(err)}
    }, {capture:true})
  }
}catch(e){}
// In-container backend hostname (docker-compose service name)
axios.defaults.baseURL = process.env.REACT_APP_API_BASE || (window.location.protocol + '//' + window.location.hostname + ':8000')

function Login({onLogin}){
  const [user,setUser]=useState('admin')
  const [pw,setPw]=useState('')
  const [auto,setAuto]=useState(true)
  async function submit(e){
    e.preventDefault()
    const r=await axios.post('/api/login',{username:user,password:pw})
    onLogin(r.data.token, r.data.role, auto)
  }
  return (<div style={{maxWidth:420, margin:'40px auto', padding:24, borderRadius:16, background:'#FFF8F0', boxShadow:'0 6px 18px rgba(0,0,0,0.06)', fontFamily:'Noto Sans KR, Arial'}}>
    <h2>Parent Journal</h2>
    <form onSubmit={submit}>
      <div><label>Username</label><input value={user} onChange={e=>setUser(e.target.value)} /></div>
      <div><label>Password</label><input type="password" value={pw} onChange={e=>setPw(e.target.value)} /></div>
      <div><label><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)} /> 자동로그인</label></div>
      <button type="submit">Login</button>
    </form>
  </div>)
}

function Timeline({token, onView, onNew}){
  const [entries,setEntries]=useState([])
  useEffect(()=>{ if(token) fetch() },[token])
  async function fetch(){ const r=await axios.get('/api/entries',{params:{token}}); setEntries(r.data)}
  return (<div style={{padding:20, fontFamily:'Noto Sans KR, Arial'}}>
    <div style={{display:'flex', justifyContent:'flex-start', alignItems:'center'}}>
      <h1 style={{margin:0, color:'#FF6B81'}}>타임라인</h1>
    </div>
    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px,1fr))', gap:16, marginTop:16}}>
      {entries.map(e=> (
        <div key={e.id} onClick={()=>onView(e.id)} style={{background:'#fff',borderRadius:14,padding:14,boxShadow:'0 6px 18px rgba(0,0,0,0.06)', cursor:'pointer'}}>
          <small style={{color:'#999'}}>{e.date}</small>
          <p style={{margin:'8px 0', color:'#333'}}>{e.body.slice(0,140)}</p>
        </div>
      ))}
    </div>
  </div>)
}

function Editor({token, onDone, editId, initialDate}){
  const [date,setDate]=useState(initialDate || new Date().toISOString().slice(0,10)); const [body,setBody]=useState(''); const [files,setFiles]=useState([])
  const [keepImages,setKeepImages]=useState([])
  useEffect(()=>{
    if(editId){ (async ()=>{ try{ const r=await axios.get('/api/entries/'+editId,{params:{token}}); setBody(r.data.body); setDate(r.data.date); setKeepImages((r.data.images||[]).map(i=>i.original.split('/').pop())) }catch(e){console.error('load entry failed',e)} })() }
  },[editId, token])
  useEffect(()=>{ console.log('Editor mount', editId) },[editId])
  async function submit(){
    try{
      const form=new FormData();
      form.append('body',body);
      form.append('date',date);
      form.append('token',token);
      for(let f of files) form.append('files', f);
      const r = await axios.post('/api/entries', form);
      const newId = r.data && r.data.id
      onDone(newId || null)
    }catch(e){
      console.error('save failed',e); alert('저장 실패: '+(e.response?e.response.statusText:e.message))
    }
  }
  return (<div style={{padding:20, fontFamily:'Noto Sans KR, Arial'}}>
    <h2 style={{color:'#FF6B81'}}>{editId? '기록 수정' : '새 기록 작성'}</h2>
    <div style={{display:'grid', gap:10, maxWidth:760}}>
      <label style={{fontSize:13,color:'#444'}}>날짜</label>
      <input type='date' value={date} onChange={e=>setDate(e.target.value)} style={{padding:8,borderRadius:10,border:'1px solid #f0dcdc'}} />
      <label style={{fontSize:13,color:'#444'}}>내용</label>
      <textarea placeholder='오늘의 순간을 적어보세요...' value={body} onChange={e=>setBody(e.target.value)} style={{minHeight:160,padding:10,borderRadius:12,border:'1px solid #f0dcdc'}} />
      <label style={{fontSize:13,color:'#444'}}>사진 추가</label>
      <input type='file' multiple onChange={e=>setFiles(Array.from(e.target.files))} />
      {keepImages.length>0 && (<div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
        {keepImages.map(fn=>{
          const url = window.location.protocol + '//' + window.location.hostname + ':8000/uploads/'+(editId||'')+'/'+fn
          return (<div key={fn} style={{width:96}}>
            <img src={url} style={{width:96,height:64,objectFit:'cover',borderRadius:8}} />
            <div style={{textAlign:'center'}}><button onClick={()=>setKeepImages(keepImages.filter(x=>x!==fn))} style={{background:'#fff',border:'1px solid #f0dcdc',borderRadius:8,padding:'4px',marginTop:6}}>제거</button></div>
          </div>)
        })}
      </div>)}
      <div style={{display:'flex', gap:8}}>
        <button onClick={async (e)=>{ e.stopPropagation(); console.log('save click', editId); if(editId){ try{ const form = new FormData(); form.append('body', body); form.append('date', date); form.append('token', token); form.append('keep_images', JSON.stringify(keepImages)); for(let f of files) form.append('files', f); await axios.put('/api/entries/'+editId, form); onDone(editId); }catch(e){ alert('수정 실패') } }else submit() }} style={{background:'#FF6B81', color:'#fff', border:'none', padding:'10px 14px', borderRadius:12, pointerEvents:'auto'}}>저장</button>
        <button onClick={()=>onDone()} style={{background:'#FFF', border:'1px solid #f0dcdc', padding:'10px 14px', borderRadius:12}}>취소</button>
      </div>
    </div>
  </div>)
}

function Detail({token,id, onBack, onEdit}){
  const [entry,setEntry]=useState(null)
  useEffect(()=>{ if(id) load() },[id])
  async function load(){ const r=await axios.get('/api/entries/'+id,{params:{token}}); setEntry(r.data) }
  if(!entry) return <div>로딩 중...</div>
  return (<div style={{padding:20, fontFamily:'Noto Sans KR, Arial', maxWidth:900, margin:'0 auto'}}>
    <button onClick={onBack} style={{background:'#fff',border:'none',color:'#666',marginBottom:12}}>← 목록으로</button>
    <div style={{display:'flex', alignItems:'center', gap:12}}>
      <div style={{width:72,height:72,borderRadius:18, background:'#FFEFF4', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28}}>👶</div>
      <div>
        <div style={{fontSize:24, color:'#FF6B81'}}>소중한 기록</div>
        <div style={{color:'#999'}}>{entry.date}</div>
      </div>
    </div>
    <div style={{marginTop:18, padding:16, background:'#fff', borderRadius:12, boxShadow:'0 6px 18px rgba(0,0,0,0.04)'}}>
      <div style={{whiteSpace:'pre-wrap', lineHeight:1.7, color:'#333'}}>{entry.body}</div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:12, marginTop:16}}>
        {entry.images.map(im=>{
          const host = window.location.protocol + '//' + window.location.hostname + ':8000'
          return (<div key={im.thumb} style={{borderRadius:12, overflow:'hidden'}}>
            <img src={host + im.thumb} style={{width:'100%', height:200, objectFit:'cover', display:'block', cursor:'pointer'}} onClick={()=>window.open(host + im.original)} />
          </div>)
        })}
      </div>
    </div>
    <div style={{display:'flex', gap:8, marginTop:12, position:'relative', zIndex:999}}>
      <button onClick={()=>{ if(window.confirm('삭제하시겠습니까?')){ axios.delete('/api/entries/'+id, {params:{token}}).then(()=>{ alert('삭제됨'); history.pushState({view:'timeline'},'',undefined); setTimeout(()=>location.reload(),200) }).catch(e=>alert('삭제 실패')) }}} style={{background:'#fff', border:'1px solid #f0dcdc', padding:'8px 12px', borderRadius:10, position:'relative', zIndex:1000, pointerEvents:'auto'}}>삭제</button>
      <button onClick={()=>{ console.log('edit-click',id,onEdit); if(typeof onEdit==='function') { try{ onEdit(id) }catch(e){console.error(e)} } else { history.pushState({view:'new',id},'',undefined); } }} style={{background:'#FF6B81', color:'#fff', border:'none', padding:'8px 12px', borderRadius:10, position:'relative', zIndex:1000, pointerEvents:'auto'}}>수정</button>
    </div>
  </div>)
}

function CalendarView({token, onOpenDate}){
  const [yearMonth,setYearMonth]=useState(()=>{ const d=new Date(); return {y:d.getFullYear(), m:d.getMonth()} })
  const [entriesByDate,setEntriesByDate]=useState({})
  useEffect(()=>{ if(token) loadAll() },[token, yearMonth])
  function localDateKey(dstr){ try{ // parse YYYY-MM-DD without timezone effects
    const m = dstr.match(/(\d{4}-\d{2}-\d{2})/);
    const datePart = m? m[1] : dstr.slice(0,10);
    const parts = datePart.split('-').map(x=>parseInt(x,10));
    if(parts.length===3){ const d = new Date(parts[0], parts[1]-1, parts[2]); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0') }
    return dstr.slice(0,10) }catch(e){ return dstr.slice(0,10) } }
  async function loadAll(){ const r=await axios.get('/api/entries',{params:{token, limit:1000}}); const grouped={}; (r.data||[]).forEach(e=>{ const d=localDateKey(e.date); if(!grouped[d]) grouped[d]=[]; grouped[d].push(e) }); setEntriesByDate(grouped) }
  function prev(){ let y=yearMonth.y, m=yearMonth.m-1; if(m<0){m=11;y--} setYearMonth({y,m}) }
  function next(){ let y=yearMonth.y, m=yearMonth.m+1; if(m>11){m=0;y++} setYearMonth({y,m}) }
  const first=new Date(yearMonth.y, yearMonth.m,1)
  const startDay = first.getDay() // 0 Sunday
  const daysInMonth = new Date(yearMonth.y, yearMonth.m+1,0).getDate()
  const weeks=[]; let day=1 - startDay
  for(let w=0; w<6; w++){ const week=[]; for(let i=0;i<7;i++){ const cur = new Date(yearMonth.y, yearMonth.m, day); const inMonth = cur.getMonth()===yearMonth.m; const key = cur.toISOString().slice(0,10); week.push({day:cur.getDate(), inMonth, key, count: entriesByDate[key]? entriesByDate[key].length:0}) ; day++ } weeks.push(week) }
  return (<div style={{padding:20, display:'flex', justifyContent:'center'}}>
    <div style={{width:'100%', maxWidth:1000, background:'#fff', borderRadius:12, padding:12, boxShadow:'0 6px 18px rgba(0,0,0,0.04)', margin:'0 auto', maxHeight:'calc(100vh - 220px)', overflowY:'auto', paddingBottom:20, WebkitOverflowScrolling:'touch'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <button onClick={prev}>◀</button>
      <div style={{fontSize:18}}>{yearMonth.y}년 {yearMonth.m+1}월</div>
      <button onClick={next}>▶</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6, marginTop:12, gridAutoRows:'80px'}}>
      {['일','월','화','수','목','금','토'].map(h=>(<div key={h} style={{textAlign:'center',fontWeight:600,color:'#666'}}>{h}</div>))}
      {weeks.flat().map(cell=> (
        <div key={cell.key} onClick={()=>cell.inMonth && onOpenDate(cell.key)} style={{height:80, padding:8, borderRadius:8, background: cell.inMonth? '#fff':'transparent', boxShadow: cell.inMonth? '0 4px 12px rgba(0,0,0,0.04)': 'none', cursor: cell.inMonth? 'pointer':'default', position:'relative', boxSizing:'border-box'}}>{
          cell.inMonth ? (<>
            <div style={{position:'absolute',right:8,top:8,fontSize:12,color:'#999'}}>{cell.day}</div>
            {cell.count>0 && (<div style={{position:'absolute',left:8,bottom:8,background:'#FFEEF2',color:'#FF6B81',padding:'4px 6px',borderRadius:12,fontSize:12}}>{cell.count}개</div>)}
          </>) : null}
        </div>
      ))}
    </div>
    </div>
  </div>)
}

export default function App(){
  const [token,setToken]=useState(localStorage.getItem('pj_token'))
  const [role,setRole]=useState(localStorage.getItem('pj_role'))
  const [view,setView]=useState('timeline')
  const [viewId,setViewId]=useState(null)
  const [modalOpen,setModalOpen]=useState(false)
  const [modalEditId,setModalEditId]=useState(null)
  const [modalDate,setModalDate]=useState(null)
  useEffect(()=>{ if(token) { setView('timeline') } },[token])
  useEffect(()=>{
    const onpop = (e) => {
      const s = history.state || {}
      if(s.view){
        setView(s.view)
        setViewId(s.id||null)
      }
      if(s.modal){ setModalOpen(true); setModalEditId(s.modalId||null) } else { setModalOpen(false); setModalEditId(null) }
    }
    window.addEventListener('popstate', onpop)
    return ()=> window.removeEventListener('popstate', onpop)
  },[])
  useEffect(()=>{ console.log('modalOpen=', modalOpen, 'modalEditId=', modalEditId) },[modalOpen, modalEditId])
  // ensure there's an initial history state so a single back goes to timeline
  useEffect(()=>{
    try{ const s = history.state || {};
      if(!s.view) history.replaceState({view:'timeline', modal: false}, '', undefined)
    }catch(e){}
  },[])
  function onLogin(t,r,auto){ setToken(t); setRole(r); if(auto){ localStorage.setItem('pj_token',t); localStorage.setItem('pj_role',r)} }
  if(!token) return <Login onLogin={onLogin} />
  let main = null
  const Header = (<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:16,position:'sticky',top:0,background:'#fff',zIndex:200}}><div style={{fontSize:20,color:'#FF6B81'}}>육아 일기</div><div><button onClick={()=>setView('timeline')} style={{marginRight:8}}>타임라인</button><button onClick={()=>setView('calendar')}>캘린더</button><button onClick={()=>{ setModalEditId(null); setModalOpen(true); history.pushState({modal:true,modalId:null},'',undefined); }} style={{marginLeft:12,background:'#FFD8E0', border:'none', padding:'8px 10px', borderRadius:10}}>새로운 기록</button></div></div>)
  if(view==='timeline') main = <div><Timeline token={token} onView={(id)=>{ history.pushState({view:'detail',id},'',undefined); setView('detail'); setViewId(id)}} onNew={()=>{ setModalEditId(null); setModalOpen(true); history.pushState({modal:true,modalId:null},'',undefined); }} /></div>
  else if(view==='detail') main = <Detail token={token} id={viewId} onBack={()=>{ history.back(); }} onEdit={(id)=>{ setModalEditId(id); setModalOpen(true); history.pushState({modal:true,modalId:id},'',undefined); }} />
  else if(view==='calendar') main = <CalendarView token={token} onOpenDate={(d)=>{ setModalEditId(null); setModalDate(d); setModalOpen(true); history.pushState({modal:true,modalId:null, modalDate:d},'',undefined); }} />

  return (<div>{Header}{main}{modalOpen && (
      <div>
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',backdropFilter:'blur(2px)',WebkitBackdropFilter:'blur(2px)'}} onClick={()=>{ history.back(); }}></div>
        <div style={{position:'fixed',left:'50%',top:84,transform:'translateX(-50%)',width:'min(920px,95%)',zIndex:3000,boxShadow:'0 20px 60px rgba(0,0,0,0.4)',maxHeight:'calc(100vh - 120px)',overflowY:'auto',WebkitOverflowScrolling:'touch'}} onClick={e=>e.stopPropagation()}>
          <div style={{background:'#fff',borderRadius:12,overflow:'hidden'}}>
            <Editor token={token} editId={modalEditId} initialDate={modalDate} onDone={(eid)=>{ history.back(); setModalOpen(false); setModalEditId(null); setModalDate(null); if(eid){ history.pushState({view:'detail',id:eid},'',undefined); setView('detail'); /* force reload detail by resetting id briefly */ setViewId(null); setTimeout(()=>setViewId(eid),50) } else { setView('timeline'); setViewId(null); } }} />
          </div>
        </div>
      </div>
    )} 
  </div>)
 }
