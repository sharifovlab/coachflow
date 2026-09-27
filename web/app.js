(function(){
"use strict";
/* ================= config ================= */
const SB_URL="https://kpkezoyxujilfvdxllgo.supabase.co";
const SB_KEY="sb_publishable_mG-kXYFLOwC0pcF602kWfw_bwmVhHQL"; // publishable key: safe in the browser, data is protected by row-level security
const sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const BUCKET="report-photos";

/* ================= state ================= */
let lang="ru";
try{const l=localStorage.getItem("cf-lang");if(l==="az"||l==="ru")lang=l}catch(_){}
const path=location.pathname.replace(/\/+$/,"");
const route=path.startsWith("/c/")?{kind:"client",token:decodeURIComponent(path.slice(3))}
  :path.startsWith("/p/")?{kind:"page",slug:decodeURIComponent(path.slice(3)).toLowerCase()}
  :{kind:"coach"};
let sess=null,S=null,tab="today",query="",flash={},authMode="login",busy=false;
let CV=null; // client view data
let PG=null; // public page data

/* ================= helpers ================= */
const DAY=86400000;
function today(){const d=new Date();d.setHours(0,0,0,0);return d}
function iso(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function parse(s){const [y,m,d]=String(s).slice(0,10).split("-").map(Number);return new Date(y,m-1,d)}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function addMonths(d,n){const x=new Date(d);const day=x.getDate();x.setDate(1);x.setMonth(x.getMonth()+n);const last=new Date(x.getFullYear(),x.getMonth()+1,0).getDate();x.setDate(Math.min(day,last));return x}
function diffDays(a,b){return Math.round((a-b)/DAY)}
function t(k){const v=T[lang][k];return v===undefined?k:v}
function fmt(s){if(!s)return "—";const d=parse(s);return d.getDate()+" "+t("months_s")[d.getMonth()]}
function sameMonth(s,ref){const d=parse(s);return d.getFullYear()===ref.getFullYear()&&d.getMonth()===ref.getMonth()}
function tr(v){return (v&&typeof v==="object")?(v[lang]||v.ru||v.az||""):(v==null?"":String(v))}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function initials(n){return String(n||"?").trim().split(/\s+/).slice(0,2).map(w=>w[0]||"").join("").toUpperCase()}
function weekday(d){return (d.getDay()+6)%7}
function inLang(l,fn){const s=lang;lang=l;try{return fn()}finally{lang=s}}
function num(v){return Math.round(Number(v)*100)/100}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>{el.hidden=true},2800)}
function setLang(l){lang=l;try{localStorage.setItem("cf-lang",l)}catch(_){}}
function origin(){return location.origin}
function clientLink(c){return origin()+"/c/"+c.token}
function pageLink(){return origin()+"/p/"+(S?S.coach.slug:"")}
function langSeg(){return '<div class="seg" role="group" aria-label="Language"><button type="button" data-lang="az" aria-pressed="'+(lang==="az")+'">AZ</button><button type="button" data-lang="ru" aria-pressed="'+(lang==="ru")+'">RU</button></div>'}
function errText(e){const m=String(e&&e.message||e||"");if(/too many/i.test(m))return t("too_many");return t("err_generic")}
function waLink(phone,l,kind,vars){
 const digits=String(phone||"").replace(/\D/g,"");let msg=(WA[l]||WA.ru)[kind];
 Object.keys(vars).forEach(k=>{msg=msg.split("{"+k+"}").join(vars[k])});
 return "https://wa.me/"+digits+"?text="+encodeURIComponent(msg);
}
function waClient(c,kind){const l=c.lang==="az"?"az":"ru";
 return waLink(c.phone,l,kind,{name:c.name.split(" ")[0],date:inLang(l,()=>fmt(c.next)),amount:num(c.billing.price),card:S.coach.card||"—",link:clientLink(c)})}
function copyText(txt,el){
 const ok=()=>toast(t("copied"));
 const fail=()=>{if(!el)return;const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r)};
 try{navigator.clipboard.writeText(txt).then(ok,fail)}catch(_){fail()}
}
function spark(ws){
 ws=ws.filter(w=>w.kg!=null);if(ws.length<2)return "";
 const W=300,H=56,p=6;const kg=ws.map(w=>w.kg);const mn=Math.min(...kg),mx=Math.max(...kg),r=(mx-mn)||1;
 const pts=kg.map((v,i)=>[p+i*(W-2*p)/(kg.length-1),p+(H-2*p)*(1-(v-mn)/r)]);
 const line=pts.map((q,i)=>(i?"L":"M")+q[0].toFixed(1)+" "+q[1].toFixed(1)).join(" ");
 const area=line+" L"+pts[pts.length-1][0].toFixed(1)+" "+(H-p)+" L"+pts[0][0].toFixed(1)+" "+(H-p)+" Z";
 const last=pts[pts.length-1];
 return '<svg class="spark" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true"><path d="'+area+'" fill="var(--accent-soft)"/><path d="'+line+'" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="'+last[0].toFixed(1)+'" cy="'+last[1].toFixed(1)+'" r="4" fill="var(--accent)"/></svg>';
}
function mealTotals(items){const r={k:0,p:0,f:0,c:0};(items||[]).forEach(it=>{const f=FOODS[it.f];if(!f)return;const g=it.g/100;r.k+=f.k*g;r.p+=f.p*g;r.f+=f.f*g;r.c+=f.c*g});Object.keys(r).forEach(k=>r[k]=Math.round(r[k]));return r}
function macroChips(r){return '<div class="macro"><span><b>'+r.k+'</b> '+t("kcal")+'</span><span>'+t("prot")+' <b>'+r.p+'</b> g</span><span>'+t("fat")+' <b>'+r.f+'</b> g</span><span>'+t("carb")+' <b>'+r.c+'</b> g</span></div>'}
function mealBlock(items){return SLOTS.map(s=>{const its=(items||[]).filter(i=>i.s===s);if(!its.length)return "";
 return '<div class="meal"><h5>'+t("slot_"+s)+'</h5><ul class="ex">'+its.map(i=>{const f=FOODS[i.f];return '<li><span>'+esc(f?tr(f.n):i.f)+'</span><span>'+i.g+' g · '+(f?Math.round(f.k*i.g/100):0)+' '+t("kcal")+'</span></li>'}).join("")+'</ul></div>'}).join("")}
function exList(ex){return '<ul class="ex">'+(ex||[]).map(e=>'<li><span>'+esc(e.n)+'</span><span>'+esc(e.s||"")+'</span></li>').join("")+'</ul>'}
function downscale(file){return new Promise(res=>{if(!file){res(null);return}
 const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const max=1080;const s=Math.min(1,max/Math.max(img.width,img.height));const cv=document.createElement("canvas");cv.width=Math.round(img.width*s);cv.height=Math.round(img.height*s);cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);cv.toBlob(b=>res(b),"image/jpeg",.8)};img.onerror=()=>res(null);img.src=fr.result};fr.onerror=()=>res(null);fr.readAsDataURL(file)})}
function uuid(){return (crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2))}

