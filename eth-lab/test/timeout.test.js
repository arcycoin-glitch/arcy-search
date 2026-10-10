'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {withTimeout}=require('../lib/timeout');

test('successful smoke operation cancels its watchdog timer',async()=>{
 let cancelled=null;
 const timer={id:1};
 const result=await withTimeout(Promise.resolve('ok'),65000,'SMOKE_TIMEOUT',{
  schedule:(callback,delay)=>{assert.equal(typeof callback,'function');assert.equal(delay,65000);return timer},
  cancel:value=>{cancelled=value}
 });
 assert.equal(result,'ok');
 assert.equal(cancelled,timer);
});

test('smoke watchdog still rejects a hung operation and cancels the timer',async()=>{
 let cancelled=null;
 const timer={id:2};
 await assert.rejects(withTimeout(new Promise(()=>{}),10,'SMOKE_TIMEOUT',{
  schedule:callback=>{queueMicrotask(callback);return timer},
  cancel:value=>{cancelled=value}
 }),/SMOKE_TIMEOUT/);
 assert.equal(cancelled,timer);
});
