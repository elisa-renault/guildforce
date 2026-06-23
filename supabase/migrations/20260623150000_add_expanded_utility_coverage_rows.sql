WITH seed_abilities (
  ability_key,
  coverage_key,
  ability_kind,
  spell_id,
  source,
  active,
  sort_order
) AS (
  VALUES
    ('death_grip_enemy_grouping', 'enemy_grips_and_grouping', 'raid_utility', 49576, 'manual', true, 400),
    ('gorefiends_grasp', 'enemy_grips_and_grouping', 'raid_utility', 108199, 'manual', true, 401),
    ('abomination_limb', 'enemy_grips_and_grouping', 'raid_utility', 315443, 'manual', true, 402),
    ('sigil_of_chains_enemy_grouping', 'enemy_grips_and_grouping', 'raid_utility', 202138, 'manual', true, 403),
    ('ursols_vortex_enemy_grouping', 'enemy_grips_and_grouping', 'raid_utility', 102793, 'manual', true, 404),

    ('misdirection', 'threat_redirection', 'raid_utility', 34477, 'manual', true, 410),
    ('tricks_of_the_trade', 'threat_redirection', 'raid_utility', 57934, 'manual', true, 411),

    ('solar_beam', 'silences_and_anti_cast', 'raid_utility', 78675, 'manual', true, 420),
    ('sigil_of_silence', 'silences_and_anti_cast', 'raid_utility', 202137, 'manual', true, 421),
    ('silence_priest', 'silences_and_anti_cast', 'raid_utility', 15487, 'manual', true, 422),
    ('wailing_arrow', 'silences_and_anti_cast', 'raid_utility', 392060, 'manual', true, 423),

    ('blessing_of_freedom', 'ally_freedom_and_mobility', 'raid_utility', 1044, 'manual', true, 430),
    ('tigers_lust', 'ally_freedom_and_mobility', 'raid_utility', 116841, 'manual', true, 431),
    ('masters_call', 'ally_freedom_and_mobility', 'raid_utility', 53271, 'manual', true, 432),
    ('rescue_evoker', 'ally_freedom_and_mobility', 'raid_utility', 370665, 'manual', true, 433),
    ('leap_of_faith', 'ally_freedom_and_mobility', 'raid_utility', 73325, 'manual', true, 434),
    ('angelic_feather', 'ally_freedom_and_mobility', 'raid_utility', 121536, 'manual', true, 435),

    ('mind_freeze_interrupt', 'interrupts', 'raid_utility', 47528, 'manual', true, 450),
    ('disrupt_interrupt', 'interrupts', 'raid_utility', 183752, 'manual', true, 451),
    ('skull_bash_interrupt', 'interrupts', 'raid_utility', 106839, 'manual', true, 452),
    ('quell_interrupt', 'interrupts', 'raid_utility', 351338, 'manual', true, 453),
    ('counter_shot_interrupt', 'interrupts', 'raid_utility', 147362, 'manual', true, 454),
    ('muzzle_interrupt', 'interrupts', 'raid_utility', 187707, 'manual', true, 455),
    ('counterspell_interrupt', 'interrupts', 'raid_utility', 2139, 'manual', true, 456),
    ('spear_hand_strike_interrupt', 'interrupts', 'raid_utility', 116705, 'manual', true, 457),
    ('rebuke_interrupt', 'interrupts', 'raid_utility', 96231, 'manual', true, 458),
    ('kick_interrupt', 'interrupts', 'raid_utility', 1766, 'manual', true, 459),
    ('wind_shear_interrupt', 'interrupts', 'raid_utility', 57994, 'manual', true, 460),
    ('spell_lock_interrupt', 'interrupts', 'raid_utility', 19647, 'manual', true, 461),
    ('axe_toss_interrupt', 'interrupts', 'raid_utility', 89766, 'manual', true, 462),
    ('pummel_interrupt', 'interrupts', 'raid_utility', 6552, 'manual', true, 463)
)
INSERT INTO public.composition_abilities (
  ability_key,
  coverage_key,
  ability_kind,
  spell_id,
  source,
  active,
  sort_order
)
SELECT
  ability_key,
  coverage_key,
  ability_kind,
  spell_id,
  source,
  active,
  sort_order
FROM seed_abilities
ON CONFLICT (ability_key) DO UPDATE
SET
  coverage_key = EXCLUDED.coverage_key,
  ability_kind = EXCLUDED.ability_kind,
  spell_id = EXCLUDED.spell_id,
  source = EXCLUDED.source,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

