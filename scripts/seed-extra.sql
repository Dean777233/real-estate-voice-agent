-- Additional Austin listings for search-similar (near DEMO-001 price/beds)
INSERT INTO public.listings (
  external_id, address, city, state, zip, beds, baths, sqft,
  list_price, rent_estimate, arv_estimate, rehab_estimate,
  taxes_annual, insurance_annual, property_type, photo_url, status
) VALUES
('DEMO-004', '512 Oak Hollow Dr', 'Austin', 'TX', '78745',
  3, 2.0, 1380, 310000, 2350, 355000, 32000, 6400, 1450, 'single_family',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', 'active'),
('DEMO-005', '1890 South Lamar Ct', 'Austin', 'TX', '78704',
  4, 2.5, 1680, 265000, 2100, 330000, 38000, 5900, 1350, 'single_family',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde', 'active')
ON CONFLICT (external_id) DO UPDATE SET
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  zip = EXCLUDED.zip,
  beds = EXCLUDED.beds,
  baths = EXCLUDED.baths,
  sqft = EXCLUDED.sqft,
  list_price = EXCLUDED.list_price,
  rent_estimate = EXCLUDED.rent_estimate,
  arv_estimate = EXCLUDED.arv_estimate,
  rehab_estimate = EXCLUDED.rehab_estimate,
  taxes_annual = EXCLUDED.taxes_annual,
  insurance_annual = EXCLUDED.insurance_annual,
  property_type = EXCLUDED.property_type,
  photo_url = EXCLUDED.photo_url,
  status = EXCLUDED.status;
