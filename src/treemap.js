import {hierarchy,treemap,treemapSquarify} from 'd3-hierarchy';
export function marketCapUsd(quote,krwRate){if(!(quote?.marketCap>0))return null;if(quote.marketCapCurrency==='USD')return quote.marketCap;if(quote.marketCapCurrency==='KRW'&&krwRate>0)return quote.marketCap/krwRate;return null}
export function marketLayout(stocks,entries,krwRate,width,height){
 const children=stocks.map(stock=>({stock,quote:entries[stock.symbol]?.data,value:marketCapUsd(entries[stock.symbol]?.data,krwRate)})).filter(x=>x.value>0);
 if(!children.length||width<=0||height<=0)return [];
 const root=hierarchy({children}).sum(d=>d.value||0).sort((a,b)=>b.value-a.value);
 treemap().tile(treemapSquarify).size([width,height]).padding(0).round(false)(root);
 return root.leaves().map(n=>({...n.data,x:n.x0,y:n.y0,w:n.x1-n.x0,h:n.y1-n.y0,share:n.value/root.value}));
}
