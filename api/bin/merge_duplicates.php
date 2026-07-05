#!/usr/bin/env php
<?php
/**
 * Merge duplicate ShiftScheduleDetails records
 * 
 * Script consolidates duplicate records with same shift_schedule_id + shift_code,
 * merging their routes arrays and deleting duplicates.
 * 
 * Usage: docker compose exec php php bin/merge_duplicates.php
 */

use App\Entity\ShiftScheduleDetails;
use App\Kernel;
use Symfony\Component\Dotenv\Dotenv;

require dirname(__DIR__).'/vendor/autoload.php';

if (!file_exists(dirname(__DIR__).'/config/bootstrap.php')) {
    (new Dotenv())->bootEnv(dirname(__DIR__).'/.env');
}

// Bootstrap Kernel
$kernel = new Kernel($_SERVER['APP_ENV'] ?? 'dev', (bool) ($_SERVER['APP_DEBUG'] ?? false));
$kernel->boot();
$container = $kernel->getContainer();
$em = $container->get('doctrine.orm.entity_manager');

$conn = $em->getConnection();
$startTime = microtime(true);

echo "\n╔════════════════════════════════════════════════════════════╗\n";
echo "║     Merging Duplicate ShiftScheduleDetails Records         ║\n";
echo "╚════════════════════════════════════════════════════════════╝\n\n";

// Query: Get all records grouped by shift_schedule_id and shift_code
$sql = "
    SELECT 
        shift_schedule_id,
        LOWER(TRIM(shift_code)) AS code_key,
        COUNT(*) AS record_count,
        GROUP_CONCAT(id ORDER BY id) AS ids
    FROM shift_schedule_details
    GROUP BY shift_schedule_id, code_key
    HAVING COUNT(*) > 1
    ORDER BY shift_schedule_id, code_key
";

$result = $conn->executeQuery($sql)->fetchAllAssociative();

if (empty($result)) {
    echo "✓ No duplicates found. Database is clean!\n\n";
    exit(0);
}

echo sprintf("Found %d duplicate groups to merge:\n\n", count($result));

$totalMerged = 0;
$totalDeleted = 0;

foreach ($result as $group) {
    $scheduleId = $group['shift_schedule_id'];
    $codeKey = $group['code_key'];
    $count = $group['record_count'];
    $idList = explode(',', $group['ids']);
    
    echo sprintf("  Schedule #%d | Code '%s' → %d records (IDs: %s)\n", 
        $scheduleId, $codeKey, $count, $group['ids']);
    
    // Load all records in group
    $records = [];
    foreach ($idList as $id) {
        $record = $em->getRepository(ShiftScheduleDetails::class)->find((int)$id);
        if ($record) {
            $records[] = $record;
        }
    }
    
    if (count($records) < 2) {
        echo "    ⚠ Only 1 record found in repository (may be deleted). Skipping.\n";
        continue;
    }
    
    // Sort by ID to keep first as primary
    usort($records, fn($a, $b) => $a->getId() <=> $b->getId());
    $primary = $records[0];
    $duplicates = array_slice($records, 1);
    
    // Merge routes
    $mergedRoutes = $primary->getRoutes() ?? [];
    if (!is_array($mergedRoutes)) {
        $mergedRoutes = [];
    }
    
    $routeCount = count($mergedRoutes);
    
    foreach ($duplicates as $duplicate) {
        $dupRoutes = $duplicate->getRoutes() ?? [];
        if (is_array($dupRoutes)) {
            $mergedRoutes = array_merge($mergedRoutes, $dupRoutes);
        }
        // Remove from database
        $em->remove($duplicate);
        $totalDeleted++;
    }
    
    // Update primary with merged routes
    $primary->setRoutes($mergedRoutes);
    $em->persist($primary);
    $totalMerged++;
    
    $newRouteCount = count($mergedRoutes);
    echo sprintf("    ✓ Merged: %d duplicate(s) deleted, %d routes → %d routes\n", 
        count($duplicates), $routeCount, $newRouteCount);
}

echo "\n" . str_repeat("─", 60) . "\n";
echo sprintf("Summary: %d merged, %d deleted\n", $totalMerged, $totalDeleted);

// Flush all changes
try {
    $em->flush();
    $elapsed = microtime(true) - $startTime;
    echo sprintf("\n✓ SUCCESS! Changes persisted in %.2fs\n", $elapsed);
    echo "  Database is now clean and optimized.\n\n";
} catch (\Exception $e) {
    echo sprintf("\n✗ ERROR during flush: %s\n", $e->getMessage());
    echo "  No changes were persisted.\n\n";
    exit(1);
}
