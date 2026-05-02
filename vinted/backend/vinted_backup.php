<?php
/**
 * Vinted DB Backup Trigger
 * This script exports the current database into the 'database_store' folder.
 * Access it via your browser to start the backup.
 */

header('Content-Type: text/plain; charset=utf-8');
echo "--- Vinted DB Backup Started ---\n";
echo "Date: ". date('Y-m-d H:i:s') . "\n";
echo "Target Folder: db_backup\n\n";

// Ensure we are in the script's directory
chdir(__DIR__);

// Execute node script
$cmd = "node backup_db.js 2>&1";
$out = [];
$res = 0;

exec($cmd, $out, $res);

echo implode("\n", $out) . "\n";

if ($res === 0) {
    echo "\n[SUCCESS] Current database files have been stored in 'db_backup'.\n";
} else {
    echo "\n[ERROR] Database backup failed. See output above.\n";
}

echo "--- Process Finished ---\n";
?>
