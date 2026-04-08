<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260405103456 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add status column to shift_schedules table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE shift_schedules ADD status VARCHAR(20) NOT NULL DEFAULT \'активен\'');
        // Set existing records to active
        $this->addSql('UPDATE shift_schedules SET status = \'активен\' WHERE status = \'\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE shift_schedules DROP status');
    }
}
