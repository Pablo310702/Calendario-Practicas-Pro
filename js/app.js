
const STORE = 'calendario_practicas_pro_v1';
const DEFAULT = {
  config:{startDate:new Date().toLocaleDateString('sv-SE'),targetHours:1000,dailyHours:8,startTime:'08:00',endTime:'17:00'},
  ui:{
    companyName:'Empresa / institución',
    mode:'light',
    accent:'#1f6b54',
    preset:'#1f6b54',
    logoData:'',
    lastExport:''
  },
  records:{}
};
let state = loadState();
let currentMonth = new Date(state.config.startDate+'T12:00:00');
let editingDate = null;

function loadState(){
  try{
    const x=JSON.parse(localStorage.getItem(STORE));
    if(x && x.config && x.records){
      return normalizeState({
        config:{...DEFAULT.config,...x.config},
        ui:{...DEFAULT.ui,...(x.ui||{})},
        records:x.records||{}
      });
    }
  }catch(e){}
  return normalizeState(JSON.parse(JSON.stringify(DEFAULT)));
}
function normalizeState(value){
  const next=value||JSON.parse(JSON.stringify(DEFAULT));
  next.config={...DEFAULT.config,...(next.config||{})};
  next.config.targetHours=Math.max(1,Number(next.config.targetHours)||DEFAULT.config.targetHours);
  next.config.dailyHours=Math.max(.5,Math.min(24,Number(next.config.dailyHours)||DEFAULT.config.dailyHours));
  next.records=next.records&&typeof next.records==='object'?next.records:{};
  next.ui={...DEFAULT.ui,...(next.ui||{})};
  return next;
}
function saveState(){ localStorage.setItem(STORE,JSON.stringify(state)); }
let toastTimer;
function showToast(message,type='success'){
  const toast=document.getElementById('toast');
  if(!toast)return;
  toast.textContent=message; toast.className=`toast visible ${type}`;
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('visible'),2600);
}
function iso(d){ return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
function dateFromISO(s){ return new Date(s+'T12:00:00'); }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function isWeekday(d){ const w=d.getDay(); return w>=1 && w<=5; }
function todayISO(){ const d=new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
function isPastOrToday(s){ return s<=todayISO(); }
function fmtDate(s){ return dateFromISO(s).toLocaleDateString('es-GT',{day:'2-digit',month:'short',year:'numeric'}); }
function fmtLong(s){ return dateFromISO(s).toLocaleDateString('es-GT',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }
function monthKey(s){ return s.slice(0,7); }
function monthNameFromKey(k){ return dateFromISO(k+'-01').toLocaleDateString('es-GT',{month:'long',year:'numeric'}); }
function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
function xml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'');}

function hexToRgb(hex){
  let h=(hex||'').replace('#','').trim();
  if(h.length===3) h=h.split('').map(x=>x+x).join('');
  if(!/^[0-9a-fA-F]{6}$/.test(h)) h='1f6b54';
  const num=parseInt(h,16);
  return {r:(num>>16)&255,g:(num>>8)&255,b:num&255};
}
function rgbToHex(r,g,b){
  return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function mix(hex1,hex2,ratio){
  const a=hexToRgb(hex1), b=hexToRgb(hex2), t=Math.max(0,Math.min(1,ratio));
  return rgbToHex(a.r+(b.r-a.r)*t,a.g+(b.g-a.g)*t,a.b+(b.b-a.b)*t);
}
function luminance(hex){
  const {r,g,b}=hexToRgb(hex);
  const c=[r,g,b].map(v=>{v/=255; return v<=.03928 ? v/12.92 : Math.pow((v+.055)/1.055,2.4);});
  return .2126*c[0]+.7152*c[1]+.0722*c[2];
}
function idealText(hex){ return luminance(hex)>.45 ? '#10211d' : '#ffffff'; }

function applyBrand(hex){
  const root=document.documentElement;
  const brand=hex || '#1f6b54';
  const dark=mix(brand,'#000000',.28);
  const soft=mix(brand,'#ffffff',.88);
  const soft2=mix(brand,'#ffffff',.78);
  const {r,g,b}=hexToRgb(brand);
  root.style.setProperty('--brand',brand);
  root.style.setProperty('--brand-dark',dark);
  root.style.setProperty('--brand-soft',soft);
  root.style.setProperty('--brand-soft-2',soft2);
  root.style.setProperty('--brand-rgb',`${r},${g},${b}`);
  root.style.setProperty('--brand-contrast',idealText(brand));
}
function applyMode(mode){
  document.body.classList.toggle('theme-dark',mode==='dark');
  document.getElementById('modeBadge').textContent=mode==='dark'?'Modo noche':'Modo claro';
  document.getElementById('toggleDarkMode').textContent=mode==='dark'?'☀️ Modo claro':'🌙 Modo noche';
}
function applyUI(refreshSave=false){
  applyBrand(state.ui.accent||state.ui.preset||'#1f6b54');
  applyMode(state.ui.mode||'light');
  document.getElementById('companyBadge').textContent=state.ui.companyName || 'Empresa / institución';
  document.getElementById('companySummary').textContent=state.ui.companyName || '—';
  document.getElementById('companyName').value=state.ui.companyName || '';
  document.getElementById('themeMode').value=state.ui.mode || 'light';
  document.getElementById('themePreset').value=state.ui.preset || '#1f6b54';
  document.getElementById('accentColor').value=state.ui.accent || '#1f6b54';
  renderLogo();
  if(refreshSave) saveState();
}

function defaultStatus(s){ return isPastOrToday(s)?'attended':'scheduled'; }
function effectiveRecord(s){
  const r=state.records[s];
  if(r) return {...r};
  return {status:defaultStatus(s),hours: state.config.dailyHours,note:''};
}
function creditedHours(s, forProjection=false){
  const r=effectiveRecord(s), daily=Number(state.config.dailyHours);
  if(r.status==='attended') return daily;
  if(r.status==='absent'||r.status==='off') return 0;
  if(r.status==='partial') return Math.max(0,Math.min(daily,Number(r.hours)||0));
  if(r.status==='scheduled') return forProjection ? daily : 0;
  return 0;
}
function projection(){
  const target=Number(state.config.targetHours), start=dateFromISO(state.config.startDate);
  let total=0,d=new Date(start),workdays=0, guard=0;
  while(total<target && guard<3000){
    if(isWeekday(d)){
      const s=iso(d);
      total+=creditedHours(s,true);
      workdays++;
    }
    d=addDays(d,1); guard++;
  }
  return {date:iso(addDays(d,-1)), workdays, projectedHours:total};
}
function actualStats(){
  const start=dateFromISO(state.config.startDate), today=todayISO();
  let d=new Date(start), actual=0, absences=0, affected=0, workedDays=0;
  const daily=Number(state.config.dailyHours);
  const cutoff=[today,projection().date].sort()[0];
  while(iso(d)<=cutoff){
    if(isWeekday(d)){
      const s=iso(d), r=effectiveRecord(s), h=creditedHours(s,false);
      actual+=h;
      if(h>0) workedDays++;
      if(r.status==='absent') absences++;
      if(r.status==='absent'||r.status==='off'||r.status==='partial') affected += Math.max(0,daily-h);
    }
    d=addDays(d,1);
  }
  return {actual,absences,affected,workedDays};
}
function statusLabel(status){
  return {attended:'Asistió',absent:'Faltó',partial:'Parcial',off:'No laborable',scheduled:'Programado'}[status]||status;
}
function statusClass(status){ return 's-'+status; }
function buildDates(){
  const end=projection().date, arr=[]; let d=dateFromISO(state.config.startDate);
  while(iso(d)<=end){ if(isWeekday(d)) arr.push(iso(d)); d=addDays(d,1); }
  return arr;
}
function statusDistribution(){
  const counts={attended:0,absent:0,partial:0,off:0,scheduled:0};
  const dates=buildDates();
  dates.forEach(s=>{const st=effectiveRecord(s).status; counts[st]=(counts[st]||0)+1;});
  return {counts,total:dates.length};
}
function reportRows(){return buildDates().map(s=>{const r=effectiveRecord(s);return {date:s,day:cap(dateFromISO(s).toLocaleDateString('es-GT',{weekday:'long'})),status:r.status,h:r.status==='scheduled'?null:creditedHours(s,false),note:r.note||''};});}
function reportStats(){const a=actualStats(),p=projection(),c=state.config;return [['Meta de horas',Number(c.targetHours)],['Horas acumuladas',a.actual],['Horas pendientes',Math.max(0,c.targetHours-a.actual)],['Faltas marcadas',a.absences],['Finalización estimada',fmtDate(p.date)],['Progreso real',(100*Math.min(1,a.actual/c.targetHours)).toFixed(1)+'%'],['Fecha de inicio',fmtDate(c.startDate)],['Horas por día',Number(c.dailyHours)],['Horario',c.startTime+' – '+c.endTime],['Días hábiles proyectados',p.workdays],['Horas no realizadas',a.affected]];}

function hydrateConfig(){
  for(const id of ['startDate','targetHours','dailyHours','startTime','endTime'])
    document.getElementById(id).value=state.config[id];
}
function updateDashboard(){
  const a=actualStats(), p=projection(), target=Number(state.config.targetHours);
  const remaining=Math.max(0,target-a.actual), pct=Math.min(100,target? a.actual/target*100:0);
  const daysRemaining=Math.max(0,Math.ceil(remaining/Math.max(0.25,Number(state.config.dailyHours))));
  document.getElementById('actualHours').textContent=a.actual.toFixed(a.actual%1?2:0)+' h';
  document.getElementById('remainingHours').textContent=remaining.toFixed(remaining%1?2:0)+' h';
  document.getElementById('absenceCount').textContent=a.absences;
  document.getElementById('lostHoursText').textContent=a.affected.toFixed(a.affected%1?2:0)+' h no realizadas';
  document.getElementById('projectedDate').textContent=fmtDate(p.date);
  document.getElementById('projectedSub').textContent='alcanzando '+target.toLocaleString('es-GT')+' h';
  document.getElementById('progressText').textContent=pct.toFixed(1)+'%';
  document.getElementById('progressBar').style.width=pct+'%';
  document.getElementById('workdaysProjected').textContent=p.workdays;
  document.getElementById('dailySummary').textContent=state.config.dailyHours+' h';
  document.getElementById('scheduleSummary').textContent=state.config.startTime+' – '+state.config.endTime;
  document.getElementById('workdaysProjectedTop').textContent=p.workdays;
  document.getElementById('workedDays').textContent=a.workedDays;
  document.getElementById('affectedHoursTop').textContent=a.affected.toFixed(a.affected%1?2:0)+' h';
  document.getElementById('daysRemaining').textContent=daysRemaining;
  document.getElementById('donutChart').style.setProperty('--pct',pct.toFixed(1));
  document.getElementById('donutValue').textContent=pct.toFixed(1)+'%';
  document.getElementById('targetHoursDash').textContent=target.toLocaleString('es-GT')+' h';
  document.getElementById('scheduleDash').textContent=state.config.startTime+' – '+state.config.endTime;
  document.getElementById('startDateDash').textContent=fmtDate(state.config.startDate);
  document.getElementById('lastExportDash').textContent=state.ui.lastExport || 'Aún no';
  renderStatusBars();
}
function renderStatusBars(){
  const {counts,total}=statusDistribution();
  const wrap=document.getElementById('statusBars');
  const order=['attended','partial','absent','off','scheduled'];
  const fillClass={attended:'fill-attended',partial:'fill-partial',absent:'fill-absent',off:'fill-off',scheduled:'fill-scheduled'};
  wrap.innerHTML=order.map(k=>{
    const count=counts[k]||0;
    const pct=total?((count/total)*100):0;
    return `<div class="status-row"><strong>${xml(statusLabel(k))}</strong><div class="status-track"><div class="status-fill ${fillClass[k]}" style="width:${pct}%"></div></div><span>${count}</span></div>`;
  }).join('');
}
function renderCalendar(){
  const y=currentMonth.getFullYear(), m=currentMonth.getMonth();
  document.getElementById('monthLabel').textContent=cap(currentMonth.toLocaleDateString('es-GT',{month:'long',year:'numeric'}));
  const grid=document.getElementById('calendarGrid'); grid.innerHTML='';
  const first=new Date(y,m,1,12), last=new Date(y,m+1,0,12);
  const mondayIndex=(first.getDay()+6)%7;
  for(let i=0;i<mondayIndex;i++){ const e=document.createElement('div'); e.className='day empty'; grid.appendChild(e); }
  const projectedEnd=projection().date;
  for(let n=1;n<=last.getDate();n++){
    const d=new Date(y,m,n,12), s=iso(d), cell=document.createElement('div');
    if(!isWeekday(d)){ cell.className='day weekend'; cell.innerHTML=`<span class="num">${n}</span>`; grid.appendChild(cell); continue; }
    const r=effectiveRecord(s), inPlan=s>=state.config.startDate && s<=projectedEnd;
    cell.className='day'+(s===todayISO()?' today':'');
    if(!inPlan){cell.className+=' weekend'; cell.innerHTML=`<span class="num">${n}</span>`; grid.appendChild(cell); continue;}
    const h=(r.status==='scheduled'?state.config.dailyHours:creditedHours(s,false));
    cell.innerHTML=`<span class="num">${n}</span><br><span class="badge ${statusClass(r.status)}">${statusLabel(r.status)}</span><span class="hours">${Number(h).toFixed(Number(h)%1?2:0)} h</span>`;
    if(s>=state.config.startDate){ cell.onclick=()=>openDialog(s); } else cell.style.cursor='default';
    grid.appendChild(cell);
  }
}
function renderTable(){
  const dates=buildDates(), body=document.getElementById('recordsBody'), filter=document.getElementById('monthFilter').value;
  const statusFilter=document.getElementById('recordStatusFilter')?.value||'all';
  const search=(document.getElementById('recordSearch')?.value||'').trim().toLocaleLowerCase('es-GT');
  body.innerHTML='';
  for(const s of dates){
    if(filter!=='all' && monthKey(s)!==filter) continue;
    const r=effectiveRecord(s), tr=document.createElement('tr');
    const day=cap(dateFromISO(s).toLocaleDateString('es-GT',{weekday:'long'}));
    const searchable=`${s} ${fmtDate(s)} ${day} ${r.note||''}`.toLocaleLowerCase('es-GT');
    if(statusFilter!=='all' && r.status!==statusFilter) continue;
    if(search && !searchable.includes(search)) continue;
    tr.innerHTML=`
      <td><strong>${fmtDate(s)}</strong></td>
      <td>${day}</td>
      <td>
        <select class="status-select" data-date="${s}">
          ${['attended','absent','partial','off','scheduled'].map(x=>`<option value="${x}" ${r.status===x?'selected':''}>${statusLabel(x)}</option>`).join('')}
        </select>
      </td>
      <td><input class="hours-input" type="number" min="0" max="${state.config.dailyHours}" step="0.25" value="${r.status==='partial'?r.hours:(r.status==='attended'?state.config.dailyHours:0)}" data-hours="${s}" ${r.status==='partial'?'':'disabled'}></td>
      <td><input class="status-select" style="min-width:220px" type="text" maxlength="120" value="${xml(r.note||'')}" placeholder="Opcional" data-note="${s}"></td>`;
    body.appendChild(tr);
  }
  if(!body.children.length){
    body.innerHTML='<tr><td colspan="5" class="empty-state">No hay registros que coincidan con los filtros.</td></tr>';
  }
  body.querySelectorAll('[data-date]').forEach(el=>el.onchange=e=>{
    const s=e.target.dataset.date, val=e.target.value, old=effectiveRecord(s);
    state.records[s]={status:val,hours:val==='partial'?(old.status==='partial'?old.hours:state.config.dailyHours): (val==='attended'?state.config.dailyHours:0),note:old.note||''};
    saveState(); renderAll();
  });
  body.querySelectorAll('[data-hours]').forEach(el=>el.onchange=e=>{
    const s=e.target.dataset.hours, r=effectiveRecord(s);
    state.records[s]={...r,status:'partial',hours:Math.max(0,Math.min(Number(state.config.dailyHours),Number(e.target.value)||0))};
    saveState(); renderAll();
  });
  body.querySelectorAll('[data-note]').forEach(el=>el.onchange=e=>{
    const s=e.target.dataset.note, r=effectiveRecord(s);
    state.records[s]={...r,note:e.target.value};
    saveState();
  });
}
function renderMonthFilter(){
  const select=document.getElementById('monthFilter'), prev=select.value||'all', months=[...new Set(buildDates().map(monthKey))];
  select.innerHTML='<option value="all">Todos los meses</option>'+months.map(k=>`<option value="${k}">${cap(monthNameFromKey(k))}</option>`).join('');
  if([...select.options].some(o=>o.value===prev)) select.value=prev;
}
function renderAll(){
  updateDashboard(); renderMonthFilter(); renderCalendar(); renderTable(); applyUI(false);
}
function registerServiceWorker(){
  if('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
let deferredInstallPrompt=null;
function setupInstallPrompt(){
  const button=document.getElementById('installBtn');
  if(!button)return;
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault(); deferredInstallPrompt=event; button.classList.remove('hidden');
  });
  button.onclick=async()=>{
    if(!deferredInstallPrompt)return;
    deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice;
    deferredInstallPrompt=null; button.classList.add('hidden');
  };
}
function renderLogo(){
  const data=state.ui.logoData;
  const headerLogo=document.getElementById('headerLogo');
  const fallback=document.getElementById('headerLogoFallback');
  const preview=document.getElementById('logoPreview');
  if(data){
    headerLogo.src=data; headerLogo.classList.remove('hidden'); fallback.classList.add('hidden');
    preview.innerHTML=`<img src="${data}" alt="Logo">`;
  }else{
    headerLogo.removeAttribute('src'); headerLogo.classList.add('hidden'); fallback.classList.remove('hidden');
    preview.innerHTML='<span>Sin logo</span>';
  }
}
function openDialog(s){
  editingDate=s; const r=effectiveRecord(s);
  document.getElementById('dialogTitle').textContent=fmtLong(s);
  document.getElementById('dialogStatus').value=r.status;
  document.getElementById('dialogHours').value=r.status==='partial'?r.hours:(r.status==='attended'?state.config.dailyHours:0);
  document.getElementById('dialogHours').max=state.config.dailyHours;
  document.getElementById('dialogNote').value=r.note||'';
  toggleDialogHours();
  document.getElementById('editDialog').showModal();
}
function toggleDialogHours(){
  const st=document.getElementById('dialogStatus').value, inp=document.getElementById('dialogHours');
  inp.disabled=st!=='partial';
  if(st==='attended') inp.value=state.config.dailyHours;
  if(st==='absent'||st==='off'||st==='scheduled') inp.value=0;
}
document.getElementById('dialogStatus').onchange=toggleDialogHours;
document.getElementById('cancelDialog').onclick=()=>document.getElementById('editDialog').close();
document.getElementById('saveDay').onclick=()=>{
  const st=document.getElementById('dialogStatus').value;
  state.records[editingDate]={
    status:st,
    hours:st==='partial'?Math.max(0,Math.min(Number(state.config.dailyHours),Number(document.getElementById('dialogHours').value)||0)):(st==='attended'?Number(state.config.dailyHours):0),
    note:document.getElementById('dialogNote').value.trim()
  };
  saveState(); document.getElementById('editDialog').close(); renderAll(); showToast('Registro guardado correctamente.');
};
document.getElementById('clearDay').onclick=()=>{
  delete state.records[editingDate]; saveState(); document.getElementById('editDialog').close(); renderAll();
};
document.getElementById('saveConfig').onclick=()=>{
  const startDate=document.getElementById('startDate').value||DEFAULT.config.startDate;
  const targetHours=Number(document.getElementById('targetHours').value);
  const dailyHours=Number(document.getElementById('dailyHours').value);
  if(!targetHours || targetHours<1 || !dailyHours || dailyHours<.5 || dailyHours>24){
    showToast('Revisa la meta y las horas diarias.','error'); return;
  }
  state.config={
    startDate,
    targetHours,
    dailyHours,
    startTime:document.getElementById('startTime').value||'08:00',
    endTime:document.getElementById('endTime').value||'17:00'
  };
  saveState(); currentMonth=dateFromISO(state.config.startDate); renderAll(); showToast('Configuración guardada.');
};
document.getElementById('prevMonth').onclick=()=>{ currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()-1,1,12); renderCalendar(); };
document.getElementById('nextMonth').onclick=()=>{ currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()+1,1,12); renderCalendar(); };
document.getElementById('goToday').onclick=()=>{ const t=new Date(); currentMonth=new Date(t.getFullYear(),t.getMonth(),1,12); renderCalendar(); };
document.getElementById('registerToday').onclick=()=>{
  const today=todayISO();
  if(today<state.config.startDate){ showToast('La fecha de inicio todavía no ha llegado.','error'); return; }
  openDialog(today);
};
document.getElementById('printBtn').onclick=()=>{ renderPrint(); window.print(); };
document.getElementById('monthFilter').onchange=renderTable;
document.getElementById('recordStatusFilter').onchange=renderTable;
document.getElementById('recordSearch').oninput=renderTable;
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  t.classList.add('active'); document.getElementById(t.dataset.view).classList.add('active');
});

