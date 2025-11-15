import fs from 'fs'
import path from 'path'

function load(){
  try{
    const p=path.join(process.cwd(),'data','resources.json')
    return JSON.parse(fs.readFileSync(p,'utf-8'))
  }catch{return []}
}

function search(resources,q,limit=10){
  if(!q) return []
  const words=Array.from(new Set(q.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)))
  const scored=resources.map(r=>{
    const text=[r.title,r.description,(r.tags||[]).join(' ')].join(' ').toLowerCase()
    let s=0
    for(const w of words){
      if(text.includes(w)) s+=2
      if((r.category||'').toLowerCase().includes(w)) s+=1
    }
    return {r,s}
  })
  scored.sort((a,b)=>b.s-a.s)
  return scored.slice(0,limit).filter(x=>x.s>0).map(({r})=>({title:r.title,url:r.url||'#'}))
}

export default async function handler(req,res){
  if(req.method!=='GET'){
    res.status(405).json({error:'method_not_allowed'})
    return
  }
  const q=(req.query?.q||'').toString()
  const resources=load()
  const result=search(resources,q,10)
  res.status(200).json({items:result})
}

