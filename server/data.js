import {STOCKS,isFiniteNumber} from '../src/instruments.js';
export const ALLOWED=new Set([...STOCKS.map(s=>s.symbol),'CNY=X','KRW=X']);
const positive=x=>isFiniteNumber(x)&&x>0;
export function normalizeChart(data,symbol,now=Date.now()){
 const result=data?.chart?.result?.[0],m=result?.meta;
 if(!m||m.symbol!==symbol||!positive(m.regularMarketPrice)||!positive(m.regularMarketTime))throw Error('行情数据不完整');
 const at=m.regularMarketTime*1000;if(at>now+120000)throw Error('报价时间异常');
 const prev=m.previousClose??m.chartPreviousClose,change=positive(prev)?m.regularMarketPrice-prev:null;
 const period=m.currentTradingPeriod?.regular;
 const state=period&&now/1000>=period.start&&now/1000<period.end?'open':'closed';
 const close=result.indicators?.quote?.[0]?.close??[];
 const points=(result.timestamp??[]).map((t,i)=>({t:t*1000,v:close[i]})).filter(p=>positive(p.v)&&positive(p.t)&&p.t<=now+120000);
 return {symbol,price:m.regularMarketPrice,currency:m.currency,previousClose:positive(prev)?prev:null,change,changePercent:change!==null?change/prev*100:null,quoteAt:new Date(at).toISOString(),fetchedAt:new Date(now).toISOString(),source:'Yahoo Finance',sourceUrl:`https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/`,delayMinutes:symbol==='000660.KS'?20:null,latencyLabel:symbol==='000660.KS'?'公开源约延迟 20 分钟':symbol==='CNY=X'?'公开汇率 · 延迟未保证':'公开行情 · 延迟未保证',marketState:state,high:m.regularMarketDayHigh??null,low:m.regularMarketDayLow??null,volume:m.regularMarketVolume??null,points:points.filter((_,i)=>i%Math.max(1,Math.floor(points.length/90))===0||i===points.length-1),quoteTimeKind:'市场报价时间'};
}
async function fetchJson(url){const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (compatible; MarketDashboard/1.0)','Accept':'application/json'},signal:AbortSignal.timeout(6500)});if(!r.ok)throw Error(`行情源 HTTP ${r.status}`);return r.json();}
export async function stock(symbol){let last;for(const host of ['query2','query1']){try{return normalizeChart(await fetchJson(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d&includePrePost=true`),symbol);}catch(e){last=e}}throw last;}
export function normalizeMetal(d,symbol,now=Date.now()){
 const at=Date.parse(d?.updatedAt);if(d?.symbol!==symbol||!positive(d.price)||!positive(at)||at>now+120000)throw Error('金属报价不完整');
 return {symbol,price:d.price,currency:'USD',quoteAt:new Date(at).toISOString(),fetchedAt:new Date(now).toISOString(),source:'Gold API',sourceUrl:'https://gold-api.com/faqs',latencyLabel:'源每 30 秒更新',quoteTimeKind:'数据源采集时间'};
}
export async function metal(symbol){return normalizeMetal(await fetchJson(`https://api.gold-api.com/price/${symbol}`),symbol);}

const raw=x=>x&&typeof x==='object'?x.raw:x;
export function parseQuotePage(html,symbol){
 const candidates=[];
 for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){
  try{const outer=JSON.parse(match[1]);if(typeof outer?.body!=='string')continue;const body=JSON.parse(outer.body);
   const p=body?.quoteSummary?.result?.[0]?.price;if(p?.symbol===symbol)candidates.push(p);
   for(const q of body?.quoteResponse?.result??[])if(q.symbol===symbol)candidates.push(q);
  }catch{}
 }
 if(!candidates.length)throw Error('公开行情页缺少结构化报价');
 // Different embedded modules can be a few seconds apart. Retain the newest field/time pair.
 const merged={symbol};
 for(const q of candidates){
  for(const key of ['currency','marketState','exchangeDataDelayedBy','marketCap','regularMarketPreviousClose','quoteSourceName'])if(q[key]!=null)merged[key]=raw(q[key]);
  for(const prefix of ['regularMarket','preMarket','postMarket','overnightMarket']){
   const t=raw(q[prefix+'Time']),p=raw(q[prefix+'Price']);
   if(positive(t)&&positive(p)&&(!merged[prefix+'Time']||t>=merged[prefix+'Time'])){merged[prefix+'Time']=t;merged[prefix+'Price']=p}
  }
 }
 return merged;
}
export function applyLatest(base,q,now=Date.now()){
 const labels={regularMarket:'常规',preMarket:'盘前',postMarket:'盘后',overnightMarket:'隔夜'};
 const candidates=Object.keys(labels).map(prefix=>({prefix,price:raw(q[prefix+'Price']),at:raw(q[prefix+'Time'])*1000})).filter(x=>positive(x.price)&&positive(x.at)&&x.at<=now+120000).sort((a,b)=>b.at-a.at);
 const latest=candidates[0];if(!latest)throw Error('未获得有效价格与时间');
 const regularPrice=raw(q.regularMarketPrice)??base.regularPrice??base.price;
 const regularAt=raw(q.regularMarketTime)?new Date(raw(q.regularMarketTime)*1000).toISOString():base.regularQuoteAt??base.quoteAt;
 const extended=latest.prefix!=='regularMarket';
 const previous=extended?regularPrice:(raw(q.regularMarketPreviousClose)??base.previousClose);
 const change=positive(previous)?latest.price-previous:null;
 const currency=q.currency??base.currency,cap=raw(q.marketCap);
 return {...base,price:latest.price,quoteAt:new Date(latest.at).toISOString(),currency,change,changePercent:change===null?null:change/previous*100,changeBasis:extended?'相对最近常规收盘':'相对前收盘',comparisonPrice:previous,regularPrice,regularQuoteAt:regularAt,session:labels[latest.prefix],sessionKey:latest.prefix,providerState:q.marketState??null,extended,extendedUnavailable:false,marketCap:positive(cap)?cap:null,marketCapCurrency:currency,marketCapRetrievedAt:new Date(now).toISOString(),marketCapSource:'Yahoo Finance 公司总市值',declaredDelayMinutes:raw(q.exchangeDataDelayedBy)??null,source:latest.prefix==='overnightMarket'?'Yahoo Finance · Blue Ocean ATS':'Yahoo Finance',marketState:latest.prefix==='regularMarket'?base.marketState:'extended',latencyLabel:base.symbol==='000660.KS'?'公开源约延迟 20 分钟':'公开行情 · 延迟未保证',quoteTimeKind:'市场报价时间',fetchedAt:new Date(now).toISOString()};
}
async function pageQuote(symbol){const r=await fetch(`https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/`,{headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error(`公开行情页 HTTP ${r.status}`);const html=await r.text();return parseQuotePage(html,symbol)}
export async function completeStock(symbol){
 if(symbol==='CNY=X'||symbol==='KRW=X')return stock(symbol);
 const [chart,page]=await Promise.allSettled([stock(symbol),pageQuote(symbol)]);
 let base=chart.status==='fulfilled'?chart.value:null;
 if(page.status==='fulfilled'){
  if(!base){const q=page.value;if(!positive(q.regularMarketPrice)||!positive(q.regularMarketTime))throw Error('缺少常规基准价');base={symbol,price:q.regularMarketPrice,quoteAt:new Date(q.regularMarketTime*1000).toISOString(),previousClose:q.regularMarketPreviousClose,currency:q.currency,marketState:'unknown',points:[],sourceUrl:`https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/`,delayMinutes:symbol==='000660.KS'?20:null};}
  return applyLatest(base,page.value);
 }
 if(base)return {...base,regularPrice:base.price,regularQuoteAt:base.quoteAt,session:'常规',sessionKey:'regularMarket',extendedUnavailable:true,changeBasis:'相对前收盘',marketCap:null,points:base.points};
 throw Error('行情暂时不可用');
}
