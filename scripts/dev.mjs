import http from 'node:http';
import worker from '../dist/server/index.js';
const port=Number(process.env.PORT||4173);
http.createServer(async(req,res)=>{try{const r=await worker.fetch(new Request(`http://localhost:${port}${req.url}`),{}, {waitUntil:p=>p.catch(console.error)});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));}catch(e){console.error(e);res.writeHead(500);res.end('Server error')}}).listen(port,'127.0.0.1',()=>console.log(`Local: http://localhost:${port}`));