WITH seed_mappings (
  ability_key,
  class_id,
  spec_id
) AS (
  VALUES
    ('death_grip_enemy_grouping', 'death-knight', NULL),
    ('gorefiends_grasp', 'death-knight', 'dk-blood'),
    ('abomination_limb', 'death-knight', NULL),
    ('sigil_of_chains_enemy_grouping', 'demon-hunter', 'dh-vengeance'),
    ('ursols_vortex_enemy_grouping', 'druid', NULL),

    ('misdirection', 'hunter', NULL),
    ('tricks_of_the_trade', 'rogue', NULL),

    ('solar_beam', 'druid', 'druid-balance'),
    ('sigil_of_silence', 'demon-hunter', 'dh-vengeance'),
    ('silence_priest', 'priest', 'priest-shadow'),
    ('wailing_arrow', 'hunter', 'hunter-beast-mastery'),
    ('wailing_arrow', 'hunter', 'hunter-marksmanship'),

    ('blessing_of_freedom', 'paladin', NULL),
    ('tigers_lust', 'monk', NULL),
    ('masters_call', 'hunter', NULL),
    ('rescue_evoker', 'evoker', NULL),
    ('leap_of_faith', 'priest', NULL),
    ('angelic_feather', 'priest', NULL),

    ('mind_freeze_interrupt', 'death-knight', NULL),
    ('disrupt_interrupt', 'demon-hunter', NULL),
    ('skull_bash_interrupt', 'druid', 'druid-feral'),
    ('skull_bash_interrupt', 'druid', 'druid-guardian'),
    ('quell_interrupt', 'evoker', 'evoker-devastation'),
    ('quell_interrupt', 'evoker', 'evoker-augmentation'),
    ('counter_shot_interrupt', 'hunter', 'hunter-beast-mastery'),
    ('counter_shot_interrupt', 'hunter', 'hunter-marksmanship'),
    ('muzzle_interrupt', 'hunter', 'hunter-survival'),
    ('counterspell_interrupt', 'mage', NULL),
    ('spear_hand_strike_interrupt', 'monk', 'monk-brewmaster'),
    ('spear_hand_strike_interrupt', 'monk', 'monk-windwalker'),
    ('rebuke_interrupt', 'paladin', 'paladin-protection'),
    ('rebuke_interrupt', 'paladin', 'paladin-retribution'),
    ('kick_interrupt', 'rogue', NULL),
    ('wind_shear_interrupt', 'shaman', NULL),
    ('spell_lock_interrupt', 'warlock', 'warlock-affliction'),
    ('spell_lock_interrupt', 'warlock', 'warlock-destruction'),
    ('axe_toss_interrupt', 'warlock', 'warlock-demonology'),
    ('pummel_interrupt', 'warrior', NULL)
)
INSERT INTO public.composition_ability_mappings (
  ability_id,
  class_id,
  spec_id,
  role,
  applies_to_main,
  applies_to_offspec_alt
)
SELECT
  abilities.id,
  mappings.class_id,
  mappings.spec_id,
  NULL,
  true,
  false
FROM seed_mappings mappings
JOIN public.composition_abilities abilities
  ON abilities.ability_key = mappings.ability_key
WHERE NOT EXISTS (
  SELECT 1
  FROM public.composition_ability_mappings existing
  WHERE existing.ability_id = abilities.id
    AND existing.class_id = mappings.class_id
    AND existing.spec_id IS NOT DISTINCT FROM mappings.spec_id
    AND existing.role IS NULL
);

