import {useState,useEffect,useRef} from 'react'
import D from './db.json'
const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch{return d}}
const LG=D.languages
const useHash=()=>{const[h,s]=useState(location.hash||'#/');useEffect(()=>{const f=()=>{s(location.hash||'#/');scrollTo(0,0)};addEventListener('hashchange',f);return()=>removeEventListener('hashchange',f)},[]);return h}
const jump=id=>{const go=()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth'});if((location.hash||'#/')!=='#/'){location.hash='#/';setTimeout(go,120)}else go()}

async function translate(text,from,to){
 const parts=(text.match(/[^.!?।\n]+[.!?।\n]*/g)||[text]).reduce((a,s)=>{const l=a[a.length-1];l!==undefined&&(l+s).length<420?a[a.length-1]=l+s:a.push(s);return a},[])
 let out=''
 for(const p of parts){if(!p.trim()){out+=p;continue}
  const r=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(p)}&langpair=${from}|${to}`);const j=await r.json()
  if(j.responseStatus&&j.responseStatus!==200)throw new Error(j.responseDetails||'Translation failed')
  out+=j.responseData.translatedText}
 return out
}
const FILE_KINDS={
 image:/\.(avif|bmp|gif|heic|jpe?g|png|tiff?|webp)$/i,
 pdf:/\.pdf$/i,
 media:/\.(aac|aiff?|flac|m4a|mkv|mov|mp3|mp4|mpeg|oga|ogg|opus|wav|webm|wmv)$/i,
 text:/\.(csv|html?|json|md|rtf|srt|sub|tsv|txt|vtt|xml|yaml|yml)$/i,
 doc:/\.(docx?|odt|pages|pptx?|xlsx?)$/i
}

const kindOf=f=>{
 const type=(f.type||'').toLowerCase(),name=f.name||''
 if(type.startsWith('image/')||FILE_KINDS.image.test(name))return'image'
 if(type==='application/pdf'||FILE_KINDS.pdf.test(name))return'pdf'
 if(type.startsWith('audio/')||type.startsWith('video/')||FILE_KINDS.media.test(name))return'media'
 if(type.startsWith('text/')||FILE_KINDS.text.test(name))return'text'
 if(FILE_KINDS.doc.test(name))return'doc'
 return'unknown'
}
const dl=(name,txt)=>{const a=document.createElement('a');const url=URL.createObjectURL(new Blob([txt],{type:'text/plain;charset=utf-8'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
const loadScript=(src,ready)=>new Promise((resolve,reject)=>{
 if(ready())return resolve()
 const s=document.createElement('script');s.src=src;s.onload=()=>ready()?resolve():reject(new Error('Library failed to initialise'));s.onerror=()=>reject(new Error('Could not load extraction library'));document.head.appendChild(s)
})
const OCR_LANG={en:'eng',mr:'mar',hi:'hin',gu:'guj',ta:'tam',te:'tel',kn:'kan',bn:'ben',ur:'urd',pa:'pan'}
async function extractImage(file,language){
 await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',()=>window.Tesseract)
 const{data}=await window.Tesseract.recognize(file,OCR_LANG[language]||'eng')
 return data.text.trim()
}
async function extractPdf(file){
 await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',()=>window.pdfjsLib)
 const pdf=await window.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise
 const pages=[]
 for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const content=await page.getTextContent();pages.push(content.items.map(x=>x.str).join(' '))}
 return pages.join('\n\n').trim()
}
async function extractDocx(file){
 await loadScript('https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js',()=>window.mammoth)
 const result=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})
 return result.value.trim()
}
async function extractMedia(file){
 const body=new FormData();body.append('file',file,file.name)
 const response=await fetch('/api/extract-media',{method:'POST',body})
 if(!response.ok)throw new Error('Audio and video need a configured speech-to-text service. Add /api/extract-media to enable transcription.')
 const data=await response.json()
 if(!data.text||typeof data.text!=='string')throw new Error('The speech-to-text service returned no transcript.')
 return data.text.trim()
}
async function extractWithBackend(file){
 const body=new FormData();body.append('file',file,file.name)
 const response=await fetch('/api/extract-file',{method:'POST',body})
 if(!response.ok)throw new Error('This format needs the document extraction service. Configure /api/extract-file or upload a PDF, DOCX, image, or text file.')
 const data=await response.json()
 if(!data.text||typeof data.text!=='string')throw new Error('The document extraction service returned no readable text.')
 return data.text.trim()
}
async function extractFile(file,kind,language){
 if(kind==='text')return file.text()
 if(kind==='image')return extractImage(file,language)
 if(kind==='pdf')return extractPdf(file)
 if(kind==='doc'&&/\.docx$/i.test(file.name))return extractDocx(file)
 if(kind==='media')return extractMedia(file)
 return extractWithBackend(file)
}

function useReveal(dep){useEffect(()=>{const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('in')),{threshold:.12});document.querySelectorAll('.rv:not(.in)').forEach(n=>io.observe(n));return()=>io.disconnect()},[dep])}

function Nav({user,out}){
 const[o,setO]=useState(false)
 return <nav><div className="wrap"><div className="logo" onClick={()=>location.hash='#/'}><i>⚖</i><div><b>PuneCourtTranslator</b><small>LEGAL LANGUAGE AI</small></div></div>
 <div className={'links'+(o?' open':'')} onClick={()=>setO(false)}>{[['features','Features'],['pricing','Pricing'],['about','About'],['contact','Contact']].map(([k,l])=><a key={k} href={k==='about'?'#/about':undefined} onClick={e=>{if(k!=='about'){e.preventDefault();jump(k)}}}>{l}</a>)}</div>
 <div className="nr">{user?<><a className="btn gh sm" href="#/app">Dashboard</a><a className="btn sm" href="#/app">⚡ Translate</a><a className="av" href="#/profile" title="Open profile">{user.name.replace(/^Adv\.\s*/,'')[0]}</a><button className="btn gh sm" onClick={out}>Log out</button></>:<><a className="btn gh sm" href="#/login">Log in</a><a className="btn sm" href="#/login?signup">Start Free</a></>}<button className="bg" onClick={()=>setO(!o)}>☰</button></div></div></nav>
}

function AboutPage(){
 const[active,setActive]=useState(0)
 const chapters=[
  ['01','The problem','Court records move faster than language. A Marathi hearing, an English judgment and a scanned affidavit can all belong to the same matter — but rarely arrive in the same readable format.'],
  ['02','The translation layer','PuneCourtTranslator turns those fragments into one calm workspace: extract the words, translate the meaning and keep the original context close by for review.'],
  ['03','The human in control','This is assistive intelligence, not a replacement for legal judgement. Every output stays reviewable, downloadable and connected to the source record.']
 ]
 return <main className="about-page"><div className="wrap">
  <section className="about-hero"><span className="tag">✦ About PuneCourtTranslator</span><h1>Justice should not get <span className="gt">lost in translation.</span></h1><p>We are building a thoughtful language layer for Pune’s courts — helping advocates, litigants, clerks and interpreters move through complex records with more clarity and less waiting.</p><div className="about-hero-meta"><span><i className="pulse-dot"/> Built for Pune Court workflows</span><span>English · Marathi · Hindi · 10+ languages</span></div></section>
  <section className="about-story"><div className="about-story-intro"><span className="eyebrow">A BETTER WAY TO READ THE RECORD</span><h2>From a pile of files to a <span className="gt">shared understanding.</span></h2><p>Our product is designed around the real rhythm of legal work: evidence arrives in every format, language changes from room to room, and important decisions still need a human eye.</p><div className="about-quote">“Technology should make the record easier to enter — never harder to trust.”</div></div>
   <div className="case-file"><div className="case-file-top"><span>CASE FILE / PCT-2026</span><span className="case-status">● IN PROGRESS</span></div><div className="case-file-tabs">{chapters.map((c,i)=><button key={c[0]} className={active===i?'active':''} onClick={()=>setActive(i)}><b>{c[0]}</b><span>{c[1]}</span></button>)}</div><div className="case-file-body"><div className="case-file-mark">⚖</div><div><span className="eyebrow">{chapters[active][0]} / {chapters[active][1]}</span><p>{chapters[active][2]}</p></div></div><div className="case-file-footer"><span>source language detected</span><strong>MARATHI → ENGLISH</strong><span className="case-wave">{Array.from({length:18},(_,i)=><i key={i} style={{height:8+(i*13%22)}}/>)}</span></div></div>
  </section>
  <section className="about-principles"><span className="tag">Our principles</span><h2>Quiet technology. <span className="gt">Meaningful impact.</span></h2><div className="principle-grid"><div className="principle-card"><span>01</span><h3>Context over shortcuts</h3><p>Names, case numbers, dates and legal phrasing deserve careful review — not a rushed one-click black box.</p></div><div className="principle-card"><span>02</span><h3>Access over complexity</h3><p>A clear interface should welcome a first-time litigant and still feel powerful to a busy advocate.</p></div><div className="principle-card"><span>03</span><h3>Trust by design</h3><p>Originals stay close, outputs stay editable, and every translation is clearly marked as AI-assisted.</p></div></div></section>
  <section className="about-cta"><div className="fin"><span className="tag">Start with one record</span><h2>Make the next document <span className="gt">easier to understand.</span></h2><p>Explore the workspace with five free minutes — no card, no setup, no complicated onboarding.</p><div className="cta"><a className="btn" href="#/login?signup">Try PuneCourtTranslator →</a><a className="btn gh" href="#/">Back to home</a></div></div></section>
 </div></main>
}

function Hero(){
 const[i,setI]=useState(0),[n,setN]=useState(0),L=D.heroLines
 useEffect(()=>{const t=setInterval(()=>setN(x=>{if(x>=L[i][0].length+L[i][1].length+8){setI(v=>(v+1)%L.length);return 0}return x+1}),55);return()=>clearInterval(t)},[i])
 const[a,b]=L[i];const s1=a.slice(0,n),s2=b.slice(0,Math.max(0,n-a.length-4))
 return <div className="hero"><div className="hero-kicker"><span className="pulse-dot"/> AI media intelligence for Indian courts <span className="kicker-line"/></div><h1 className="rv in">Every Word in Court, <span className="gt">Understood in Any Language.</span></h1>
 <p>AI-powered translation for text, images, PDFs, audio and video. Built for Pune Court advocates, litigants and staff — Marathi, Hindi, English and more.</p>
 <div className="cta"><a className="btn" href="#/login?signup">⚡ Start Free — 5 mins on us</a><a className="btn gh" href="#/app">📤 Upload a File</a><a className="btn gh" style={{border:0,background:'none',color:'var(--mu)',boxShadow:'none'}} onClick={()=>jump('contact')}>Book a Demo →</a></div>
 <div className="term"><div className="dots"><i/><i/><i/>&nbsp;punecourt_translator — live<em>● Translating...</em></div>
 <div className="wf">{Array.from({length:44},(_,k)=><i key={k} style={{animationDelay:-(k*97%1100)+'ms',height:12+(k*37%44)}}/>)}</div>
 <div className="tr"><small>LIVE TRANSLATION</small><br/>[EN] {s1}<br/><span className="mr">[MR] {s2}</span><span className="cur"/></div></div>
 <div className="media-stage" aria-label="Animated translation workflow preview">
  <div className="stage-glow"/>
  <div className="stage-orbit orbit-one"/><div className="stage-orbit orbit-two"/>
  <div className="float-chip chip-image">▧ <span>Image OCR</span></div>
  <div className="float-chip chip-audio">◉ <span>Audio 00:42</span></div>
  <div className="stage-panel">
   <div className="stage-top"><span><i className="stage-live"/> processing_case_042.mp4</span><small>LIVE PREVIEW</small></div>
   <div className="stage-content"><div className="stage-video"><div className="video-frame"><span className="play-mark">▶</span><div className="scan-beam"/></div><div className="video-controls"><span>00:18</span><div className="progress"><i/></div><span>02:46</span></div></div>
   <div className="stage-transcript"><small>TRANSLATED TRANSCRIPT</small><div className="transcript-line">The matter is listed before the court.</div><div className="translated-line">प्रकरण न्यायालयासमोर सूचीबद्ध आहे.</div><div className="voice-bars">{Array.from({length:22},(_,k)=><i key={k} style={{height:10+(k*17%28)}}/>)}</div></div></div>
  </div>
 </div>
 <div className="stats">{D.stats.map(([a,b])=><div key={b}><b>{a}</b><span>{b}</span></div>)}</div></div>
}

function Landing({user}){
 const[q,setQ]=useState(-1)
 const[showcase,setShowcase]=useState('media')
 useReveal('l')
 const pick=p=>{if(!user)return location.hash='#/login?signup';location.hash='#/app';localStorage.setItem('pctplan',p)}
 return <><div className="wrap"><Hero/>
 <section className="showcase"><span className="tag">✦ One workspace, every format</span><h2>From spoken words to <span className="gt">court-ready insight.</span></h2><p className="sub">A calm, intelligent workflow for every file your team handles.</p>
 <div className="showcase-shell"><div className="showcase-nav">{[['media','◉','Media translation'],['documents','▤','Document intelligence'],['languages','文','Indian languages']].map(([key,icon,label])=><button key={key} className={showcase===key?'active':''} onClick={()=>setShowcase(key)}><b>{icon}</b>{label}</button>)}</div>
  <div className="showcase-body">{showcase==='media'&&<><div className="showcase-copy"><span className="eyebrow">MEDIA TRANSLATION</span><h3>Hear it. See it. Understand it.</h3><p>Turn hearings, recordings and video evidence into searchable translated transcripts with timestamps and speaker-aware context.</p><div className="metric-row"><span><b>99.2%</b><small>clear audio accuracy</small></span><span><b>50+</b><small>language pairs</small></span></div></div><div className="showcase-art media-art"><div className="art-screen"><div className="art-wave">{Array.from({length:30},(_,k)=><i key={k} style={{height:12+(k*23%44)}}/>)}</div><div className="art-caption">[00:42] Counsel may proceed.</div><div className="art-caption translated">[00:42] वकील पुढे जाऊ शकतात.</div></div><div className="art-bubble">● Speaking<br/><small>Speaker 02 · Marathi</small></div></div></>}
  {showcase==='documents'&&<><div className="showcase-copy"><span className="eyebrow">DOCUMENT INTELLIGENCE</span><h3>Every page, ready to act on.</h3><p>Extract, translate and organize judgments, affidavits, FIRs and notices without losing the structure of the original record.</p><div className="metric-row"><span><b>20+</b><small>file formats</small></span><span><b>OCR</b><small>for scanned pages</small></span></div></div><div className="showcase-art document-art"><div className="doc-sheet"><i/><i/><i/><i/><i/></div><div className="doc-scan"/></div></>}
  {showcase==='languages'&&<><div className="showcase-copy"><span className="eyebrow">LANGUAGE COVERAGE</span><h3>Built for the way India speaks.</h3><p>Translate legal language across English, Marathi, Hindi and regional languages while keeping names, dates and case terms easy to review.</p><div className="metric-row"><span><b>10+</b><small>Indian languages</small></span><span><b>24/7</b><small>secure access</small></span></div></div><div className="showcase-art language-art">{Object.entries(LG).slice(0,8).map(([key,label],k)=><span key={key} style={{'--i':k}}>{label}</span>)}</div></>}
  </div></div></section>
 <section id="features"><span className="tag">⚡ Features</span><h2>Everything you need to <span className="gt">understand court records</span></h2><p className="sub">From raw files to translated, structured text — in minutes, not days.</p>
 <div className="grid">{D.features.map(([i,t,d])=><div className="card rv" key={t}><div className="ic">{i}</div><h3>{t}</h3><p>{d}</p></div>)}</div></section>
 <section><span className="tag" style={{color:'#b48cff',borderColor:'#4a2f8a'}}>→ How It Works</span><h2>Three steps to translate anything</h2><p className="sub"/>
 <div className="steps">{D.steps.map(([i,t,d],k)=><div className="step rv" key={t}><div className="ic">{i}<b>{k+1}</b></div><h3>{t}</h3><p>{d}</p></div>)}</div><div className="cta"><a className="btn" href="#/login?signup">Try It Now — Free →</a></div></section>
 <section id="pricing"><span className="tag" style={{color:'#4ade80',borderColor:'#1d5a36'}}>⚡ Pricing</span><h2>Simple, honest pricing</h2><p className="sub">Start free. Scale as you grow.</p>
 <div className="plans">{D.plans.map(p=><div className={'plan rv'+(p.pop?' pop':'')} key={p.n}>{p.pop&&<span className="pp">Most Popular</span>}<h3>{p.n}</h3><div className="d">{p.d}</div><div className="p">{p.p} <small>{p.u}</small></div><ul>{p.f.map(f=><li key={f}>{f}</li>)}</ul><button className={'btn'+(p.pop?'':' gh')} onClick={()=>pick(p.n)}>{p.n==='Free'?'Start Free':'Start '+p.n}</button></div>)}</div></section>
 <section id="about"><span className="tag">✦ About PuneCourtTranslator</span><h2>Language should open the record, <span className="gt">not close it.</span></h2><p className="sub" style={{maxWidth:680,margin:'14px auto 0'}}>A focused language layer for Pune Court workflows — helping advocates, litigants, clerks and interpreters understand records in the language they think in.</p><div className="cta"><a className="btn gh" href="#/about">Read our story →</a></div></section>
 <section><h2>Frequently Asked Questions</h2><p className="sub"/><div className="faq">{D.faqs.map(([a,b],k)=><div className={'fq rv'+(q===k?' o':'')} key={a}><button onClick={()=>setQ(q===k?-1:k)}>{a}<span>⌄</span></button><p>{b}</p></div>)}</div></section>
 <section id="contact"><div className="fin rv"><h2>Your first 5 minutes are free.</h2><p>No credit card. No setup. Upload now and see it work in under 3 minutes.</p><div className="cta"><a className="btn" href="#/login?signup">⚡ Upload Your First File</a><a className="btn gh" onClick={()=>jump('pricing')}>View All Plans</a></div></div></section></div>
 <footer><div className="wrap"><div className="fg"><div><div className="logo"><i>⚖</i><div><b>PuneCourtTranslator</b><small>LEGAL LANGUAGE AI</small></div></div><p>Language infrastructure for Pune Court. Translate, transcribe and understand records at scale.</p></div>
 {[['PRODUCT',[['Features','features'],['Pricing','pricing']]],['COMPANY',[['About','about'],['Contact','contact']]],['LEGAL',[['Privacy Policy'],['Terms of Service'],['DPDP Act']]]].map(([h,ls])=><div key={h}><h5>{h}</h5>{ls.map(([l,id])=><a key={l} href={id==='about'?'#/about':undefined} onClick={e=>{if(id==='about')return;if(id){e.preventDefault();jump(id)}}}>{l}</a>)}</div>)}</div>
 <div className="cp"><span>© 2026 PuneCourtTranslator. All rights reserved.</span><span>Demo build — not an official court service</span></div></div></footer></>
}

function Login({users,setUsers,ok}){
 const[su,setSu]=useState(location.hash.includes('signup')),[f,setF]=useState({email:'user@punecourttranslator.in',password:'Demo@123',name:''}),[er,setEr]=useState('')
 const go=e=>{e.preventDefault();const u=users.find(x=>x.email===f.email)
  if(su){if(u)return setEr('Account already exists. Please log in.');const n={email:f.email,password:f.password,name:f.name||'New User',plan:'Free',used:0,history:[]};setUsers([...users,n]);ok(n.email)}
  else u?ok(u.email):setEr('Incorrect email or password.')}
 const c=k=>e=>setF({...f,[k]:e.target.value})
 return <div className="wrap lg"><form className="lgc" onSubmit={go}><h2>{su?'Create your account':'Welcome back'}</h2><p style={{color:'var(--mu)',margin:'6px 0 0'}}>{su?'Get 5 free minutes. No card needed.':'Log in to translate documents, images, audio and video.'}</p>
 {su&&<label className="fld">Full name<input value={f.name} onChange={c('name')} required/></label>}<label className="fld">Email<input type="email" value={f.email} onChange={c('email')} required/></label><label className="fld">Password<input type="password" value={f.password} onChange={c('password')} required minLength={6}/></label>
 {er&&<div className="err">{er}</div>}<button className="btn" style={{width:'100%',marginTop:12}}>{su?'Create account':'Log in'}</button>
 <div className="hint">Demo login: <b>user@punecourttranslator.in</b> / <b>Demo@123</b></div>
 <p style={{textAlign:'center',color:'var(--mu)',fontSize:14}}>{su?'Have an account?':'New here?'} <a style={{color:'#6d9bff',cursor:'pointer'}} onClick={()=>{setSu(!su);setEr('')}}>{su?'Log in':'Sign up free'}</a></p></form></div>
}

function ProfilePanel({user,upd,onTranslate}){
 const minutes=user.plan==='Business'?'Unlimited':`${user.used.toFixed(1)} min`
 const limit=D.limits[user.plan],usage=limit==null?100:Math.min(100,(user.used/limit)*100)
 const initials=user.name.split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase()
 const features=[
  ['🎙','Translate Speech','Turn hearings, depositions and voice notes into accurate translated text with timestamps.','speech','MP3, WAV, M4A'],
  ['📄','Translate Document','Translate judgments, affidavits, FIRs and notices while keeping your records organized.','document','PDF, DOCX, TXT'],
  ['🎬','Translate Video','Create translated captions for recorded proceedings and review every time-coded line.','video','MP4, MOV, WEBM']
 ]
 return <div className="profile-screen">
  <div className="profile-head">
  <div className="profile-identity"><div className="profile-avatar">{initials}</div><div><span className="eyebrow">USER PROFILE</span><h2>{user.name}</h2><p>{user.email}</p><div className="profile-status"><i/> Account active · Member since 2026</div></div></div>
  <div className="profile-plan"><span>Current plan</span><b>{user.plan}</b><small>{user.plan==='Free'?'Upgrade for more capacity':'Plan active'}</small></div>
  </div>
  <div className="profile-stats">
   <div><b>{user.history.length}</b><span>Saved translations</span></div>
   <div><b>{minutes}</b><span>Minutes used</span></div>
   <div><b>{user.plan==='Free'?'5':'50+'}</b><span>Languages available</span></div>
  </div>
 <div className="profile-columns">
  <div className="profile-usage card"><div className="profile-card-head"><div><span className="eyebrow">PLAN USAGE</span><h3>Translation allowance</h3></div><span className="profile-card-icon">◒</span></div><div className="usage-line"><b>{minutes}</b><span>{limit==null?'Unlimited access':`of ${limit} minutes`}</span></div><div className="meter"><i style={{width:`${usage}%`}}/></div><p>{limit==null?'Your Business plan has unlimited translation minutes.':`${Math.max(0,limit-user.used).toFixed(1)} minutes remaining this period.`}</p><a className="btn sm" href="#/app">Manage plan →</a></div>
  <div className="profile-security-card card"><div className="profile-card-head"><div><span className="eyebrow">SECURITY</span><h3>Your account is protected</h3></div><span className="profile-card-icon">⌾</span></div><div className="security-row"><span>🔒</span><div><b>Private workspace</b><small>Your files are visible only to you.</small></div><strong>Active</strong></div><div className="security-row"><span>✓</span><div><b>Secure processing</b><small>Encrypted in transit and at rest.</small></div><strong>On</strong></div></div>
 </div>
 <div className="profile-section-title"><div><span className="eyebrow">TRANSLATION TOOLS</span><h3>What would you like to translate?</h3></div><span className="profile-section-note">Choose a format to get started</span></div>
 <div className="profile-features">{features.map(([icon,title,desc,type,formats])=><button className="profile-feature" key={type} onClick={()=>onTranslate(type)}><div className={'profile-feature-icon '+type}>{icon}</div><div className="profile-feature-copy"><h4>{title}</h4><p>{desc}</p><small>{formats}</small></div><span className="profile-arrow">→</span></button>)}</div>
 <div className="profile-history card"><div className="profile-card-head"><div><span className="eyebrow">RECENT ACTIVITY</span><h3>Your translation history</h3></div><a className="profile-text-link" href="#/app">Open workspace →</a></div>{user.history.length?<div className="profile-history-list">{user.history.slice(0,5).map(h=><div className="profile-history-item" key={h.id}><span className="profile-history-kind">✦</span><div><b>{h.name}</b><small>{LG[h.from]} → {LG[h.to]} · {new Date(h.at).toLocaleDateString()}</small></div><button className="btn gh sm" onClick={()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([h.out],{type:'text/plain'}));a.download='translation.txt';a.click()}}>Download</button></div>)}</div>:<div className="profile-empty"><span>◌</span><p>No translations yet. Your completed work will appear here.</p><a className="profile-text-link" href="#/app">Start your first translation →</a></div>}</div>
 <div className="profile-details card"><div><span className="eyebrow">ACCOUNT DETAILS</span><h3>Personal information</h3></div><div className="profile-fields"><label className="fld">Name<input value={user.name} onChange={e=>upd({name:e.target.value})}/></label><label className="fld">Email<input value={user.email} disabled/></label></div><p className="profile-security">🔒 Your account and translations are stored securely.</p></div>
 </div>
}

function Workspace({user,upd}){
 const[tab,setTab]=useState('t'),[from,setFrom]=useState('mr'),[to,setTo]=useState('en'),[txt,setTxt]=useState(''),[file,setFile]=useState(null),[busy,setBusy]=useState(false),[res,setRes]=useState(null),[er,setEr]=useState(''),[up,setUp]=useState(false),[dg,setDg]=useState(false),[accept,setAccept]=useState(''),ref=useRef()
 const lim=D.limits[user.plan],left=lim==null?Infinity:Math.max(0,lim-user.used)
 const run=async()=>{setEr('');setRes(null)
  const kind=tab==='t'?'text':file&&kindOf(file);if(tab==='t'?!txt.trim():!file)return setEr(tab==='t'?'Enter some text first.':'Choose a file first.')
  const cost=tab==='t'?Math.max(.1,txt.length/5000):kind==='media'?Math.max(.5,file.size/2e6):.3
  if(cost>left)return setUp(true);setBusy(true)
  try{let source=txt,src=from,note=''
   if(tab==='f'){src='en';source=await extractFile(file,kind,from);if(!source.trim())throw new Error('No readable text was found in this file. For scanned PDFs, use a clearer scan or an image upload.')}
   const lines=source.split(/\r?\n/).filter(Boolean).map(s=>({s}))
   for(const l of lines)l.o=src===to?l.s:await translate(l.s,src,to)
   if(tab==='f'&&kind==='image')note='Text was extracted from the image with OCR. Review names, case numbers and handwritten content before relying on it.'
   if(tab==='f'&&kind==='pdf')note='Text was extracted from the PDF. Scanned PDFs without a text layer need OCR before translation.'
   const name=tab==='t'?'Text translation':file.name,all=lines.map(l=>l.o).join('\n')
   setRes({lines,note,name,all});upd({used:+(user.used+cost).toFixed(2),history:[{id:Date.now(),name,kind:kind,from:src,to,at:Date.now(),out:all},...user.history]})
  }catch(e){setEr(e.message||'The file could not be extracted. Check the format and try again.')}
  setBusy(false)}
 const pct=lim==null?8:Math.min(100,user.used/lim*100)
 return <div className="wrap app"><h2 style={{fontSize:30}}>Hello, {user.name} 👋</h2>
 <div className="card" style={{marginTop:16}}><b>{user.plan} plan</b> · {lim==null?'Unlimited minutes':`${user.used.toFixed(1)} / ${lim} minutes used`} <a style={{color:'#6d9bff',float:'right',cursor:'pointer'}} onClick={()=>setUp(true)}>Upgrade</a><div className="meter"><i style={{width:pct+'%'}}/></div></div>
 <div className="tb">{[['t','✍ Text'],['f','📎 Any file'],['h','🕘 History'],['p','👤 Profile']].map(([k,l])=><button key={k} className={tab===k?'on':''} onClick={()=>{setTab(k);setRes(null);setEr('')}}>{l}</button>)}</div>
 {tab==='p'&&<ProfilePanel user={user} upd={upd} onTranslate={type=>{setAccept(type==='speech'?'audio/*':type==='video'?'video/*':'');setFile(null);setTab('f');setRes(null);setEr('')}}/>}
 {(tab==='t'||tab==='f')&&<><div className="pair"><label className="fld">From<select value={from} onChange={e=>setFrom(e.target.value)}>{Object.entries(LG).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><button className="btn gh" onClick={()=>{setFrom(to);setTo(from)}}>⇄</button><label className="fld">To<select value={to} onChange={e=>setTo(e.target.value)}>{Object.entries(LG).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>
 {tab==='t'?<textarea rows={8} placeholder="Type or paste text from a court document..." value={txt} onChange={e=>setTxt(e.target.value)}/>:
 <div className={'drop'+(dg?' dg':'')} onClick={()=>ref.current.click()} onDragOver={e=>{e.preventDefault();setDg(true)}} onDragLeave={()=>setDg(false)} onDrop={e=>{e.preventDefault();setDg(false);setFile(e.dataTransfer.files[0])}}><input ref={ref} type="file" accept={accept} hidden onChange={e=>setFile(e.target.files[0])}/><div style={{fontSize:38}}>{file?'📄':'☁'}</div><b>{file?file.name:'Drop any file here or click to browse'}</b><span>{file?(file.size/1e6).toFixed(2)+' MB · '+kindOf(file):'PDF, DOCX, images, text, audio and video — any file type'}</span></div>}
 {er&&<div className="err">{er}</div>}<div style={{marginTop:14}}><button className="btn" disabled={busy} onClick={run}>{busy?<><span className="spin"/>Translating...</>:'⚡ Translate'}</button></div></>}
 {res&&<div style={{marginTop:22}}><div className="pair" style={{justifyContent:'space-between'}}><b>✅ Translation complete — {res.name}</b><span style={{display:'flex',gap:8}}><button className="btn gh sm" onClick={()=>navigator.clipboard?.writeText(res.all)}>Copy</button><button className="btn sm" onClick={()=>dl('translation.txt',res.all)}>Download TXT</button></span></div>
 {res.note&&<div className="hint" style={{marginTop:0,marginBottom:12}}>{res.note}</div>}
 <div className="two"><div className="res">{res.lines.map((l,i)=><div className="l" key={i}>{l.t&&<span className="ts">[{l.t}]</span>}{l.s}</div>)}</div><div className="res">{res.lines.map((l,i)=><div className="l" key={i}>{l.t&&<span className="ts">[{l.t}]</span>}{l.o}</div>)}</div></div></div>}
 {tab==='h'&&(user.history.length?user.history.map(h=><div className="hi" key={h.id}><div><b>{h.name}</b><small>{LG[h.from]} → {LG[h.to]} · {new Date(h.at).toLocaleString()}</small></div><span style={{display:'flex',gap:8}}><button className="btn gh sm" onClick={()=>dl('translation.txt',h.out)}>Download</button><button className="btn gh sm" onClick={()=>upd({history:user.history.filter(x=>x.id!==h.id)})}>Delete</button></span></div>):<p style={{color:'var(--mu)'}}>No translations yet. Your saved work will appear here.</p>)}
 {up&&<div className="ov" onClick={()=>setUp(false)}><div className="md" onClick={e=>e.stopPropagation()}><h3>Upgrade your plan</h3><p style={{color:'var(--mu)'}}>{left<=0?'Your free minutes are used up. ':''}Choose a plan (demo — no payment taken).</p>{D.plans.filter(p=>p.n!==user.plan).map(p=><button key={p.n} className="btn" style={{width:'100%',marginBottom:10}} onClick={()=>{upd({plan:p.n});setUp(false)}}>{p.n} — {p.p}{p.u}</button>)}<button className="btn gh" onClick={()=>setUp(false)}>Close</button></div></div>}</div>
}

export default function App(){
 const h=useHash(),[users,setUsers]=useState(()=>LS('pctusers',D.users)),[me,setMe]=useState(()=>localStorage.getItem('pctme'))
 useEffect(()=>localStorage.setItem('pctusers',JSON.stringify(users)),[users])
 const user=users.find(u=>u.email===me),out=()=>{localStorage.removeItem('pctme');setMe(null);location.hash='#/'}
 const upd=o=>setUsers(us=>us.map(u=>u.email===me?{...u,...o}:u))
 const ok=e=>{localStorage.setItem('pctme',e);setMe(e);location.hash='#/app'}
 useEffect(()=>{if(user&&localStorage.getItem('pctplan')){upd({plan:localStorage.getItem('pctplan')});localStorage.removeItem('pctplan')}},[me])
 let page
 if(h.startsWith('#/login'))page=<Login users={users} setUsers={setUsers} ok={ok}/>
 else if(h.startsWith('#/app'))page=user?<Workspace user={user} upd={upd}/>:<Login users={users} setUsers={setUsers} ok={ok}/>
 else if(h.startsWith('#/profile'))page=user?<div className="wrap app"><ProfilePanel user={user} upd={upd} onTranslate={()=>{location.hash='#/app'}}/></div>:<Login users={users} setUsers={setUsers} ok={ok}/>
 else if(h.startsWith('#/about'))page=<AboutPage/>
 else page=<Landing user={user}/>
 return <><CreativeBackdrop/><Nav user={user} out={out}/>{page}</>
}

function CreativeBackdrop(){
 return <div className="creative-backdrop" aria-hidden="true">
  <div className="aurora aurora-a"/>
  <div className="aurora aurora-b"/>
  <div className="orb o1"/><div className="orb o2"/>
  <div className="signal-orbit orbit-a"><i/><i/><i/></div>
  <div className="signal-orbit orbit-b"><i/><i/></div>
  <div className="scanline"/>
 </div>
}
