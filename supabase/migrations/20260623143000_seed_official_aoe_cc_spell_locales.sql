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
    (122, 'Frost Nova', 'Nova de givre', 'Frostnova', 'Nova de Escarcha', 'Nova Congelante', 'Esplosione Gelida', 'Кольцо льда', '冰霜新星', '얼음 회오리'),
    (2484, 'Earthbind Totem', 'Totem de lien terrestre', 'Totem der Erdbindung', 'Tótem Nexo Terrestre', 'Totem de Prisão Terrena', 'Totem del Vincolo Terrestre', 'Тотем оков земли', '地縛圖騰', '속박의 토템'),
    (12323, 'Piercing Howl', 'Hurlement perçant', 'Durchdringendes Heulen', 'Aullido perforador', 'Uivo Perfurante', 'Urlo Penetrante', 'Пронзительный вой', '刺耳怒吼', '날카로운 고함'),
    (30283, 'Shadowfury', 'Furie de l’ombre', 'Schattenfuror', 'Furia de las Sombras', 'Fúria Sombria', 'Furia dell''Ombra', 'Неистовство Тьмы', '暗影之怒', '어둠의 격노'),
    (46968, 'Shockwave', 'Onde de choc', 'Schockwelle', 'Ola de choque', 'Onda de Choque', 'Onda d''Urto', 'Ударная волна', '震懾波', '충격파'),
    (51485, 'Earthgrab Totem', 'Totem de poigne de terre', 'Totem des Erdgriffs', 'Tótem Pillaterra', 'Totem Agarraterra', 'Totem della Presa della Terra', 'Тотем хватки земли', '陷地圖騰', '구속의 토템'),
    (51490, 'Thunderstorm', 'Orage', 'Gewitter', 'Tormenta de truenos', 'Tempestade Relampejante', 'Esplosione Tonante', 'Гром и молния', '雷霆風暴', '천둥폭풍'),
    (102359, 'Mass Entanglement', 'Enchevêtrement de masse', 'Massenumschlingung', 'Enredo masivo', 'Embaraço em Massa', 'Intrappolamento di Massa', 'Массовое оплетение', '群體糾纏', '대규모 휘감기'),
    (102793, 'Ursol''s Vortex', 'Vortex d’Ursol', 'Ursols Vortex', 'Vórtice de Ursol', 'Vórtice de Ursol', 'Vortice di Ursol', 'Вихрь Урсола', '厄索爾的漩渦', '우르솔의 회오리'),
    (116844, 'Ring of Peace', 'Anneau de paix', 'Ring des Friedens', 'Anillo de paz', 'Anel da Paz', 'Circolo di Pace', 'Круг мира', '和平之環', '평화의 고리'),
    (117526, 'Binding Shot', 'Tir de lien', 'Bindender Schuss', 'Disparo vinculante', 'Disparo Vinculante', 'Tiro Vincolante', 'Связующий выстрел', '束縛射擊', '구속의 사격'),
    (119381, 'Leg Sweep', 'Balayement de jambe', 'Fußfeger', 'Barrido de pierna', 'Rasteira', 'Calcio a Spazzata', 'Круговой удар ногой', '掃葉腿', '팽이 차기'),
    (132469, 'Typhoon', 'Typhon', 'Taifun', 'Tifón', 'Tufão', 'Tifone', 'Тайфун', '颱風', '태풍'),
    (179057, 'Chaos Nova', 'Nova du chaos', 'Chaosnova', 'Nova de caos', 'Nova Entrópica', 'Nova del Caos', 'Кольцо Хаоса', '混沌新星', '혼돈의 회오리'),
    (187698, 'Tar Trap', 'Piège de goudron', 'Teerfalle', 'Trampa de brea', 'Armadilha de Piche', 'Trappola di Pece', 'Смоляная ловушка', '瀝青陷阱', '타르 덫'),
    (192058, 'Capacitor Totem', 'Totem condensateur', 'Totem der Energiespeicherung', 'Tótem capacitador', 'Totem Capacitor', 'Totem della Condensazione Elettrica', 'Тотем конденсации', '電容圖騰', '축전 토템'),
    (202138, 'Sigil of Chains', 'Sigil de chaînes', 'Zeichen der Ketten', 'Sigilo de cadenas', 'Signo dos Grilhões', 'Sigillo delle Catene', 'Печать цепей', '鎖鏈符印', '사슬의 인장'),
    (357214, 'Wing Buffet', 'Frappe des ailes', 'Flügelstoß', 'Sacudida de alas', 'Bofetada de Asa', 'Battito d''Ali', 'Взмах крыльями', '振翅攻擊', '폭풍 날개'),
    (358385, 'Landslide', 'Glissement de terrain', 'Erdrutsch', 'Derrumbamiento', 'Soterramento', 'Smottamento', 'Сель', '崩石流土', '산사태'),
    (368970, 'Tail Swipe', 'Claque caudale', 'Schwanzfeger', 'Flagelo de cola', 'Revés com a Cauda', 'Spazzata di Coda', 'Удар хвостом', '尾巴揮擊', '꼬리 휘둘러치기'),
    (378779, 'Thundershock', 'Coup de tonnerre', 'Donnerschock', 'Choque de truenos', 'Choque Trovejante', 'Tuonofolgore', 'Громовой удар', '雷霆震擊', '천둥충격'),
    (429639, 'Boneshaker', 'Tremble-os', 'Knochenerschütterer', 'Sacudehuesos', 'Abala-ossos', 'Frullaossa', 'Дрожь костей', '震骨襲', '해골전율자'),
    (439895, 'Entangling Vortex', 'Vortex enchevêtrant', 'Umschlingender Vortex', 'Vórtice enredador', 'Vórtice Enredante', 'Vortice Intrappolante', 'Опутывающий вихрь', '糾纏漩渦', '휘감는 소용돌이'),
    (452403, 'Wave of Debilitation', 'Vague d’apathie', 'Welle der Entkräftung', 'Ola de debilitación', 'Onda de Debilitação', 'Ondata di Spossatezza', 'Волна истощения', '衰弱浪潮', '쇠약의 너울'),
    (1234195, 'Void Nova', 'Nova du Vide', 'Leerennova', 'Nova del Vacío', 'Nova do Caos', 'Nova del Vuoto', 'Выброс Бездны', '虛無新星', '공허 회오리'),
    (1250691, 'Void Tendrils', 'Tentacules du Vide', 'Leerententakel', 'Zarcillos del Vacío', 'Tentáculos do Caos', 'Tentacoli del Vuoto', 'Щупальца Бездны', '虛無觸鬚', '공허의 촉수')
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
  name_en = EXCLUDED.name_en,
  name_fr = EXCLUDED.name_fr,
  name_de = EXCLUDED.name_de,
  name_es = EXCLUDED.name_es,
  name_pt_br = EXCLUDED.name_pt_br,
  name_it = EXCLUDED.name_it,
  name_ru = EXCLUDED.name_ru,
  name_zh_tw = EXCLUDED.name_zh_tw,
  name_ko = EXCLUDED.name_ko,
  updated_at = now();
