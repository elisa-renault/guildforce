-- ============================================
-- GUILDFORCE DATABASE BACKUP
-- Generated: 2026-01-26
-- ============================================

-- ====================
-- TABLE: profiles
-- ====================
INSERT INTO public.profiles (id, username, avatar_url, battlenet_id, battletag, battletag_visibility, main_character_name, preferred_language, show_battletag, created_at, updated_at) VALUES
('f10cf67f-5e3b-4141-9978-5078d7e944f5', 'Fwapp', NULL, '467034', 'Climaxin#1170', 'nobody', 'Fwapp-Eredar', 'en', true, '2026-01-21 22:25:52.159461+00', '2026-01-23 05:05:26.367787+00'),
('2ff992be-34a7-4732-84f3-270195d6a828', 'Hermit', NULL, '1123980764', 'Hermit#21125', 'nobody', 'Demongoyoink-darkspear', 'en', true, '2026-01-21 17:28:50.253151+00', '2026-01-21 17:28:51.226763+00'),
('592782d2-51d8-4896-a4b2-0dc2d40c78fc', 'Yaya', 'https://nztgnodoxfxjgbgcysge.supabase.co/storage/v1/object/public/avatars/592782d2-51d8-4896-a4b2-0dc2d40c78fc/avatar.jpg?t=1768399554749', '101924160', 'Yaya#2920', 'nobody', 'Berthegarde-Archimonde', 'fr', false, '2026-01-11 11:27:34.042589+00', '2026-01-18 14:42:21.37253+00'),
('a37e8866-1422-472f-a1d8-da3274887109', 'Elsia', 'https://nztgnodoxfxjgbgcysge.supabase.co/storage/v1/object/public/avatars/a37e8866-1422-472f-a1d8-da3274887109/avatar.jpg?t=1769077849508', '411459115', 'Elsia#21853', 'nobody', 'Barbarbie-Archimonde', 'en', true, '2026-01-18 20:19:00.071471+00', '2026-01-26 18:01:02.54482+00'),
('e3bc7e32-63ae-46c0-a346-dcbd576860d7', 'Nidéyo', NULL, '100702727', 'Nidéyo#2604', 'guild_only', 'Nidéyo-garona', 'fr', true, '2026-01-17 12:41:29.144373+00', '2026-01-22 00:31:36.931984+00'),
('cf5615dd-42b4-46ae-9cfd-4cf8dec1b083', 'Psykotisk', NULL, '142641899', 'PGgunMan#21299', 'nobody', 'Blåfisk-tarren-mill', 'en', true, '2026-01-22 10:29:34.453109+00', '2026-01-22 18:51:20.124757+00'),
('598cdb37-ae24-4832-b1da-c539f59ed12d', 'Nikodemos', NULL, '80573385', 'ClosingAce#1177', 'nobody', 'Nikodemos-Wildhammer', 'en', true, '2026-01-23 00:55:05.766426+00', '2026-01-23 01:03:01.2089+00'),
('6798821d-26d1-4d2d-8789-09b99eddd830', 'Trypha', 'https://nztgnodoxfxjgbgcysge.supabase.co/storage/v1/object/public/avatars/6798821d-26d1-4d2d-8789-09b99eddd830/avatar.jpg?t=1768640758001', '405246575', 'Trypha#2863', 'everyone', 'Tryphélin-Dalaran', 'fr', true, '2026-01-17 09:04:22.9306+00', '2026-01-18 01:06:25.569257+00'),
('edf0251e-5226-4d5e-a83c-c417db81aa72', 'ghostpants', NULL, '450101793', 'ghostpants#226394', 'nobody', 'Golkrim-draenor', 'en', true, '2026-01-21 19:01:15.302169+00', '2026-01-21 19:01:16.787688+00'),
('e5cf3cfc-b4bd-45b0-a498-5ae2d592ed9d', 'Eiel', NULL, '51754335', 'Eiel#11624', 'nobody', 'Eielmolate-Gorefiend', 'en', true, '2026-01-22 17:29:59.435542+00', '2026-01-23 01:04:01.384065+00'),
('64dbaf29-d528-4ab4-a175-9fc8455f92ae', 'JIoey', NULL, '122208353', 'JIoey#2577', 'nobody', 'Deor-archimonde', 'fr', true, '2026-01-18 11:04:37.38784+00', '2026-01-22 19:27:57.757021+00'),
('f7772a65-d411-45da-99a8-ff3d4beb2e60', 'kss', NULL, '427973423', 'kss#21464', 'nobody', 'Sanø-blackrock', 'en', true, '2026-01-21 21:00:12.529948+00', '2026-01-21 21:00:13.610173+00'),
('1f0425a5-f5f6-472e-ba56-8783d62ce077', 'Elzed', NULL, '405649158', 'Elzed#2439', 'everyone', 'Elzevok-hyjal', 'fr', true, '2026-01-17 11:09:10.141662+00', '2026-01-20 21:55:56.02799+00'),
('615a5e3f-11db-4cf6-8282-4c7465b381b1', 'Ronki', NULL, '102703042', 'Ronki#21158', 'nobody', 'Fróstíwarr-blackrock', 'en', true, '2026-01-21 21:00:27.640503+00', '2026-01-21 21:00:41.504778+00')
ON CONFLICT (id) DO NOTHING;