/* ================= coach data ================= */
async function loadAll(){
 const uid=sess.user.id;
 const since=iso(addMonths(today(),-12)),rsince=iso(addDays(today(),-180));
 const q=await Promise.all([
  sb.from("coaches").select("*").eq("id",uid).maybeSingle(),
  sb.from("services").select("*").order("sort").order("created_at"),
  sb.from("programs").select("*").order("created_at"),
  sb.from("meal_plans").select("*").order("created_at"),
  sb.from("clients").select("*").order("created_at"),
  sb.from("payments").select("*").gte("paid_on",since).order("paid_on",{ascending:false}),
  sb.from("reports").select("*").gte("report_date",rsince).order("report_date").order("created_at"),
  sb.from("leads").select("*").eq("status","new").order("created_at",{ascending:false}),
  sb.from("todo_done").select("key").eq("day",iso(today()))
 ]);
 const bad=q.find(r=>r.error);if(bad)throw bad.error;
 const [co,sv,pr,ml,cl,pay,rep,ld,td]=q.map(r=>r.data);
 if(!co)throw new Error("profile missing");
 const reportsBy={};rep.forEach(r=>{(reportsBy[r.client_id]=reportsBy[r.client_id]||[]).push({id:r.id,d:r.report_date,kg:r.weight==null?null:Number(r.weight),note:r.note,photo:r.photo_path,fromClient:r.from_client})});
 S={
  coach:{id:co.id,name:co.name,city:co.city,instagram:co.instagram,card:co.card,remindDays:co.remind_days,bio:{az:co.bio_az,ru:co.bio_ru},slug:co.slug,lang:co.lang,
   services:sv.map(s=>({id:s.id,name:{az:s.name_az,ru:s.name_ru},desc:{az:s.desc_az,ru:s.desc_ru},price:Number(s.price),type:s.type,months:s.months}))},
  programs:pr.map(p=>({id:p.id,name:p.name,ex:p.exercises||[]})),
  meals:ml.map(m=>({id:m.id,name:m.name,items:m.items||[]})),
  clients:cl.map(r=>({id:r.id,name:r.name,phone:r.phone,lang:r.lang,goal:r.goal,billing:{type:r.billing_type,price:Number(r.price),months:r.months,parts:r.parts,paid:r.parts_paid},
   prog:r.program_id||"",meal:r.meal_plan_id||"",next:r.next_payment,cday:r.check_day,token:r.access_token,weights:reportsBy[r.id]||[]})),
  payments:pay.map(p=>({id:p.id,cid:p.client_id,amount:Number(p.amount),d:p.paid_on,m:p.method,part:p.part,parts:p.parts})),
  leads:ld.map(l=>({id:l.id,d:l.created_at.slice(0,10),name:l.name,phone:l.phone,goal:l.goal,level:l.level,svc:l.service_id,lang:l.lang,health:l.health,status:l.status})),
  sent:td.map(x=>x.key),photoUrl:(S&&S.photoUrl)||{}
 };
 const paths=rep.map(r=>r.photo_path).filter(p=>p&&!S.photoUrl[p]);
 if(paths.length){const {data}=await sb.storage.from(BUCKET).createSignedUrls(paths,3600);(data||[]).forEach(x=>{if(x.signedUrl)S.photoUrl[x.path]=x.signedUrl})}
}
async function run(fn,okMsg){
 if(busy)return false;busy=true;document.body.style.cursor="progress";
 try{await fn();await loadAll();render();if(okMsg)toast(okMsg);return true}
 catch(e){console.error(e);toast(errText(e));return false}
 finally{busy=false;document.body.style.cursor=""}
}
const prog=id=>S.programs.find(p=>p.id===id);
const meal=id=>S.meals.find(m=>m.id===id);
const client=id=>S.clients.find(c=>c.id===id);
const svc=id=>S.coach.services.find(s=>s.id===id);
function status(c){if(!c.next)return "closed";const d=diffDays(parse(c.next),today());return d<0?"overdue":(d<=3?"due":"ok")}
function payText(c){if(!c.next)return t("parts_paid").replace("{k}",c.billing.paid).replace("{n}",c.billing.parts);
 const d=diffDays(parse(c.next),today());if(d<0)return (-d)+" "+t("days_late");if(d===0)return t("today");if(d===1)return t("tomorrow");return t("in_days").replace("{n}",d)}
function billLabel(c){const b=c.billing;if(b.type==="package")return num(b.price)+" AZN / "+b.months+" "+t("mo");if(b.type==="installment")return num(b.price)+" AZN × "+b.parts;return num(b.price)+" "+t("per_month")}
function billSub(c){const b=c.billing;if(b.type==="installment")return t("bt_installment")+" · "+t("parts_paid").replace("{k}",b.paid).replace("{n}",b.parts);return t("bt_"+b.type)}
function due(c){return c.next?Number(c.billing.price)||0:0}
function lastReport(c){const w=c.weights.filter(x=>x.kg!=null);return w.length?w[w.length-1]:null}
function daysSinceReport(c){const l=c.weights.length?c.weights[c.weights.length-1]:null;return l?diffDays(today(),parse(l.d)):null}
function pill(c){const s=status(c);return '<span class="pill '+s+'">'+t("st_"+s)+'</span>'}
function goalLabel(g){return g?t("goal_"+g):"—"}
function histList(c,withPhotos){return c.weights.length?'<ul class="hist">'+c.weights.slice().reverse().map(w=>'<li><span>'+fmt(w.d)+(w.note?' · <span class="note">'+esc(w.note)+'</span>':'')+'</span><span style="display:flex;gap:8px;align-items:center">'+(withPhotos&&w.photo&&S.photoUrl[w.photo]?'<a href="'+esc(S.photoUrl[w.photo])+'" target="_blank" rel="noopener"><img class="thumb" src="'+esc(S.photoUrl[w.photo])+'" alt=""></a>':'')+'<span class="num">'+(w.kg!=null?w.kg+' kg':'—')+'</span></span></li>').join("")+'</ul>':'<p class="hint">'+t("no_reports")+'</p>'}

