-- Update any remaining 'APPROVED' statuses to 'OPEN'
-- This is a one-time migration to handle any records that might have been missed

-- First, ensure the leave_status type exists with the correct values
DO $$
BEGIN
    -- Check if the type exists and has the correct values
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'leave_status' AND e.enumlabel = 'OPEN'
    ) THEN
        -- If the type exists but is missing values, we need to drop and recreate it
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_status') THEN
            -- First, drop any columns that depend on this type
            ALTER TABLE IF EXISTS leaves ALTER COLUMN status DROP DEFAULT;
            ALTER TABLE IF EXISTS leaves DROP CONSTRAINT IF EXISTS leaves_status_check;
            
            -- Create a temporary type with the new values
            CREATE TYPE leave_status_new AS ENUM ('OPEN', 'DENIED', 'COMPLETED');
            
            -- Change the column type to text temporarily
            ALTER TABLE leaves ALTER COLUMN status TYPE TEXT;
            
            -- Convert the values
            UPDATE leaves SET status = 
                CASE 
                    WHEN status = 'APPROVED' THEN 'OPEN'
                    WHEN status = 'AUTO_DENIED' THEN 'DENIED'
                    WHEN status = 'PENDING' THEN 'DENIED'
                    ELSE COALESCE(status, 'OPEN')
                END;
            
            -- Change the column type to the new enum
            ALTER TABLE leaves 
                ALTER COLUMN status TYPE leave_status_new 
                USING (status::leave_status_new);
            
            -- Drop the old type and rename the new one
            DROP TYPE IF EXISTS leave_status;
            ALTER TYPE leave_status_new RENAME TO leave_status;
            
            -- Recreate the constraints
            ALTER TABLE leaves 
                ALTER COLUMN status SET DEFAULT 'OPEN',
                ADD CONSTRAINT leaves_status_check 
                CHECK (status IN ('OPEN', 'DENIED', 'COMPLETED'));
                
            RAISE NOTICE 'Updated leave_status enum and converted existing records';
        ELSE
            -- Type doesn't exist, create it
            CREATE TYPE leave_status AS ENUM ('OPEN', 'DENIED', 'COMPLETED');
            RAISE NOTICE 'Created leave_status enum type';
        END IF;
    END IF;
    
    -- Now update any remaining 'APPROVED' statuses to 'OPEN'
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'leaves' AND column_name = 'status') THEN
        
        -- First update any text 'APPROVED' values
        UPDATE leaves 
        SET status = 'OPEN' 
        WHERE status::text = 'APPROVED';
        
        -- Then update any enum 'APPROVED' values (if the cast works)
        BEGIN
            UPDATE leaves 
            SET status = 'OPEN'::leave_status 
            WHERE status = 'APPROVED'::leave_status;
        EXCEPTION WHEN OTHERS THEN
            -- If the cast fails, we've already handled text values above
            RAISE NOTICE 'Could not cast APPROVED to leave_status, text update was sufficient';
        END;
        
        RAISE NOTICE 'Updated % row(s) from APPROVED to OPEN', FOUND;
    ELSE
        RAISE NOTICE 'Status column does not exist';
    END IF;
END $$;
