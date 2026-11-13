-- Reference data: the launch route and its stops (not demo data). Drivers pick this
-- route when creating trips; return trips use the same stops in reverse order.
INSERT INTO routes (name, slug) VALUES ('Dehradun – Karnaprayag', 'dehradun-karnaprayag') ON CONFLICT (slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO route_stops (route_id, slug, name, position, offset_minutes, distance_km, lat, lng, pickup_points)
SELECT r.id, s.slug, s.name, s.position, s.offset_minutes, s.distance_km, s.lat, s.lng, s.pickup_points::jsonb
FROM routes r,
(VALUES
  ('dehradun', 'Dehradun', 0, 0, 0, 30.3165, 78.0322, '["ISBT Dehradun","Clock Tower (Ghanta Ghar)","Railway Station"]'),
  ('rishikesh', 'Rishikesh', 1, 75, 45, 30.0869, 78.2676, '["Natraj Chowk","Rishikesh Bus Stand"]'),
  ('devprayag', 'Devprayag', 2, 200, 115, 30.1461, 78.598, '["Devprayag Bus Stand","Sangam Market"]'),
  ('srinagar', 'Srinagar', 3, 255, 150, 30.2238, 78.7842, '["Srinagar Bus Stand","HNB University Gate"]'),
  ('rudraprayag', 'Rudraprayag', 4, 320, 185, 30.2844, 78.9811, '["Gulabrai","Rudraprayag Main Market"]'),
  ('karnaprayag', 'Karnaprayag', 5, 400, 215, 30.2634, 79.2179, '["Karnaprayag Bus Stand","Sangam Bridge"]')
) AS s(slug, name, position, offset_minutes, distance_km, lat, lng, pickup_points)
WHERE r.slug = 'dehradun-karnaprayag'
ON CONFLICT (route_id, slug) DO NOTHING;
