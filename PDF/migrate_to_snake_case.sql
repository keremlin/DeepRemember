-- Migration script to change groupAlphabetName to group_alphabet_name
-- Run this script directly in your Supabase SQL Editor or database console

-- Step 1: Drop the existing index on groupAlphabetName
DROP INDEX IF EXISTS idx_word_base_groupAlphabetName;

-- Step 2: Rename the column from "groupAlphabetName" to group_alphabet_name
ALTER TABLE word_base 
RENAME COLUMN "groupAlphabetName" TO group_alphabet_name;

-- Step 3: Recreate the index with the new column name
CREATE INDEX IF NOT EXISTS idx_word_base_group_alphabet_name ON word_base(group_alphabet_name);

-- Step 4: Verify the change
-- You can run this to check:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'word_base' AND column_name LIKE '%group%';

