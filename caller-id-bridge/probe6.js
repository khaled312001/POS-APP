'use strict';
const koffi = require('koffi');
const lib      = koffi.load('C:\\Windows\\System32\\capi2032.dll');
const lib2     = koffi.load('C:\\Windows\\System32\\capi2032.dll');
const kernel32 = koffi.load('kernel32.dll');

const REG       = lib.func('uint32 CAPI_REGISTER(uint32,uint32,uint32,uint32,uint32 *out)');
const PUT       = lib.func('uint32 CAPI_PUT_MESSAGE(uint32, uint8 *)');
const GET_PROBE = lib.func('uint32 CAPI_GET_MESSAGE(uint32, void **out)');
const GET_BUF   = lib2.func('uint32 CAPI_GET_MESSAGE(uint32, uint8 *)');

const GetCurrentProcess  = kernel32.func('void *GetCurrentProcess()');
const ReadProcessMemory  = kernel32.func('bool ReadProcessMemory(void *, uintptr, uint8 *, uint32, uint32 *out)');

const hProc = GetCurrentProcess();
console.log('hProc OK');

// Register
const idOut=[0];
const r=REG(4096,2,7,2048,idOut);
console.log('REGISTER=0x'+r.toString(16));
let appId=idOut[0];
if(!appId){for(let i=1;i<=16;i++){const p=[null];if(GET_PROBE(i,p)===0x1104){appId=i;break;}}}
console.log('AppID='+appId);

// LISTEN_REQ
const req=Buffer.alloc(26,0);
req.writeUInt16LE(26,0);req.writeUInt16LE(appId,2);req.writeUInt8(5,4);
req.writeUInt8(0x80,5);req.writeUInt16LE(1,6);req.writeUInt32LE(1,8);
req.writeUInt32LE(0xFFFF,12);req.writeUInt32LE(0x1FFF03FF,16);
console.log('PUT_LISTEN=0x'+PUT(appId,req).toString(16));

const t=Date.now(); let n=0;
(function poll(){
  if(Date.now()-t>10000){console.log('Timeout ('+n+' polls)');process.exit(0);}
  n++;
  const ptrHolder = Buffer.alloc(8, 0);
  const g = GET_BUF(appId, ptrHolder);
  if(g===0x1104||g===0x1101){setTimeout(poll,20);return;}
  console.log('GET ret=0x'+g.toString(16));
  if(g===0){
    const ptrLo = ptrHolder.readUInt32LE(0);
    const ptrHi = ptrHolder.readUInt32LE(4);
    const ptrNum = ptrHi * 0x100000000 + ptrLo;
    console.log('msg ptr=0x'+ptrHi.toString(16).padStart(8,'0')+ptrLo.toString(16).padStart(8,'0'));
    if(ptrNum !== 0){
      const msgBuf = Buffer.alloc(64, 0);
      const nRead = [0];
      const ok = ReadProcessMemory(hProc, ptrNum, msgBuf, 64, nRead);
      console.log('ReadProcessMemory ok='+ok+' nRead='+nRead[0]);
      if(ok){
        const actual = Math.min(nRead[0]||16, 64);
        console.log('MSG HEX: '+msgBuf.slice(0,actual).toString('hex'));
        const len=msgBuf.readUInt16LE(0);
        const cmd=msgBuf[4]; const sub=msgBuf[5];
        console.log('  len='+len+' cmd=0x'+cmd.toString(16)+' sub=0x'+sub.toString(16));
      }
    }
  }
  setTimeout(poll,20);
})();
