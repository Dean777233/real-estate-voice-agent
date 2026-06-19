-- Demo listing UUIDs (after seed): see scripts/demo-ids.json
-- DEMO-001 Austin:  76c2dbd6-71fe-4e33-837e-a77fdf27c292
-- DEMO-002 Phoenix: 88c23ac3-67e3-455f-9970-62115e03e778
-- DEMO-003 Cleveland: bb9f6767-95a4-41d4-b263-fc0830ea7fa6

INSERT INTO public.listings (
  external_id, address, city, state, zip, beds, baths, sqft,
  list_price, rent_estimate, arv_estimate, rehab_estimate,
  taxes_annual, insurance_annual, property_type, photo_url, status
) VALUES
('DEMO-001', '742 Evergreen Terrace', 'Austin', 'TX', '78745',
  3, 2.0, 1450, 285000, 2200, 340000, 35000, 6200, 1400, 'single_family',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6', 'active'),
('DEMO-002', '221B Baker Street', 'Phoenix', 'AZ', '85004',
  4, 2.5, 2100, 395000, 2800, 480000, 55000, 4800, 1800, 'single_family',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9', 'active'),
('DEMO-003', '88 Investment Lane', 'Cleveland', 'OH', '44114',
  2, 1.0, 980, 89000, 950, 130000, 25000, 1800, 900, 'duplex',
  'https://images.unsplash.com/photo-1605276374101-e581d1f023a8', 'active');

INSERT INTO public.area_stats (
  city, state, zip, crime_index, violent_crime_rate, property_crime_rate,
  median_income, population, school_rating, rent_growth_yoy, appreciation_yoy, vacancy_rate, notes
) VALUES
('Austin', 'TX', '78745', 42, 3.2, 18.5, 78000, 980000, 7.8, 0.04, 0.06, 0.07,
 'Strong job growth, moderate crime in south Austin.'),
('Phoenix', 'AZ', '85004', 55, 5.1, 24.0, 62000, 1650000, 6.5, 0.05, 0.08, 0.06,
 'Hot market, watch insurance costs.'),
('Cleveland', 'OH', '44114', 68, 8.9, 32.0, 41000, 380000, 5.2, 0.03, 0.04, 0.11,
 'Cash-flow market, higher crime — verify block by block.');