function persistPersonalization(){
  state.ui.companyName=(document.getElementById('companyName').value||'').trim() || 'Empresa / institución';
  state.ui.mode=document.getElementById('themeMode').value || 'light';
  state.ui.preset=document.getElementById('themePreset').value || '#1f6b54';
  state.ui.accent=document.getElementById('accentColor').value || state.ui.preset || '#1f6b54';
  saveState(); applyUI(false); updateDashboard();
}
document.getElementById('savePersonalization').onclick=()=>{ persistPersonalization(); };
document.getElementById('applyThemeBtn').onclick=()=>{ persistPersonalization(); };
document.getElementById('toggleDarkMode').onclick=()=>{
  const next=(state.ui.mode==='dark'?'light':'dark');
  state.ui.mode=next; document.getElementById('themeMode').value=next; saveState(); applyUI(false);
};
document.getElementById('themeMode').onchange=()=>{ state.ui.mode=document.getElementById('themeMode').value; saveState(); applyUI(false); };
document.getElementById('themePreset').onchange=()=>{ const v=document.getElementById('themePreset').value; document.getElementById('accentColor').value=v; state.ui.preset=v; state.ui.accent=v; saveState(); applyUI(false); updateDashboard(); };
document.getElementById('accentColor').oninput=()=>{ state.ui.accent=document.getElementById('accentColor').value; saveState(); applyUI(false); updateDashboard(); };
document.getElementById('resetTheme').onclick=()=>{
  state.ui={...state.ui, mode:'light', accent:'#1f6b54', preset:'#1f6b54', companyName:state.ui.companyName||'Empresa / institución'};
  saveState(); applyUI(false); updateDashboard();
};
document.getElementById('removeLogo').onclick=()=>{ state.ui.logoData=''; saveState(); renderAll(); };
document.getElementById('logoInput').onchange=e=>{
  const file=e.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{ state.ui.logoData=String(reader.result||''); saveState(); renderAll(); };
  reader.readAsDataURL(file);
  e.target.value='';
};

