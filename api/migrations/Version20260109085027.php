<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260109085027 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE monthly_schedules (id INT AUTO_INCREMENT NOT NULL, year INT NOT NULL, month INT NOT NULL, working_days INT DEFAULT NULL, working_hours INT DEFAULT NULL, description VARCHAR(255) DEFAULT NULL, status VARCHAR(255) DEFAULT \'чернова\' NOT NULL, schedule_rows JSON DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME DEFAULT NULL, position_id INT NOT NULL, INDEX IDX_207BDFFDDD842E46 (position_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('ALTER TABLE monthly_schedules ADD CONSTRAINT FK_207BDFFDDD842E46 FOREIGN KEY (position_id) REFERENCES positions (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE monthly_schedules DROP FOREIGN KEY FK_207BDFFDDD842E46');
        $this->addSql('DROP TABLE monthly_schedules');
    }
}