WITH seed_spells (
  spell_id,
  name_en,
  name_fr,
  name_de,
  name_es,
  name_pt_br,
  name_it,
  name_ru,
  name_zh_tw,
  name_ko
) AS (
  VALUES
    (49576, 'Death Grip', 'Poigne de la mort', 'Todesgriff', 'Atracción letal', 'Garra da Morte', 'Presa Mortale', 'Хватка смерти', '死亡之握', '죽음의 손아귀'),
    (108199, 'Gorefiend''s Grasp', 'Emprise de Fielsang', 'Blutschattens Griff', 'Abrazo de Sanguino', 'Garra de Sanguinávido', 'Presa di Malacarne', 'Хватка Кровожада', '血魔之握', '고어핀드의 손아귀'),
    (315443, 'Abomination Limb', 'Membre abominable', 'Monströse Gliedmaße', 'Extremidad abominable', 'Membro da Abominação', 'Arto di Abominio', 'Рука поганища', '憎惡體外肢', '흉물 사지'),
    (202138, 'Sigil of Chains', 'Sigil de chaînes', 'Zeichen der Ketten', 'Sigilo de cadenas', 'Signo dos Grilhões', 'Sigillo delle Catene', 'Печать цепей', '鎖鏈符印', '사슬의 인장'),
    (102793, 'Ursol''s Vortex', 'Vortex d’Ursol', 'Ursols Vortex', 'Vórtice de Ursol', 'Vórtice de Ursol', 'Vortice di Ursol', 'Вихрь Урсола', '厄索爾的漩渦', '우르솔의 회오리'),
    (34477, 'Misdirection', 'Détournement', 'Irreführung', 'Redirección', 'Redirecionar', 'Depistaggio', 'Перенаправление', '誤導', '눈속임'),
    (57934, 'Tricks of the Trade', 'Ficelles du métier', 'Schurkenhandel', 'Secretos del oficio', 'Truques do Ofício', 'Trucchi del Mestiere', 'Маленькие хитрости', '偷天換日', '속임수 거래'),
    (78675, 'Solar Beam', 'Rayon solaire', 'Sonnenstrahl', 'Rayo solar', 'Raio Solar', 'Fascio Solare', 'Столп солнечного света', '太陽光束', '태양 광선'),
    (202137, 'Sigil of Silence', 'Sigil de silence', 'Zeichen der Stille', 'Sigilo de silencio', 'Signo do Silêncio', 'Sigillo del Silenzio', 'Печать немоты', '沉默符印', '침묵의 인장'),
    (15487, 'Silence', 'Silence', 'Stille', 'Silencio', 'Silêncio', 'Silenzio', 'Безмолвие', '沉默', '침묵'),
    (392060, 'Wailing Arrow', 'Flèche gémissante', 'Klagender Pfeil', 'Flecha lastimera', 'Seta Plangente', 'Freccia Funesta', 'Стенающая стрела', '悲鳴箭', '울부짖는 화살'),
    (1044, 'Blessing of Freedom', 'Bénédiction de liberté', 'Segen der Freiheit', 'Bendición de libertad', 'Bênção da Liberdade', 'Benedizione della Libertà', 'Благословенная свобода', '自由祝福', '자유의 축복'),
    (116841, 'Tiger''s Lust', 'Soif du tigre', 'Tigerrausch', 'Deseo del tigre', 'Luxúria do Tigre', 'Brama della Tigre', 'Тигриное рвение', '猛虎出閘', '범의 욕망'),
    (53271, 'Master''s Call', 'Appel du maître', 'Ruf des Meisters', 'Llamada del amo', 'Chamado do Mestre', 'Richiamo del Padrone', 'Приказ хозяина', '主人的呼喚', '주인의 부름'),
    (370665, 'Rescue', 'Secourir', 'Retten', 'Rescatar', 'Resgate', 'Salvataggio', 'Спасение', '救援', '구출'),
    (73325, 'Leap of Faith', 'Saut de foi', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (121536, 'Angelic Feather', 'Plume angélique', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (47528, 'Mind Freeze', 'Gel de l’esprit', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (183752, 'Disrupt', 'Disruption', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (106839, 'Skull Bash', 'Coup de crâne', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (351338, 'Quell', 'Quell', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (147362, 'Counter Shot', 'Contre-tir', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (187707, 'Muzzle', 'Muselière', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (2139, 'Counterspell', 'Contresort', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (116705, 'Spear Hand Strike', 'Pique de main', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (96231, 'Rebuke', 'Réprimandes', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (1766, 'Kick', 'Coup de pied', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (57994, 'Wind Shear', 'Cisaille de vent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (19647, 'Spell Lock', 'Verrou magique', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (89766, 'Axe Toss', 'Lancer de hache', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (6552, 'Pummel', 'Volée de coups', NULL, NULL, NULL, NULL, NULL, NULL, NULL)
)
INSERT INTO public.wow_spells (
  spell_id,
  name_en,
  name_fr,
  name_de,
  name_es,
  name_pt_br,
  name_it,
  name_ru,
  name_zh_tw,
  name_ko,
  updated_at
)
SELECT
  spell_id,
  name_en,
  name_fr,
  name_de,
  name_es,
  name_pt_br,
  name_it,
  name_ru,
  name_zh_tw,
  name_ko,
  now()
FROM seed_spells
ON CONFLICT (spell_id) DO UPDATE
SET
  name_en = COALESCE(EXCLUDED.name_en, public.wow_spells.name_en),
  name_fr = COALESCE(EXCLUDED.name_fr, public.wow_spells.name_fr),
  name_de = COALESCE(EXCLUDED.name_de, public.wow_spells.name_de),
  name_es = COALESCE(EXCLUDED.name_es, public.wow_spells.name_es),
  name_pt_br = COALESCE(EXCLUDED.name_pt_br, public.wow_spells.name_pt_br),
  name_it = COALESCE(EXCLUDED.name_it, public.wow_spells.name_it),
  name_ru = COALESCE(EXCLUDED.name_ru, public.wow_spells.name_ru),
  name_zh_tw = COALESCE(EXCLUDED.name_zh_tw, public.wow_spells.name_zh_tw),
  name_ko = COALESCE(EXCLUDED.name_ko, public.wow_spells.name_ko),
  updated_at = now();
