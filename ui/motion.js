'use strict';
// Presentation only. No network, task dispatch, progress estimation or production writes.
(()=>{
 const preference=matchMedia('(prefers-reduced-motion: reduce)'),running=new Map();
 let input='pointer';document.documentElement.dataset.input=input;
 addEventListener('pointerdown',()=>{input='pointer';document.documentElement.dataset.input=input;},true);
 addEventListener('keydown',()=>{input='keyboard';document.documentElement.dataset.input=input;},true);
 const curve='cubic-bezier(0.23, 1, 0.32, 1)';
 function reveal(el,{duration=180,distance=4,delay=0,gesture=false}={}){
  if(!el||typeof el.animate!=='function')return;
  if(gesture&&input==='keyboard'){running.get(el)?.cancel();running.delete(el);return;}
  const old=running.get(el),current=old?getComputedStyle(el):null;
  const opacity=old?current.opacity:.65,transform=old?current.transform:`translateY(${distance}px)`;
  old?.cancel();
  const first=preference.matches?{opacity}:{opacity,transform};
  const last=preference.matches?{opacity:1}:{opacity:1,transform:'none'};
  const a=el.animate([first,last],{duration:preference.matches?100:duration,delay:preference.matches?0:delay,easing:curve});running.set(el,a);
  const done=()=>{if(running.get(el)===a)running.delete(el);};a.onfinish=done;a.oncancel=done;
 }
 function swap(el,html,{gesture=false,animate=true}={}){if(el.innerHTML===html)return false;const had=!!el.innerHTML;el.innerHTML=html;if(had&&animate)reveal(el,{gesture,duration:160,distance:3});return true;}
 preference.addEventListener('change',()=>{for(const a of running.values())a.cancel();running.clear();});
 document.addEventListener('visibilitychange',()=>{document.documentElement.classList.toggle('page-hidden',document.hidden);});
 window.WorkbenchMotion={reveal,swap,get reduced(){return preference.matches;},get keyboard(){return input==='keyboard';},curve};
})();
