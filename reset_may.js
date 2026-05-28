const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.join(__dirname, '.env');
const envFile = fs.readFileSync(envPath, 'utf-8');
const envLines = envFile.split('\n');

let supabaseUrl = '';
let supabaseKey = '';

envLines.forEach(line => {
  if (line.startsWith('REACT_APP_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1];
  }
  if (line.startsWith('REACT_APP_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1];
  }
});

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetMayData() {
  try {
    console.log('Fetching all May 2026 records...');
    
    // First, get all May records to see what we're updating
    const { data: mayRecords, error: fetchError } = await supabase
      .from('records')
      .select('id, title, qty_amount, schedule_at')
      .gte('schedule_at', '2026-05-01')
      .lte('schedule_at', '2026-05-31');

    if (fetchError) {
      throw new Error(`Error fetching records: ${fetchError.message}`);
    }

    console.log(`Found ${mayRecords?.length || 0} records in May 2026:`);
    if (mayRecords && mayRecords.length > 0) {
      mayRecords.forEach(record => {
        console.log(`  - ID: ${record.id}, Title: ${record.title}, Current Qty: ${record.qty_amount}, Date: ${record.schedule_at}`);
      });
    }

    if (!mayRecords || mayRecords.length === 0) {
      console.log('No May records found to reset.');
      return;
    }

    // Update all May records to set qty_amount to 0
    console.log('\nUpdating all May records to qty_amount = 0...');
    const { data: updateData, error: updateError } = await supabase
      .from('records')
      .update({ qty_amount: 0 })
      .gte('schedule_at', '2026-05-01')
      .lte('schedule_at', '2026-05-31');

    if (updateError) {
      throw new Error(`Error updating records: ${updateError.message}`);
    }

    console.log('✅ Successfully reset all May records to 0!');
    console.log(`Updated ${mayRecords.length} records`);

    // Verify the update
    const { data: verifyRecords, error: verifyError } = await supabase
      .from('records')
      .select('id, title, qty_amount, schedule_at')
      .gte('schedule_at', '2026-05-01')
      .lte('schedule_at', '2026-05-31');

    if (!verifyError && verifyRecords) {
      console.log('\nVerification - Updated records:');
      verifyRecords.forEach(record => {
        console.log(`  - ID: ${record.id}, Title: ${record.title}, New Qty: ${record.qty_amount}, Date: ${record.schedule_at}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetMayData();