/* ================= coach views ================= */
function todoItems(){
 const td=today(),out=[],rd=Number(S.coach.remindDays)||0;
 S.clients.forEach(c=>{
  const st=status(c);
  if(st==="overdue")out.push({key:"pay-"+c.id+"-"+c.next,kind:"pay",c,title:t("todo_overdue"),sub:billLabel(c)+" · "+payText(c),href:waClient(c,"pay")});
  else if(c.next){const d=diffDays(parse(c.next),td);if(d>=0&&d<=rd)out.push({key:"soon-"+c.id+"-"+c.next,kind:"soon",c,title:t("todo_soon").replace("{when}",d===0?t("today"):(d===1?t("tomorrow"):t("in_days").replace("{n}",d))),sub:billLabel(c),href:waClient(c,"pay")})}
  const ds=daysSinceReport(c);
  if(ds!=null&&ds>7)out.push({key:"rep-"+c.id,kind:"rep",c,title:t("todo_silent").replace("{n}",ds),sub:t("todo_report"),href:waClient(c,"rep")});
  else if(c.cday===weekday(td)&&ds!==0)out.push({key:"rep-"+c.id,kind:"rep",c,title:t("todo_report"),sub:t("check_day")+": "+t("days")[c.cday],href:waClient(c,"rep")});
 });
 S.leads.forEach(l=>out.push({key:"lead-"+l.id,kind:"lead",lead:l,title:t("todo_lead"),sub:(svc(l.svc)?tr(svc(l.svc).name):"")+" · "+goalLabel(l.goal),href:waLink(l.phone,l.lang,"lead",{name:l.name.split(" ")[0]})}));
 out.forEach(i=>i.done=S.sent.includes(i.key));out.sort((a,b)=>a.done-b.done);return out;
}
function viewToday(){
 const items=todoItems();
 const rows=items.map(i=>{const nm=i.c?i.c.name:i.lead.name;
  return '<div class="todo'+(i.done?" done":"")+'"><span class="kind '+i.kind+'"></span><div class="txt"><b>'+esc(nm)+' · '+esc(i.title)+'</b><small>'+esc(i.sub)+'</small></div><div class="acts">'+
   (i.done?'<span class="pill ok">'+t("sent")+'</span>':'<a class="btn wa sm" href="'+i.href+'" target="_blank" rel="noopener" data-sent="'+esc(i.key)+'">WhatsApp</a>')+
   (i.c?'<button class="btn sm" type="button" data-open="'+i.c.id+'">'+t("open")+'</button>':'<button class="btn sm" type="button" data-tab="leads">'+t("open")+'</button>')+'</div></div>'}).join("");
 return '<div class="bar"><h2>'+t("today_title")+'</h2></div><p class="hint" style="margin-bottom:12px">'+t("today_hint")+'</p><div class="list">'+(items.length?rows:'<div class="empty">'+t("all_done")+'</div>')+'</div>';
}
function viewClients(){
 const q=query.trim().toLowerCase();const order={overdue:0,due:1,ok:2,closed:3};
 const list=S.clients.filter(c=>!q||c.name.toLowerCase().includes(q)).sort((a,b)=>order[status(a)]-order[status(b)]||(a.next&&b.next?parse(a.next)-parse(b.next):0));
 let rows=list.map(c=>{const p=prog(c.prog);const ds=daysSinceReport(c);const lr=lastReport(c);
  const flag=(ds!=null&&ds>7)?'<small class="flag">'+t("no_report").replace("{n}",ds)+'</small>':'<small>'+t("next_report")+': '+t("days")[c.cday]+'</small>';
  return '<button type="button" class="row" data-open="'+c.id+'"><div class="who"><span class="ava">'+esc(initials(c.name))+'</span><div><b>'+esc(c.name)+'</b><small>'+esc(p?p.name:t("no_program"))+' · '+c.lang.toUpperCase()+'</small></div></div>'+
   '<div class="cell c-price num">'+esc(billLabel(c))+'<small>'+esc(billSub(c))+'</small></div>'+
   '<div class="cell c-pay">'+pill(c)+'<small>'+(c.next?t("until")+' '+fmt(c.next)+' · ':'')+payText(c)+'</small></div>'+
   '<div class="cell c-check">'+(lr?'<span class="num">'+lr.kg+' kg</span>':'—')+flag+'</div><span class="chev" aria-hidden="true">›</span></button>'}).join("");
 if(!list.length)rows='<div class="empty">'+(S.clients.length?t("no_match"):t("nothing"))+'</div>';
 return '<div class="bar"><input class="search" id="search" type="search" placeholder="'+t("search")+'" value="'+esc(query)+'"><button class="btn primary" type="button" data-act="new-client">+ '+t("add_client")+'</button></div>'+
  '<div class="list"><div class="row head"><div>'+t("h_client")+'</div><div>'+t("h_price")+'</div><div>'+t("h_pay")+'</div><div>'+t("h_check")+'</div><span></span></div>'+rows+'</div>';
}
function viewPayments(){
 const td=today();const monthEnd=new Date(td.getFullYear(),td.getMonth()+1,0);
 const by=s=>S.clients.filter(c=>status(c)===s).sort((a,b)=>parse(a.next)-parse(b.next));
 const upcoming=S.clients.filter(c=>status(c)==="ok"&&parse(c.next)<=monthEnd).sort((a,b)=>parse(a.next)-parse(b.next));
 const crow=c=>'<div class="prow"><div class="who"><span class="ava">'+esc(initials(c.name))+'</span><div><b>'+esc(c.name)+'</b><small>'+payText(c)+'</small></div></div>'+
  '<div class="amt">'+num(due(c))+' AZN<small>'+esc(billSub(c))+'</small></div><div class="p-date num">'+fmt(c.next)+'</div>'+
  '<div class="acts"><a class="btn wa sm" href="'+waClient(c,"pay")+'" target="_blank" rel="noopener">'+t("remind")+'</a><button class="btn sm" type="button" data-pay="'+c.id+'">'+t("mark_paid")+'</button></div></div>';
 const group=(title,arr)=>'<section class="group"><h3>'+title+' · '+num(arr.reduce((a,c)=>a+due(c),0))+' AZN</h3><div class="list">'+(arr.length?arr.map(crow).join(""):'<div class="empty">'+t("nothing")+'</div>')+'</div></section>';
 const rec=S.payments.filter(p=>sameMonth(p.d,td));
 const recRows=rec.map(p=>{const c=client(p.cid);return '<div class="prow"><div class="who"><span class="ava">'+esc(initials(c?c.name:"?"))+'</span><div><b>'+esc(c?c.name:"—")+'</b><small>'+t("m_"+p.m)+(p.part?' · '+t("part_of").replace("{k}",p.part).replace("{n}",p.parts):'')+'</small></div></div><div class="amt">'+num(p.amount)+' AZN</div><div class="p-date num">'+fmt(p.d)+'</div><div class="acts"><span class="pill ok">'+t("st_ok")+'</span></div></div>'}).join("");
 return '<p class="hint" style="margin-bottom:14px">'+t("wa_hint")+'</p>'+group(t("g_overdue"),by("overdue"))+group(t("g_due"),by("due"))+group(t("g_upcoming"),upcoming)+
  '<section class="group"><h3>'+t("g_received")+' · '+num(rec.reduce((a,p)=>a+p.amount,0))+' AZN</h3><div class="list">'+(rec.length?recRows:'<div class="empty">'+t("nothing")+'</div>')+'</div></section>';
}
function viewPrograms(){
 const cards=S.programs.map(p=>{const n=S.clients.filter(c=>c.prog===p.id).length;
  return '<article class="card"><h4>'+esc(p.name)+'</h4><div class="meta">'+t("assigned")+': '+n+' '+t("clients_word")+'</div>'+exList(p.ex)+'</article>'}).join("");
 return '<div class="bar"><h2>'+t("tab_programs")+'</h2><button class="btn primary" type="button" data-act="new-program">+ '+t("new_program")+'</button></div><div class="cards">'+(cards||'<div class="empty">'+t("nothing")+'</div>')+'</div>';
}
function viewMeals(){
 const cards=S.meals.map(m=>{const n=S.clients.filter(c=>c.meal===m.id).length;
  return '<article class="card"><h4>'+esc(m.name)+'</h4><div class="meta">'+t("assigned")+': '+n+' '+t("clients_word")+'</div>'+mealBlock(m.items)+macroChips(mealTotals(m.items))+'</article>'}).join("");
 const foods=Object.keys(FOODS).map(k=>{const f=FOODS[k];return '<tr><td>'+esc(tr(f.n))+'</td><td>'+f.k+'</td><td>'+f.p+'</td><td>'+f.f+'</td><td>'+f.c+'</td></tr>'}).join("");
 return '<div class="bar"><h2>'+t("meals_title")+'</h2><button class="btn primary" type="button" data-act="new-meal">+ '+t("new_meal")+'</button></div><div class="cards">'+(cards||'<div class="empty">'+t("nothing")+'</div>')+'</div>'+
  '<details class="fooddb"'+(flash.foodOpen?' open':'')+'><summary>'+t("fooddb")+'</summary><p class="hint" style="margin-bottom:8px">'+t("food_note")+'</p><div class="tablewrap"><table class="food"><thead><tr><th>'+t("food")+'</th><th>'+t("kcal")+'</th><th>'+t("prot")+', g</th><th>'+t("fat")+', g</th><th>'+t("carb")+', g</th></tr></thead><tbody>'+foods+'</tbody></table></div></details>';
}
function viewCheckins(){
 const all=[];S.clients.forEach(c=>c.weights.forEach((w,i)=>all.push({c,w,prev:i?c.weights[i-1]:null})));
 all.sort((a,b)=>parse(b.w.d)-parse(a.w.d));
 const rows=all.slice(0,40).map(({c,w,prev})=>{const d=(prev&&prev.kg!=null&&w.kg!=null)?num(w.kg-prev.kg):null;
  const dl=d==null?'<span class="note">'+(prev?'':t("start"))+'</span>':'<span class="delta num '+(d<0?"down":(d>0?"up":""))+'">'+(d>0?"+":"")+d+' kg</span>';
  const ph=w.photo&&S.photoUrl[w.photo]?'<a href="'+esc(S.photoUrl[w.photo])+'" target="_blank" rel="noopener"><img class="thumb" src="'+esc(S.photoUrl[w.photo])+'" alt=""></a>':'<span></span>';
  return '<div class="crow"><div class="who"><span class="ava">'+esc(initials(c.name))+'</span><div><b>'+esc(c.name)+'</b><small>'+fmt(w.d)+'</small></div></div><div class="num">'+(w.kg!=null?w.kg+' kg':'—')+'</div><div class="c-date">'+dl+'</div><div class="note">'+esc(w.note||"")+'</div>'+ph+'</div>'});
 return '<div class="bar"><h2>'+t("recent_reports")+'</h2></div><div class="list">'+(rows.length?rows.join(""):'<div class="empty">'+t("no_reports")+'</div>')+'</div>';
}
function viewLeads(){
 const ls=S.leads;
 const cards=ls.map(l=>{const s=svc(l.svc);
  return '<article class="card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><h4>'+esc(l.name)+'</h4><span class="pill new">'+fmt(l.d)+'</span></div>'+
   '<dl class="kv" style="margin:10px 0 12px"><dt>'+t("phone")+'</dt><dd class="num">'+esc(l.phone)+'</dd><dt>'+t("lead_service")+'</dt><dd>'+esc(s?tr(s.name):"—")+'</dd><dt>'+t("goal")+'</dt><dd>'+esc(goalLabel(l.goal))+'</dd><dt>'+t("lead_level")+'</dt><dd>'+esc(t("lvl_"+l.level))+'</dd><dt>'+t("lang_pref")+'</dt><dd>'+(l.lang==="az"?t("lang_az"):t("lang_ru"))+'</dd>'+(l.health?'<dt>'+t("lead_health")+'</dt><dd>'+esc(l.health)+'</dd>':'')+'</dl>'+
   '<div class="acts"><a class="btn wa sm" href="'+waLink(l.phone,l.lang,"lead",{name:l.name.split(" ")[0]})+'" target="_blank" rel="noopener" data-sent="lead-'+l.id+'">'+t("lead_write")+'</a><button class="btn primary sm" type="button" data-lead-convert="'+l.id+'">'+t("lead_to_client")+'</button><button class="btn sm" type="button" data-lead-reject="'+l.id+'">'+t("lead_reject")+'</button></div></article>'}).join("");
 return '<div class="bar"><h2>'+t("leads_title")+'</h2><a class="btn" href="'+esc(pageLink())+'" target="_blank" rel="noopener">'+t("open_page")+' →</a></div>'+(ls.length?'<div class="cards">'+cards+'</div>':'<div class="list"><div class="empty">'+t("no_leads")+'</div></div>');
}
function viewPage(){
 const c=S.coach;
 const svcRows=c.services.map(s=>'<li><span>'+esc(tr(s.name))+'</span><span style="display:flex;gap:10px;align-items:center"><span class="num">'+num(s.price)+' AZN'+(s.type==="package"&&s.months>1?' / '+s.months+' '+t("mo"):(s.type==="monthly"?' / '+t("mo"):''))+'</span><button class="btn danger sm" type="button" data-svc-del="'+s.id+'">'+t("remove")+'</button></span></li>').join("");
 return '<div class="bar"><h2>'+t("page_title")+'</h2><a class="btn primary" href="'+esc(pageLink())+'" target="_blank" rel="noopener">'+t("open_page")+' →</a></div><p class="hint" style="margin-bottom:10px">'+t("page_hint")+'</p>'+
  '<div class="sec"><h3>'+t("your_link")+'</h3><div class="linkbox"><code id="pagelink">'+esc(pageLink())+'</code><button class="btn sm" type="button" data-copy-text="'+esc(pageLink())+'" data-copy-el="pagelink">'+t("copy")+'</button></div></div>'+
  '<div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))"><section class="sec"><h3>'+t("s_profile")+'</h3><form class="f" id="coachForm">'+
  '<div class="two"><label>'+t("coach_name")+'<input id="k-name" value="'+esc(c.name)+'"></label><label>'+t("city")+'<input id="k-city" value="'+esc(c.city)+'"></label></div>'+
  '<div class="two"><label>'+t("instagram")+'<input id="k-ig" value="'+esc(c.instagram)+'"></label><label>'+t("remind_days")+'<input id="k-rd" type="number" min="0" max="7" value="'+esc(c.remindDays)+'"></label></div>'+
  '<label>'+t("slug")+'<input id="k-slug" value="'+esc(c.slug)+'" autocapitalize="off" spellcheck="false"><span class="hint">'+t("slug_hint")+'</span></label>'+
  '<label>'+t("card")+'<input id="k-card" value="'+esc(c.card)+'" inputmode="numeric"><span class="hint">'+t("card_hint")+'</span></label>'+
  '<label>'+t("bio_az")+'<textarea id="k-bio-az">'+esc(c.bio.az)+'</textarea></label><label>'+t("bio_ru")+'<textarea id="k-bio-ru">'+esc(c.bio.ru)+'</textarea></label>'+
  '<p class="err" id="k-err" hidden></p><div class="acts"><button class="btn primary" type="submit">'+t("save")+'</button></div></form></section>'+
  '<section class="sec"><h3>'+t("services")+'</h3><ul class="hist" style="margin-bottom:14px">'+svcRows+'</ul><form class="f" id="svcForm">'+
  '<div class="two"><label>'+t("svc_name_az")+'<input id="v-naz"></label><label>'+t("svc_name_ru")+'<input id="v-nru"></label></div>'+
  '<div class="two"><label>'+t("svc_desc_az")+'<input id="v-daz"></label><label>'+t("svc_desc_ru")+'<input id="v-dru"></label></div>'+
  '<div class="two"><label>'+t("svc_type")+'<select id="v-type"><option value="monthly">'+t("bt_monthly")+'</option><option value="package">'+t("bt_package")+'</option></select></label><label>'+t("amount")+'<input id="v-price" type="number" min="0" value="100"></label></div>'+
  '<label>'+t("months")+'<input id="v-months" type="number" min="1" max="12" value="1"></label><p class="err" id="v-err" hidden></p>'+
  '<div class="acts"><button class="btn" type="submit">+ '+t("add_service")+'</button></div></form></section></div>';
}
function renderCoach(){
 const td=today();const monthEnd=new Date(td.getFullYear(),td.getMonth()+1,0);
 const expectedList=S.clients.filter(c=>c.next&&parse(c.next)<=monthEnd);
 const expected=expectedList.reduce((a,c)=>a+due(c),0);
 const received=S.payments.filter(p=>sameMonth(p.d,td)).reduce((a,p)=>a+p.amount,0);
 const od=S.clients.filter(c=>status(c)==="overdue");const odSum=od.reduce((a,c)=>a+due(c),0);
 const todoOpen=todoItems().filter(i=>!i.done).length;
 const tabs=[["today",todoOpen,true],["clients",S.clients.length],["payments",S.clients.filter(c=>status(c)==="overdue"||status(c)==="due").length],["programs",null],["meals",null],["checkins",null],["leads",S.leads.length,true],["page",null]];
 const view=tab==="today"?viewToday():tab==="clients"?viewClients():tab==="payments"?viewPayments():tab==="programs"?viewPrograms():tab==="meals"?viewMeals():tab==="checkins"?viewCheckins():tab==="leads"?viewLeads():viewPage();
 return '<div class="wrap"><header class="top"><div class="brand"><b>Coach<span>Flow</span></b><small>'+t("tagline")+' · '+esc(S.coach.name)+'</small></div><div class="hright">'+langSeg()+'<button class="btn" type="button" data-act="logout">'+t("logout")+'</button></div></header>'+
  '<section class="tiles"><div class="tile"><div class="lbl">'+t("t_active")+'</div><div class="val">'+S.clients.length+'</div></div>'+
  '<div class="tile money"><div class="lbl">'+t("t_received")+'</div><div class="val">'+num(received)+'<small>AZN</small></div></div>'+
  '<div class="tile"><div class="lbl">'+t("t_expected")+'</div><div class="val">'+num(expected)+'<small>AZN</small></div><div class="sub">'+expectedList.length+' '+t("clients_word")+'</div></div>'+
  '<div class="tile alert"><div class="lbl">'+t("t_overdue")+'</div><div class="val">'+num(odSum)+'<small>AZN</small></div><div class="sub">'+od.length+' '+t("clients_word")+'</div></div></section>'+
  '<nav class="tabs" role="tablist">'+tabs.map(([k,n,hot])=>'<button role="tab" type="button" data-tab="'+k+'" aria-selected="'+(tab===k)+'">'+t("tab_"+k)+(n?'<span class="count'+(hot?" hot":"")+'">'+n+'</span>':'')+'</button>').join("")+'</nav>'+
  '<main id="view">'+view+'</main></div>';
}
function renderAuth(){
 const su=authMode==="signup";
 return '<div class="wrap"><div class="auth"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div class="brand"><b>Coach<span>Flow</span></b></div>'+langSeg()+'</div>'+
  '<p class="pitch">'+t("login_pitch")+'</p><div class="card"><h2 style="font-family:var(--display);font-weight:500;font-size:18px;margin:0 0 14px">'+t(su?"signup_title":"login_title")+'</h2>'+
  '<form class="f" id="authForm">'+(su?'<label>'+t("coach_name")+'<input id="a-name" autocomplete="name"></label>':'')+
  '<label>'+t("email")+'<input id="a-email" type="email" autocomplete="email" required></label>'+
  '<label>'+t("password")+'<input id="a-pass" type="password" minlength="8" autocomplete="'+(su?"new-password":"current-password")+'" required></label>'+
  '<p class="err" id="a-err" hidden></p><div class="acts"><button class="btn primary" type="submit">'+t(su?"signup":"login")+'</button></div></form>'+
  '<p style="margin:14px 0 0"><button class="linkbtn" type="button" data-act="auth-toggle">'+t(su?"have_account":"no_account")+'</button></p></div></div></div>';
}

