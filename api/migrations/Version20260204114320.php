<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260204114320 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE train_diagram (id INT AUTO_INCREMENT NOT NULL, train_number VARCHAR(50) NOT NULL, intermediate_stations JSON NOT NULL, start_station VARCHAR(255) DEFAULT NULL, end_station VARCHAR(255) DEFAULT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('CREATE TABLE train_schedule (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) NOT NULL, description VARCHAR(255) DEFAULT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('CREATE TABLE train_schedule_line (id INT AUTO_INCREMENT NOT NULL, train_number VARCHAR(50) NOT NULL, station_track VARCHAR(255) NOT NULL, arrival_time TIME DEFAULT NULL, departure_time TIME DEFAULT NULL, train_schedule_id INT NOT NULL, INDEX IDX_779175B62AAD00B3 (train_schedule_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('ALTER TABLE train_schedule_line ADD CONSTRAINT FK_779175B62AAD00B3 FOREIGN KEY (train_schedule_id) REFERENCES train_schedule (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE train_schedule_line DROP FOREIGN KEY FK_779175B62AAD00B3');
        $this->addSql('DROP TABLE train_diagram');
        $this->addSql('DROP TABLE train_schedule');
        $this->addSql('DROP TABLE train_schedule_line');
    }
}