-- ====================
-- TABLE: user_roles
-- ====================
INSERT INTO public.user_roles (id, user_id, role, created_at) VALUES
('73018a52-c4fc-49e5-94c5-3cf388d7028d', 'a37e8866-1422-472f-a1d8-da3274887109', 'admin', '2026-01-18 20:22:00.963149+00')
ON CONFLICT (id) DO NOTHING;

-- ====================
-- TABLE: forum_categories
-- ====================
INSERT INTO public.forum_categories (id, name, slug, description, icon, color, display_order, is_global, guild_id, created_at, updated_at) VALUES
('2691715c-f607-453b-8f09-23132b1ee740', 'general', 'general', 'Discussions générales sur Guildforce et le jeu', 'MessageCircle', '#6366f1', 0, true, NULL, '2026-01-11 18:27:02.04166+00', '2026-01-11 18:27:02.04166+00'),
('6e014c59-5283-4761-8d83-6943be236369', 'Bugs & Issues', 'bugs', 'Report bugs and technical issues', 'bug', '#ef4444', 2, true, NULL, '2026-01-11 18:29:18.350318+00', '2026-01-11 18:29:18.350318+00'),
('86b6a72b-f8bf-41d4-be68-e977bf71aff4', 'support', 'support', 'Aide et support technique', 'HelpCircle', '#3b82f6', 1, true, NULL, '2026-01-11 18:27:02.04166+00', '2026-01-11 18:27:02.04166+00'),
('040f631a-f55c-4171-a8e8-9a39d393a134', 'feedback', 'feedback', 'Suggestions et retours pour améliorer Guildforce', 'Lightbulb', '#22c55e', 3, true, NULL, '2026-01-11 18:27:02.04166+00', '2026-01-11 18:27:02.04166+00')
ON CONFLICT (id) DO NOTHING;

-- ====================
-- TABLE: forum_topics
-- ====================
INSERT INTO public.forum_topics (id, title, content, author_id, category_id, is_pinned, is_locked, view_count, reply_count, last_reply_at, last_reply_by, created_at, updated_at) VALUES
('fd9f7927-4667-46e9-aa12-74c5ceb7fc21', 'Le mage Arcane est le seul vrai mage', '![Le mage Arcane est le seul vrai mage](https://i.imgur.com/Xd8El2x.jpeg)', 'e867a46c-7fe3-407e-98e6-9e93f3e7f9d5', '2691715c-f607-453b-8f09-23132b1ee740', false, false, 32, 2, '2026-01-23 10:20:53.48806+00', '0235abc2-2629-49ab-9279-aaa8fd35cedc', '2026-01-17 20:58:36.864676+00', '2026-01-23 10:20:53.48806+00')
ON CONFLICT (id) DO NOTHING;

