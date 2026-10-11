(function(root,factory){
 'use strict';
 const formatter=factory();
 if(typeof module==='object'&&module.exports)module.exports=formatter;
 else root.ARCYMetricFormat=formatter;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const NUMERIC=/^([+-]?)(\d+)(?:\.(\d+))?$/;
 const SUFFIXES=[{power:3,suffix:'K'},{power:6,suffix:'M'},
  {power:9,suffix:'B'},{power:12,suffix:'T'},{power:15,suffix:'Q'}];
 const isPercent=key=>/^(change24h|largestWalletPct|top10Pct|top20Pct|burnAddressPct)$/.test(key);
 const isUsd=key=>/^(liquidityUsd|volume24h|valuation|priceUsd)$/.test(key);
 const label=kind=>kind==='MARKET_CAP'?'Market Cap ':kind==='FDV'?'FDV ':kind?kind+' ':'';
 function parseNumeric(value){
  if(typeof value!=='number'&&typeof value!=='string')return null;
  if(typeof value==='number'&&!Number.isFinite(value))return null;
  let raw=String(value).trim();
  // Numbers from JSON can contain exponent notation. Preserve evidence
  // instead of inventing high-precision digits from a floating-point value.
  if(!NUMERIC.test(raw)&&typeof value==='number'&&Number.isFinite(value))
   raw=value.toLocaleString('en-US',{useGrouping:false,maximumFractionDigits:20});
  const match=NUMERIC.exec(raw);
  return match?{negative:match[1]==='-',whole:match[2].replace(/^0+(?=\d)/,''),fraction:match[3]||'',raw}:null;
 }
 function fullNumeric(value){
  const n=parseNumeric(value);
  if(!n)return String(value);
  const sign=n.negative&&!(n.whole==='0'&&!/[1-9]/.test(n.fraction))?'-':'';
  return sign+n.whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')+
   (n.fraction?'.'+n.fraction:'');
 }
 function compactNumeric(value){
  const n=parseNumeric(value);
  if(!n)return null;
  let index=-1;
  for(let i=0;i<SUFFIXES.length;i++)if(n.whole.length>SUFFIXES[i].power)index=i;
  if(index===-1)return null;
  let cents=0n;
  for(;;){
   const power=SUFFIXES[index].power;
   const major=n.whole.length>power?n.whole.slice(0,-power):'0';
   const remainder=n.whole.slice(-power).padStart(power,'0')+n.fraction;
   const digits=(remainder+'000').slice(0,3);
   cents=BigInt(major)*100n+BigInt(digits.slice(0,2))+(digits[2]>='5'?1n:0n);
   // Avoid showing "1000K"; reround from the original evidence at M/B/T.
   if(cents>=100000n&&index+1<SUFFIXES.length){index++;continue}
   break;
  }
  const whole=(cents/100n).toString();
  const fractional=(cents%100n).toString().padStart(2,'0').replace(/0+$/,'');
  const sign=n.negative&&cents!==0n?'-':'';
  // Tiny negative numbers are never forced to 0; they remain full precision.
  if(cents===0n&&n.negative)return null;
  return sign+whole+(fractional?'.'+fractional:'')+SUFFIXES[index].suffix;
 }
 function display(value,key,kind){
  if(typeof value==='boolean')return value?'TRUE':'FALSE';
  const prefix=label(kind),numeric=parseNumeric(value);
  if(!numeric)return prefix+String(value);
  // Percent changes and wallet shares are NOT token counts; never abbreviate.
  if(isPercent(key))return prefix+fullNumeric(value)+'%';
  const compact=compactNumeric(value);
  return prefix+(isUsd(key)?'$':'')+(compact||fullNumeric(value));
 }
 function full(value,key,kind){
  if(typeof value==='boolean')return value?'TRUE':'FALSE';
  const prefix=label(kind),numeric=parseNumeric(value);
  if(!numeric)return prefix+String(value);
  return prefix+(isUsd(key)?'$':'')+fullNumeric(value)+(isPercent(key)?'%':'');
 }
 return Object.freeze({display,full,compactNumeric});
});
