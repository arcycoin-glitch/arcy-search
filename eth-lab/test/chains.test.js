'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {chain,rpcUrl,verifyChainId}=require('../lib/chains');
const stocks=require('../lib/robinhood-assets');
const CONTRACT_A='0x1234567890123456789012345678901234567890';
const CONTRACT_B='0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const fixture={assets:[
 {tokenSymbol:'ABCD',tokenName:'Example Equity • Robinhood Token',currentMultiplier:'0.500000000000000000',status:'ASSET_STATUS_ACTIVE',
  deployments:[{chainId:46630,contractAddress:CONTRACT_B},{chainId:4663,contractAddress:CONTRACT_A}]},
 {tokenSymbol:'ABCD',tokenName:'Other Same-Symbol Entity',deployments:[{chainId:1,contractAddress:CONTRACT_B}]}
]};
test('two distinct mainnet configurations; testnet ID never accepted',()=>{
 assert.equal(chain('ethereum').chainId,1);
 assert.equal(chain('robinhood').chainId,4663);
 assert.throws(()=>chain('robinhood-testnet'),/Unsupported network/);
 assert.throws(()=>chain('Robinhood'),/Unsupported network/);
 assert.equal(verifyChainId('robinhood','0x1237'),4663);
 assert.equal(verifyChainId('ethereum','0x1'),1);
 assert.throws(()=>verifyChainId('robinhood','0xb62e'),/mismatch/); // 46638, never mainnet
 assert.throws(()=>verifyChainId('robinhood','0xb626'),/mismatch/); // 46630 testnet
 assert.throws(()=>verifyChainId('ethereum','0x1237'),/mismatch/);
});
test('secure configured RPC and mainnet explorer',()=>{
 assert.equal(chain('robinhood').explorer,'https://robinhoodchain.blockscout.com');
 assert.equal(chain('robinhood').stockTokenRegistry,'https://api.robinhood.com/rhj/assets');
 assert.equal(new URL(rpcUrl('robinhood',{})).host,'rpc.mainnet.chain.robinhood.com');
 assert.throws(()=>rpcUrl('robinhood',{ROBINHOOD_RPC_URL:'http://bad-host.example'}),/HTTPS/);
 assert.throws(()=>rpcUrl('robinhood',{ROBINHOOD_RPC_URL:'https://user:password@rpc.example'}),/credentials/);
});
test('canonical registry only matches exact chain ID 4663 and full contract',()=>{
 const matches=stocks.parseAssets(fixture);
 assert.equal(matches.length,1);
 assert.equal(matches[0].address,CONTRACT_A);
 assert.equal(matches[0].multiplier,'0.500000000000000000');
 assert.equal(matches[0].registryMatched,true);
 assert.equal(stocks.byContract(fixture,CONTRACT_A)?.symbol,'ABCD');
 assert.equal(stocks.byContract(fixture,CONTRACT_B),null);
 assert.equal(stocks.search(fixture,'ABCD').length,1);
 assert.equal(stocks.search(fixture,'random').length,0);
});
test('duplicate ticker is not automatically treated as canonical',()=>{
 const fake={assets:[{tokenSymbol:'ABCD',tokenName:'Same ticker fake',deployments:[{chainId:46630,contractAddress:CONTRACT_B}]}]};
 assert.equal(stocks.byContract(fake,CONTRACT_B),null);
 assert.equal(stocks.search(fake,'ABCD').length,0);
});
test('conflicting Stock Token registry deployments fail closed',()=>{
 const different={assets:[...fixture.assets[0].deployments.map(x=>({tokenSymbol:'ABCD',tokenName:x.chainId===4663?'A':'B',deployments:[x]})),{tokenSymbol:'ABCD',tokenName:'Fraud',deployments:[{chainId:4663,contractAddress:CONTRACT_A}]}]};
 assert.throws(()=>stocks.parseAssets(different),/Conflicting/);
});
