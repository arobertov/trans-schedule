<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260223121059 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE shift_schedule_details (id INT AUTO_INCREMENT NOT NULL, route INT NOT NULL, pickup_location VARCHAR(255) NOT NULL, pickup_route_number INT NOT NULL, in_schedule TIME NOT NULL, from_schedule TIME NOT NULL, dropoff_location VARCHAR(255) NOT NULL, dropoff_route_number INT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, shift_schedule_id INT NOT NULL, INDEX IDX_40E6EA00FEE40C7 (shift_schedule_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('ALTER TABLE shift_schedule_details ADD CONSTRAINT FK_40E6EA00FEE40C7 FOREIGN KEY (shift_schedule_id) REFERENCES shift_schedules (id)');
        $this->addSql('ALTER TABLE shift_schedules ADD at_doctor TIME NOT NULL, ADD at_duty_officer TIME NOT NULL, ADD shift_end TIME NOT NULL, DROP day_type, DROP season, CHANGE zero_time zero_time INT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE shift_schedule_details DROP FOREIGN KEY FK_40E6EA00FEE40C7');
        $this->addSql('DROP TABLE shift_schedule_details');
        $this->addSql('ALTER TABLE shift_schedules ADD day_type VARCHAR(255) NOT NULL, ADD season VARCHAR(255) NOT NULL, DROP at_doctor, DROP at_duty_officer, DROP shift_end, CHANGE zero_time zero_time TIME DEFAULT NULL');
    }
}