-- ====================
-- TABLE: forum_posts
-- ====================
INSERT INTO public.forum_posts (id, content, author_id, topic_id, quoted_post_id, is_edited, created_at, updated_at) VALUES
('2c048859-d564-4279-87e2-84ec30244209', 'Alors que le mageladin existe...', '592782d2-51d8-4896-a4b2-0dc2d40c78fc', 'fd9f7927-4667-46e9-aa12-74c5ceb7fc21', NULL, false, '2026-01-21 22:26:10.732106+00', '2026-01-21 22:26:10.732106+00'),
('9cc3b56f-8d4b-4d22-b3bf-377788d72efa', 'Faut jouer Druide et pas réfléchir plus loin', '0235abc2-2629-49ab-9279-aaa8fd35cedc', 'fd9f7927-4667-46e9-aa12-74c5ceb7fc21', NULL, false, '2026-01-23 10:20:53.48806+00', '2026-01-23 10:20:53.48806+00')
ON CONFLICT (id) DO NOTHING;

-- ====================
-- TABLE: forum_reactions
-- ====================
INSERT INTO public.forum_reactions (id, user_id, post_id, topic_id, reaction_type, created_at) VALUES
('9df3c3d2-7123-4eb0-b3e1-e66010b30129', 'e867a46c-7fe3-407e-98e6-9e93f3e7f9d5', '2c048859-d564-4279-87e2-84ec30244209', NULL, 'like', '2026-01-22 21:28:45.517837+00')
ON CONFLICT (id) DO NOTHING;

-- ====================
-- TABLE: forum_topic_subscriptions
-- ====================
INSERT INTO public.forum_topic_subscriptions (id, user_id, topic_id, notify_replies, created_at) VALUES
('a1086d3f-1bc1-4cfc-b246-570cd685e394', 'e867a46c-7fe3-407e-98e6-9e93f3e7f9d5', 'fd9f7927-4667-46e9-aa12-74c5ceb7fc21', true, '2026-01-17 20:58:36.864676+00'),
('a2d882b0-0aa1-40ef-89e8-b4fc6bd43cb3', '592782d2-51d8-4896-a4b2-0dc2d40c78fc', 'fd9f7927-4667-46e9-aa12-74c5ceb7fc21', true, '2026-01-21 22:26:10.732106+00'),
('f36d1f33-16e6-420b-93d8-91517e82fc63', '0235abc2-2629-49ab-9279-aaa8fd35cedc', 'fd9f7927-4667-46e9-aa12-74c5ceb7fc21', true, '2026-01-23 10:20:53.48806+00')
ON CONFLICT (id) DO NOTHING;

-- ====================
-- TABLE: forum_notifications
-- ====================
INSERT INTO public.forum_notifications (id, user_id, type, topic_id, post_id, triggered_by, is_read, created_at) VALUES
('a356b48c-aaae-45da-86b7-6b4a47a5422e', '592782d2-51d8-4896-a4b2-0dc2d40c78fc', 'post_reply', 'fd9f7927-4667-46e9-aa12-74c5ceb7fc21', '9cc3b56f-8d4b-4d22-b3bf-377788d72efa', '0235abc2-2629-49ab-9279-aaa8fd35cedc', true, '2026-01-23 10:20:53.48806+00'),
('c21987e7-0deb-4ee1-b320-b6155d357514', 'e867a46c-7fe3-407e-98e6-9e93f3e7f9d5', 'topic_reply', 'fd9f7927-4667-46e9-aa12-74c5ceb7fc21', '9cc3b56f-8d4b-4d22-b3bf-377788d72efa', '0235abc2-2629-49ab-9279-aaa8fd35cedc', true, '2026-01-23 10:20:53.48806+00')
ON CONFLICT (id) DO NOTHING;

-- ====================
-- TABLE: guild_permissions
-- ====================
INSERT INTO public.guild_permissions (id, guild_id, permission_type, access_type, user_id, min_rank_index, max_rank_index, created_at) VALUES
('a1a1e65c-1ff9-4df4-95e7-27a7e94e976d', '3dc7fd04-25f1-4e07-b8cd-37702fca2724', 'manage_rosters', 'rank', NULL, 0, 3, '2026-01-21 22:19:27.517092+00'),
('861fda62-924d-45cd-aa00-8591d77ed242', '3dc7fd04-25f1-4e07-b8cd-37702fca2724', 'view_activity_log', 'rank', NULL, 0, 3, '2026-01-21 22:19:27.517092+00'),
('7ddbd432-8bb1-4db4-8cf0-5817139d2c6a', '3dc7fd04-25f1-4e07-b8cd-37702fca2724', 'manage_wishes', 'rank', NULL, 0, 3, '2026-01-21 22:19:27.517092+00'),
('c97ba074-f670-46de-8776-bb8fcda7cf75', '3dc7fd04-25f1-4e07-b8cd-37702fca2724', 'manage_polls', 'rank', NULL, 0, 3, '2026-01-21 22:19:27.517092+00')
ON CONFLICT (id) DO NOTHING;

