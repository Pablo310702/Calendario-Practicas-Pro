(function(){
  const config=window.PRACTICAS_CONFIG||{};
  const ready=Boolean(config.supabaseUrl&&config.supabasePublishableKey&&window.supabase);
  const els={
    email:document.getElementById('accountEmail'), password:document.getElementById('accountPassword'),
    status:document.getElementById('cloudStatus'), state:document.getElementById('cloudState'),
    signIn:document.getElementById('signInBtn'), signUp:document.getElementById('signUpBtn'),
    sync:document.getElementById('syncBtn'), signOut:document.getElementById('signOutBtn')
  };
  if(!els.email)return;
  if(!ready){
    els.status.textContent='Modo local activo. Añade tus datos de Supabase para activar cuentas y sincronización.';
    els.signIn.disabled=true; els.signUp.disabled=true;
    return;
  }
  els.status.textContent='Nube disponible. Crea una cuenta o inicia sesión para sincronizar tu calendario.';
  els.state.textContent='Nube disponible';
  const client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey);
  const setBusy=busy=>[els.signIn,els.signUp,els.sync,els.signOut].forEach(button=>{if(button)button.disabled=busy;});
  const message=(text,error=false)=>{els.status.textContent=text;els.state.textContent=error?'Error':'Conectado';els.state.classList.toggle('cloud-error',error);};
  function setSignedIn(user){
    const signed=Boolean(user); els.signIn.classList.toggle('hidden',signed); els.signUp.classList.toggle('hidden',signed);
    els.signOut.classList.toggle('hidden',!signed); els.sync.disabled=!signed; els.email.value=user?.email||'';
    els.password.value=''; els.state.textContent=signed?'Conectado':(ready?'Nube disponible':'Local'); els.state.classList.remove('cloud-error');
  }
  async function saveCloud(){
    const {data:{user}}=await client.auth.getUser(); if(!user)return;
    const payload={user_id:user.id,plan_name:(window.getPracticeState()?.ui?.companyName||'Plan de prácticas'),state:window.getPracticeState(),updated_at:new Date().toISOString()};
    const {error}=await client.from('practice_plans').upsert(payload,{onConflict:'user_id'});
    if(error)throw error;
    await client.rpc('register_usage',{event_name:'sync'});
    message('Sincronizado correctamente.');
  }
  async function loadCloud(){
    const {data:{user}}=await client.auth.getUser(); if(!user)return;
    const {data,error}=await client.from('practice_plans').select('state').eq('user_id',user.id).maybeSingle();
    if(error)throw error;
    if(data?.state){window.replacePracticeState(data.state);message('Datos descargados desde la nube.');}
    else {await saveCloud();message('Cuenta creada y plan local sincronizado.');}
  }
  els.signIn.onclick=async()=>{try{setBusy(true);const {error}=await client.auth.signInWithPassword({email:els.email.value.trim(),password:els.password.value});if(error)throw error;await loadCloud();const {data:{user}}=await client.auth.getUser();setSignedIn(user);}catch(error){message(error.message||'No fue posible iniciar sesión.',true);}finally{setBusy(false);}};
  els.signUp.onclick=async()=>{try{setBusy(true);const email=els.email.value.trim(),password=els.password.value;if(password.length<6)throw new Error('La contraseña debe tener al menos 6 caracteres.');const {error}=await client.auth.signUp({email,password});if(error)throw error;message('Revisa tu correo para confirmar la cuenta.');}catch(error){message(error.message||'No fue posible crear la cuenta.',true);}finally{setBusy(false);}};
  els.sync.onclick=async()=>{try{setBusy(true);await saveCloud();}catch(error){message(error.message||'No fue posible sincronizar.',true);}finally{setBusy(false);}};
  els.signOut.onclick=async()=>{await client.auth.signOut();setSignedIn(null);message('Sesión cerrada. Tus datos locales siguen disponibles.');};
  client.auth.getSession().then(async({data:{session}})=>{setSignedIn(session?.user||null);if(session)try{await loadCloud();}catch(error){message(error.message||'No fue posible cargar la nube.',true);}});
})();
