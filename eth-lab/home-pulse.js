'use strict';
(()=>{
 const node=document.getElementById('arcPulse');
 if(!node)return;
 let started=false;
 const list=document.getElementById('pulseEntries');
 const status=document.getElementById('pulseProof');
 const week=document.getElementById('pulseWeek');
 async function load(){
  list.replaceChildren();
  try{
   const response=await fetch('/api/pulse',{cache:'no-store'});
   if(!response.ok)throw Error('SOURCE_UNAVAILABLE');
   const payload=await response.json();
   if(payload.ok!==true||!Array.isArray(payload.cards)||payload.cards.length>5||
    !Number.isFinite(Date.parse(payload.checkedAt)))throw Error('INVALID_PULSE');
   week.textContent='Edition #'+String(payload.number||'—')+' · '+payload.checkedAt.slice(0,10);
   for(const item of payload.cards){
    if(typeof item.title!=='string'||typeof item.sourceUrl!=='string'||typeof item.publishedAt!=='string')continue;
    let url;
    try{url=new URL(item.sourceUrl)}catch{continue}
    if(url.protocol!=='https:')continue;
    const article=document.createElement('a');article.href=url.href;article.className='pulse-entry';
    article.target='_blank';article.rel='noopener noreferrer';
    const copy=document.createElement('span'),title=document.createElement('strong'),meta=document.createElement('small');
    title.textContent=item.title;
    meta.textContent=String(item.owner||'Official source')+' · '+item.publishedAt.slice(0,10);
    copy.append(title,meta);
    const arrow=document.createElement('span');arrow.className='pulse-arrow';arrow.textContent='↗';
    article.append(copy,arrow);list.append(article);
   }
   if(!list.children.length){
    const empty=document.createElement('p');empty.className='pulse-empty';
    empty.textContent='No verified updates this week. We do not recycle old announcements.';
    list.append(empty);
   }
   status.textContent='Checked '+(payload.coverage?.checked??'—')+'/'+(payload.coverage?.total??'—')+
     ' official source families · Current weekly edition only.';
  }catch{
   const empty=document.createElement('p');empty.className='pulse-empty';
   empty.textContent='Official Arc Pulse data is temporarily unavailable. No fabricated headlines.';
   list.append(empty);status.textContent='SOURCE UNAVAILABLE';
  }
 }
 const observer=new IntersectionObserver(entries=>{
  if(started||!entries.some(e=>e.isIntersecting))return;
  started=true;observer.disconnect();void load();
 },{rootMargin:'150px'});
 observer.observe(node);
})();
