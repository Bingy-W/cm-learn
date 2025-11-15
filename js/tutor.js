function el(id){return document.getElementById(id)}

function getProfile(){
  try{
    const raw=localStorage.getItem('tutor_profile')
    return raw?JSON.parse(raw):{goal:'计算力学入门',level:'beginner'}
  }catch{return {goal:'计算力学入门',level:'beginner'}}
}

function saveProgress(entry){
  try{
    const raw=localStorage.getItem('tutor_progress')
    const arr=raw?JSON.parse(raw):[]
    arr.unshift({...entry, ts:Date.now()})
    localStorage.setItem('tutor_progress', JSON.stringify(arr.slice(0,100)))
  }catch{}
}

function addBlock(container, title, contentHtml){
  const wrap=document.createElement('div')
  wrap.className='mb-3'
  wrap.innerHTML=`<div class="fw-semibold mb-1">${title}</div>${contentHtml}`
  container.appendChild(wrap)
}

function renderTutorReply(data){
  const box=el('tutor-messages')
  box.innerHTML=''
  const {diagnostics=[], hints=[], explanation='', practice=[], citations=[]}=data||{}
  if(diagnostics.length){
    const html='<ul class="mb-0">'+diagnostics.map(d=>`<li>${d}</li>`).join('')+'</ul>'
    addBlock(box,'诊断问题',html)
  }
  if(hints.length){
    const html='<ol class="mb-0">'+hints.map(h=>`<li>${h}</li>`).join('')+'</ol>'
    addBlock(box,'逐步提示',html)
  }
  if(explanation){
    const html=`<div>${explanation.replace(/\n/g,'<br>')}</div>`
    addBlock(box,'核心讲解',html)
  }
  if(practice.length){
    const html=practice.map((p,i)=>{
      const aid=`practice-answer-${i}`
      return `<div class="mb-2"><div class="mb-1">${p.prompt}</div>
        <button class="btn btn-sm btn-outline-secondary" onclick="(function(){const a=document.getElementById('${aid}');a.style.display='block'})()">查看答案</button>
        <div id="${aid}" class="mt-1" style="display:none;">${p.answer||''}</div></div>`
    }).join('')
    addBlock(box,'微练习',html)
  }
  if(citations.length){
    const html='<ul class="mb-0">'+citations.map(c=>`<li><a href="${c.url}" target="_blank">${c.title||c.url}</a></li>`).join('')+'</ul>'
    addBlock(box,'参考资料',html)
  }
}

async function sendTutor(){
  const input=el('tutor-input')
  const msg=input.value.trim()
  if(!msg) return
  const mode=el('tutor-mode').value
  const level=el('tutor-level').value
  el('tutor-messages').innerHTML='<div class="text-muted">正在思考与组织教学结构...</div>'
  try{
    if(mode==='plan'){
      const resp=await fetch('/api/lesson-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg, level})})
      const data=await resp.json()
      if(!resp.ok){
        el('tutor-messages').innerHTML=`<div class="text-danger">服务暂不可用：${data.error||'unknown_error'}</div>`
        return
      }
      renderPlan(data)
    }else{
      const resp=await fetch('/api/tutor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg, mode, level, profile:getProfile()})})
      const data=await resp.json()
      if(!resp.ok){
        el('tutor-messages').innerHTML=`<div class="text-danger">服务暂不可用：${data.error||'unknown_error'}</div>`
        return
      }
      renderTutorReply(data)
    }
    saveProgress({q:msg, mode, level})
  }catch(e){
    el('tutor-messages').innerHTML='<div class="text-danger">请求失败，请稍后重试</div>'
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  const btn=el('tutor-send')
  if(btn){
    btn.addEventListener('click', sendTutor)
  }
  const input=el('tutor-input')
  if(input){
    input.addEventListener('keydown', (e)=>{
      if(e.key==='Enter') sendTutor()
    })
  }
  const header=el('tutorCanvasLabel')
  if(header){
    const wrongBtn=document.createElement('button')
    wrongBtn.className='btn btn-sm btn-outline-secondary ms-2'
    wrongBtn.textContent='错题本'
    wrongBtn.onclick=()=>renderWrong()
    header.parentElement?.appendChild(wrongBtn)
  }
})

function renderPlan(data){
  const box=el('tutor-messages')
  box.innerHTML=''
  const {plan={}, citations=[], tools=[]}=data||{}
  const {prerequisites=[], core=[], practice=[], consolidate=[]}=plan
  if(prerequisites.length){
    const html='<ol class="mb-0">'+prerequisites.map(x=>`<li>${x}</li>`).join('')+'</ol>'
    addBlock(box,'先修知识',html)
  }
  if(core.length){
    const html='<ol class="mb-0">'+core.map(x=>`<li>${x}</li>`).join('')+'</ol>'
    addBlock(box,'核心学习',html)
  }
  if(practice.length){
    const html='<ul class="mb-0">'+practice.map((p,i)=>{
      const id=`plan-practice-${i}`
      return `<li>${p} <button class="btn btn-sm btn-outline-secondary" onclick="(function(){addWrong('${id}','${p.replace(/"/g,'\"')}')})()">标记错题</button></li>`
    }).join('')+'</ul>'
    addBlock(box,'练习任务',html)
  }
  if(consolidate.length){
    const html='<ul class="mb-0">'+consolidate.map(x=>`<li>${x}</li>`).join('')+'</ul>'
    addBlock(box,'巩固与拓展',html)
  }
  if(tools.length){
    const html='<ul class="mb-0">'+tools.map(t=>`<li><a href="${t.url}" target="_blank">${t.title}</a></li>`).join('')+'</ul>'
    addBlock(box,'使用站内工具验证',html)
  }
  if(citations.length){
    const html='<ul class="mb-0">'+citations.map(c=>`<li><a href="${c.url}" target="_blank">${c.title||c.url}</a></li>`).join('')+'</ul>'
    addBlock(box,'参考资料',html)
  }
}

function addWrong(id,prompt){
  try{
    const raw=localStorage.getItem('tutor_wrong')
    const arr=raw?JSON.parse(raw):[]
    const next=Date.now()+3*24*60*60*1000
    arr.unshift({prompt, ts:Date.now(), next})
    localStorage.setItem('tutor_wrong', JSON.stringify(arr.slice(0,100)))
  }catch{}
}

function renderWrong(){
  const box=el('tutor-messages')
  box.innerHTML=''
  try{
    const raw=localStorage.getItem('tutor_wrong')
    const arr=raw?JSON.parse(raw):[]
    if(!arr.length){
      box.innerHTML='<div class="text-muted">暂无错题记录</div>'
      return
    }
    const html='<ul class="mb-0">'+arr.map(x=>{
      const d=new Date(x.next)
      return `<li>${x.prompt} <span class="text-muted">复习时间：${d.toLocaleDateString()} ${d.toLocaleTimeString()}</span></li>`
    }).join('')+'</ul>'
    addBlock(box,'错题本',html)
  }catch{
    box.innerHTML='<div class="text-muted">暂无错题记录</div>'
  }
}
