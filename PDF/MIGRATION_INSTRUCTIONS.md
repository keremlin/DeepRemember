# Migration Instructions: groupAlphabetName to group_alphabet_name

## Overview
This migration changes the column name from `groupAlphabetName` (camelCase) to `group_alphabet_name` (snake_case) to comply with PostgreSQL conventions and avoid Supabase PostgREST schema cache issues.

## Step 1: Run the SQL Migration Script

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `PDF/migrate_to_snake_case.sql`
4. Click **Run** to execute the migration

The script will:
- Drop the old index
- Rename the column from `"groupAlphabetName"` to `group_alphabet_name`
- Recreate the index with the new column name

## Step 2: Verify the Migration

After running the SQL script, you can verify the change by running:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'word_base' AND column_name LIKE '%group%';
```

You should see `group_alphabet_name` in the results.

## Step 3: Test the Import

Once the migration is complete, run the import script:

```bash
node PDF/importWordBase.js
```

## What Was Changed

### Code Files Updated:
1. ✅ `backend/database/access/WordBaseRepository.js` - All SQL queries updated
2. ✅ `backend/database/access/SupabaseDatabase.js` - Table creation SQL updated
3. ✅ `backend/database/access/SupabaseDatabaseJavaScriptClient.js` - Table creation SQL updated
4. ✅ `backend/database/access/SQLiteDatabase.js` - Table creation SQL updated
5. ✅ `backend/routes/wordBase.js` - API route updated to handle both names
6. ✅ `PDF/importWordBase.js` - Import script updated (still uses groupAlphabetName from JSON, but maps to database column)
7. ✅ `PDF/fixWordBaseTable.js` - Table fix script updated
8. ✅ `PDF/checkWordBaseCount.js` - Count script updated

### Notes:
- The JSON file still uses `groupAlphabetName` (camelCase) - this is fine
- The repository maps `groupAlphabetName` from the JSON to `group_alphabet_name` in the database
- The API still accepts `groupAlphabetName` in query parameters for backward compatibility
- All database queries now use `group_alphabet_name` (snake_case)

## Troubleshooting

If you encounter any issues:

1. **Check if the column was renamed:**
   ```sql
   SELECT * FROM word_base LIMIT 1;
   ```

2. **If the column still exists with the old name, run the migration script again**

3. **If you get "column does not exist" errors, make sure you ran the SQL migration script**

4. **To check the current column name:**
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'word_base';
   ```