/* ================= client screen ================= */
function renderClient(){
 if(CV===false)return '<div class="center"><p>'+t("not_found")+'</p></div>';
 const c=CV;const st=(!c.next_payment)?"closed":(diffDays(parse(c.next_payment),today())<0?"overdue":"ok");
 const amount=num(c.price);const done=c.done_today||[];
 const sub=c.billing_type==="installment"?t("bt_installment")+" · "+t("parts_paid").replace("{k}",c.parts_paid).replace("{n}",c.parts):t("bt_"+c.billing_type);
 const dd=c.next_payment?diffDays(parse(c.next_payment),today()):0;
 const when=!c.next_payment?"":dd<0?(-dd)+" "+t("days_late"):dd===0?t("today"):dd===1?t("tomorrow"):t("in_days").replace("{n}",dd);
 const payCard=c.next_payment?'<section class="ccard paycard'+(st==="overdue"?" late":"")+'"><h3><span>'+(st==="overdue"?t("pay_late"):t("next_payment"))+'</span><span>'+esc(sub)+'</span></h3><div class="bigamt">'+amount+' AZN</div><div class="note">'+t("until")+' '+fmt(c.next_payment)+' · '+when+'</div>'+
  (c.coach.card?'<div class="cardno"><span>'+t("how_pay")+':</span><code id="cardno">'+esc(c.coach.card)+'</code><button class="btn sm" type="button" data-copy-text="'+esc(c.coach.card)+'" data-copy-el="cardno">'+t("copy")+'</button></div>':'')+'</section>'
  :'<section class="ccard"><h3>'+t("s_payment")+'</h3><span class="pill ok">'+t("paid_all")+'</span></section>';
 const ex=c.program?c.program.exercises||[]:[];
 const work=c.program?'<section class="ccard"><h3><span>'+t("workout_today")+' · '+esc(c.program.name)+'</span><span class="num">'+t("done_of").replace("{k}",done.length).replace("{n}",ex.length)+'</span></h3><div class="progressbar"><i style="width:'+(ex.length?Math.round(100*done.length/ex.length):0)+'%"></i></div><ul class="checklist">'+
  ex.map((e,i)=>'<li><label><input type="checkbox" data-done="'+i+'"'+(done.includes(i)?" checked":"")+'><span class="nm">'+esc(e.n)+'</span><span class="sc">'+esc(e.s||"")+'</span></label></li>').join("")+'</ul></section>':"";
 const food=c.meal?'<section class="ccard"><h3><span>'+t("meal_today")+' · '+esc(c.meal.name)+'</span></h3>'+mealBlock(c.meal.items)+macroChips(mealTotals(c.meal.items))+'</section>':"";
 const last=(c.reports||[]).filter(r=>r.kg!=null).slice(-1)[0];
 const rep='<section class="ccard"><h3><span>'+t("send_report")+'</span></h3>'+(flash.reportSent?'<p class="thanks">'+t("report_sent")+'</p>':
  '<form class="f" id="clientRepForm"><div class="two"><label>'+t("weight")+'<input id="cr-kg" type="number" step="0.1" min="20" max="400" inputmode="decimal" value="'+(last?last.kg:"")+'" required></label><label>'+t("photo")+'<input id="cr-photo" type="file" accept="image/*"></label></div><label>'+t("note")+'<input id="cr-note" maxlength="1000"></label><div class="acts"><button class="btn primary" type="submit">'+t("send_report")+'</button></div></form>')+'</section>';
 const ws=(c.reports||[]).map(r=>({d:r.d,kg:r.kg==null?null:Number(r.kg),note:r.note}));
 const prg='<section class="ccard"><h3><span>'+t("my_progress")+'</span></h3>'+spark(ws)+(ws.length?'<ul class="hist">'+ws.slice().reverse().map(w=>'<li><span>'+fmt(w.d)+(w.note?' · <span class="note">'+esc(w.note)+'</span>':'')+'</span><span class="num">'+(w.kg!=null?w.kg+' kg':'—')+'</span></li>').join("")+'</ul>':'<p class="hint">'+t("no_reports")+'</p>')+'</section>';
 return '<div class="wrap"><div class="phone"><div class="hello"><h1>'+esc(t("hi").replace("{name}",String(c.name).split(" ")[0]))+'<small>'+t("your_coach")+': '+esc(c.coach.name)+'</small></h1>'+langSeg()+'</div>'+payCard+work+food+rep+prg+'</div></div>';
}

