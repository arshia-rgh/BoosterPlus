-- +goose NO TRANSACTION
-- +goose Up
-- Extend installation drafts without rewriting prior migration checksums.
-- Only the untouched original MLBB seed gets new artwork; operator edits,
-- publication snapshots and revision-based optimistic locking remain intact.
UPDATE games SET configuration=JSON_SET(configuration,
 '$.asset','/catalog-assets/game-mlbb-1536.jpg',
 '$.asset_alt','Mobile Legends game artwork',
 '$.hero_layout',JSON_OBJECT('desktop_x',75,'desktop_y',20,'mobile_x',85,'mobile_y',20,'copy_side','left')),
 version=version+1
WHERE id='6faf485a-eab8-4700-8c87-3e30bf003001' AND slug='mobile-legends'
 AND version=1 AND published=FALSE AND archived=FALSE AND paused=FALSE AND current_release=''
 AND JSON_UNQUOTE(JSON_EXTRACT(configuration,'$.asset'))='/catalog-assets/game-placeholder.svg'
 AND JSON_EXTRACT(configuration,'$.reviewed')=FALSE;

-- Missing catalogs are private, unreviewed shells. No prices, rank data,
-- service availability, commercial promises or public releases are invented.
INSERT INTO games (id,slug,name,configuration,version,published,created_at)
SELECT '6faf485a-eab8-4700-8c87-3e30bf003002','world-of-warcraft','World of Warcraft','{"schema_version":1,"name":"World of Warcraft","description":"Draft catalog awaiting reviewed services, game data, prices, availability and customer terms.","asset":"/catalog-assets/game-wow-1536.jpg","asset_alt":"World of Warcraft game artwork","reviewed":false,"hero_layout":{"desktop_x":18,"desktop_y":20,"mobile_x":5,"mobile_y":20,"copy_side":"right"},"references":[],"services":[],"packages":[],"faqs":[],"discovery":{"capabilities":[{"service":"boost","state":"off","description":"","reason":""},{"service":"accounts","state":"off","description":"","reason":""},{"service":"shop","state":"off","description":"","reason":""},{"service":"news","state":"off","description":"","reason":""}],"promotions":[]}}',1,FALSE,UTC_TIMESTAMP(6)
WHERE NOT EXISTS (SELECT 1 FROM games WHERE slug='world-of-warcraft');

INSERT INTO games (id,slug,name,configuration,version,published,created_at)
SELECT '6faf485a-eab8-4700-8c87-3e30bf003003','league-of-legends','League of Legends','{"schema_version":1,"name":"League of Legends","description":"Draft catalog awaiting reviewed services, game data, prices, availability and customer terms.","asset":"/catalog-assets/game-lol-1536.jpg","asset_alt":"League of Legends game artwork","reviewed":false,"hero_layout":{"desktop_x":65,"desktop_y":20,"mobile_x":65,"mobile_y":20,"copy_side":"left"},"references":[],"services":[],"packages":[],"faqs":[],"discovery":{"capabilities":[{"service":"boost","state":"off","description":"","reason":""},{"service":"accounts","state":"off","description":"","reason":""},{"service":"shop","state":"off","description":"","reason":""},{"service":"news","state":"off","description":"","reason":""}],"promotions":[]}}',1,FALSE,UTC_TIMESTAMP(6)
WHERE NOT EXISTS (SELECT 1 FROM games WHERE slug='league-of-legends');

INSERT INTO games (id,slug,name,configuration,version,published,created_at)
SELECT '6faf485a-eab8-4700-8c87-3e30bf003004','valorant','VALORANT','{"schema_version":1,"name":"VALORANT","description":"Draft catalog awaiting reviewed services, game data, prices, availability and customer terms.","asset":"/catalog-assets/game-valorant-1536.png","asset_alt":"VALORANT game artwork","reviewed":false,"hero_layout":{"desktop_x":57,"desktop_y":20,"mobile_x":57,"mobile_y":20,"copy_side":"left"},"references":[],"services":[],"packages":[],"faqs":[],"discovery":{"capabilities":[{"service":"boost","state":"off","description":"","reason":""},{"service":"accounts","state":"off","description":"","reason":""},{"service":"shop","state":"off","description":"","reason":""},{"service":"news","state":"off","description":"","reason":""}],"promotions":[]}}',1,FALSE,UTC_TIMESTAMP(6)
WHERE NOT EXISTS (SELECT 1 FROM games WHERE slug='valorant');

INSERT INTO games (id,slug,name,configuration,version,published,created_at)
SELECT '6faf485a-eab8-4700-8c87-3e30bf003005','dota-2','Dota 2','{"schema_version":1,"name":"Dota 2","description":"Draft catalog awaiting reviewed services, game data, prices, availability and customer terms.","asset":"/catalog-assets/game-dota-1536.jpg","asset_alt":"Dota 2 game artwork","reviewed":false,"hero_layout":{"desktop_x":53,"desktop_y":20,"mobile_x":53,"mobile_y":20,"copy_side":"left"},"references":[],"services":[],"packages":[],"faqs":[],"discovery":{"capabilities":[{"service":"boost","state":"off","description":"","reason":""},{"service":"accounts","state":"off","description":"","reason":""},{"service":"shop","state":"off","description":"","reason":""},{"service":"news","state":"off","description":"","reason":""}],"promotions":[]}}',1,FALSE,UTC_TIMESTAMP(6)
WHERE NOT EXISTS (SELECT 1 FROM games WHERE slug='dota-2');

INSERT INTO games (id,slug,name,configuration,version,published,created_at)
SELECT '6faf485a-eab8-4700-8c87-3e30bf003006','wild-rift','Wild Rift','{"schema_version":1,"name":"Wild Rift","description":"Draft catalog awaiting reviewed services, game data, prices, availability and customer terms.","asset":"/catalog-assets/game-wildrift-1536.jpg","asset_alt":"Wild Rift game artwork","reviewed":false,"hero_layout":{"desktop_x":67,"desktop_y":20,"mobile_x":67,"mobile_y":20,"copy_side":"left"},"references":[],"services":[],"packages":[],"faqs":[],"discovery":{"capabilities":[{"service":"boost","state":"off","description":"","reason":""},{"service":"accounts","state":"off","description":"","reason":""},{"service":"shop","state":"off","description":"","reason":""},{"service":"news","state":"off","description":"","reason":""}],"promotions":[]}}',1,FALSE,UTC_TIMESTAMP(6)
WHERE NOT EXISTS (SELECT 1 FROM games WHERE slug='wild-rift');

-- +goose Down
-- Retain drafts: they may now have operator edits, releases or commerce history.
-- The prior application already supports these configuration fields. Reapplying
-- skips existing slugs and does not reset the upgraded MLBB revision.
SELECT 1;
