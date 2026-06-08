-- migrations/add_profile_fields.sql
-- Add profile-related columns to NguoiDung table
ALTER TABLE NguoiDung
    ADD COLUMN GioiTinh VARCHAR(20) NULL,
    ADD COLUMN NgaySinh DATE NULL,
    ADD COLUMN AvatarUrl VARCHAR(255) NULL;

-- You can run this SQL in your MySQL client to apply the schema changes.
-- Example (Windows / PowerShell):
-- mysql -u <user> -p < database_name < migrations/add_profile_fields.sql
