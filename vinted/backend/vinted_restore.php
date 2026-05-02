<?php
/**
 * Vinted DB Restore Trigger
 * This script restores the database from the 'database_store' folder.
 * WARNING: This will clear the current database before restoring.
 */

header('Content-Type: text/plain; charset=utf-8');
echo "--- Vinted DB Restoration Started ---\n";
echo "Date: ". date('Y-m-d H:i:s') . "\n";
echo "Source Folder: db_backup\n\n";

// Ensure we are in the script's directory
chdir(__DIR__);

// Execute node script
$cmd = "node restore_db.js 2>&1";
$out = [];
$res = 0;

exec($cmd, $out, $res);

echo implode("\n", $out) . "\n";

if ($res === 0) {
    echo "\n[SUCCESS] Custom database backup has been successfully restored.\n";
} else {
    echo "\n[ERROR] Database restoration failed. See output above.\n";
}

echo "--- Process Finished ---\n";
?>
