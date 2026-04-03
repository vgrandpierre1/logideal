// Logidéal v1.2.254
// ── PROFIL UTILISATEUR ──
const STORAGE_KEY = 'logideal_profil';

function sauvegarderProfil(profil) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profil));
}

function chargerProfil() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
}

function profilExiste() {
  return !!localStorage.getItem(STORAGE_KEY);
}

// ── CALCULS BUDGET ──
function analyserBudget(profil) {
  // Revenus foyer — utilise salaire_foyer si gestion commune, sinon salaire seul
  const salaire = ((profil.situation === 'couple' || profil.situation === 'famille') && profil.vit_ensemble === 'oui' && profil.gestion_couple === 'commune' && profil.salaire_foyer)
    ? profil.salaire_foyer
    : (profil.salaire || 0);
  // Calcul complet depuis tous les champs détaillés
  const logement = (profil.loyer||0)+(profil.electricite||0)+(profil.eau||0)+(profil.assurance_habitation||0)+(profil.charges_copro||0)+(profil.entretien_maison||0);
  const mobilite = (profil.carburant||0)+(profil.assurance_auto||0)+(profil.entretien_auto||0)+(profil.parking||0)+(profil.transports_commun||0)+(profil.velo||0)+(profil.vtc||0)+(profil.train||0);
  const abonnements = (profil.telephone||0)+(profil.internet||0)+(profil.streaming_video||0)+(profil.streaming_musique||0)+(profil.gaming||0)+(profil.cloud||0)+(profil.presse||0)+(profil.prime||0);
  const alimentaire = (profil.courses||0)+(profil.restaurants||0)+(profil.cafe||0);
  const loisirs = (profil.loisirs_budget||0)+(profil.vetements||0)
    +(profil.culture||0)+((profil.voyages_annuel||0)/12||profil.voyages||0)
    +((profil.cadeaux_annuel||0)/12||profil.cadeaux||0);
  const famille_enfants_var = ((profil.vetements_enfants_annuel||0)/12)+((profil.loisirs_famille_annuel||0)/12);
  const famille = (profil.garde_enfants||0)+(profil.scolarite||0)+(profil.activites_enfants||0)+(profil.pension||0)+famille_enfants_var;
  const sante = (profil.mutuelle||0)+(profil.sante||0)+(profil.dentiste||0);
  const autres = (profil.animal||0)+(profil.formation||0)+(profil.dons||0)
    +((profil.taxe_fonciere_annuel||0)/12)+((profil.taxe_habitation_annuel||0)/12);
  const credits = (profil.credit_immo||0)+(profil.credit_auto||0)+(profil.credit_conso||0)+(profil.credit_autre||0);
  const depenses = logement+mobilite+abonnements+alimentaire+loisirs+famille+sante+autres+credits;
  const resteAvantEpargne = salaire - depenses;
  const epargneReelle = Math.min(profil.epargne||0, Math.max(0, resteAvantEpargne));
  const tauxEpargneReel = salaire > 0 ? (epargneReelle / salaire) * 100 : 0;
  const loyerVal = profil.loyer || 0;

  return {
    depenses, logement, mobilite, abonnements, alimentaire, loisirs, famille, sante, autres, credits,
    resteAvantEpargne, epargneReelle,
    total: depenses, reste: resteAvantEpargne,
    tauxLoyer: salaire > 0 ? (loyerVal / salaire) * 100 : 0,
    tauxEpargne: tauxEpargneReel,
    tauxDepenses: salaire > 0 ? (depenses / salaire) * 100 : 0,
    tauxTotal: salaire > 0 ? (depenses / salaire) * 100 : 0,
    statutLoyer: salaire > 0 ? (loyerVal/salaire<=0.33?'ok':loyerVal/salaire<=0.40?'warn':'bad') : 'ok',
    statutEpargne: tauxEpargneReel >= 10 ? 'ok' : tauxEpargneReel >= 5 ? 'warn' : 'bad',
    statutBudget: resteAvantEpargne >= 0 ? (resteAvantEpargne/salaire >= 0.05 ? 'ok' : 'warn') : 'bad',
  };
}

