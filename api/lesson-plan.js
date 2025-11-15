import fs from 'fs'
import path from 'path'

function loadResources(){
  try{
    const p=path.join(process.cwd(),'data','resources.json')
    return JSON.parse(fs.readFileSync(p,'utf-8'))
  }catch{return []}
}

function search(resources, q, limit=6){
  if(!q) return []
  const query=q.toLowerCase()
  const words=Array.from(new Set(query.split(/[^\p{L}\p{N}]+/u).filter(Boolean)))
  const scored=resources.map((r)=>{
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

function toolHints(q){
  const t=q.toLowerCase()
  const list=[]
  if(/刚度|杆|梁|stiffness/.test(t)) list.push({title:'杆/梁刚度工具',url:'/tools/bar-stiffness.html'})
  if(/形函数|shape function/.test(t)) list.push({title:'形函数工具与资料',url:'/tools/shape-functions.html'})
  if(/高斯|积分|gauss/.test(t)) list.push({title:'高斯积分工具',url:'/tools/gauss-integration.html'})
  if(/矩阵|特征值|线性代数/.test(t)) list.push({title:'矩阵工具合集',url:'/tools/matrix-calculator.html'})
  return list
}

function planFromTopic(topic, level){
  const base=[
    '线性代数基础：矩阵与向量、内积、范数',
    '微积分与微分方程：导数、积分、常微分方程',
    '张量与连续介质基础：应力应变基本概念'
  ]
  const core=[]
  const practice=[]
  const consolidate=[]
  const t=topic.toLowerCase()
  if(/刚度|杆|梁|stiffness/.test(t)){
    core.push('推导一维杆单元刚度矩阵：能量法或加权残值法')
    core.push('理解材料参数E、截面A、长度L的作用与单位')
    core.push('组装多单元系统并施加边界与载荷')
    practice.push('计算两节点杆单元的刚度矩阵并验证对称性')
    practice.push('三杆串联系统的总刚度与端部位移求解')
    consolidate.push('对比不同材料与截面的影响，绘制位移与应力分布')
  }else if(/形函数|shape function/.test(t)){
    core.push('理解插值与形函数的意义，节点值到场量的映射')
    core.push('一维线性、二次形函数的构造与性质')
    practice.push('推导线性一维形函数并验证分片线性与分配性')
    consolidate.push('将形函数用于位移场插值并计算梯度')
  }else if(/高斯|积分|gauss/.test(t)){
    core.push('高斯积分的节点与权重，数值积分误差与阶数')
    core.push('在单元上进行积分以得到刚度与载荷项')
    practice.push('使用2点与3点Gauss分别计算多项式积分并对比误差')
    consolidate.push('将Gauss积分用于形函数与梯度的积分验证')
  }else{
    core.push('明确主题关键概念并列出公式与变量含义')
    practice.push('围绕主题设计1–2个小练习并给出答案')
    consolidate.push('结合站内工具或外部资料进行巩固与拓展')
  }
  if(level==='advanced'){
    core.push('讨论误差来源与收敛特性，给出网格加密实验建议')
    consolidate.push('阅读权威课程讲义或教材章节并做笔记')
  }
  return { prerequisites: base, core, practice, consolidate }
}

export default async function handler(req,res){
  if(req.method!=='POST'){
    res.status(405).json({error:'method_not_allowed'})
    return
  }
  const { message, level='beginner' } = req.body || {}
  if(!message||typeof message!=='string'){
    res.status(400).json({error:'invalid_message'})
    return
  }
  const resources=loadResources()
  const plan=planFromTopic(message, level)
  const citations=search(resources, message, 6)
  const tools=toolHints(message)
  res.status(200).json({ plan, citations, tools })
}

