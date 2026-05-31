<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260508090352 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Move workbook_snapshot from shift_schedules to separate shift_schedule_workbook table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE shift_schedule_workbook (id INT AUTO_INCREMENT NOT NULL, snapshot JSON DEFAULT NULL, schedule_id INT NOT NULL, UNIQUE INDEX UNIQ_F1BF4788A40BC2D5 (schedule_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('ALTER TABLE shift_schedule_workbook ADD CONSTRAINT FK_F1BF4788A40BC2D5 FOREIGN KEY (schedule_id) REFERENCES shift_schedules (id) ON DELETE CASCADE');
        // Migrate existing workbook_snapshot data to the new table
        $this->addSql('INSERT INTO shift_schedule_workbook (schedule_id, snapshot) SELECT id, workbook_snapshot FROM shift_schedules WHERE workbook_snapshot IS NOT NULL');
        $this->addSql('ALTER TABLE shift_schedules DROP workbook_snapshot');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE shift_schedule_workbook DROP FOREIGN KEY FK_F1BF4788A40BC2D5');
        $this->addSql('DROP TABLE shift_schedule_workbook');
        $this->addSql('ALTER TABLE shift_schedules ADD workbook_snapshot JSON DEFAULT NULL');
    }
}
