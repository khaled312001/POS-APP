'use strict';
const koffi = require('koffi');
const lib  = koffi.load('C:\\Windows\\System32\\capi2032.dll');
const lib2 = koffi.load('C:\\Windows\\System32\\capi2032.dll');

const REG     = lib.func('uint32 CAPI_REGISTER(uint32,uint32,uint32,uint32,uint32 *out)');
const PUT     = lib.func('uint32 CAPI_PUT_MESSAGE(uint32, uint8 *)');
const GET_PTR = lib.func('uint32 CAPI_GET_MESSAGE(uint32, void **out)');  // for AppID probe
const GET_BUF = lib2.func('uint32 CAPI_GET_MESSAGE(uint32, uint8 *)');   // raw buffer approach

const idOut=[0];
const r=REG(4096,2,7,2048,idOut);
console.log('REGISTER=0x'+r.toString(16));
let appId=idOut[0];
if(!appId){for(let i=1;i<=16;i++){const p=[null];if(GET_PTR(i,p)===0x1104){appId=i;break;}}}
console.log('AppID='+appId);

// Send LISTEN_REQ
const req=Buffer.alloc(26,0);
req.writeUInt16LE(26,0);req.writeUInt16LE(appId,2);req.writeUInt8(5,4);
req.writeUInt8(0x80,5);req.writeUInt16LE(1,6);req.writeUInt32LE(1,8);
req.writeUInt32LE(0xFFFF,12);req.writeUInt32LE(0x1FFF03FF,16);
console.log('PUT_LISTEN=0x'+PUT(appId,req).toString(16));

const t=Date.now();let n=0;
(function poll(){
  if(Date.now()-t>10000){console.log('Timeout ('+n+' polls)');process.exit(0);}
  n++;
  // Fill with 0xAA so we can detect any DLL writes
  const msgBuf = Buffer.alloc(512, 0xAA);
  const g = GET_BUF(appId, msgBuf);
  if(g===0x1104||g===0x1101){setTimeout(poll,20);return;}
  console.log('GET_BUF ret=0x'+g.toString(16));
  if(g===0){
    const first32 = msgBuf.slice(0,32).toString('hex');
    console.log('buf[0..31]: '+first32);
    // Check if it looks like a direct CAPI message
    const msgLen = msgBuf.readUInt16LE(0);
    const msgAppId = msgBuf.readUInt16LE(2);
    const cmd = msgBuf[4]; const sub = msgBuf[5];
    console.log('  as message: len='+msgLen+' appId='+msgAppId+' cmd=0x'+cmd.toString(16)+' sub=0x'+sub.toString(16));
    // Check if first 8 bytes look like a pointer (non-zero, not 0xAAAA...)
    const lo = msgBuf.readUInt32LE(0); const hi = msgBuf.readUInt32LE(4);
    if(lo!==0xAAAAAAAA||hi!==0xAAAAAAAA){
      console.log('  as pointer: 0x'+hi.toString(16).padStart(8,'0')+lo.toString(16).padStart(8,'0'));
    } else {
      console.log('  buf unchanged (DLL did not write to our buffer)');
    }
  }
  setTimeout(poll,20);
})();