// ── MENUS SEMAINE ──
const RECETTES = {
  economique: [
    {nom:'Pasta bolognaise maison', budget:1.8, temps:25, calories:520},
    {nom:'Soupe de légumes + pain', budget:1.2, temps:20, calories:320},
    {nom:'Omelette & salade verte', budget:1.5, temps:10, calories:380},
    {nom:'Riz sauté aux légumes', budget:1.4, temps:20, calories:420},
    {nom:'Gratin dauphinois', budget:1.9, temps:60, calories:480},
    {nom:'Lentilles & saucisses', budget:1.8, temps:30, calories:540},
    {nom:'Crêpes salées & fromage', budget:1.3, temps:20, calories:440},
    {nom:'Soupe minestrone', budget:1.1, temps:25, calories:280},
    {nom:'Pâtes au pesto maison', budget:1.6, temps:15, calories:490},
    {nom:'Purée & œufs pochés', budget:1.4, temps:20, calories:410},
  ],
  equilibre: [
    {nom:'Saumon grillé & quinoa', budget:4.2, temps:20, calories:480},
    {nom:'Poulet rôti & légumes', budget:3.5, temps:45, calories:520},
    {nom:'Salade niçoise complète', budget:3.0, temps:15, calories:420},
    {nom:'Steak & patates douces', budget:4.5, temps:25, calories:560},
    {nom:'Curry de pois chiches', budget:2.8, temps:30, calories:460},
    {nom:'Cabillaud & légumes vapeur', budget:4.0, temps:20, calories:380},
    {nom:'Bowl buddha au tofu', budget:3.2, temps:20, calories:440},
    {nom:'Risotto champignons', budget:3.0, temps:35, calories:510},
    {nom:'Filet de dinde & brocoli', budget:3.8, temps:25, calories:400},
    {nom:'Wok de crevettes & riz', budget:4.0, temps:15, calories:470},
  ],
  rapide: [
    {nom:'Tacos maison au poulet', budget:2.5, temps:15, calories:520},
    {nom:'Pesto pasta express', budget:2.0, temps:10, calories:490},
    {nom:'Wrap thon & avocat', budget:2.8, temps:8, calories:440},
    {nom:'Salade composée express', budget:2.2, temps:10, calories:360},
    {nom:'Oeufs brouillés & toast', budget:1.5, temps:8, calories:380},
    {nom:'Soupe tomate & croutons', budget:1.8, temps:10, calories:320},
    {nom:'Sandwich club maison', budget:2.3, temps:10, calories:450},
    {nom:'Bol de riz & légumes rôtis', budget:2.0, temps:15, calories:420},
    {nom:'Pizza pita maison', budget:2.2, temps:12, calories:480},
    {nom:'Quesadilla fromage & jambon', budget:2.0, temps:8, calories:460},
  ]
};

const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

function genererMenuSemaine(budgetCourses, personnes) {
  const budgetParRepas = (budgetCourses / personnes) / 7;
  let type = budgetParRepas < 2 ? 'economique' : budgetParRepas < 3.5 ? 'equilibre' : 'equilibre';
  const recettes = RECETTES[type];
  const shuffled = [...recettes].sort(() => Math.random() - 0.5);
  return JOURS.map((jour, i) => ({
    jour,
    repas: shuffled[i % shuffled.length],
    type
  }));
}

// ── CONSEILS PERSONNALISÉS ──
function genererConseils(profil, analyse) {
  const conseils = [];

  if (analyse.statutLoyer === 'warn' || analyse.statutLoyer === 'bad') {
    conseils.push({
      icone: '🏠',
      titre: 'Ton loyer dépasse la règle des 33%',
      texte: `Ton loyer représente ${Math.round(analyse.tauxLoyer)}% de tes revenus. Idéalement, il ne devrait pas dépasser 33%. Envisage une colocation ou un déménagement dans un secteur moins cher.`,
      lien: 'logement.html',
      priorite: 'warn'
    });
  }

  if (analyse.statutEpargne === 'warn' || analyse.statutEpargne === 'bad') {
    const objectif = Math.round(profil.salaire * 0.10);
    conseils.push({
      icone: '💰',
      titre: 'Augmente ton taux d\'épargne',
      texte: `Tu épargnes ${Math.round(analyse.tauxEpargne)}% de tes revenus. L'objectif recommandé est 10%, soit ${objectif}€/mois. Quelques ajustements suffisent souvent.`,
      lien: 'epargne.html',
      priorite: analyse.statutEpargne
    });
  }

  if (analyse.statutBudget === 'bad') {
    conseils.push({
      icone: '⚠️',
      titre: 'Ton budget est déficitaire',
      texte: `Tes dépenses dépassent tes revenus de ${Math.abs(Math.round(analyse.reste))}€. Il faut identifier les postes à réduire en priorité.`,
      lien: 'charges.html',
      priorite: 'bad'
    });
  }

  if (analyse.statutBudget === 'ok' && analyse.statutLoyer === 'ok' && analyse.statutEpargne === 'ok') {
    conseils.push({
      icone: '✅',
      titre: 'Ton budget est bien équilibré !',
      texte: `Bravo, tu gères bien tes finances. Explore nos conseils pour optimiser encore ton épargne et tes charges.`,
      lien: 'epargne.html',
      priorite: 'ok'
    });
  }

  return conseils;
}

