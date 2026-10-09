import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Define the new dataset manifest schema version
const NEW_SCHEMA_VERSION = 'v2.0.0';

// Interface for the old dataset manifest
interface LegacyArenaDatasetManifest {
  // Existing properties of the legacy manifest
}

// Interface for the new dataset manifest
export interface ArenaDatasetManifest extends LegacyArenaDatasetManifest {
  schemaVersion: string;
}

// Function to migrate legacy v1.0.0 arena data directories to v2.0.0
export function migrateDatasetVersion(legacyDir: string, newDir: string): void {
  // Check if the new directory exists and create it if not
  if (!existsSync(newDir)) {
    mkdirSync(newDir);
  }

  // Read the legacy dataset manifest file
  const legacyManifestPath = join(legacyDir, 'arena_dataset_manifest.json');
  if (existsSync(legacyManifestPath)) {
    const legacyManifestContent = readFileSync(legacyManifestPath, 'utf-8');

    // Parse the legacy manifest content
    const legacyManifest: LegacyArenaDatasetManifest = JSON.parse(legacyManifestContent);

    // Create a new dataset manifest with the updated schema version
    const newManifest: ArenaDatasetManifest = {
      ...legacyManifest,
      schemaVersion: NEW_SCHEMA_VERSION,
    };

    // Write the new manifest to the new directory
    const newManifestPath = join(newDir, 'arena_dataset_manifest.json');
    writeFileSync(newManifestPath, JSON.stringify(newManifest, null, 2), 'utf-8');

    console.log(`Migrated dataset version from ${legacyDir} to ${newDir}`);
  } else {
    console.error(`Legacy manifest not found at ${legacyManifestPath}`);
  }
}

// Example usage
const legacyDataDir = '/path/to/legacy/data';
const newDataDir = '/path/to/new/data';

migrateDatasetVersion(legacyDataDir, newDataDir);
