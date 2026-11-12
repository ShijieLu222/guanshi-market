import html from '../work-generated/page.html';
import {ALLOWED,completeStock,metal} from './data.js';
const inFlight=new Map();
const memory=new Map();
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
async function quote(symbol,kind,ctx,url){
 const key=kind+symbol,ttl=kind==='metal'?30000:symbol==='CNY=X'?30000:15000;
 const cached=memory.get(key);if(cached&&Date.now()<cached.until)return cached.data;
 if(inFlight.has(key))return inFlight.get(key);
 const promise=(async()=>{
  const edgeKey=new Request(new URL(`/cache/${kind}/${encodeURIComponent(symbol)}`,url).href);
  const edge=globalThis.caches?.default;
  if(edge){const hit=await edge.match(edgeKey);if(hit){const body=await hit.json();if(Date.now()-Date.parse(body.fetchedAt)<ttl && (kind!=='metal'||Date.now()-Date.parse(body.quoteAt)<30000)){memory.set(key,{data:body,until:kind==='metal'?Math.min(Date.parse(body.fetchedAt)+ttl,Date.parse(body.quoteAt)+30000):Date.parse(body.fetchedAt)+ttl});return body}}}
  const data=await(kind==='metal'?metal(symbol):completeStock(symbol));
  const validMs=kind==='metal'?Math.max(1000,Math.min(ttl,Date.parse(data.quoteAt)+30000-Date.now())):ttl;
  memory.set(key,{data,until:Date.now()+validMs});
  if(edge&&ctx?.waitUntil)ctx.waitUntil(edge.put(edgeKey,new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json','Cache-Control':`public, max-age=${Math.ceil(validMs/1000)}`}})));
  return data;
 })();inFlight.set(key,promise);try{return await promise}finally{inFlight.delete(key)}
}
export default {async fetch(request,env,ctx){
 const url=new URL(request.url);
 if(request.method!=='GET')return json({error:'Method not allowed'},405);
 if(url.pathname==='/api/quote'){
  const symbol=url.searchParams.get('symbol'),kind=url.searchParams.get('kind');
  if(!['metal','stock'].includes(kind)||(kind==='metal'?!['XAU','XAG'].includes(symbol):!ALLOWED.has(symbol)))return json({error:'不支持的代码'},400);
  try{return json(await quote(symbol,kind,ctx,url))}catch{return json({symbol,error:'行情源暂时不可用，正在等待下次更新',fetchedAt:new Date().toISOString()},502)}
 }
 if(url.pathname==='/favicon.svg')return new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="13" fill="#141b20"/><path d="M8 33 18 20 26 27 39 12" fill="none" stroke="#dbb878" stroke-width="4"/></svg>',{headers:{'Content-Type':'image/svg+xml'}});
 if(url.pathname!=='/')return new Response('Not found',{status:404});
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
}};
