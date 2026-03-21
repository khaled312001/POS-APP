'use strict';
const koffi = require('koffi');
const lib  = koffi.load('C:\\Windows\\System32\\capi2032.dll');
const lib2 = koffi.load('C:\\Windows\\System32\\capi2032.dll');

const REG     = lib.func('uint32 CAPI_REGISTER(uint32,uint32,uint32,uint32,uint32 *out)');
const PUT     = lib.func('uint32 CAPI_PUT_MESSAGE(uint32, uint8 *)');
const GET_PTR = lib.func('uint32 CAPI_GET_MESSAGE(uint32, void **out)');  // AppID probe only
const GET_BUF = lib2.func('uint32 CAPI_GET_MESSAGE(uint32, uint8 *)');   // gets 8-byte ptr into buffer

const idOut=[0];
const r=REG(4096,2,7,2048,idOut);
console.log('REGISTER=0x'+r.toString(16));
let appId=idOut[0];
if(!appId){for(let i=1;i<=16;i++){const p=[null];if(GET_PTR(i,p)===0x1104){appId=i;break;}}}
console.log('AppID='+appId);

const req=Buffer.alloc(26,0);
req.writeUInt16LE(26,0);req.writeUInt16LE(appId,2);req.writeUInt8(5,4);
req.writeUInt8(0x80,5);req.writeUInt16LE(1,6);req.writeUInt32LE(1,8);
req.writeUInt32LE(0xFFFF,12);req.writeUInt32LE(0x1FFF03FF,16);
console.log('PUT_LISTEN=0x'+PUT(appId,req).toString(16));

const t=Date.now();let n=0;
(function poll(){
  if(Date.now()-t>10000){console.log('Timeout ('+n+' polls)');process.exit(0);}
  n++;
  const ptrHolder = Buffer.alloc(8, 0);
  const g = GET_BUF(appId, ptrHolder);
  if(g===0x1104||g===0x1101){setTimeout(poll,20);return;}
  console.log('GET ret=0x'+g.toString(16));
  if(g===0){
    const ptr = ptrHolder.readBigUInt64LE(0);
    console.log('msg ptr=0x'+ptr.toString(16));
    if(ptr!==0n){
      // Try koffi.decode with BigInt address
      try{
        const bytes=koffi.decode(ptr, koffi.array('uint8',32));
        console.log('SUCCESS - HEX: '+Buffer.from(bytes).toString('hex'));
        const len=bytes[0]|(bytes[1]<<8);
        console.log('  len='+len+' appId='+(bytes[2]|(bytes[3]<<8))+' cmd=0x'+bytes[4].toString(16)+' sub=0x'+bytes[5].toString(16));
      }catch(e1){
        console.log('BigInt decode failed: '+e1.message);
        // Try with Number
        try{
          const bytes=koffi.decode(Number(ptr), koffi.array('uint8',32));
          console.log('Number decode SUCCESS - HEX: '+Buffer.from(bytes).toString('hex'));
        }catch(e2){
          console.log('Number decode failed: '+e2.message);
        }
      }
    }
  }
  setTimeout(poll,20);
})();