/* ================= public sales page ================= */
function renderPage(){
 if(PG===false)return '<div class="center"><p>404</p></div>';
 const c=PG;
 const svcCards=(c.services||[]).map(s=>'<article class="card"><h4>'+esc(lang==="az"?s.name_az:s.name_ru)+'</h4><div class="price">'+num(s.price)+' <small>AZN'+(s.type==="monthly"?' / '+t("mo"):(s.months>1?' / '+s.months+' '+t("mo"):''))+'</small></div><p>'+esc(lang==="az"?s.desc_az:s.desc_ru)+'</p><button class="btn" type="button" data-choose="'+s.id+'">'+t("choose")+'</button></article>').join("");
 const form=flash.leadSent?'<p class="thanks">'+t("lead_sent")+'</p>':
  '<form class="f" id="leadForm"><div class="two"><label>'+t("name")+'<input id="ld-name" autocomplete="name" maxlength="120"></label><label>'+t("phone")+'<input id="ld-phone" inputmode="tel" value="+994 " maxlength="40"></label></div>'+
  '<div class="two"><label>'+t("lead_service")+'<select id="ld-svc">'+(c.services||[]).map(s=>'<option value="'+s.id+'"'+(flash.choose===s.id?" selected":"")+'>'+esc(lang==="az"?s.name_az:s.name_ru)+' · '+num(s.price)+' AZN</option>').join("")+'</select></label>'+
  '<label>'+t("goal")+'<select id="ld-goal"><option value="lose">'+t("goal_lose")+'</option><option value="gain">'+t("goal_gain")+'</option><option value="fit">'+t("goal_fit")+'</option><option value="rehab">'+t("goal_rehab")+'</option></select></label></div>'+
  '<div class="two"><label>'+t("lead_level")+'<select id="ld-level"><option value="new">'+t("lvl_new")+'</option><option value="some">'+t("lvl_some")+'</option><option value="pro">'+t("lvl_pro")+'</option></select></label>'+
  '<label>'+t("lang_pref")+'<select id="ld-lang"><option value="az"'+(lang==="az"?" selected":"")+'>'+t("lang_az")+'</option><option value="ru"'+(lang==="ru"?" selected":"")+'>'+t("lang_ru")+'</option></select></label></div>'+
  '<label>'+t("lead_health")+'<input id="ld-health" maxlength="500" placeholder="'+esc(t("health_hint"))+'"></label>'+
  '<label class="check"><input type="checkbox" id="ld-consent"><span>'+t("consent")+'</span></label><p class="err" id="ld-err" hidden></p>'+
  '<div class="acts"><button class="btn primary" type="submit">'+t("send")+'</button></div></form>';
 const city=lang==="ru"&&c.city==="Bakı"?"Баку":c.city;
 return '<div class="wrap"><div class="sp"><section class="sp-hero"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div class="mono">'+esc(initials(c.name))+'</div>'+langSeg()+'</div>'+
  '<span class="badge">'+t("sp_badge")+(city?' · '+esc(city):'')+(c.instagram?' · '+esc(c.instagram):'')+'</span><h1>'+esc(c.name)+'</h1><p>'+esc(lang==="az"?(c.bio_az||c.bio_ru):(c.bio_ru||c.bio_az))+'</p></section>'+
  (svcCards?'<h2>'+t("sp_services")+'</h2><div class="svc">'+svcCards+'</div>':'')+
  '<h2>'+t("sp_how")+'</h2><ol class="steps"><li><b>'+t("sp_s1")+'</b>'+t("sp_s1d")+'</li><li><b>'+t("sp_s2")+'</b>'+t("sp_s2d")+'</li><li><b>'+t("sp_s3")+'</b>'+t("sp_s3d")+'</li></ol>'+
  '<h2 id="lead">'+t("sp_form")+'</h2><div class="sp-form">'+form+'</div></div></div>';
}

/* ================= render ================= */
function render(){
 document.documentElement.lang=lang;
 const app=document.getElementById("app");
 if(route.kind==="client"){app.innerHTML=CV===null?'<div class="center">'+t("loading")+'</div>':renderClient();return}
 if(route.kind==="page"){app.innerHTML=PG===null?'<div class="center">'+t("loading")+'</div>':renderPage();return}
 if(!sess){app.innerHTML=renderAuth();return}
 if(!S){app.innerHTML='<div class="center">'+t("loading")+'</div>';return}
 app.innerHTML=renderCoach();
 if(openId&&!client(openId))closeModal();
}