// ── NAVIGATION AVEC PROFIL ──
function verifierProfil(redirigerVers) {
  if (!profilExiste()) {
    window.location.href = 'index.html';
    return null;
  }
  return chargerProfil();
}

// ── SCROLL ANIMATIONS ──
document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(el => { if (el.isIntersecting) el.target.classList.add('visible'); });
  }, { threshold: 0.08 });
  document.querySelectorAll('.anim').forEach(el => observer.observe(el));
});

// ── FORMAT MONNAIE ──
function formatEuro(n) {
  if (n >= 5) {
    return Math.ceil(n).toLocaleString('fr-FR') + ' €';
  }
  const val = Math.ceil(n * 10) / 10;
  // N'afficher la décimale que si elle est non nulle
  if (val === Math.floor(val)) {
    return Math.floor(val).toLocaleString('fr-FR') + ' €';
  }
  return val.toLocaleString('fr-FR', {minimumFractionDigits: 1, maximumFractionDigits: 1}) + ' €';
}

function formatPct(n) {
  return Math.round(n) + '%';
}

// ── SEGMENTATION PROFIL ──
function getProfilType(profil, analyse) {
  const baseRevenu = (profil.gestion_couple === 'commune' && profil.salaire_foyer)
    ? profil.salaire_foyer : (profil.salaire || 1);
  const taux = analyse.resteAvantEpargne / baseRevenu;
  if (taux < 0) return 'deficitaire';
  if (taux < 0.10) return 'serre';
  if (taux < 0.25) return 'equilibre';
  if (taux < 0.40) return 'aise';
  return 'confortable';
}

function getProfilConfig(type) {
  const configs = {
    deficitaire: {
      nom: '⚠️ Budget déficitaire',
      couleur: 'var(--danger)',
      message: 'Tes dépenses dépassent tes revenus. Priorité absolue : identifier et réduire les postes les plus lourds.',
      orientation: 'optimisation'
    },
    serre: {
      nom: '🎯 Profil Optimiseur',
      couleur: 'var(--warning)',
      message: 'Marge serrée. On va t\'aider à optimiser chaque poste et dénicher des économies concrètes.',
      orientation: 'optimisation'
    },
    equilibre: {
      nom: '⚖️ Profil Équilibré',
      couleur: 'var(--terra)',
      message: 'Bonne situation. On va consolider ton épargne et t\'initier aux premiers placements sûrs.',
      orientation: 'epargne'
    },
    aise: {
      nom: '📈 Profil Épargnant+',
      couleur: 'var(--terra)',
      message: 'Belle marge de manœuvre. Cap sur des stratégies d\'investissement accessibles et rentables.',
      orientation: 'investissement'
    },
    confortable: {
      nom: '💎 Profil Investisseur',
      couleur: 'var(--success)',
      message: 'Excellent reste à vivre. On t\'accompagne vers une stratégie patrimoniale solide et diversifiée.',
      orientation: 'patrimoine'
    }
  };
  return configs[type] || configs['equilibre'];
}

