/* Shared presentation only: viewport sizing and explicit pages. No engine/save access. */
(() => {
  const $=s=>document.querySelector(s), wide=()=>window.innerWidth>window.innerHeight;
  let handPage=0, handSignature='', effectSource=null, pageCount=1, usableHeight=window.innerHeight;
  const viewport=()=>{const v=window.visualViewport;if(v&&Math.abs((v.scale||1)-1)>.02)return;const h=Math.min(window.innerHeight||9999,v?.height||9999);if(h>0&&h<9999){usableHeight=Math.floor(h);document.documentElement.style.setProperty('--app-height',`${usableHeight}px`);}};
  const btn=(text,aria,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',aria);b.addEventListener('click',fn);return b;};
  const navFor=(label,count,show)=>{const nav=document.createElement('nav');nav.className='page-nav';nav.setAttribute('aria-label',label);let index=0;const prev=btn('‹',`${label} 前のページ`,()=>set(index-1)),next=btn('›',`${label} 次のページ`,()=>set(index+1)),out=document.createElement('output');nav.append(prev,out,next);function set(n){index=Math.max(0,Math.min(count-1,n));out.textContent=`${index+1}/${count}`;prev.disabled=index===0;next.disabled=index===count-1;show(index);}set(0);nav.hidden=count<=1;return {nav,set};};
  function splitText(text,limit){const parts=[];for(const sentence of text.match(/[^。]+。?|。/g)||[]){let rest=sentence;while(rest.length>limit){parts.push(rest.slice(0,limit));rest=rest.slice(limit);}if(!rest)continue;if(parts.length&&parts.at(-1).length+rest.length<=limit)parts[parts.length-1]+=rest;else parts.push(rest);}return parts;}
  function pageGroups(element,count){const children=[...element.children],groups=[];for(let i=0;i<children.length;i+=count){const shell=element.cloneNode(false);shell.removeAttribute('id');shell.append(...children.slice(i,i+count));groups.push(shell);}return groups;}
  function makePages(inner,groups,label,actions,host=null){actions.querySelectorAll(':scope>.page-nav').forEach(n=>n.remove());if(!groups.length)groups=[document.createElement('div')];const pages=host||document.createElement('div');pages.replaceChildren();pages.className='dialog-pages';groups.forEach(g=>{const page=document.createElement('section');page.className='dialog-page';page.append(g);pages.append(page);});const visible=[...pages.children];const n=navFor(label,visible.length,index=>visible.forEach((p,i)=>p.hidden=i!==index));actions.prepend(n.nav);inner.insertBefore(pages,actions);return pages;}
  function setupStory(){const dialog=$('#storyDialog'),inner=$('#storyBody>.dialog-inner');if(!inner||inner.dataset.paged)return;inner.dataset.paged='true';const phase=dialog.dataset.phase||'intro',title=inner.querySelector('h2'),eyebrow=inner.querySelector(':scope>.eyebrow'),actions=inner.querySelector(':scope>.actions'),head=document.createElement('header');head.className='dialog-title';head.append(title);eyebrow?.remove();inner.prepend(head);const content=[...inner.children].filter(x=>x!==head&&x!==actions),groups=[],notes=[];const special=content.find(x=>x.matches('.origin-grid,.reward-grid,.choices,.recap'));
    if(phase==='intro'){
      const warning=content.filter(x=>x.matches('.journey-note'));if(warning.length){const p=document.createElement('p');p.className='story-warning';p.textContent=warning.some(x=>x.textContent.includes('引き継'))?'以前の保存を引継げます。新しい旅は現在の保存を上書きします。':'新しい旅は現在の保存を上書きします。';head.append(p);}
      groups.push(special);content.filter(x=>x!==special).forEach(x=>{if(x.tagName!=='IMG')notes.push(x);});
    }else if(special){
      if(special.matches('.reward-grid'))groups.push(...pageGroups(special,4));else groups.push(special);
      content.filter(x=>x!==special).forEach(x=>{if(x.tagName!=='IMG')notes.push(x);});
    }else content.forEach(x=>{if(x.tagName!=='IMG')groups.push(x);});
    for(const node of [...groups,...notes])node?.remove();for(const node of content)node.remove();
    if(phase!=='intro'&&special){const context=notes.find(x=>x.tagName==='P');if(context){notes.splice(notes.indexOf(context),1);const group=document.createElement('div');group.className='choice-with-context';group.append(context,groups.shift());groups.unshift(group);}}
    for(const note of notes){if(note.matches('.result-stat')){const group=document.createElement('div');group.className='choice-with-context';group.append(note,groups.shift());groups.unshift(group);}else groups.push(note);}
    makePages(inner,groups.filter(Boolean),phase==='intro'?'護符と説明':'選択と説明',actions);
  }
  function setupDialog(id){if(id==='storyDialog'){setupStory();return;}const d=$('#'+id),inner=d?.querySelector('.dialog-inner');if(!inner||!d.open)return;let list=id==='catalogDialog'?$('#catalogList'):id==='deckDialog'?$('#deckList'):id==='helpDialog'?$('#helpBody'):null;
    // Game handlers replace the list; if the existing pager survives, it already owns these nodes.
    if(inner.dataset.paged&&(!list||list.querySelector(':scope>.dialog-page')))return;
    const title=inner.querySelector('h2'),actions=inner.querySelector('.actions');if(!title||!actions)return;
    // Previous wrappers contain only old presentation nodes. Preserve the newly rendered list.
    if(list)list.remove();title.remove();actions.remove();inner.replaceChildren();inner.append(title,actions);const groups=[];
    if(list){list.dataset.paged='true';if(id==='catalogDialog')groups.push(...pageGroups(list,4));else if(id==='deckDialog')groups.push(...pageGroups(list,2));else{
      const pieces=[...list.children].flatMap(e=>e.tagName==='SECTION'?[...e.children]:[e]);for(const p of pieces){if(p.tagName==='H3')continue;groups.push(p);}if(!groups.length)groups.push(list);
    }}else return;
    inner.dataset.paged='true';makePages(inner,groups,id==='catalogDialog'?'図鑑':id==='deckDialog'?'デッキ':'遊び方',actions,list);
  }
  function effects(){const review=$('#cardReview'),panel=$('#cardPanel');if(!review||panel.hidden)return;
    const fresh=review.querySelector('.panel-description');if(fresh)effectSource={description:fresh.textContent,cue:review.querySelector('.current-effect')?.textContent||'',warning:review.querySelector('.panel-warning')?.textContent||'',limit:0};if(!effectSource)return;
    const width=Math.min(review.clientWidth||9999,Math.max(260,window.innerWidth-250)),chars=Math.max(36,Math.floor(width/12)*3-8);if(!fresh&&effectSource.limit===chars&&review.querySelector('.effect-pages'))return;effectSource.limit=chars;
    $('#cardPanel .effect-nav')?.remove();const {description,cue,warning}=effectSource,texts=[...splitText(cue+(warning||''),chars),...splitText(description,chars)].filter(Boolean);const body=document.createElement('div');body.className='effect-pages';texts.forEach((text,i)=>{const p=document.createElement('p');p.className='effect-page'+(i===0&&cue?' current-effect':'');p.textContent=text;p.hidden=i!==0;body.append(p);});const header=review.querySelector('.panel-card-header');review.replaceChildren(...(header?[header]:[]),body);
    if(texts.length>1){let index=0;const nav=document.createElement('div');nav.className='effect-nav';const next=btn('次の説明','カード効果の次のページ',()=>{index=(index+1)%texts.length;[...body.children].forEach((p,i)=>p.hidden=i!==index);next.textContent=`${index+1}/${texts.length} ›`;});next.textContent=`1/${texts.length} ›`;nav.append(next);$('#cardPanel .panel-actions').append(nav);}
  }
  function refreshHand(selected=null){const compact=wide()&&usableHeight<=320;document.body.classList.toggle('compact-layout',compact);document.body.classList.toggle('short-layout',wide()&&usableHeight<=360);const future=$('#futureIntent');if(future){if(compact)$('.masthead>div').append(future);else $('.game').insertBefore(future,$('.table'));}
    const hand=$('#hand');if(!hand)return;const items=[...hand.querySelectorAll(':scope>.hand-item')];const signature=items.map(x=>x.querySelector('[data-card]')?.getAttribute('aria-label')).join('|');if(signature!==handSignature){handSignature=signature;handPage=0;}pageCount=Math.max(1,Math.ceil(items.length/6));if(selected!==null)handPage=Math.floor(selected/6);handPage=Math.min(handPage,pageCount-1);
    let pager=$('#handPages');if(!pager){pager=document.createElement('nav');pager.id='handPages';pager.className='page-nav hand-pager';pager.setAttribute('aria-label','手札のページ');$('.controls').insertBefore(pager,$('#deckButton'));}
    const set=n=>{handPage=Math.max(0,Math.min(pageCount-1,n));items.forEach((x,i)=>x.hidden=wide()&&Math.floor(i/6)!==handPage);hand.style.setProperty('--hand-columns',Math.max(1,Math.min(6,items.length-handPage*6)));};
    pager.replaceChildren();const prev=btn('‹','前の手札',()=>{document.dispatchEvent(new CustomEvent('shinka:handpage'));set(handPage-1);refreshHand();($('#handPages button:not(:disabled)')||$('#endTurn')).focus({preventScroll:true});}),next=btn('›','次の手札',()=>{document.dispatchEvent(new CustomEvent('shinka:handpage'));set(handPage+1);refreshHand();($('#handPages button:last-child:not(:disabled)')||$('#handPages button:not(:disabled)')||$('#endTurn')).focus({preventScroll:true});}),out=document.createElement('output');out.textContent=`${handPage+1}/${pageCount}`;prev.disabled=handPage===0;next.disabled=handPage===pageCount-1;pager.append(prev,out,next);pager.hidden=pageCount<=1||!wide();set(handPage);effects();
  }
  function refresh(selected=null){viewport();setupStory();refreshHand(selected);}
  const relicStatus=$('#relicStatus');if(relicStatus)$('.hero-hud').append(relicStatus);
  window.ShinkaLayout=Object.freeze({refresh,refreshHand,setupDialog});
  document.addEventListener('click',ev=>{const id=ev.target.closest('button')?.id;if(['helpButton','installApp','deckButton','catalogButton'].includes(id))queueMicrotask(()=>{for(const d of ['helpDialog','deckDialog','catalogDialog'])setupDialog(d);});});
  window.addEventListener('resize',()=>{viewport();refreshHand();});window.visualViewport?.addEventListener('resize',()=>{viewport();refreshHand();});viewport();
})();
