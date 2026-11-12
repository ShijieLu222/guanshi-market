export const STOCKS = [
  {symbol:'NVDA',name:'英伟达',en:'NVIDIA',logo:'N',color:'#91c844',sector:'算力',market:'NASDAQ'},
  {symbol:'SPCX',name:'SpaceX',en:'SpaceX',logo:'X',color:'#e2e8f0',sector:'航天',market:'NASDAQ'},
  {symbol:'000660.KS',name:'SK 海力士',en:'SK hynix',logo:'SK',color:'#f06c5f',sector:'存储',market:'KRX'},
  {symbol:'SNDK',name:'闪迪',en:'Sandisk',logo:'S',color:'#e35566',sector:'存储',market:'NASDAQ'},
  {symbol:'MU',name:'美光',en:'Micron',logo:'μ',color:'#75a7ff',sector:'存储',market:'NASDAQ'},
  {symbol:'WDC',name:'西部数据',en:'Western Digital',logo:'WD',color:'#70a5ee',sector:'存储',market:'NASDAQ'},
  {symbol:'AMD',name:'AMD',en:'Advanced Micro Devices',logo:'↗',color:'#e38d70',sector:'算力',market:'NASDAQ'},
  {symbol:'INTC',name:'英特尔',en:'Intel',logo:'in',color:'#5ac1ef',sector:'算力',market:'NASDAQ'},
  {symbol:'AAPL',name:'苹果',en:'Apple',logo:'a',color:'#c4cedb',sector:'科技',market:'NASDAQ'},
  {symbol:'GOOGL',name:'谷歌',en:'Alphabet · A 类',logo:'G',color:'#7eacee',sector:'科技',market:'NASDAQ'},
  {symbol:'MSFT',name:'微软',en:'Microsoft',logo:'⊞',color:'#75c6ac',sector:'科技',market:'NASDAQ'},
  {symbol:'META',name:'Meta',en:'Meta Platforms',logo:'∞',color:'#6d9fff',sector:'科技',market:'NASDAQ'},
  {symbol:'AMZN',name:'亚马逊',en:'Amazon',logo:'a',color:'#e8ac60',sector:'科技',market:'NASDAQ'},
  {symbol:'TSLA',name:'特斯拉',en:'Tesla',logo:'T',color:'#e35b66',sector:'科技',market:'NASDAQ'},
  {symbol:'LITE',name:'Lumentum',en:'Lumentum Holdings',logo:'L',color:'#b18be9',sector:'算力',market:'NASDAQ'},
];
export const OUNCE_GRAMS=31.1034768;
export const isFiniteNumber=x=>typeof x==='number'&&Number.isFinite(x);
export function yuanPerGram(usd,rate){return isFiniteNumber(usd)&&usd>0&&isFiniteNumber(rate)&&rate>0?usd*rate/OUNCE_GRAMS:null}
export function cleanOrder(saved){const defaults=STOCKS.map(x=>x.symbol);return [...new Set([...(Array.isArray(saved)?saved.filter(x=>defaults.includes(x)):[]),...defaults])];}
export function moveItem(order,from,to){const next=[...order],i=next.indexOf(from),j=next.indexOf(to);if(i<0||j<0)return next;next.splice(i,1);next.splice(j,0,from);return next;}
export function mergeQuoteEntry(previous,data,requestMs,now=Date.now()){
 const old=previous?.data;
 if(old&&Date.parse(data.quoteAt)<Date.parse(old.quoteAt))return {...previous,error:'新响应早于已有报价，保留较新数据',failedAt:now,requestMs};
 if(!data.marketCap&&old?.marketCap)data={...data,marketCap:old.marketCap,marketCapCurrency:old.marketCapCurrency,marketCapSource:old.marketCapSource,marketCapRetrievedAt:old.marketCapRetrievedAt};
 return {data,error:null,receivedAt:now,requestMs};
}