document.getElementById('exportCsv').onclick=exportExcel;
document.getElementById('exportJson').onclick=()=>downloadBlob(JSON.stringify(state,null,2),'respaldo_practicas_1000_horas.json','application/json');
document.getElementById('importJson').onchange=e=>{
  const f=e.target.files[0]; if(!f)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const x=JSON.parse(reader.result);
      if(!x.config||!x.records) throw new Error();
      state={config:{...DEFAULT.config,...x.config}, ui:{...DEFAULT.ui,...(x.ui||{})}, records:x.records||{}};
      saveState(); hydrateConfig(); currentMonth=dateFromISO(state.config.startDate); renderAll();
      alert('Respaldo importado correctamente.');
    }catch(err){alert('El archivo no parece ser un respaldo válido.');}
  };
  reader.readAsText(f); e.target.value='';
};
document.getElementById('resetBtn').onclick=()=>{
  if(confirm('¿Seguro que deseas borrar todos los registros y volver a la configuración inicial?')){
    state=JSON.parse(JSON.stringify(DEFAULT)); saveState(); hydrateConfig(); currentMonth=dateFromISO(state.config.startDate); renderAll();
  }
};
function downloadBlob(content,name,type){
  const blob=new Blob([content],{type}), a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function renderPrint(){
  const rows=reportRows(), months=[...new Set(rows.map(r=>monthKey(r.date)))];
  const report=document.getElementById('printReport');
  const logoHtml=state.ui.logoData ? `<div class="report-logo"><img src="${state.ui.logoData}" alt="Logo"></div>` : '';
  const company=state.ui.companyName && state.ui.companyName!=='Empresa / institución' ? `<p class="report-company">${xml(state.ui.companyName)}</p>` : '';
  report.innerHTML=`<div class="report-head">${logoHtml}<div><h1 class="report-title">Calendario de prácticas</h1>${company}<p class="report-meta">Registro de asistencia y horas · Generado el ${xml(fmtDate(todayISO()))}</p></div></div><div class="report-stats">${reportStats().map(([k,v])=>'<div class="report-stat">'+xml(k)+'<strong>'+xml(v)+'</strong></div>').join('')}</div>${months.map(m=>'<h2 class="report-month">'+xml(cap(monthNameFromKey(m)))+'</h2><table class="report-table"><colgroup><col style="width:18%"><col style="width:17%"><col style="width:21%"><col style="width:12%"><col style="width:32%"></colgroup><thead><tr><th>Fecha</th><th>Día</th><th>Estado</th><th>Horas</th><th>Observación</th></tr></thead><tbody>'+rows.filter(r=>monthKey(r.date)===m).map(r=>'<tr><td>'+xml(fmtDate(r.date))+'</td><td>'+xml(r.day)+'</td><td class="'+statusClass(r.status)+'">'+xml(statusLabel(r.status))+'</td><td style="text-align:center">'+(r.h===null?'—':xml(r.h))+'</td><td>'+xml(r.note)+'</td></tr>').join('')+'</tbody></table>').join('')}<p class="report-foot">Los días programados no se contabilizan como horas realizadas. Los días hábiles pasados sin modificación se consideran asistidos, según la configuración del calendario.</p>`;
}
// Native XLSX (Office Open XML), no external dependencies.
function zipFiles(files){
  const enc=new TextEncoder(),chunks=[],central=[];let offset=0;
  const crc=b=>{let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
  const buf=n=>new Uint8Array(n);
  for(const [name,content] of Object.entries(files)){
    const n=enc.encode(name),d=enc.encode(content),sum=crc(d),h=buf(30),v=new DataView(h.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,sum,true);v.setUint32(18,d.length,true);v.setUint32(22,d.length,true);v.setUint16(26,n.length,true);
    chunks.push(h,n,d);
    const c=buf(46),w=new DataView(c.buffer);
    w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint32(16,sum,true);w.setUint32(20,d.length,true);w.setUint32(24,d.length,true);w.setUint16(28,n.length,true);w.setUint32(42,offset,true);
    central.push(c,n);offset+=h.length+n.length+d.length;
  }
  const end=buf(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,Object.keys(files).length,true);e.setUint16(10,Object.keys(files).length,true);e.setUint32(12,central.reduce((a,b)=>a+b.length,0),true);e.setUint32(16,offset,true);
  return new Blob([...chunks,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function exportExcel(){
  const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main', rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships', pkg='http://schemas.openxmlformats.org/package/2006/relationships';
  const cell=(v,i,r,st)=>{const ref=String.fromCharCode(65+i)+r;return typeof v==='number'?`<c r="${ref}" s="${st}"><v>${v}</v></c>`:`<c r="${ref}" s="${st}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;};
  const row=(vals,r,styles,height=27)=>`<row r="${r}" ht="${height}" customHeight="1">${vals.map((v,i)=>cell(v,i,r,Array.isArray(styles)?styles[i]:styles)).join('')}</row>`;
  const data=reportRows();
  const statusStyles={attended:4,absent:5,partial:6,off:7,scheduled:8};
  let body=row(['Calendario de prácticas','','','',''],1,1,35)+row(['Fecha','Día','Estado','Horas','Observación'],2,2,30);
  data.forEach((d,i)=>{const base=i%2?3:0;body+=row([Math.round(Date.parse(d.date+'T00:00:00Z')/86400000)+25569,d.day,statusLabel(d.status),d.h??'',d.note],i+3,[9,base,statusStyles[d.status]??base,base,base],Math.max(28,Math.ceil((d.note||'').length/36)*23));});
  const sheet=(rows,widths,merge,filter='',freeze=2)=>`<worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${freeze}" topLeftCell="A${freeze+1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="27"/><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1" style="0"/>`).join('')}</cols><sheetData>${rows}</sheetData>${filter?`<autoFilter ref="${filter}"/>`:''}<mergeCells count="1"><mergeCell ref="${merge}"/></mergeCells><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup paperSize="1" orientation="landscape"/></worksheet>`;
  let summary=row(['Calendario de prácticas',''],1,1,35)+row(['Indicador','Resultado'],2,2,30);
  reportStats().forEach(([k,v],i)=>summary+=row([k,v],i+3,i%2?3:0));
  const fills=['none','gray125','174E3F','1F6B54','F0F6F3','DFF4E8','FDE7E7','FFF2CF','E8EDF0','EAF1FF'];
  const xf=(font,fill,num=0)=>`<xf numFmtId="${num}" fontId="${font}" fillId="${fill}" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" applyNumberFormat="1"><alignment vertical="center" wrapText="1"/></xf>`;
  const styles=`<styleSheet xmlns="${ns}"><fonts count="2"><font><sz val="16"/><name val="Times New Roman"/><color rgb="FF19312B"/></font><font><b/><sz val="16"/><name val="Times New Roman"/><color rgb="FFFFFFFF"/></font></fonts><fills count="10">${fills.map((f,i)=>i<2?`<fill><patternFill patternType="${f}"/></fill>`:`<fill><patternFill patternType="solid"><fgColor rgb="FF${f}"/><bgColor indexed="64"/></patternFill></fill>`).join('')}</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border>${['left','right','top','bottom'].map(k=>`<${k} style="thin"><color rgb="FFD5E1DB"/></${k}>`).join('')}<diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="10">${[xf(0,0),xf(1,2),xf(1,3),xf(0,4),xf(0,5),xf(0,6),xf(0,7),xf(0,8),xf(0,9),xf(0,0,14)].join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const files={
    '[Content_Types].xml':`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${[['workbook','sheet.main'],['styles','styles'],['worksheets/sheet1','worksheet'],['worksheets/sheet2','worksheet']].map(([p,t])=>`<Override PartName="/xl/${p}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.${t}+xml"/>`).join('')}</Types>`,
    '_rels/.rels':`<Relationships xmlns="${pkg}"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml':`<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets><sheet name="Resumen" sheetId="1" r:id="rId1"/><sheet name="Registro detallado" sheetId="2" r:id="rId2"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels':`<Relationships xmlns="${pkg}"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${rel}/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="${rel}/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml':styles,
    'xl/worksheets/sheet1.xml':sheet(summary,[40,32],'A1:B1'),
    'xl/worksheets/sheet2.xml':sheet(body,[18,19,23,13,55],'A1:E1',`A2:E${data.length+2}`)
  };
  const blob=zipFiles(files),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='Calendario_de_practicas.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  state.ui.lastExport=new Date().toLocaleString('es-GT'); saveState(); updateDashboard();
}

window.getPracticeState=()=>JSON.parse(JSON.stringify(state));
window.replacePracticeState=value=>{ state=normalizeState(value); saveState(); hydrateConfig(); currentMonth=dateFromISO(state.config.startDate); renderAll(); };
registerServiceWorker();
setupInstallPrompt();
hydrateConfig();
applyUI(false);
renderAll();
