import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readMd(fp){
  return fs.readFileSync(fp,'utf8').split(/\r?\n/);
}

function today(){
  const d=new Date();
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const dd=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}

function typeMap(t){
  if(!t) return 'doc';
  t=t.toLowerCase();
  if(/视频|课程|系列视频/.test(t)) return 'video';
  if(/讲义|教材|pdf|索引|页面/.test(t)) return 'doc';
  if(/开源程序|代码/.test(t)) return 'code';
  if(/工具/.test(t)) return 'tool';
  return 'doc';
}

function diffMap(s){
  if(!s) return 3;
  s=s.toLowerCase();
  if(s.includes('研究生')||s.includes('⭐⭐⭐⭐⭐')) return 5;
  if(s.includes('高级')) return 4;
  if(s.includes('进阶')) return 3;
  if(s.includes('实操')) return 3;
  if(s.includes('入门')) return 1;
  return 3;
}

function sectionMap(section, subSection, item){
  const sec=(section||'').toLowerCase();
  const sub=(subSection||'').toLowerCase();
  const title=(item.title||'').toLowerCase();
  const tags=(item.tags||[]).join(' ').toLowerCase();
  if(sec.includes('线性代数')) return {category:'math',subCategory:'linear-algebra'};
  if(sec.includes('微积分')) return {category:'math',subCategory:'calculus'};
  if(sec.includes('概率')) return {category:'math',subCategory:'probability-statistics'};
  if(sec.includes('数值分析')) return {category:'math',subCategory:'numerical-methods'};
  if(sec.includes('优化')) return {category:'math',subCategory:'optimization'};
  if(sec.includes('pde')) return {category:'fea-theory',subCategory: (title.includes('finite element')||tags.includes('有限元')) ? 'finite-element-method' : 'pde'};
  if(sec.includes('连续体力学')) return {category:'math',subCategory:'continuum-mechanics'};
  if(sec.includes('中文精选')){
    if(tags.includes('线性代数')||title.includes('线性代数')) return {category:'math',subCategory:'linear-algebra'};
    return {category:'math',subCategory:'numerical-methods'};
  }
  if(sec.includes('有限元与计算力学')){
    if(sub.includes('开源程序')||sub.includes('代码')) return {category:'programming',subCategory:'finite-element-implementation'};
    if(sub.includes('软件教程')) return {category:'software',subCategory:'abaqus'};
    if(sub.includes('前置课程')) return {category:'math',subCategory:'continuum-mechanics'};
    return {category:'fea-theory',subCategory:'finite-element-method'};
  }
  return {category:'fea-theory',subCategory:'finite-element-method'};
}

function makeId(url,title){
  try{
    const u=new URL(url);
    const host=u.host;
    const p=u.pathname;
    if(host.includes('bilibili.com')){
      const m=p.match(/BV[\w]+/);
      if(m) return `bili-${m[0]}`;
      return 'bili-'+p.split('/').filter(Boolean).pop();
    }
    if(host.includes('ocw.mit.edu')){
      const m=p.match(/courses\/(\d+-\d+)/);
      if(m){return 'mit-'+m[1].replace(/-/g,'');}
      const n=p.match(/classes?\/(\d+-\d+)/);
      if(n){return 'mit-'+n[1].replace(/-/g,'');}
      return 'mit-'+p.split('/').filter(Boolean).join('-').slice(0,40);
    }
    if(host.includes('web.mit.edu')) return 'mit-'+p.split('/').filter(Boolean).join('-').slice(0,40);
    if(host.includes('web.stanford.edu')) return 'stanford-'+p.split('/').filter(Boolean).pop();
    if(host.includes('comdyn.hy.tsinghua.edu.cn')){
      const seg=p.split('/').filter(Boolean);
      const last=seg.pop();
      return 'comdyn-'+(last||'home');
    }
    if(host.includes('github.com')){
      const seg=p.split('/').filter(Boolean);
      if(seg.length>=2) return `github-${seg[0]}-${seg[1]}`;
      return 'github-home';
    }
    if(host.includes('scipy-lectures.org')) return 'scipy-lectures';
    if(host.includes('matrixcalc.org')) return 'matrix-calculator';
    if(host.includes('math.uwaterloo.ca')) return 'matrix-cookbook';
    return (host.split('.').slice(-2).join('-')+'-'+(title||'item')).toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,50);
  }catch(e){
    return (title||'item').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').slice(0,50);
  }
}

function parseMd(lines){
  let section='';
  let subSection='';
  const items=[];
  let cur=null;
  function pushCur(){
    if(cur){
      const map=sectionMap(section,subSection,cur);
      cur.category=map.category;
      cur.subCategory=map.subCategory;
      cur.type=typeMap(cur.type);
      cur.language=(cur.language||'').toLowerCase().includes('zh')?'zh':'en';
      cur.difficulty=diffMap(cur.difficulty);
      cur.tags=(cur.tags||'').split(/[，,、;；]/).map(s=>s.trim()).filter(Boolean);
      cur.updatedAt=today();
      cur.id=makeId(cur.url||'',cur.title||'');
      items.push(cur);
    }
  }
  for(const raw of lines){
    const line=raw.trim();
    if(line.startsWith('## ')){
      pushCur();
      section=line.slice(3).trim();
      subSection='';
      cur=null;
      continue;
    }
    if(line.startsWith('### ')){
      pushCur();
      subSection=line.slice(4).trim();
      cur=null;
      continue;
    }
    if(line.startsWith('- 标题：')){
      pushCur();
      cur={title:line.replace('- 标题：','').trim()};
      continue;
    }
    if(!cur) continue;
    if(line.startsWith('- ')){
      // bullet but not 标题行
      const kv=line.slice(2);
      if(kv.includes('链接：')) cur.url=kv.split('链接：')[1].trim();
      else if(kv.includes('类型：')) cur.type=kv.split('类型：')[1].trim();
      else if(kv.includes('语言：')) cur.language=kv.split('语言：')[1].trim();
      else if(kv.includes('难度：')) cur.difficulty=kv.split('难度：')[1].trim();
      else if(kv.includes('标签：')) cur.tags=kv.split('标签：')[1].trim();
      else if(kv.includes('简介：')) cur.description=kv.split('简介：')[1].trim();
      continue;
    }
  }
  pushCur();
  return items;
}

function main(){
  const mdFile=path.resolve(__dirname,'..','第一批资源目录.md');
  const outFile=path.resolve(__dirname,'..','data','resources.json');
  const lines=readMd(mdFile);
  const items=parseMd(lines);
  if(!Array.isArray(items)||items.length===0){
    console.error('No items parsed from markdown');
    process.exit(1);
  }
  fs.writeFileSync(outFile,JSON.stringify(items,null,2),'utf8');
  console.log(`OUTPUT: ${outFile}`);
  console.log(`COUNT: ${items.length}`);
}

main();