/* ================= coach modals ================= */
let openId=null,panelMode=null,draft=null;
function closeModal(){document.getElementById("modalRoot").innerHTML="";openId=null;panelMode=null;draft=null;flash.convertLead=null}
function modal(inner,noFocus){document.getElementById("modalRoot").innerHTML='<div class="overlay" data-close="1"><div class="panel" role="dialog" aria-modal="true">'+inner+'</div></div>';if(!noFocus){const f=document.querySelector(".panel input, .panel select");if(f)f.focus()}}
const X='<button class="x" type="button" data-close="1" aria-label="close">×</button>';
function opts(list,sel,none){return '<option value="">'+none+'</option>'+list.map(p=>'<option value="'+p.id+'"'+(p.id===sel?" selected":"")+'>'+esc(p.name)+'</option>').join("")}
function dayOptions(sel){return t("days").map((d,i)=>'<option value="'+i+'"'+(i===sel?" selected":"")+'>'+d+'</option>').join("")}
function clientForm(c){
 const isNew=!c||!c.id;c=c||{name:"",phone:"+994 ",billing:{type:"monthly",price:100,months:3,parts:3,paid:0},prog:"",meal:"",lang:lang,next:iso(today()),cday:weekday(today()),goal:"lose"};
 const b=c.billing;
 return '<form class="f" id="clientForm"><label>'+t("name")+'<input id="f-name" value="'+esc(c.name)+'" autocomplete="off" maxlength="120"></label>'+
  '<div class="two"><label>'+t("phone")+'<input id="f-phone" inputmode="tel" value="'+esc(c.phone)+'"></label><label>'+t("client_lang")+'<select id="f-lang"><option value="az"'+(c.lang==="az"?" selected":"")+'>'+t("lang_az")+'</option><option value="ru"'+(c.lang==="ru"?" selected":"")+'>'+t("lang_ru")+'</option></select></label></div>'+
  '<div class="two"><label>'+t("billing")+'<select id="f-btype">'+["monthly","package","installment"].map(x=>'<option value="'+x+'"'+(b.type===x?" selected":"")+'>'+t("bt_"+x)+'</option>').join("")+'</select></label>'+
  '<label><span id="f-price-l">'+t("price_"+b.type)+'</span><input id="f-price" type="number" min="0" step="5" value="'+esc(num(b.price))+'"></label></div>'+
  '<div class="two"><label data-for="package"'+(b.type==="package"?"":" hidden")+'>'+t("months")+'<input id="f-months" type="number" min="1" max="12" value="'+esc(b.months)+'"></label>'+
  '<label data-for="installment"'+(b.type==="installment"?"":" hidden")+'>'+t("parts")+'<input id="f-parts" type="number" min="2" max="12" value="'+esc(Math.max(2,b.parts))+'"></label>'+
  '<label>'+t("next_pay")+'<input id="f-next" type="date" value="'+esc(c.next||iso(today()))+'"></label></div>'+
  '<div class="two"><label>'+t("program")+'<select id="f-prog">'+opts(S.programs,c.prog,t("no_program"))+'</select></label><label>'+t("meal")+'<select id="f-meal">'+opts(S.meals,c.meal,t("no_meal"))+'</select></label></div>'+
  '<div class="two"><label>'+t("check_day")+'<select id="f-cday">'+dayOptions(Number(c.cday))+'</select></label><label>'+t("goal")+'<select id="f-goal">'+["lose","gain","fit","rehab"].map(g=>'<option value="'+g+'"'+(c.goal===g?" selected":"")+'>'+t("goal_"+g)+'</option>').join("")+'</select></label></div>'+
  '<p class="err" id="f-err" hidden></p><div class="acts"><button class="btn primary" type="submit">'+t("save")+'</button><button class="btn" type="button" data-act="'+(isNew?"close":"reopen")+'">'+t("cancel")+'</button></div></form>';
}
function openNewClient(prefill){openId=null;panelMode="new";modal('<div class="ph"><h2>'+t("new_client")+'</h2>'+X+'</div><div class="sec">'+clientForm(prefill||null)+'</div>')}
function openClient(id,m){
 const c=client(id);if(!c){closeModal();return}
 openId=id;panelMode=m||"view";
 if(panelMode==="edit"){modal('<div class="ph"><h2>'+esc(c.name)+'</h2>'+X+'</div><section class="sec"><h3>'+t("s_profile")+'</h3>'+clientForm(c)+'</section>');return}
 const p=prog(c.prog),ml=meal(c.meal);const pays=S.payments.filter(x=>x.cid===id);
 const paySec=panelMode==="pay"?
  '<form class="f" id="payForm"><div class="two"><label>'+t("amount")+'<input id="p-amount" type="number" min="0" value="'+esc(num(c.billing.price))+'"></label><label>'+t("date")+'<input id="p-date" type="date" value="'+iso(today())+'"></label></div>'+
   '<label>'+t("method")+'<select id="p-method"><option value="card">'+t("m_card")+'</option><option value="cash">'+t("m_cash")+'</option><option value="online">'+t("m_online")+'</option></select></label>'+
   '<div class="acts"><button class="btn primary" type="submit">'+t("save")+'</button><button class="btn" type="button" data-act="reopen">'+t("cancel")+'</button></div></form>'
  :'<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px">'+pill(c)+'<span class="num">'+esc(billLabel(c))+(c.next?' · '+t("until")+' '+fmt(c.next):'')+'</span></div><p class="hint" style="margin-bottom:10px">'+esc(billSub(c))+'</p>'+
   (c.next?'<div class="acts"><button class="btn primary" type="button" data-act="pay">'+t("mark_paid")+'</button><a class="btn wa" href="'+waClient(c,"pay")+'" target="_blank" rel="noopener">'+t("remind")+'</a></div>':'');
 const link=clientLink(c);
 modal('<div class="ph"><div style="display:flex;gap:12px;align-items:center"><span class="ava" style="width:44px;height:44px;font-size:15px">'+esc(initials(c.name))+'</span><h2>'+esc(c.name)+'</h2></div>'+X+'</div>'+
  '<section class="sec"><h3>'+t("s_link")+'</h3><p class="hint" style="margin-bottom:8px">'+t("client_link_hint")+'</p><div class="linkbox" style="margin-bottom:10px"><code id="clink">'+esc(link)+'</code><button class="btn sm" type="button" data-copy-text="'+esc(link)+'" data-copy-el="clink">'+t("copy")+'</button></div>'+
  '<div class="acts"><a class="btn wa sm" href="'+waClient(c,"link")+'" target="_blank" rel="noopener">'+t("send_link")+'</a><a class="btn sm" href="'+esc(link)+'" target="_blank" rel="noopener">'+t("open")+' →</a></div></section>'+
  '<section class="sec"><h3>'+t("s_payment")+'</h3>'+paySec+'</section>'+
  '<section class="sec"><h3>'+t("s_profile")+'</h3><dl class="kv"><dt>'+t("phone")+'</dt><dd class="num">'+esc(c.phone)+'</dd><dt>'+t("client_lang")+'</dt><dd>'+(c.lang==="az"?t("lang_az"):t("lang_ru"))+'</dd><dt>'+t("goal")+'</dt><dd>'+esc(goalLabel(c.goal))+'</dd><dt>'+t("check_day")+'</dt><dd>'+t("days")[c.cday]+'</dd></dl><div class="acts" style="margin-top:10px"><button class="btn sm" type="button" data-act="edit">'+t("edit")+'</button></div></section>'+
  '<section class="sec"><h3>'+t("s_progress")+'</h3>'+spark(c.weights)+histList(c,true)+
  (panelMode==="report"?'<form class="f" id="repForm" style="margin-top:12px"><div class="two"><label>'+t("weight")+'<input id="r-kg" type="number" step="0.1" min="20" max="400" value="'+(lastReport(c)?lastReport(c).kg:"")+'" required></label><label>'+t("date")+'<input id="r-date" type="date" value="'+iso(today())+'"></label></div><label>'+t("note")+'<input id="r-note" maxlength="1000"></label><div class="acts"><button class="btn primary" type="submit">'+t("save")+'</button><button class="btn" type="button" data-act="reopen">'+t("cancel")+'</button></div></form>'
   :'<div class="acts" style="margin-top:12px"><button class="btn" type="button" data-act="report">+ '+t("add_report")+'</button><a class="btn wa" href="'+waClient(c,"rep")+'" target="_blank" rel="noopener">'+t("ask_report")+'</a></div>')+'</section>'+
  '<section class="sec"><h3>'+t("s_program")+'</h3>'+(p?'<b>'+esc(p.name)+'</b><div style="margin-top:8px">'+exList(p.ex)+'</div>':'<p class="hint">'+t("no_program")+'</p>')+'</section>'+
  '<section class="sec"><h3>'+t("s_meal")+'</h3>'+(ml?'<b>'+esc(ml.name)+'</b>'+macroChips(mealTotals(ml.items)):'<p class="hint">'+t("no_meal")+'</p>')+'</section>'+
  '<section class="sec"><h3>'+t("s_history")+'</h3>'+(pays.length?'<ul class="hist">'+pays.map(x=>'<li><span>'+fmt(x.d)+' · '+t("m_"+x.m)+(x.part?' · '+t("part_of").replace("{k}",x.part).replace("{n}",x.parts):'')+'</span><span class="num">'+num(x.amount)+' AZN</span></li>').join("")+'</ul>':'<p class="hint">'+t("no_payments")+'</p>')+'</section>'+
  (panelMode==="delete"?'<div class="confirm"><span>'+t("sure")+'</span><button class="btn primary" type="button" data-act="do-delete" style="background:var(--bad);border-color:var(--bad);color:#fff">'+t("yes_delete")+'</button><button class="btn" type="button" data-act="reopen">'+t("cancel")+'</button></div>'
   :'<button class="btn danger" type="button" data-act="delete">'+t("delete_client")+'</button>'),panelMode==="view");
}
function openNewProgram(){openId=null;panelMode="newprog";
 modal('<div class="ph"><h2>'+t("new_program")+'</h2>'+X+'</div><div class="sec"><form class="f" id="progForm"><label>'+t("prog_name")+'<input id="g-name" maxlength="120"></label><label>'+t("exercises")+'<textarea id="g-ex" placeholder="'+esc(t("ex_hint"))+'"></textarea></label><p class="hint">'+t("ex_hint")+'</p><p class="err" id="g-err" hidden></p><div class="acts"><button class="btn primary" type="submit">'+t("save")+'</button><button class="btn" type="button" data-act="close">'+t("cancel")+'</button></div></form></div>')}
