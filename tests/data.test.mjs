import test from 'node:test';import assert from 'node:assert/strict';
import {yuanPerGram,OUNCE_GRAMS,cleanOrder,moveItem,STOCKS} from '../src/instruments.js';
import {normalizeChart,normalizeMetal,ALLOWED} from '../server/data.js';
test('金衡盎司换算与无效汇率',()=>{assert.equal(yuanPerGram(OUNCE_GRAMS,7),7);for(const bad of [null,undefined,0,-1,NaN,Infinity])assert.equal(yuanPerGram(3000,bad),null)});
test('排序修复损坏及过时数据，仍保留所有13只股票',()=>{const order=cleanOrder(['AMD','AMD','INVALID']);assert.equal(order[0],'AMD');assert.equal(order.length,13);assert.deepEqual(new Set(order),new Set(STOCKS.map(x=>x.symbol)));assert.equal(cleanOrder({}).length,13);assert.deepEqual(moveItem(['A','B','C'],'A','C'),['B','C','A']);assert.deepEqual(moveItem(['A','B'],'X','A'),['A','B'])});
const now=Date.parse('2026-11-12T15:00:00Z');
const fixture={chart:{result:[{meta:{symbol:'NVDA',regularMarketPrice:120,regularMarketTime:now/1000-10,previousClose:100,currency:'USD',currentTradingPeriod:{regular:{start:now/1000-1000,end:now/1000+1000}}},timestamp:[now/1000-60,now/1000-30,now/1000],indicators:{quote:[{close:[118,null,120]}]}}]}};
test('报价与日涨跌、时段和真实曲线规范化',()=>{const q=normalizeChart(fixture,'NVDA',now);assert.equal(q.changePercent,20);assert.equal(q.marketState,'open');assert.equal(q.points.length,2);assert.equal(q.quoteAt,'2026-11-12T14:59:50.000Z');assert.equal(normalizeChart(fixture,'NVDA',now+3600000).marketState,'closed')});
test('拒绝错标、无效与未来报价，不填充假数据',()=>{assert.throws(()=>normalizeChart(fixture,'AMD',now));assert.throws(()=>normalizeChart({},'NVDA',now));assert.throws(()=>normalizeMetal({symbol:'XAU',price:3000,updatedAt:'not-date'},'XAU',now));assert.throws(()=>normalizeMetal({symbol:'XAU',price:3000,updatedAt:'2027-01-01T00:00:00Z'},'XAU',now));assert.equal(ALLOWED.has('https://example.com'),false)});
test('韩股明确延迟20分钟',()=>{const f=structuredClone(fixture);f.chart.result[0].meta.symbol='000660.KS';f.chart.result[0].meta.currency='KRW';assert.equal(normalizeChart(f,'000660.KS',now).delayMinutes,20)});

import {parseQuotePage,applyLatest} from '../server/data.js';
test('隔夜价选择对应时间戳，涨跌基于最近常规收盘',()=>{
 const base=normalizeChart(fixture,'NVDA',now),q={symbol:'NVDA',currency:'USD',regularMarketPrice:120,regularMarketTime:now/1000-1000,overnightMarketPrice:110,overnightMarketTime:now/1000-10,regularMarketPreviousClose:100,marketCap:3e12};
 const latest=applyLatest(base,q,now);assert.equal(latest.price,110);assert.equal(latest.regularPrice,120);assert.equal(latest.change,-10);assert.equal(latest.changePercent,-10/120*100);assert.equal(latest.session,'隔夜');assert.equal(latest.quoteAt,'2026-11-12T14:59:50.000Z');assert.equal(latest.marketCap,3e12);
 q.preMarketPrice=115;q.preMarketTime=now/1000-5;assert.equal(applyLatest(base,q,now).session,'盘前');
 q.overnightMarketTime=now/1000+600;assert.equal(applyLatest(base,q,now).session,'盘前');
});
test('公开页结构化报价只读取目标代码，并匹配新价格及时间',()=>{
 const one={quoteSummary:{result:[{price:{symbol:'NVDA',currency:'USD',marketCap:{raw:3e12},overnightMarketPrice:{raw:110},overnightMarketTime:100}}]}};
 const two={quoteResponse:{result:[{symbol:'AMD',overnightMarketPrice:{raw:900},overnightMarketTime:1000},{symbol:'NVDA',overnightMarketPrice:{raw:112},overnightMarketTime:{raw:200}}]}};
 const html=[one,two].map(d=>`<script type="application/json">${JSON.stringify({body:JSON.stringify(d)})}</script>`).join('');
 const q=parseQuotePage(html,'NVDA');assert.equal(q.overnightMarketPrice,112);assert.equal(q.overnightMarketTime,200);assert.equal(q.marketCap,3e12);assert.throws(()=>parseQuotePage(html,'META'));
});
import {mergeQuoteEntry} from '../src/instruments.js';
test('扩展源中断或旧响应不能让最新报价倒退',()=>{const old={data:{price:161,quoteAt:'2026-11-12T07:00:00Z',marketCap:4e12,marketCapCurrency:'USD',marketCapRetrievedAt:'2026-11-12T07:00:00Z'}};const stale={price:173,quoteAt:'2026-11-11T21:00:00Z'};const result=mergeQuoteEntry(old,stale,100);assert.equal(result.data.price,161);assert.ok(result.error);const fresh=mergeQuoteEntry(old,{price:162,quoteAt:'2026-11-12T07:01:00Z'},100);assert.equal(fresh.data.marketCap,4e12);assert.equal(fresh.data.marketCapRetrievedAt,old.data.marketCapRetrievedAt)});
