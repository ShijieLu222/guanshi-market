import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});await mkdir('work-generated',{recursive:true});
const js=await build({entryPoints:['src/main.jsx'],bundle:true,minify:true,write:false,format:'iife',target:'es2022',define:{'process.env.NODE_ENV':'"production"'}});
const css=(await readFile('src/style.css','utf8'))+'\n'+(await readFile('src/theme.css','utf8'));
const html=`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#0c1014"><meta name="description" content="观市：黄金、白银人民币克价与全球科技股票行情，支持卡片排序、分时走势、涨跌热力图和透明的数据时间。"><title>观市 · 全球资产看板</title><link rel="icon" href="/favicon.svg"><style>${css}</style><script>try{document.documentElement.dataset.theme=JSON.parse(localStorage.getItem('guanshi-theme'))==='light'?'light':'dark'}catch{}</script></head><body><div id="root"></div><script>${js.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
await writeFile('work-generated/page.html',html);
await build({entryPoints:['server/worker.js'],bundle:true,minify:true,format:'esm',platform:'browser',target:'es2022',outfile:'dist/server/index.js',loader:{'.html':'text'}});
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');console.log('Built React UI and Worker API.');