function openNewMeal(){openId=null;panelMode="newmeal";draft=draft||{name:"",items:[]};
 const foodOpts=Object.keys(FOODS).sort((a,b)=>tr(FOODS[a].n).localeCompare(tr(FOODS[b].n))).map(k=>'<option value="'+k+'">'+esc(tr(FOODS[k].n))+'</option>').join("");
 const rows=draft.items.length?SLOTS.map(s=>{const its=draft.items.map((it,i)=>({it,i})).filter(x=>x.it.s===s);if(!its.length)return "";
  return '<div class="meal"><h5>'+t("slot_"+s)+'</h5><ul class="ex">'+its.map(({it,i})=>'<li><span>'+esc(tr(FOODS[it.f].n))+' · '+it.g+' g</span><span style="display:flex;gap:8px;align-items:center">'+Math.round(FOODS[it.f].k*it.g/100)+' '+t("kcal")+'<button class="btn danger sm" type="button" data-draft-del="'+i+'">'+t("remove")+'</button></span></li>').join("")+'</ul></div>'}).join("")+macroChips(mealTotals(draft.items)):"";
 modal('<div class="ph"><h2>'+t("new_meal")+'</h2>'+X+'</div><div class="sec"><form class="f" id="mealForm"><label>'+t("meal_name")+'<input id="ml-name" value="'+esc(draft.name)+'" maxlength="120"></label>'+
  '<div class="three"><label>'+t("meal_slot")+'<select id="ml-slot">'+SLOTS.map(s=>'<option value="'+s+'"'+(flash.lastSlot===s?" selected":"")+'>'+t("slot_"+s)+'</option>').join("")+'</select></label><label>'+t("food")+'<select id="ml-food">'+foodOpts+'</select></label><label>'+t("grams")+'<input id="ml-g" type="number" min="5" step="5" value="100"></label><button class="btn" type="button" data-act="draft-add">'+t("add_food")+'</button></div>'+
  rows+'<p class="hint">'+t("food_note")+'</p><p class="err" id="ml-err" hidden></p><div class="acts"><button class="btn primary" type="submit">'+t("save")+'</button><button class="btn" type="button" data-act="close">'+t("cancel")+'</button></div></form></div>',true);
}
function reopenPanel(){if(openId)openClient(openId,panelMode==="edit"?"edit":"view");else if(panelMode==="new")openNewClient();else if(panelMode==="newprog")openNewProgram();else if(panelMode==="newmeal")openNewMeal()}

/* ================= events ================= */
document.addEventListener("click",async e=>{
 const el=e.target.closest("[data-tab],[data-open],[data-act],[data-pay],[data-close],[data-lang],[data-sent],[data-lead-convert],[data-lead-reject],[data-svc-del],[data-choose],[data-copy-text],[data-draft-del]");
 if(!el)return;
 if(el.dataset.close&&e.target!==el&&!e.target.closest(".x"))return;
 if(el.dataset.lang){setLang(el.dataset.lang);render();if(document.querySelector(".overlay"))reopenPanel();
  if(route.kind==="coach"&&S){S.coach.lang=lang;sb.from("coaches").update({lang}).eq("id",S.coach.id).then(()=>{})}return}
 if(el.dataset.copyText!==undefined){copyText(el.dataset.copyText,document.getElementById(el.dataset.copyEl));return}
 if(el.dataset.sent){const k=el.dataset.sent;if(!S.sent.includes(k)){S.sent.push(k);sb.from("todo_done").upsert({coach_id:S.coach.id,day:iso(today()),key:k},{ignoreDuplicates:true}).then(()=>{});setTimeout(render,60)}return}
 if(el.dataset.close){closeModal();return}
 if(el.dataset.tab){tab=el.dataset.tab;closeModal();render();window.scrollTo(0,0);return}
 if(el.dataset.open){openClient(el.dataset.open);return}
 if(el.dataset.pay){openClient(el.dataset.pay,"pay");return}
 if(el.dataset.leadConvert){const l=S.leads.find(x=>x.id===el.dataset.leadConvert);if(!l)return;const s=svc(l.svc);
  const billing=s?{type:s.type==="package"?"package":"monthly",price:s.price,months:s.months,parts:3,paid:0}:{type:"monthly",price:100,months:1,parts:3,paid:0};
  openNewClient({name:l.name,phone:l.phone,billing,prog:"",meal:"",lang:l.lang,next:iso(today()),cday:weekday(today()),goal:l.goal});flash.convertLead=l.id;return}
 if(el.dataset.leadReject){await run(async()=>{const {error}=await sb.from("leads").update({status:"rejected"}).eq("id",el.dataset.leadReject);if(error)throw error},t("rejected"));return}
 if(el.dataset.svcDel){await run(async()=>{const {error}=await sb.from("services").delete().eq("id",el.dataset.svcDel);if(error)throw error});return}
 if(el.dataset.choose){flash.choose=el.dataset.choose;const sel=document.getElementById("ld-svc");if(sel)sel.value=el.dataset.choose;const h=document.getElementById("lead");if(h&&h.scrollIntoView)h.scrollIntoView({behavior:"smooth"});return}
 if(el.dataset.draftDel){draft.items.splice(Number(el.dataset.draftDel),1);openNewMeal();return}
 const a=el.dataset.act;
 if(a==="auth-toggle"){authMode=authMode==="login"?"signup":"login";render()}
 else if(a==="logout"){await sb.auth.signOut();S=null;sess=null;closeModal();render()}
 else if(a==="new-client")openNewClient();
 else if(a==="new-program")openNewProgram();
 else if(a==="new-meal"){draft=null;openNewMeal()}
 else if(a==="draft-add"){draft.name=document.getElementById("ml-name").value;const s=document.getElementById("ml-slot").value;const f=document.getElementById("ml-food").value;const g=Math.max(5,Math.min(2000,Number(document.getElementById("ml-g").value)||100));flash.lastSlot=s;draft.items.push({s,f,g});openNewMeal()}
 else if(a==="close")closeModal();
 else if(a==="reopen")openClient(openId);
 else if(a==="pay")openClient(openId,"pay");
 else if(a==="report")openClient(openId,"report");
 else if(a==="edit")openClient(openId,"edit");
 else if(a==="delete")openClient(openId,"delete");
 else if(a==="do-delete"){const c=client(openId);if(!c)return;
  const ok=await run(async()=>{
   const {data:files}=await sb.storage.from(BUCKET).list(c.token,{limit:1000});
   if(files&&files.length)await sb.storage.from(BUCKET).remove(files.map(f=>c.token+"/"+f.name));
   const {error}=await sb.from("clients").delete().eq("id",c.id);if(error)throw error},t("deleted"));
  if(ok)closeModal()}
});
document.addEventListener("change",async e=>{
 const el=e.target;
 if(el.dataset&&el.dataset.done!==undefined&&route.kind==="client"){
  const i=Number(el.dataset.done),on=el.checked;
  const {data,error}=await sb.rpc("client_toggle_exercise",{p_token:route.token,p_index:i,p_done:on});
  if(error){el.checked=!on;toast(errText(error));return}
  CV.done_today=data||[];render();return}
 if(el.id==="f-btype"){const v=el.value;document.getElementById("f-price-l").textContent=t("price_"+v);document.querySelectorAll("[data-for]").forEach(n=>{n.hidden=n.dataset.for!==v})}
});
document.addEventListener("toggle",e=>{if(e.target.classList&&e.target.classList.contains("fooddb"))flash.foodOpen=e.target.open},true);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.querySelector(".overlay"))closeModal()});
document.addEventListener("input",e=>{
 if(e.target.id==="search"){query=e.target.value;const pos=e.target.selectionStart;document.getElementById("view").innerHTML=viewClients();const s=document.getElementById("search");s.focus();try{s.setSelectionRange(pos,pos)}catch(_){}}
 if(e.target.id==="ml-name"&&draft)draft.name=e.target.value});
