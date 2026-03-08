-- Change version column to bigint to support timestamp-based versions
ALTER TABLE ml_models ALTER COLUMN version TYPE bigint;