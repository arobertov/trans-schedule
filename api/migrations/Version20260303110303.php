<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260303110303 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        $schemaManager = $this->connection->createSchemaManager();

        $calendarColumns = $schemaManager->listTableColumns('calendars');
        $calendarIndexes = $schemaManager->listTableIndexes('calendars');

        if ($this->hasIndex($calendarIndexes, 'unique_year_month')) {
            $this->addSql('DROP INDEX unique_year_month ON calendars');
        }

        $calendarAlterParts = [];

        if ($this->hasColumn($calendarColumns, 'month')) {
            $calendarAlterParts[] = 'DROP month';
        }
        if ($this->hasColumn($calendarColumns, 'work_days')) {
            $calendarAlterParts[] = 'DROP work_days';
        }
        if ($this->hasColumn($calendarColumns, 'work_hours')) {
            $calendarAlterParts[] = 'DROP work_hours';
        }
        if ($this->hasColumn($calendarColumns, 'days') && !$this->hasColumn($calendarColumns, 'months_data')) {
            $calendarAlterParts[] = 'CHANGE days months_data JSON NOT NULL';
        }

        if ($calendarAlterParts !== []) {
            $this->addSql('ALTER TABLE calendars '.implode(', ', $calendarAlterParts));
        }

        $calendarIndexes = $schemaManager->listTableIndexes('calendars');
        if (!$this->hasIndex($calendarIndexes, 'unique_year')) {
            $this->addSql('CREATE UNIQUE INDEX unique_year ON calendars (year)');
        }

        $shiftScheduleColumns = $schemaManager->listTableColumns('shift_schedules');
        if (!$this->hasColumn($shiftScheduleColumns, 'description')) {
            $this->addSql('ALTER TABLE shift_schedules ADD description LONGTEXT DEFAULT NULL');
        }
    }

    public function down(Schema $schema): void
    {
        $schemaManager = $this->connection->createSchemaManager();

        $calendarColumns = $schemaManager->listTableColumns('calendars');
        $calendarIndexes = $schemaManager->listTableIndexes('calendars');

        if ($this->hasIndex($calendarIndexes, 'unique_year')) {
            $this->addSql('DROP INDEX unique_year ON calendars');
        }

        $calendarAlterParts = [];

        if (!$this->hasColumn($calendarColumns, 'month')) {
            $calendarAlterParts[] = 'ADD month INT NOT NULL';
        }
        if (!$this->hasColumn($calendarColumns, 'work_days')) {
            $calendarAlterParts[] = 'ADD work_days INT DEFAULT NULL';
        }
        if (!$this->hasColumn($calendarColumns, 'work_hours')) {
            $calendarAlterParts[] = 'ADD work_hours INT DEFAULT NULL';
        }
        if ($this->hasColumn($calendarColumns, 'months_data') && !$this->hasColumn($calendarColumns, 'days')) {
            $calendarAlterParts[] = 'CHANGE months_data days JSON NOT NULL';
        }

        if ($calendarAlterParts !== []) {
            $this->addSql('ALTER TABLE calendars '.implode(', ', $calendarAlterParts));
        }

        $calendarIndexes = $schemaManager->listTableIndexes('calendars');
        if (!$this->hasIndex($calendarIndexes, 'unique_year_month')
            && $this->hasColumn($schemaManager->listTableColumns('calendars'), 'year')
            && $this->hasColumn($schemaManager->listTableColumns('calendars'), 'month')) {
            $this->addSql('CREATE UNIQUE INDEX unique_year_month ON calendars (year, month)');
        }

        $shiftScheduleColumns = $schemaManager->listTableColumns('shift_schedules');
        if ($this->hasColumn($shiftScheduleColumns, 'description')) {
            $this->addSql('ALTER TABLE shift_schedules DROP description');
        }
    }

    /**
     * @param array<string, mixed> $columns
     */
    private function hasColumn(array $columns, string $name): bool
    {
        foreach (array_keys($columns) as $columnName) {
            if (strtolower((string) $columnName) === strtolower($name)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param array<string, mixed> $indexes
     */
    private function hasIndex(array $indexes, string $name): bool
    {
        foreach (array_keys($indexes) as $indexName) {
            if (strtolower((string) $indexName) === strtolower($name)) {
                return true;
            }
        }

        return false;
    }
}
