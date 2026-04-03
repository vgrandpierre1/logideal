// ── MODULE IA LOGIDÉAL ──
// Génère des conseils ultra-personnalisés via Claude API

async function genererConseilIA(page, profil, contexteSupp) {
  const cats = calculerCategories(profil);
  const salaire = profil.salaire || 0;
  const reste = salaire - cats.total;

  const situationLabels = {seul:'célibataire',couple:'en couple',famille:'en famille',coloc:'en colocation'};
  const zoneLabels = {paris:'région parisienne',grande_ville:'grande ville',province:'province'};
  const contratLabels = {cdi:'CDI',cdd:'CDD',independant:'indépendant',autre:'autre contrat'};
  const profilLabels = {deficitaire:'budget déficitaire',serre:'budget serré (profil Optimiseur)',equilibre:'budget équilibré',aise:'budget confortable (profil Épargnant+)',confortable:'excellent budget (profil Investisseur)'};

  const pType = reste<0?'deficitaire':reste/salaire<0.10?'serre':reste/salaire<0.25?'equilibre':reste/salaire<0.40?'aise':'confortable';

  const profilResume = [
    profil.age ? `${profil.age} ans` : null,
    profil.situation ? situationLabels[profil.situation] : null,
    profil.enfants > 0 ? `${profil.enfants} enfant(s)` : null,
    profil.contrat ? contratLabels[profil.contrat] : null,
    profil.zone ? `en ${zoneLabels[profil.zone]}` : null,
    profil.statut_logement === 'proprietaire' ? 'propriétaire' : profil.statut_logement === 'accession' ? 'en accession immobilière' : 'locataire',
  ].filter(Boolean).join(', ');

  const budgetResume = `
- Revenus nets : ${salaire}€/mois
- Total dépenses : ${cats.total}€/mois (${Math.round(cats.total/salaire*100)}% des revenus)
- Reste à vivre : ${reste}€/mois
- Profil : ${profilLabels[pType]}
- Logement (loyer + charges) : ${cats.logement}€ (${Math.round(cats.logement/salaire*100)}%)
- Alimentation : ${cats.alimentaire}€ (${Math.round(cats.alimentaire/salaire*100)}%)
- Abonnements : ${cats.abonnements}€ (${Math.round(cats.abonnements/salaire*100)}%)
- Transport : ${cats.mobilite}€ (${Math.round(cats.mobilite/salaire*100)}%)
- Loisirs & bien-être : ${cats.loisirs}€ (${Math.round(cats.loisirs/salaire*100)}%)
- Crédits : ${cats.credits}€ (${Math.round(cats.credits/salaire*100)}%)
- Famille & santé : ${cats.famille + cats.sante}€
- Épargne souhaitée : ${profil.epargne||0}€/mois
- Objectif déclaré : ${profil.objectif || 'non précisé'}
${contexteSupp || ''}`;

  const prompts = {
    alimentation: `Tu es un conseiller financier expert en gestion du budget alimentaire. Voici le profil d'un utilisateur de l'application Logidéal :

Profil : ${profilResume}
${budgetResume}

Détail alimentation :
- Courses : ${profil.courses||0}€
- Restaurants/livraison : ${profil.restaurants||0}€
- Café/snacks : ${profil.cafe||0}€

Donne 4 conseils très concrets, chiffrés et personnalisés pour optimiser son budget alimentation. Tiens compte de sa zone géographique, sa situation familiale et son profil financier. 

Si son profil est "aisé" ou "investisseur", oriente vers la qualité et l'alimentation saine plutôt que les économies à tout prix.
Si son profil est "serré" ou "déficitaire", donne des astuces concrètes pour réduire le budget courses sans sacrifier la qualité nutritionnelle.

Format : 4 blocs JSON avec cette structure exacte (réponds UNIQUEMENT en JSON, sans markdown) :
[{"titre":"...","texte":"...","economie":"...","priorite":"ok|warn|bad"}]
Le champ "economie" indique l'économie potentielle estimée (ex: "~30€/mois") ou "" si non applicable.`,

    logement: `Tu es un expert en immobilier et gestion du budget logement. Voici le profil d'un utilisateur de Logidéal :

Profil : ${profilResume}
${budgetResume}

Détail logement :
- Loyer/crédit immo : ${profil.loyer||0}€
- Électricité/gaz : ${profil.electricite||0}€
- Eau : ${profil.eau||0}€
- Assurance habitation : ${profil.assurance_habitation||0}€
- Charges copro : ${profil.charges_copro||0}€
- Crédit immobilier : ${profil.credit_immo||0}€
- Statut : ${profil.statut_logement || 'locataire'}

Donne 4 conseils ultra-personnalisés sur le logement. Si propriétaire, parle de renégociation de prêt, travaux, défiscalisation. Si locataire, parle de droits, APL, négociation. Tiens compte de la zone géographique.

Format JSON uniquement :
[{"titre":"...","texte":"...","economie":"...","priorite":"ok|warn|bad"}]`,

    epargne: `Tu es un conseiller en gestion de patrimoine et épargne. Voici le profil d'un utilisateur de Logidéal :

Profil : ${profilResume}
${budgetResume}

Détail épargne :
- Épargne souhaitée : ${profil.epargne||0}€/mois
- Investissement souhaité : ${profil.investissement||0}€/mois
- Épargne réellement possible : ${Math.min(profil.epargne||0, Math.max(0, reste))}€/mois

${pType === 'aise' || pType === 'confortable' ? 
'Cet utilisateur a un bon reste à vivre. Oriente vers des stratégies d\'investissement : ETF, PEA, assurance-vie, SCPI, défiscalisation. Sois précis sur les produits financiers adaptés à son âge et situation.' : 
'Cet utilisateur a peu de marge. Aide-le à construire une épargne de précaution d\'abord, puis les premiers placements simples (Livret A, LEP).'}

Donne 4 conseils personnalisés et actionnables sur l'épargne et l'investissement.

Format JSON uniquement :
[{"titre":"...","texte":"...","economie":"...","priorite":"ok|warn|bad"}]`,

    mobilite: `Tu es un expert en optimisation des dépenses de transport en France. Voici le profil complet d'un utilisateur de Logidéal :

Profil : ${profilResume}
${budgetResume}

Détail mobilité déclaré :
- Carburant : ${profil.carburant||0}€/mois
- Assurance auto : ${profil.assurance_auto||0}€/mois
- Entretien auto : ${profil.entretien_auto||0}€/mois
- Parking/péages : ${profil.parking||0}€/mois
- Transports en commun : ${profil.transports_commun||0}€/mois
- Vélo/trottinette : ${profil.velo||0}€/mois
- VTC/taxi : ${profil.vtc||0}€/mois
- Covoiturage : ${profil.covoiturage||0}€/mois
- Train/avion : ${profil.train||0}€/mois

${contexteSupp || ''}

Génère 5 conseils ultra-personnalisés, concrets et chiffrés pour optimiser sa mobilité.
Règles importantes :
- Appuie-toi sur les données calculées fournies (coût réel, dépréciation) pour justifier tes conseils
- Cite des chiffres précis issus de son profil (pas de généralités)
- Adapte à sa zone géographique (${profil.zone||'province'}) : les alternatives TC ne sont pas les mêmes en province qu'à Paris
- Si la dépréciation est élevée, c'est probablement le conseil le plus impactant — mets-le en avant
- Propose des actions concrètes avec des liens ou noms d'outils français (LeLynx, Leocare, BlaBlaCar, SNCF Connect…)
- Varie les priorités : au moins 1 "ok" (confirmation), 2 "warn" (à optimiser), 1 "bad" (urgent si applicable)

Format JSON uniquement, sans markdown, sans texte avant ou après :
[{"titre":"...","texte":"...","economie":"~XX€/mois ou vide si non applicable","priorite":"ok|warn|bad"}]`,

    charges: `Tu es un expert en optimisation des charges et abonnements. Voici le profil d'un utilisateur de Logidéal :

Profil : ${profilResume}
${budgetResume}

Détail charges et abonnements :
- Téléphone : ${profil.telephone||0}€
- Internet/box : ${profil.internet||0}€
- Streaming vidéo : ${profil.streaming_video||0}€
- Streaming musique : ${profil.streaming_musique||0}€
- Gaming : ${profil.gaming||0}€
- Cloud : ${profil.cloud||0}€
- Presse : ${profil.presse||0}€
- Amazon Prime : ${profil.prime||0}€
- Assurance habitation : ${profil.assurance_habitation||0}€
- Assurance auto : ${profil.assurance_auto||0}€
- Mutuelle : ${profil.mutuelle||0}€

Identifie les abonnements qui semblent élevés ou redondants. Propose des alternatives concrètes avec des prix actuels du marché. Chiffre précisément les économies potentielles.

Format JSON uniquement :
[{"titre":"...","texte":"...","economie":"...","priorite":"ok|warn|bad"}]`,
  };

  const prompt = prompts[page];
  if (!prompt) return null;

  try {
    // Appel via le proxy Netlify — la clé API reste côté serveur
    const response = await fetch('/.netlify/functions/claude-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Erreur API:', data);
      return null;
    }
    const text = data.content?.map(i => i.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch(e) {
    console.error('Erreur IA:', e);
    return null;
  }
}

function calculerCategories(p) {
  const logement=(p.loyer||0)+(p.electricite||0)+(p.eau||0)+(p.assurance_habitation||0)+(p.charges_copro||0)+(p.entretien_maison||0);
  const mobilite=(p.carburant||0)+(p.assurance_auto||0)+(p.entretien_auto||0)+(p.parking||0)+(p.transports_commun||0)+(p.velo||0)+(p.vtc||0)+(p.train||0);
  const abonnements=(p.telephone||0)+(p.internet||0)+(p.streaming_video||0)+(p.streaming_musique||0)+(p.gaming||0)+(p.cloud||0)+(p.presse||0)+(p.prime||0);
  const alimentaire=(p.courses||0)+(p.restaurants||0)+(p.cafe||0);
  const loisirs=(p.culture||0)+(p.voyages||0)+(p.vetements||0)+(p.cadeaux||0)+(p.sport||0)+(p.bienetre||0)+(p.tabac||0);
  const famille=(p.garde_enfants||0)+(p.scolarite||0)+(p.activites_enfants||0)+(p.pension||0);
  const sante=(p.mutuelle||0)+(p.sante||0)+(p.dentiste||0);
  const autres=(p.animal||0)+(p.formation||0)+(p.dons||0);
  const credits=(p.credit_immo||0)+(p.credit_auto||0)+(p.credit_conso||0)+(p.credit_autre||0);
  const total=logement+mobilite+abonnements+alimentaire+loisirs+famille+sante+autres+credits;
  return {logement,mobilite,abonnements,alimentaire,loisirs,famille,sante,autres,credits,total};
}

// ── RENDU DES CONSEILS IA ──
function renderConseilsIA(conseils, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (!conseils || conseils.length === 0) {
    container.innerHTML = '<p style="color:var(--gris);font-size:0.85rem">Impossible de charger les conseils pour le moment.</p>';
    return;
  }
  conseils.forEach(c => {
    const prioriteColor = c.priorite === 'bad' ? 'var(--danger)' : c.priorite === 'warn' ? 'var(--warning)' : 'var(--terra)';
    container.innerHTML += `
      <div style="background:var(--creme);border-radius:var(--radius);padding:24px;border-left:4px solid ${prioriteColor}">
        <div style="font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:var(--texte);margin-bottom:8px">${c.titre}</div>
        <p style="font-size:0.83rem;color:var(--gris);line-height:1.65;font-weight:300;margin-bottom:${c.economie?'10px':'0'}">${c.texte}</p>
        ${c.economie ? `<div style="display:inline-flex;align-items:center;gap:6px;background:var(--terra-pale);color:var(--terra-dark);font-size:0.75rem;font-weight:700;padding:4px 12px;border-radius:50px">💰 Économie estimée : ${c.economie}</div>` : ''}
      </div>`;
  });
}

// ── BLOC IA COMPLET avec loading ──
async function chargerConseilsIA(page, containerId, profilLocal) {
  const profil = profilLocal || chargerProfil();
  if (!profil) return;

  const container = document.getElementById(containerId);
  if (!container) return;

  // Loading state
  container.innerHTML = `
    <div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;gap:14px;padding:32px;color:var(--gris)">
      <div class="ia-loader"></div>
      <div style="font-size:0.85rem">L'IA analyse ton profil et tes dépenses…</div>
    </div>`;

  const conseils = await genererConseilIA(page, profil);
  renderConseilsIA(conseils, containerId);
}
