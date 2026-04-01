insert into public.customers (id, name, primary_contact, phone, email, address)
values
  ('11111111-1111-1111-1111-111111111111', 'Northside Storage', 'Anna Roberts', '07700 900111', 'anna@example.com', 'Leeds'),
  ('22222222-2222-2222-2222-222222222222', 'Apex Engineering', 'Martin Shaw', '07700 900212', 'martin@example.com', 'Wakefield'),
  ('33333333-3333-3333-3333-333333333333', 'Kingscourt Retail', 'Leah Moss', '07700 900313', 'leah@example.com', 'Manchester')
on conflict (id) do nothing;

insert into public.sites (id, customer_id, name, address, notes, primary_engineer_name, last_visit_at, next_visit_at)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Northside Storage - Main Warehouse',
    'Leeds',
    'High-bay warehouse. MEWP access usually required. Lighting rows continue beyond racking.',
    'Dale',
    now() - interval '5 days',
    now() + interval '2 days'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'Apex Engineering - Workshop',
    'Wakefield',
    'Fire alarm additions in workshop and stores. Detector coverage history should stay visible.',
    'Lewis',
    now() - interval '10 days',
    now() + interval '7 days'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    'Kingscourt Retail - Rear Stair',
    'Manchester',
    'Recurring emergency lighting test site. Access works best before store opening.',
    'Mick',
    now() - interval '6 days',
    now() + interval '180 days'
  )
on conflict (id) do nothing;

insert into public.jobs (id, job_number, customer_id, site_id, title, job_type, stage, assignee_name, scheduled_for, value_gbp, summary)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'JOB-2417',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Warehouse LED lighting upgrade',
    'Electrical',
    'booked',
    'Dale',
    now() + interval '1 day',
    12450,
    'Final aisle emergency fittings and row alignment to be checked.'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'JOB-2418',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'EICR and remedials',
    'Electrical',
    'materials_ordered',
    'Mick',
    now() + interval '2 days',
    2860,
    'RCBO replacements and circuit labels still to arrive.'
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'JOB-2421',
    '22222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Fire alarm extension - workshop block',
    'Fire',
    'quote_sent',
    'Estimator',
    now() + interval '4 days',
    4310,
    'Revised detector positions sent to client for approval.'
  ),
  (
    '99999999-9999-9999-9999-999999999999',
    'JOB-2423',
    '33333333-3333-3333-3333-333333333333',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Emergency lighting annual test',
    'Electrical',
    'invoice_sent',
    'Lewis',
    now() - interval '6 days',
    980,
    'Completed and invoiced. Awaiting payment.'
  )
on conflict (id) do nothing;

insert into public.site_visits (id, site_id, job_id, visit_date, title, visit_type, engineer_name, summary)
values
  (
    '12121212-1212-1212-1212-121212121212',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    now() - interval '5 days',
    'LED lighting upgrade',
    'Jobsheet',
    'Dale',
    'Installation layout reviewed and final row spacing confirmed.'
  ),
  (
    '13131313-1313-1313-1313-131313131313',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    null,
    now() - interval '45 days',
    'Emergency light fault repair',
    'Visit report',
    'Mick',
    'Fault traced and repaired. Final test carried out.'
  ),
  (
    '14141414-1414-1414-1414-141414141414',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    now() - interval '10 days',
    'Fire alarm extension survey',
    'Survey',
    'Lewis',
    'Detector and sounder positions captured and marked for quote revision.'
  ),
  (
    '15151515-1515-1515-1515-151515151515',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '99999999-9999-9999-9999-999999999999',
    now() - interval '6 days',
    'Annual emergency lighting test',
    'Certificate',
    'Lewis',
    'All fittings tested and report issued.'
  )
on conflict (id) do nothing;

insert into public.site_images (id, site_id, image_url, caption, uploaded_by_name, created_at)
values
  (
    '16161616-1616-1616-1616-161616161616',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=80',
    'Warehouse aisle lighting',
    'Dale',
    now() - interval '5 days'
  ),
  (
    '17171717-1717-1717-1717-171717171717',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80',
    'Workshop panel location',
    'Lewis',
    now() - interval '9 days'
  ),
  (
    '18181818-1818-1818-1818-181818181818',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80',
    'Rear stair escape route',
    'Mick',
    now() - interval '6 days'
  )
on conflict (id) do nothing;

insert into public.chat_threads (id, name, directors_only)
values
  ('19191919-1919-1919-1919-191919191919', 'Team Updates', false),
  ('20202020-2020-2020-2020-202020202020', 'Office & Scheduling', false),
  ('21212121-2121-2121-2121-212121212121', 'Directors', true)
on conflict (id) do nothing;

insert into public.chat_messages (id, thread_id, author_name, body, created_at)
values
  (
    '22222222-aaaa-bbbb-cccc-222222222222',
    '19191919-1919-1919-1919-191919191919',
    'Dale',
    'Please add final photos to Northside before close of play.',
    now() - interval '3 hours'
  ),
  (
    '23232323-aaaa-bbbb-cccc-232323232323',
    '19191919-1919-1919-1919-191919191919',
    'Mick',
    'Will do. I will also upload the remedials sheet for Horizon.',
    now() - interval '2 hours'
  ),
  (
    '24242424-aaaa-bbbb-cccc-242424242424',
    '20202020-2020-2020-2020-202020202020',
    'Admin',
    'PO received for Elm Square phase 1.',
    now() - interval '1 hour'
  ),
  (
    '25252525-aaaa-bbbb-cccc-252525252525',
    '21212121-2121-2121-2121-212121212121',
    'System',
    'Private files and OneDrive shortcuts only visible here.',
    now() - interval '30 minutes'
  )
on conflict (id) do nothing;

insert into public.invoices (id, invoice_number, customer_id, job_id, amount_gbp, status, due_date)
values
  (
    '26262626-2626-2626-2626-262626262626',
    'INV-551',
    '11111111-1111-1111-1111-111111111111',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    6200,
    'due',
    current_date + 3
  ),
  (
    '27272727-2727-2727-2727-272727272727',
    'INV-552',
    '33333333-3333-3333-3333-333333333333',
    '99999999-9999-9999-9999-999999999999',
    980,
    'paid',
    current_date - 2
  ),
  (
    '28282828-2828-2828-2828-282828282828',
    'INV-553',
    '22222222-2222-2222-2222-222222222222',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    2140,
    'overdue',
    current_date - 6
  )
on conflict (id) do nothing;
