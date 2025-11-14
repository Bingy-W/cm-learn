async function loadHotResources(){
  try{
    const res=await fetch('../data/resources.json');
    const data=await res.json();
    const hot=data.slice(0,8);
    const container=document.getElementById('hot-resources');
    container.innerHTML=hot.map(item=>{
      const href=item.url||'#';
      const tag=(item.tags||[]).slice(0,2).join(' · ');
      return `<div class="col-sm-6 col-lg-3">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title">${item.title}</h6>
            <p class="card-text">${item.description||''}</p>
            <div class="mb-2 text-muted">${tag}</div>
            <a href="${href}" target="_blank" class="btn btn-outline-secondary btn-sm">打开</a>
          </div>
        </div>
      </div>`
    }).join('');
  }catch(e){
    const container=document.getElementById('hot-resources');
    if(container) container.innerHTML='<div class="text-muted">资源加载失败</div>';
  }
}

function onSearch(){
  const q=document.getElementById('search-input').value.trim();
  if(!q) return;
  const target=`resources/software-tools.html?q=${encodeURIComponent(q)}`;
  location.href=target;
}

document.addEventListener('DOMContentLoaded',loadHotResources);
