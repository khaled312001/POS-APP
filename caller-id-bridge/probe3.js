'use strict';
const koffi = require('koffi');
const lib = koffi.load('C:\\Windows\\System32\\capi2032.dll');
const REG = lib.func('uint32 CAPI_REGISTER(uint32,uint32,uint32,uint32,uint32 *out)');
const PUT = lib.func('uint32 CAPI_PUT_MESSAGE(uint32, uint8 *)');
const GET = lib.func('uint32 CAPI_GET_MESSAGE(uint32, void **out)');
const idOut=[0];
const r=REG(4096,2,7,2048,idOut);
console.log('REGISTER=0x'+r.toString(16));
let appId=idOut[0];
if(!appId){for(let i=1;i<=16;i++){const p=[null];if(GET(i,p)===0x1104){appId=i;break;}}}
console.log('AppID='+appId);
const req=Buffer.alloc(26,0);
req.writeUInt16LE(26,0);req.writeUInt16LE(appId,2);req.writeUInt8(5,4);
req.writeUInt8(0x80,5);req.writeUInt16LE(1,6);req.writeUInt32LE(1,8);
req.writeUInt32LE(0xFFFF,12);req.writeUInt32LE(0x1FFF03FF,16);
console.log('PUT_LISTEN=0x'+PUT(appId,req).toString(16));
const t=Date.now();let n=0;
(function poll(){
  if(Date.now()-t>8000){console.log('Timeout ('+n+' polls)');process.exit(0);}
  n++;
  const p=[null];const g=GET(appId,p);
  if(g===0x1104||g===0x1101){setTimeout(poll,20);return;}
  console.log('GET=0x'+g.toString(16)+' ptr='+(p[0]?'NON-NULL':'null'));
  if(g===0&&p[0]){
    try{const b=koffi.decode(p[0],koffi.array('uint8',32));console.log('HEX:'+Buffer.from(b).toString('hex'));}
    catch(e){console.log('decode:'+e.message);}
  }
  setTimeout(poll,20);
})();
