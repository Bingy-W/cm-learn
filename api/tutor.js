import fs from 'fs'
import path from 'path'

function loadResources() {
  try {
    const p = path.join(process.cwd(), 'data', 'resources.json')
    const raw = fs.readFileSync(p, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function pickCitations(resources, q, limit = 3) {
  if (!q) return []
  const query = q.toLowerCase()
  const words = Array.from(new Set(query.split(/[^\p{L}\p{N}]+/u).filter(Boolean)))
  const scored = resources.map((r) => {
    const text = [r.title, r.description, (r.tags || []).join(' ')].join(' ').toLowerCase()
    let s = 0
    for (const w of words) {
      if (text.includes(w)) s += 2
      if ((r.category || '').toLowerCase().includes(w)) s += 1
    }
    return { r, s }
  })
  scored.sort((a, b) => b.s - a.s)
  return scored.slice(0, limit).filter(x => x.s > 0).map(({ r }) => ({ title: r.title, url: r.url || '#'}))
}

function pickTools(q){
  const t=(q||'').toLowerCase()
  const list=[]
  if(/刚度|杆|梁|stiffness/.test(t)) list.push({title:'杆/梁刚度工具',url:'/tools/bar-stiffness.html'})
  if(/形函数|shape function/.test(t)) list.push({title:'形函数工具与资料',url:'/tools/shape-functions.html'})
  if(/高斯|积分|gauss/.test(t)) list.push({title:'高斯积分工具',url:'/tools/gauss-integration.html'})
  if(/矩阵|特征值|线性代数/.test(t)) list.push({title:'矩阵工具合集',url:'/tools/matrix-calculator.html'})
  return list
}

function getProviderConfig(){
  const provider=(process.env.AI_PROVIDER||'openai').toLowerCase()
  if(provider==='deepseek'){
    const apiKey=process.env.DEEPSEEK_API_KEY
    const base=process.env.DEEPSEEK_API_BASE||'https://api.deepseek.com/v1/chat/completions'
    const model=process.env.DEEPSEEK_MODEL||'deepseek-chat'
    return { provider, apiKey, base, model }
  }
  const apiKey=process.env.OPENAI_API_KEY
  const base=process.env.OPENAI_API_BASE||'https://api.openai.com/v1/chat/completions'
  const model=process.env.OPENAI_MODEL||'gpt-4o-mini'
  return { provider:'openai', apiKey, base, model }
}

async function callModel({ message, mode, level, profile }) {
  const cfg=getProviderConfig()
  if (!cfg.apiKey) {
    return { error: 'missing_api_key', provider: cfg.provider }
  }
  const system = [
    '你是一名计算力学入门教师，使用中文进行讲解。',
    '始终遵循：诊断→逐步提示→核心讲解→微练习→参考资料。',
    '尽量结合站内资源（数学基础、有限元理论、编程实现、在线工具）提出联动建议。',
    '请严格输出JSON对象，字段：',
    '{"diagnostics":[],"hints":[],"explanation":"","practice":[{"type":"choice|fill|derive","prompt":"","answer":""}],"citations":[]}',
    '入门模式提供更多细化提示；进阶模式可提升难度与收敛到要点。',
  ].join('\n')

  const userPayload = {
    role: 'user',
    content: JSON.stringify({ message, mode, level, profile })
  }

  const resp = await fetch(cfg.base, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        userPayload
      ]
    })
  })

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    return { error: 'provider_request_failed', provider: cfg.provider, details: txt }
  }
  const data = await resp.json()
  const content = data?.choices?.[0]?.message?.content || ''
  try {
    const obj = JSON.parse(content)
    return obj
  } catch {
    return { diagnostics: [], hints: [], explanation: content, practice: [], citations: [] }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }
  try {
    const { message, mode = 'ask', level = 'beginner', profile = {} } = req.body || {}
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'invalid_message' })
      return
    }
    const resources = loadResources()
    const result = await callModel({ message, mode, level, profile })
    if (result?.error) {
      res.status(500).json(result)
      return
    }
    const citations = result.citations && result.citations.length > 0
      ? result.citations
      : pickCitations(resources, message)
    const tools = pickTools(message)
    res.status(200).json({ ...result, citations, tools })
  } catch (e) {
    res.status(500).json({ error: 'internal_error' })
  }
}
