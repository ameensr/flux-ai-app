#!/usr/bin/env python3
"""
Diagnostic script to check which tickets should match for October 30, 2026
"""
import os
from datetime import datetime, timezone
from supabase import create_client

# Load environment
url = os.getenv('VITE_SUPABASE_URL')
key = os.getenv('VITE_SUPABASE_ANON_KEY')

if not url or not key:
    print('Missing Supabase credentials')
    exit(1)

supabase = create_client(url, key)

# Query forwarding history for Oct 30, 2026
result = supabase.table('ticket_bowl_forwarding_history').select('*').gte('changed_at', '2026-10-30T00:00:00Z').lte('changed_at', '2026-10-30T23:59:59Z').execute()

print(f'Found {len(result.data)} forwarding events on Oct 30, 2026:')
for event in result.data:
    print(f"  WP {event['work_package_id']}: {event['changed_at']} by {event['changed_by_name']}")

# Now check the work packages table for these tickets
wp_ids = list(set([e['work_package_id'] for e in result.data]))
print(f'\nUnique work package IDs: {wp_ids}')

if wp_ids:
    wp_result = supabase.table('ticket_bowl_work_packages').select('work_package_id,status_name,testing_status,type_name,history_verification_status,latest_forwarded_at').in_('work_package_id', wp_ids).execute()
    print(f'\nWork package details:')
    for wp in wp_result.data:
        print(f"  WP {wp['work_package_id']}:")
        print(f"    Status: {wp['status_name']}")
        print(f"    Testing: {wp['testing_status']}")
        print(f"    Type: {wp['type_name']}")
        print(f"    History Verification: {wp['history_verification_status']}")
        print(f"    Latest Forwarded At: {wp['latest_forwarded_at']}")
        print()