// Conseils personnalisés selon profil ET orientation
function genererConseilsV2(profil, analyse) {
  const type = getProfilType(profil, analyse);
  const conseils = [];

  // Conseil loyer
  if (analyse.statutLoyer === 'warn' || analyse.statutLoyer === 'bad') {
    conseils.push({
      icone: '🏠', priorite: analyse.statutLoyer,
      titre: 'Ton loyer pèse trop lourd',
      texte: `${Math.round(analyse.tauxLoyer)}% de tes revenus partent en loyer (seuil : 33%). ${type === 'serre' ? 'Une colocation ou un déménagement peut libérer plusieurs centaines d\'euros par mois.' : 'Envisage de renégocier ou de comparer les offres de ton secteur.'}`,
      lien: 'logement.html'
    });
  }

  // Conseils selon orientation
  if (type === 'deficitaire' || type === 'serre') {
    conseils.push({ icone: '✂️', priorite: 'bad', titre: 'Audit de tes abonnements', texte: 'Streaming, téléphone, salle de sport… En moyenne, on oublie 3-4 abonnements actifs. 15 minutes d\'audit peuvent libérer 40 à 80€/mois.', lien: 'charges.html' });
    conseils.push({ icone: '🛒', priorite: 'warn', titre: 'Optimise tes courses', texte: 'Planifier ses menus avant de faire ses courses réduit le budget alimentaire de 20 à 30% en moyenne. Notre générateur t\'y aide.', lien: 'alimentation.html' });
    if (profil.zone === 'paris') conseils.push({ icone: '🚇', priorite: 'warn', titre: 'Transport Paris : passes Navigo', texte: 'Le pass Navigo annuel revient moins cher que 10 mensualités. Combiné au vélo, il peut diviser ta facture transport par 2.', lien: 'charges.html' });
  }

  if (type === 'equilibre') {
    conseils.push({ icone: '🐷', priorite: 'ok', titre: 'Lance ton épargne automatique', texte: 'Programme un virement automatique le jour de ta paie. Même 50€/mois investis tôt valent bien plus que 200€ investis tard.', lien: 'epargne.html' });
    conseils.push({ icone: '📊', priorite: 'ok', titre: 'Livret A et PEL d\'abord', texte: 'Avant tout placement complexe, assure-toi d\'avoir 3 mois de dépenses sur un livret A. C\'est ton filet de sécurité essentiel.', lien: 'epargne.html' });
  }

  if (type === 'aise') {
    conseils.push({ icone: '📈', priorite: 'ok', titre: 'Découvre les ETF indiciels', texte: 'Les ETF permettent d\'investir en Bourse avec des frais très faibles (< 0.3%/an). Sur 10 ans, ils surpassent 90% des fonds gérés activement.', lien: 'epargne.html' });
    conseils.push({ icone: '🏦', priorite: 'ok', titre: 'Ouvre un PEA', texte: 'Le Plan d\'Épargne en Actions est l\'enveloppe fiscale idéale pour investir en Bourse. Exonération d\'impôts après 5 ans de détention.', lien: 'epargne.html' });
    if (profil.age && profil.age < 35) conseils.push({ icone: '🏡', priorite: 'ok', titre: 'Pense à l\'apport immobilier', texte: `À ${profil.age} ans avec ta capacité d'épargne, un apport de 10% pour un achat immo dans 3-5 ans est tout à fait atteignable.`, lien: 'epargne.html' });
  }

  if (type === 'confortable') {
    conseils.push({ icone: '💎', priorite: 'ok', titre: 'Assurance-vie multi-supports', texte: 'Avec ton niveau d\'épargne, une assurance-vie en unités de compte te permet de diversifier (actions, obligations, immo) avec une fiscalité avantageuse.', lien: 'epargne.html' });
    conseils.push({ icone: '🏢', priorite: 'ok', titre: 'SCPI : l\'immo sans contraintes', texte: 'Les SCPI permettent d\'investir dans l\'immobilier professionnel dès 1 000€, avec des rendements moyens de 4 à 5% par an sans gestion locative.', lien: 'epargne.html' });
    conseils.push({ icone: '📋', priorite: 'ok', titre: 'Optimise ta fiscalité', texte: 'À ton niveau de revenus, des dispositifs comme le PER (Plan Épargne Retraite) permettent de défiscaliser jusqu\'à plusieurs milliers d\'euros par an.', lien: 'epargne.html' });
  }

  // Conseil enfants
  if (profil.enfants > 0) {
    conseils.push({ icone: '👶', priorite: 'ok', titre: `${profil.enfants} enfant${profil.enfants > 1 ? 's' : ''} : vérifie tes droits`, texte: 'CAF, allocations familiales, complément de libre choix… De nombreuses aides sont sous-utilisées. Un bilan CAF prend 10 minutes et peut révéler des centaines d\'euros d\'aides annuelles.', lien: 'dashboard.html' });
  }

  // Conseil contrat précaire
  if (profil.contrat === 'cdd' || profil.contrat === 'independant') {
    conseils.push({ icone: '🛡️', priorite: 'warn', titre: 'Contrat précaire : renforce ton épargne de précaution', texte: 'Avec un contrat non permanent, vise 6 mois de dépenses en épargne de précaution (livret A) avant tout investissement.', lien: 'epargne.html' });
  }

  return conseils.slice(0, 4);
}
