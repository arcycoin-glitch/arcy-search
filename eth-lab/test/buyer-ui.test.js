'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
// Guard the buyer-facing UI regressions without adding a browser dependency to production.
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('unscanned metrics are dashes, not prematurely NOT VERIFIED',()=>{
 assert.match(html,/const displayed=!report\?'—':missing\?'NOT VERIFIED'/);
 assert.match(html,/id="address"[^>]*value=""/);
});
test('issuer badges are visible in results and remain sticky during report scroll',()=>{
 assert.match(html,/#identity\{position:sticky;top:6px;z-index:20\}/);
 assert.match(html,/badge\.textContent=item\.identity\?\.status==='OFFICIAL_CONTRACT_MATCHED'/);
 assert.match(html,/name\.textContent=identity\?\.status==='OFFICIAL_CONTRACT_MATCHED'/);
 assert.match(html,/View official source ↗/);
});
test('all five buyer-first cards and source-coverage summary remain present',()=>{
 assert.match(html,/const buyerOrder=\['liquidity','holders','mechanics','supply','activity'\]/);
 assert.match(html,/of '\+total\+' metrics have source-backed values/);
 assert.match(html,/function shortReason\(field\)/);
 assert.match(html,/shortReason\(data\)/);
});

test('sourced metrics remain visible and missing values are available on demand',()=>{
 assert.match(html,/const missingRows=\[\]/);
 assert.match(html,/if\(report&&missing\)missingRows\.push\(row\)/);
 assert.match(html,/Show '\+missingRows\.length\+' unverified checks and reasons/);
 assert.match(html,/No source-backed values available for this token/);
});

test('only one main token appears by default with alternative contracts in expandable section',()=>{
 assert.match(html,/function showCandidates\(data,network,version\)/);
 assert.match(html,/container\.append\(candidateElement\(main,true\)\)/);
 assert.match(html,/const expandable=document\.createElement\('details'\)/);
 assert.match(html,/Show '\+others\.length\+' other matching contracts \/ related tokens/);
 assert.match(html,/candidates\.find\(item=>official\(item\)&&exact\(item\)\)/);
 assert.match(html,/docs\.ondo\.foundation/);
});

test('unknown tickers show three safely illustrated candidates with all others expandable',()=>{
 assert.match(html,/if\(trustedMain\)\{/);
 assert.match(html,/const list=document\.createElement\('div'\);list\.className='candidate-list'/);
 assert.match(html,/for\(const candidate of candidates\.slice\(0,3\)\)list\.append\(candidateElement\(candidate\)\)/);
 assert.match(html,/for\(const candidate of candidates\.slice\(3\)\)others\.append\(candidateElement\(candidate\)\)/);
 assert.match(html,/const img=document\.createElement\('img'\)/);
 assert.match(html,/img\.referrerPolicy='no-referrer'/);
 assert.match(html,/const logo=safeCandidateImage\(item\.logoUrl\)/);
 assert.match(html,/Logo is not proof of identity/);
});
