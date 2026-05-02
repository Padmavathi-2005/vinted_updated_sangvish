<?php
/**
 * DB Reset Trigger Script
 * This script will clear the current database and restore it from the last backup.
 * It calls the Node.js restore script under the hood.
 */

header('Content-Type: text/plain');

echo "--- MongoDB Reset Process Started ---\n";

// Execute the node restore script
// We use the absolute path to node if possible, or just 'node'
$command = "node restore_db.js 2>&1";
$output = [];
$return_var = 0;

exec($command, $output, $return_var);

echo implode("\n", $output) . "\n";

if ($return_var === 0) {
    echo "\nSUCCESS: Database has been reset and restored from backup.\n";
} else {
    echo "\nERROR: Database reset failed. See output above.\n";
}

echo "--- Process Finished ---\n";
?>
