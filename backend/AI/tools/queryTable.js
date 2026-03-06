/**
 * Standalone Supabase table query tool for testing and inspection.
 *
 * Usage:
 *   node queryTable.js <table> [options]
 *
 * Examples:
 *   node queryTable.js games
 *   node queryTable.js games --limit 5
 *   node queryTable.js games --filter "user_id=eq.abc123"
 *   node queryTable.js games --columns "id,user_id,word"
 *   node queryTable.js games --order "created_at desc" --limit 10
 *   node queryTable.js games --count
 *   node queryTable.js --list-tables
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    table: null,
    limit: 20,
    filter: null,
    columns: null,
    order: null,
    count: false,
    listTables: false,
    raw: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--list-tables') { opts.listTables = true; }
    else if (a === '--count') { opts.count = true; }
    else if (a === '--raw') { opts.raw = true; }
    else if (a === '--limit') { opts.limit = parseInt(args[++i], 10); }
    else if (a === '--filter') { opts.filter = args[++i]; }
    else if (a === '--columns') { opts.columns = args[++i]; }
    else if (a === '--order') { opts.order = args[++i]; }
    else if (!a.startsWith('--')) { opts.table = a; }
  }
  return opts;
}

async function listTables() {
  // Query information_schema via raw SQL using a known table as a vehicle
  // Supabase JS client doesn't support arbitrary schema queries, so we list
  // well-known app tables by probing them, or fall back to a helpful message.
  const knownTables = [
    'games', 'users', 'cards', 'decks', 'word_base', 'app_variables',
    'deep_remember', 'chat_templates', 'user_configs', 'srs_items',
    'courses', 'dictate', 'timer', 'test', 'migrations'
  ];

  console.log('\nProbing known tables in public schema...\n');
  const found = [];
  await Promise.all(knownTables.map(async (t) => {
    const { error } = await supabase.from(t).select('*').limit(1);
    if (!error) found.push(t);
  }));

  if (found.length === 0) {
    console.log('No known tables found. Query a specific table with: node queryTable.js <table>');
    return;
  }

  found.sort();
  console.log('Accessible tables:');
  found.forEach(t => console.log(' -', t));
}

async function queryTable(opts) {
  const columns = opts.columns || '*';
  let query = supabase.from(opts.table).select(columns, opts.count ? { count: 'exact' } : undefined);

  if (opts.filter) {
    // Parse simple key=op.value filters, e.g. "user_id=eq.abc" or "id=gt.5"
    const filterParts = opts.filter.split(',');
    for (const part of filterParts) {
      const match = part.match(/^(\w+)=([a-z]+)\.(.+)$/);
      if (match) {
        const [, col, op, val] = match;
        query = query.filter(col, op, val);
      } else {
        console.warn(`  Skipping unrecognized filter format: "${part}"`);
        console.warn('  Expected format: column=op.value  (e.g. id=eq.5, age=gt.18)');
      }
    }
  }

  if (opts.order) {
    const [col, dir] = opts.order.split(' ');
    query = query.order(col, { ascending: dir !== 'desc' });
  } else {
    // Default: newest first if there's a created_at column (graceful fallback)
    query = query.limit(opts.limit);
  }

  if (opts.order) {
    query = query.limit(opts.limit);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Query error:', error.message);
    process.exit(1);
  }

  if (opts.count) {
    console.log(`\nTotal rows in "${opts.table}": ${count}`);
  }

  if (!data || data.length === 0) {
    console.log('No rows returned.');
    return;
  }

  if (opts.raw) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log(`\nTable: ${opts.table}  (${data.length} row${data.length !== 1 ? 's' : ''}${opts.count ? ` of ${count} total` : ''})\n`);

  // Pretty-print as a table
  const keys = Object.keys(data[0]);
  const colWidths = keys.map(k => Math.min(
    Math.max(k.length, ...data.map(r => String(r[k] ?? '').length)),
    40
  ));

  const header = keys.map((k, i) => k.padEnd(colWidths[i])).join(' | ');
  const divider = colWidths.map(w => '-'.repeat(w)).join('-+-');
  console.log(header);
  console.log(divider);

  for (const row of data) {
    const line = keys.map((k, i) => {
      const val = String(row[k] ?? '');
      return (val.length > 40 ? val.slice(0, 37) + '...' : val).padEnd(colWidths[i]);
    }).join(' | ');
    console.log(line);
  }
}

async function main() {
  const opts = parseArgs(process.argv);

  if (opts.listTables) {
    await listTables();
    return;
  }

  if (!opts.table) {
    console.log('Usage: node queryTable.js <table> [options]');
    console.log('       node queryTable.js --list-tables');
    console.log('\nOptions:');
    console.log('  --limit <n>            Max rows to return (default: 20)');
    console.log('  --filter <expr>        Filter, e.g. "user_id=eq.abc" or "id=gt.5"');
    console.log('  --columns <cols>       Comma-separated columns (default: *)');
    console.log('  --order <col> [desc]   Order by column, e.g. "created_at desc"');
    console.log('  --count                Show total row count');
    console.log('  --raw                  Output raw JSON');
    console.log('  --list-tables          List all public tables');
    return;
  }

  await queryTable(opts);
}

main().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