-- ====================
-- TABLE: poll_results_access_rules
-- ====================
INSERT INTO public.poll_results_access_rules (id, poll_id, access_type, user_id, min_rank_index, max_rank_index, created_at) VALUES
('137b684f-28b6-4c77-8958-b6551dae82f9', '0cd7806e-4135-4162-a1ad-39cb8b1662e7', 'rank_range', NULL, 0, 3, '2026-01-22 21:03:58.91134+00')
ON CONFLICT (id) DO NOTHING;

-- ====================
-- TABLE: raid_effects
-- ====================
INSERT INTO public.raid_effects (id, class_id, spec_id, spell_id, category, created_at) VALUES
(1, 'druid', NULL, 1126, 'major_buff', '2026-01-26 17:14:44.167418+00'),
(2, 'mage', NULL, 1459, 'major_buff', '2026-01-26 17:14:44.167418+00'),
(3, 'warrior', NULL, 6673, 'major_buff', '2026-01-26 17:14:44.167418+00'),
(4, 'evoker', NULL, 364342, 'major_buff', '2026-01-26 17:14:44.167418+00'),
(5, 'shaman', NULL, 2825, 'major_buff', '2026-01-26 17:14:44.167418+00'),
(6, 'warlock', NULL, 29893, 'major_buff', '2026-01-26 17:14:44.167418+00'),
(7, 'paladin', NULL, 465, 'major_buff', '2026-01-26 17:14:44.167418+00'),
(8, 'priest', NULL, 21562, 'major_buff', '2026-01-26 17:14:44.167418+00'),
(9, 'shaman', NULL, 462854, 'major_buff', '2026-01-26 17:14:44.167418+00'),
(10, 'monk', NULL, 8647, 'major_debuff', '2026-01-26 17:14:44.167418+00'),
(11, 'demon-hunter', NULL, 255260, 'major_debuff', '2026-01-26 17:14:44.167418+00'),
(12, 'hunter', NULL, 257284, 'major_debuff', '2026-01-26 17:14:44.167418+00'),
(13, 'rogue', NULL, 381637, 'major_debuff', '2026-01-26 17:14:44.167418+00'),
(14, 'evoker', 'evoker-augmentation', 395152, 'major_buff', '2026-01-26 17:14:44.167418+00')
ON CONFLICT (id) DO NOTHING;

-- ====================
-- TABLE: account_deletion_requests
-- ====================
INSERT INTO public.account_deletion_requests (id, user_id, status, requested_at, processed_at, processed_by, created_at) VALUES
('8facb1b9-df88-4485-a2e0-7f62063dc516', '9a068358-5a0a-428d-93dd-ff750341b802', 'processed', '2026-01-20 23:04:22.994442+00', '2026-01-20 23:44:20.153+00', 'a37e8866-1422-472f-a1d8-da3274887109', '2026-01-20 23:04:22.994442+00'),
('5a735abe-c15d-423c-9906-64a6366b110f', '584281d6-a3dc-40d5-9176-61de3403980c', 'processed', '2026-01-21 00:05:30.699234+00', '2026-01-21 00:45:52.179+00', 'a37e8866-1422-472f-a1d8-da3274887109', '2026-01-21 00:05:30.699234+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- NOTE: This is a partial backup containing key tables.
-- Large tables (guilds, guild_members, rosters, class_wishes, 
-- wow_characters, wow_guild_memberships, guild_activity_logs,
-- guild_roster_cache, patch_notes, legal_pages, guild_polls,
-- guild_poll_sections, guild_poll_questions, guild_poll_responses,
-- roster_access_rules, bug_reports) contain too much data
-- to include in this file.
-- 
-- For a complete backup, access your backend directly:
-- ============================================
