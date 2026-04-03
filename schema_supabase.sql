-- ══════════════════════════════════════════
--  LOGIDÉAL — Schéma Supabase v1.0
--  À exécuter dans Supabase → SQL Editor
-- ══════════════════════════════════════════


-- ── 1. TABLE PROFILS ──
-- Stocke les données du formulaire profil.html (une ligne par utilisateur)

CREATE TABLE IF NOT EXISTS profils (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  donnees     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index pour les requêtes par user
CREATE INDEX IF NOT EXISTS idx_profils_user ON profils(user_id);

-- Sécurité : chaque utilisateur ne voit que son propre profil
ALTER TABLE profils ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture propre profil" ON profils
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Insertion propre profil" ON profils
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Modification propre profil" ON profils
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Suppression propre profil" ON profils
  FOR DELETE USING (auth.uid() = user_id);


-- ── 2. TABLE DÉPENSES ──
-- Saisie manuelle des dépenses (date, montant, catégorie, note)

CREATE TABLE IF NOT EXISTS depenses (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  montant     NUMERIC(10,2) NOT NULL CHECK (montant > 0),
  categorie   TEXT NOT NULL,
  sous_cat    TEXT,
  note        TEXT,
  source      TEXT DEFAULT 'manuel',  -- 'manuel' | 'alimentation' | 'import'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour filtrer par user + date (requêtes dashboard)
CREATE INDEX IF NOT EXISTS idx_depenses_user_date ON depenses(user_id, date DESC);

-- Sécurité RLS
ALTER TABLE depenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture propres dépenses" ON depenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Insertion propres dépenses" ON depenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Modification propres dépenses" ON depenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Suppression propres dépenses" ON depenses
  FOR DELETE USING (auth.uid() = user_id);


-- ── 3. CATÉGORIES DE DÉPENSES ──
-- Référentiel des catégories (cohérent avec les rubriques du site)

-- (pas de table séparée — on utilise des constantes JS côté client)
-- Catégories : Logement · Mobilité · Alimentation · Abonnements
--              Loisirs · Famille & Santé · Épargne · Autres


-- ── 4. TRIGGER updated_at sur profils ──

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profils_updated_at
  BEFORE UPDATE ON profils
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── VÉRIFICATION ──
-- Après exécution, tu devrais voir 2 tables dans Table Editor :
--   • profils
--   • depenses
