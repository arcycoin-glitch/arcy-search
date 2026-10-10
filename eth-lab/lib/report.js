'use strict';
const {inspect:token}=require('./eth');
const evidence=require('./evidence');
const market=require('./market');
const control=require('./control');
const missing=(description,items)=>evidence.card(Object.fromEntries(items.map(([name,reason])=>[name,evidence.unknown(reason)])),description);
async function build(address){
  const t=await token(address);
  const [m,c]=await Promise.allSettled([market.inspect(t.address),control.inspect(t.address,t.block)]);
  const mk=(m.status==='fulfilled'?m.value:market.failure(m.reason));
  const ct=(c.status==='fulfilled'?c.value:control.failure(c.reason));
  const wrap=field=>field.status==='ON_CHAIN'?evidence.found(field.value,'Ethereum RPC',[{method:field.method,block:t.block,address:t.address}],'ON_CHAIN'):evidence.unknown(field.reason);
  const supply=evidence.card({
    totalSupply:wrap(t.fields.totalSupply),
    burnAddressBalance:wrap(t.fields.burnAddressBalance),
    circulatingSupply:evidence.unknown('Verified contract-matched circulating supply source needed.'),
    nextUnlock:evidence.unknown('Verified contract-matched vesting schedule source needed.')
  },'On-chain total supply and two standard burn-address balances.');
  const holders=missing('Ethereum holder index is not yet integrated.',[
    ['holderCount','Complete holder indexing and balance reconciliation required.'],
    ['largestWalletPct','Verified holder balances and pinned total supply required.'],
    ['top10Pct','Complete verified top-10 holder balances required.'],
    ['top20Pct','Complete verified top-20 holder balances required.']
  ]);
  const claims=missing('Only verifiable published project claims may be compared.',[
    ['checked','Project claim source is not connected.'],
    ['verified','No source-backed project claims were checked.'],
    ['mismatch','No source-backed project claims were checked.'],
    ['unverified','No source-backed project claims were checked.']
  ]);
  const mechanics=missing('Fee and burn mechanisms require verified bytecode-matched interpretation.',[
    ['buyTax','Token buy tax and DEX fees must be verified independently.'],
    ['sellTax','Token sell tax and DEX fees must be verified independently.'],
    ['transferTax','Verified tax logic or reliable source report required.'],
    ['buybackBurn','Burn address custody does not prove buyback execution.']
  ]);
  return {ok:true,chainId:1,network:'ethereum',address:t.address,scannedAt:t.scannedAt,block:t.block,token:t.token,
    cards:{supply,holders,control:ct,liquidity:mk,claims,mechanics},
    warnings:['Experimental research tool: not financial advice.','SOURCE_REPORTED is not equivalent to independent on-chain verification.','Missing evidence must never be displayed as 0 or false.']};
}
module.exports={build};
