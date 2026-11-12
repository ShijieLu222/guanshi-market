// One independent loop per instrument: a slow source cannot stop other cards.
export function startQuotePoll({fetchQuote,interval,onStart=()=>{},onResult=()=>{},onError=()=>{},onSchedule=()=>{},now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout,timeoutMs=18000}){
 let stopped=false,timer=null,deadline=null,controller=null;
 const run=async()=>{
  if(stopped)return;
  controller=new AbortController();const started=now();onStart(started);
  deadline=setTimer(()=>controller?.abort(),timeoutMs);
  try{const data=await fetchQuote(controller.signal);if(!stopped)onResult(data,now()-started)}
  catch(error){if(!stopped)onError(error)}
  finally{clearTimer(deadline);deadline=null;controller=null;if(!stopped){const delay=Math.max(1000,interval-(now()-started));onSchedule(now()+delay);timer=setTimer(run,delay)}}
 };
 run();return()=>{stopped=true;if(timer!==null)clearTimer(timer);if(deadline!==null)clearTimer(deadline);controller?.abort()};
}
