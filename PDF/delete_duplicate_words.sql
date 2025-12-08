-- Delete duplicate records from word_base table based on the 'word' field
-- This query keeps one record per word (the one with the minimum id) and deletes the rest
-- Run this script directly in your Supabase SQL Editor or database console

-- STEP 1: Verify duplicates before deletion (optional - run this first to see what will be deleted)
-- Uncomment the following query to see duplicate words and their counts:
/*
SELECT 
    word, 
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY id) as ids
FROM word_base
GROUP BY word
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
*/

-- STEP 2: Delete duplicate records
-- This keeps the record with the minimum id for each word and deletes all others
DELETE FROM word_base
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (PARTITION BY word ORDER BY id ASC) as row_num
        FROM word_base
    ) AS ranked
    WHERE row_num > 1
);

-- STEP 3: Verify deletion (optional - run this after deletion to confirm)
-- Uncomment the following query to verify no duplicates remain:
/*
SELECT 
    word, 
    COUNT(*) as count
FROM word_base
GROUP BY word
HAVING COUNT(*) > 1;
-- This should return no rows if all duplicates were removed
*/

-- Alternative approach using CTE (more readable):
-- Uncomment below if you prefer this version:
/*
WITH duplicates_to_delete AS (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (PARTITION BY word ORDER BY id ASC) as row_num
        FROM word_base
    ) AS ranked
    WHERE row_num > 1
)
DELETE FROM word_base
WHERE id IN (SELECT id FROM duplicates_to_delete);
*/