document.addEventListener("submit",async e=>{
 e.preventDefault();const f=e.target;const v=id=>{const x=document.getElementById(id);return x?x.value:""};
 const showErr=(id,msg)=>{const er=document.getElementById(id);if(er){er.textContent=msg;er.hidden=false}};
 const btn=f.querySelector('button[type="submit"]');if(btn){if(btn.disabled)return;btn.disabled=true}
 try{
 if(f.id==="authForm"){
  const email=v("a-email").trim(),pass=v("a-pass");
  if(authMode==="signup"){
   const {data,error}=await sb.auth.signUp({email,password:pass,options:{data:{name:v("a-name").trim(),lang}}});
   if(error){showErr("a-err",error.message);return}
   if(!data.session){showErr("a-err",t("check_email"));return}
  }else{
   const {error}=await sb.auth.signInWithPassword({email,password:pass});
   if(error){showErr("a-err",t("login_fail"));return}
  }
  return;
 }
 if(f.id==="clientForm"){
  const name=v("f-name").trim();if(!name){showErr("f-err",t("need_name"));return}
  const type=v("f-btype");const old=panelMode==="new"?null:client(openId);
  const parts=type==="installment"?Math.max(2,Number(v("f-parts"))||2):1;
  const paid=old&&old.billing.type===type?old.billing.paid:0;
  const row={coach_id:S.coach.id,name,phone:v("f-phone").trim(),lang:v("f-lang"),goal:v("f-goal"),billing_type:type,price:Math.max(0,Number(v("f-price"))||0),
   months:type==="package"?Math.max(1,Number(v("f-months"))||1):1,parts,parts_paid:paid,next_payment:(type==="installment"&&paid>=parts)?null:(v("f-next")||iso(today())),
   check_day:Number(v("f-cday"))||0,program_id:v("f-prog")||null,meal_plan_id:v("f-meal")||null};
  if(panelMode==="new"){
   const lead=flash.convertLead;
   const ok=await run(async()=>{const {error}=await sb.from("clients").insert(row);if(error)throw error;
    if(lead){const r=await sb.from("leads").update({status:"converted"}).eq("id",lead);if(r.error)throw r.error}},lead?t("converted"):t("added_client"));
   if(ok){closeModal();tab="clients";render()}
  }else{
   const id=openId;const ok=await run(async()=>{const {error}=await sb.from("clients").update(row).eq("id",id);if(error)throw error},t("saved_client"));
   if(ok)openClient(id)}
  return}
 if(f.id==="payForm"){const id=openId;
  const ok=await run(async()=>{const {error}=await sb.rpc("record_payment",{p_client:id,p_amount:Math.max(0,Number(v("p-amount"))||0),p_paid_on:v("p-date")||iso(today()),p_method:v("p-method")});if(error)throw error},t("saved_payment"));
  if(ok)openClient(id);return}
 if(f.id==="repForm"){const id=openId;const kg=Number(v("r-kg"));if(!kg)return;
  const ok=await run(async()=>{const {error}=await sb.from("reports").insert({coach_id:S.coach.id,client_id:id,report_date:v("r-date")||iso(today()),weight:kg,note:v("r-note").trim()});if(error)throw error},t("saved_report"));
  if(ok)openClient(id);return}
 if(f.id==="progForm"){const name=v("g-name").trim();
  const ex=v("g-ex").split("\n").map(s=>s.trim()).filter(Boolean).slice(0,50).map(line=>{const m=line.split(/\s+[—–-]\s+/);return {n:m[0],s:m[1]||""}});
  if(!name||!ex.length){showErr("g-err",t("need_prog"));return}
  const ok=await run(async()=>{const {error}=await sb.from("programs").insert({coach_id:S.coach.id,name,exercises:ex});if(error)throw error},t("saved_program"));
  if(ok){closeModal();tab="programs";render()}return}
 if(f.id==="mealForm"){const name=v("ml-name").trim();if(!name||!draft||!draft.items.length){showErr("ml-err",t("need_meal"));return}
  const items=draft.items.slice();
  const ok=await run(async()=>{const {error}=await sb.from("meal_plans").insert({coach_id:S.coach.id,name,items});if(error)throw error},t("saved_meal"));
  if(ok){closeModal();tab="meals";render()}return}
 if(f.id==="coachForm"){
  const slug=v("k-slug").trim().toLowerCase();
  if(!/^[a-z0-9-]{3,30}$/.test(slug)){showErr("k-err",t("slug_bad"));return}
  const row={name:v("k-name").trim()||S.coach.name,city:v("k-city").trim(),instagram:v("k-ig").trim(),card:v("k-card").trim(),remind_days:Math.max(0,Math.min(7,Number(v("k-rd"))||0)),bio_az:v("k-bio-az").trim(),bio_ru:v("k-bio-ru").trim(),slug};
  const {error}=await sb.from("coaches").update(row).eq("id",S.coach.id);
  if(error){showErr("k-err",error.code==="23505"?t("slug_taken"):t("err_generic"));return}
  await loadAll();render();toast(t("saved_settings"));return}
 if(f.id==="svcForm"){const naz=v("v-naz").trim(),nru=v("v-nru").trim();if(!naz&&!nru){showErr("v-err",t("need_name"));return}
  const type=v("v-type");
  await run(async()=>{const {error}=await sb.from("services").insert({coach_id:S.coach.id,name_az:naz||nru,name_ru:nru||naz,desc_az:v("v-daz").trim(),desc_ru:v("v-dru").trim(),price:Math.max(0,Number(v("v-price"))||0),type,months:type==="monthly"?1:Math.max(1,Number(v("v-months"))||1),sort:S.coach.services.length+1});if(error)throw error},t("saved_settings"));
  return}
 if(f.id==="clientRepForm"){
  const kg=Number(v("cr-kg"));if(!kg)return;
  const inp=document.getElementById("cr-photo");let path=null;
  const blob=await downscale(inp&&inp.files&&inp.files[0]);
  if(blob){const p=route.token+"/"+uuid()+".jpg";const up=await sb.storage.from(BUCKET).upload(p,blob,{contentType:"image/jpeg"});if(up.error)toast(t("photo_fail"));else path=p}
  const {error}=await sb.rpc("client_submit_report",{p_token:route.token,p_weight:kg,p_note:v("cr-note").trim(),p_photo:path});
  if(error){toast(errText(error));return}
  flash.reportSent=true;await loadClient();return}
 if(f.id==="leadForm"){
  const name=v("ld-name").trim(),phone=v("ld-phone").trim();
  if(!name||phone.replace(/\D/g,"").length<7){showErr("ld-err",t("need_lead"));return}
  if(!document.getElementById("ld-consent").checked){showErr("ld-err",t("need_consent"));return}
  const {error}=await sb.rpc("submit_lead",{p_slug:route.slug,p_name:name,p_phone:phone,p_goal:v("ld-goal"),p_level:v("ld-level"),p_service:v("ld-svc")||null,p_lang:v("ld-lang"),p_health:v("ld-health").trim(),p_consent:true});
  if(error){showErr("ld-err",errText(error));return}
  flash.leadSent=true;render();const h=document.getElementById("lead");if(h&&h.scrollIntoView)h.scrollIntoView();return}
 }finally{if(btn&&document.body.contains(btn))btn.disabled=false}
});

/* ================= boot ================= */
async function loadClient(){
 const {data,error}=await sb.rpc("client_view",{p_token:route.token});
 CV=(error||!data)?false:data;
 if(CV&&!flash.langSet){lang=CV.lang==="az"?"az":"ru";flash.langSet=true}
 render();
}
async function loadPage(){
 const {data,error}=await sb.rpc("get_public_page",{p_slug:route.slug});
 PG=(error||!data)?false:data;
 if(PG&&!flash.langSet){let pref=null;try{pref=localStorage.getItem("cf-lang")}catch(_){}lang=pref||PG.lang||"az";flash.langSet=true}
 if(PG)document.title=PG.name+" · CoachFlow";
 render();
}
async function bootCoach(){
 const {data}=await sb.auth.getSession();sess=data.session;render();
 if(sess){try{await loadAll();if(S.coach.lang&&!localStorage.getItem("cf-lang"))lang=S.coach.lang}catch(e){console.error(e);toast(errText(e))}render()}
 sb.auth.onAuthStateChange(async(ev,s)=>{
  const had=!!sess;sess=s;
  if(ev==="SIGNED_IN"&&!had){S=null;render();try{await loadAll()}catch(e){console.error(e);toast(errText(e))}render()}
  if(ev==="SIGNED_OUT"){S=null;render()}
 });
}
render();
if(route.kind==="client")loadClient();
else if(route.kind==="page")loadPage();
else bootCoach();
})();
