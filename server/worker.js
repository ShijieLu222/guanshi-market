import html from '../work-generated/page.html';
import {ALLOWED,completeStock,metal,indexQuote} from './data.js';
const memory=new Map();
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
async function quote(symbol,kind,ctx,url){
 const key=kind+symbol,ttl=kind==='metal'?30000:symbol==='CNY=X'?15000:symbol==='KRW=X'?30000:5000;
 const cached=memory.get(key);if(cached&&Date.now()<cached.until)return cached.data;
 // Cache completed data only. A promise started by another Worker request can
 // stop progressing when its client disconnects; reusing it blocks all retries.
  const data=await(kind==='metal'?metal(symbol):symbol==='^NDX'?indexQuote():completeStock(symbol));
  const validMs=kind==='metal'?Math.max(1000,Math.min(ttl,Date.parse(data.quoteAt)+30000-Date.now())):ttl;
  memory.set(key,{data,until:Date.now()+validMs});

  return data;
}
export default {async fetch(request,env,ctx){
 const url=new URL(request.url);
 if(request.method!=='GET')return json({error:'Method not allowed'},405);
 if(url.pathname==='/api/quote'){
  const symbol=url.searchParams.get('symbol'),kind=url.searchParams.get('kind');
  if(!['metal','stock'].includes(kind)||(kind==='metal'?!['XAU','XAG'].includes(symbol):!ALLOWED.has(symbol)))return json({error:'不支持的代码'},400);
  try{return json(await quote(symbol,kind,ctx,url))}catch(e){console.error('quote-fetch',symbol,String(e?.message||e).slice(0,160));return json({symbol,error:'行情源暂时不可用，正在等待下次更新',fetchedAt:new Date().toISOString()},502)}
 }
 if(url.pathname==='/favicon.svg')return new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="13" fill="#141b20"/><path d="M8 33 18 20 26 27 39 12" fill="none" stroke="#dbb878" stroke-width="4"/></svg>',{headers:{'Content-Type':'image/svg+xml'}});
 if(url.pathname!=='/')return new Response('Not found',{status:404});
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
}};
