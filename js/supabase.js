// ── CLIENT SUPABASE ──
const SUPABASE_URL = 'https://lplwipvjlflnpymvpzim.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbHdpcHZqbGZsbnB5bXZwemltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwOTI1MTMsImV4cCI6MjA5MDY2ODUxM30.c3zBDdxXpdpXN7bdBgR3iN0Omkr46boAxz-mgxn3ur0';

// Initialisation avec retry — attend que le SDK soit disponible
function getSB() {
  if (!window._sbClient) {
    if (typeof supabase === 'undefined') return null;
    window._sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return window._sbClient;
}

// ── AUTH ──
async function getSession() {
  try {
    const sb = getSB();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session;
  } catch { return null; }
}

async function getUser() {
  const s = await getSession();
  return s ? s.user : null;
}

async function signOut() {
  const sb = getSB();
  if (sb) await sb.auth.signOut();
  window.location.href = 'index.html';
}

// requireAuth : vérifie la session sans rediriger trop vite
async function requireAuth() {
  // Phase 1 : session locale instantanée (localStorage Supabase)
  const localUser = getSessionLocal();
  if (localUser) {
    // Session locale valide — on retourne immédiatement et on vérifie Supabase en arrière-plan
    _verifierSessionSupabaseEnArrierePlan();
    return localUser;
  }

  // Phase 2 : pas de session locale — attendre Supabase (max 5s)
  let user = null;
  for (let i = 0; i < 10; i++) {
    try {
      user = await getUser();
      if (user) break;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }

  if (!user) {
    window.location.href = 'auth.html?redirect=' + encodeURIComponent(window.location.pathname.split('/').pop());
    return null;
  }
  return user;
}

// Vérification silencieuse en arrière-plan — déconnecte proprement si session expirée
async function _verifierSessionSupabaseEnArrierePlan() {
  try {
    const user = await getUser();
    if (!user) {
      // Session locale invalide/expirée → déconnecter proprement
      window.location.href = 'auth.html';
    }
  } catch {}
}

// ── PROFIL EN BASE ──
async function chargerProfilDB(userId) {
  const sb = getSB(); if (!sb) return null;
  const { data, error } = await sb
    .from('profils').select('*').eq('user_id', userId).single();
  if (error || !data) return null;
  return data.donnees || null;
}

async function sauvegarderProfilDB(userId, profil) {
  const payload = { user_id: userId, donnees: profil, updated_at: new Date().toISOString() };
  const sb = getSB(); if (!sb) return false;
  const { error } = await sb.from('profils')
    .upsert(payload, { onConflict: 'user_id' });
  return !error;
}

async function profilCompletDB(userId) {
  const sb = getSB(); if (!sb) return false;
  const { data } = await sb
    .from('profils').select('id').eq('user_id', userId).single();
  return !!data;
}

// ── LECTURE SESSION LOCALE (synchrone, zéro latence) ──
function getSessionLocal() {
  try {
    // Supabase stocke la session sous sb-<ref>-auth-token
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!key) return null;
    const data = JSON.parse(localStorage.getItem(key));
    if (!data?.access_token) return null;
    // Vérifier expiration
    if (data.expires_at && data.expires_at < Math.floor(Date.now() / 1000)) return null;
    return data.user || null;
  } catch { return null; }
}

function getPrenomLocal(user) {
  if (!user) return null;
  const meta = user.user_metadata || {};
  return meta.prenom || meta.given_name
    || (meta.full_name || meta.name || '').split(' ')[0]
    || user.email?.split('@')[0]
    || null;
}

// ── NAV UNIVERSELLE ──
async function renderNav() {
  await new Promise(r => document.readyState !== 'loading' ? r() : document.addEventListener('DOMContentLoaded', r));
  const navActions = document.getElementById('nav-actions');
  if (!navActions) return;

  const isDashboard = navActions.dataset.page === 'dashboard';

  // ── PHASE 1 : affichage instantané depuis localStorage (synchrone) ──
  const localUser = getSessionLocal();
  if (localUser) {
    const prenomLocal = getPrenomLocal(localUser);
    navActions.innerHTML = `
      <a href="depenses.html" class="nav-depenses">📒 Suivi dépenses</a>
      ${isDashboard ? '' : '<a href="dashboard.html" class="nav-btn-dashboard">Mon tableau de bord</a>'}
      <div class="nav-dropdown" id="nav-dropdown-wrap">
        <button class="nav-profil nav-dropdown-toggle" id="nav-dropdown-btn">👤 ${prenomLocal} ▾</button>
        <ul class="nav-dropdown-menu" id="nav-dropdown-menu">
          <li><a href="profil.html">✏️ Mon profil</a></li>
          <li style="border-top:1px solid var(--sable3);margin-top:4px;padding-top:4px">
            <a href="#" onclick="signOut();return false">🚪 Se déconnecter</a>
          </li>
        </ul>
      </div>`;
    _attachDropdown();
  }

  // ── PHASE 2 : vérification Supabase en arrière-plan ──
  let user = null;
  try {
    user = await getUser();
  } catch {}

  // Si Supabase échoue mais session locale valide → garder l'affichage connecté
  if (!user && localUser) return;

  if (!user) {
    navActions.innerHTML = `
      <a href="depenses.html" class="nav-depenses">📒 Suivi dépenses</a>
      <a href="auth.html" class="nav-btn-dashboard">Se connecter</a>`;
    return;
  }

  const profilOk = await profilCompletDB(user.id);
  const prenom = getPrenomLocal(user) || user.email.split('@')[0];

  navActions.innerHTML = `
    <a href="depenses.html" class="nav-depenses">📒 Suivi dépenses</a>
    ${isDashboard ? '' : '<a href="dashboard.html" class="nav-btn-dashboard">Mon tableau de bord</a>'}
    <div class="nav-dropdown" id="nav-dropdown-wrap">
      <button class="nav-profil nav-dropdown-toggle" id="nav-dropdown-btn">👤 ${prenom} ▾</button>
      <ul class="nav-dropdown-menu" id="nav-dropdown-menu">
        <li><a href="profil.html">${profilOk ? '✏️ Modifier mon profil' : '✏️ Compléter mon profil'}</a></li>
        <li style="border-top:1px solid var(--sable3);margin-top:4px;padding-top:4px">
          <a href="#" onclick="signOut();return false">🚪 Se déconnecter</a>
        </li>
      </ul>
    </div>`;
  _attachDropdown();
}

function _attachDropdown() {

  const btn  = document.getElementById('nav-dropdown-btn');
  const menu = document.getElementById('nav-dropdown-menu');
  if (!btn || !menu) return;
  let closeTimer = null;

  function openMenu()  { clearTimeout(closeTimer); menu.classList.add('open'); }
  function closeMenu() { closeTimer = setTimeout(() => menu.classList.remove('open'), 150); }

  btn.addEventListener('mouseenter', openMenu);
  btn.addEventListener('mouseleave', closeMenu);
  menu.addEventListener('mouseenter', openMenu);
  menu.addEventListener('mouseleave', closeMenu);
  btn.addEventListener('click', () => menu.classList.toggle('open'));

  document.addEventListener('click', e => {
    if (!document.getElementById('nav-dropdown-wrap')?.contains(e.target)) {
      menu.classList.remove('open');
    }
  });
}

// ── DÉPENSES ──
async function ajouterDepense(userId, depense) {
  const { data, error } = await getSB()
    .from('depenses').insert({ user_id: userId, ...depense }).select().single();
  return error ? null : data;
}
async function chargerDepenses(userId, { mois, annee } = {}) {
  let q = getSB().from('depenses').select('*').eq('user_id', userId).order('date', { ascending: false });
  if (mois && annee) {
    const debut = `${annee}-${String(mois).padStart(2,'0')}-01`;
    const fin = new Date(annee, mois, 0).toISOString().split('T')[0];
    q = q.gte('date', debut).lte('date', fin);
  }
  const { data, error } = await q;
  return error ? [] : data;
}
async function supprimerDepense(id) {
  const { error } = await getSB().from('depenses').delete().eq('id', id);
  return !error;
}

// ── MODE FOYER / PERSONNEL ──
function getModeAffichage() {
  return localStorage.getItem('logideal_mode') || 'auto';
  // 'auto' = foyer si couple gestion commune, sinon perso
  // 'foyer' = forcé foyer
  // 'perso' = forcé personnel
}
function setModeAffichage(mode) {
  localStorage.setItem('logideal_mode', mode);
}
function isModeFoyer(profil) {
  const mode = getModeAffichage();
  const peutEtreFoyer = profil && (profil.situation === 'couple' || profil.situation === 'famille')
    && profil.vit_ensemble === 'oui' && profil.gestion_couple === 'commune'
    && (profil.salaire_conjoint || 0) > 0;
  if (!peutEtreFoyer) return false;
  if (mode === 'perso') return false;
  return true; // 'auto' ou 'foyer' → mode foyer si les données sont là
}
function getRevenusPourMode(profil) {
  if (isModeFoyer(profil)) {
    return profil.salaire_foyer || (profil.salaire + (profil.salaire_conjoint || 0));
  }
  return profil.salaire || 0;
}
