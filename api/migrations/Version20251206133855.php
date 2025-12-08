<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251206133855 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE shift_schedules (id INT AUTO_INCREMENT NOT NULL, shift_code VARCHAR(20) NOT NULL, day_type VARCHAR(255) NOT NULL, season VARCHAR(255) NOT NULL, worked_time TIME NOT NULL, night_work TIME DEFAULT NULL, total_time NUMERIC(5, 2) NOT NULL, kilometers NUMERIC(7, 2) NOT NULL, zero_time TIME DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE shift_schedules');
    }
}
