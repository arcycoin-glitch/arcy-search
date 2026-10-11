'use strict';
(()=>{
 const target=document.getElementById('tokenUnlocks');if(!target)return;
 const confirmed=document.getElementById('unlockConfirmed');
 const reported=document.getElementById('unlockReportedRows');
 const reportedPanel=document.getElementById('unlockReported');
 const proof=document.getElementById('unlocksProof');
 const approvedLogo=raw=>{
  if(typeof raw!=='string'||raw.length>500)return null;
  try{
   const u=new URL(raw);
   return u.protocol==='https:'&&['coin-images.coingecko.com','assets.coingecko.com'].includes(u.hostname)&&
    !/\.(svg|html?|xml|pdf)$/i.test(u.pathname)?u.href:null;
  }catch{return null}
 };
 const empty=text=>{const row=document.createElement('p');row.className='pulse-empty';row.textContent=text;return row};
 const render=(root,items)=>{
  root.replaceChildren();
  for(const e of items.slice(0,5)){
   if(typeof e.sourceUrl!=='string')continue;
   let u;try{u=new URL(e.sourceUrl)}catch{continue}
   if(u.protocol!=='https:')continue;
   const row=document.createElement('a');row.className='unlock-entry';row.href=u.href;
   row.target='_blank';row.rel='noopener noreferrer';
   const art=document.createElement('span');art.className='unlock-avatar';
   art.textContent=String(e.symbol||'?').slice(0,2).toUpperCase();
   const logo=approvedLogo(e.logoUrl);
   if(logo){const img=document.createElement('img');img.src=logo;img.alt='';
    img.referrerPolicy='no-referrer';img.loading='lazy';img.addEventListener('error',()=>img.remove(),{once:true});art.append(img)}
   const copy=document.createElement('span');copy.className='unlock-copy';
   const title=document.createElement('strong');title.textContent=e.name+' ('+e.symbol+')';
   const note=document.createElement('small');note.textContent=e.date+' · '+e.amount;
   copy.append(title,note);
   const arrow=document.createElement('span');arrow.className='pulse-arrow';arrow.textContent='↗';
   row.append(art,copy,arrow);root.append(row);
  }
 };
 let started=false;
 const observer=new IntersectionObserver(async entries=>{
  if(started||!entries.some(e=>e.isIntersecting))return;started=true;observer.disconnect();
  try{
   const response=await fetch('/api/unlocks',{cache:'no-store'});
   if(!response.ok)throw Error('NO_UNLOCK_SOURCE');
   const data=await response.json();
   if(data.ok!==true||!Array.isArray(data.confirmed)||!Array.isArray(data.reported)||
     data.confirmed.length>5||data.reported.length>5)throw Error('INVALID_UNLOCK_DATA');
   render(confirmed,data.confirmed);
   if(!confirmed.children.length)confirmed.append(empty('No issuer-confirmed token unlock events in the next 30 days.'));
   render(reported,data.reported);
   reportedPanel.hidden=!reported.children.length;
   proof.textContent='Dated schedule sources checked · Issuer-confirmed and third-party claims are displayed separately.';
  }catch{
   confirmed.replaceChildren(empty('Unlock sources unavailable. No estimated or unverified dates promoted as confirmed.'));
   reportedPanel.hidden=true;proof.textContent='SOURCE UNAVAILABLE';
  }
 },{rootMargin:'150px'});
 observer.observe(target);
})();
