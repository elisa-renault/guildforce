-- Ajouter les colonnes pour l'option "Autre" et les questions conditionnelles
ALTER TABLE guild_poll_questions
ADD COLUMN IF NOT EXISTS allow_other boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS condition jsonb DEFAULT NULL;

-- Commentaires pour documentation
COMMENT ON COLUMN guild_poll_questions.allow_other IS 'Permet une option Autre avec texte libre pour single/multiple choice';
COMMENT ON COLUMN guild_poll_questions.condition IS 'Condition JSON pour affichage conditionnel basé sur réponses précédentes';