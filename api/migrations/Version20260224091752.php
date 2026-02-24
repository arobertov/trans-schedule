<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260224091752 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE shift_schedule_details ADD shift_code VARCHAR(20) NOT NULL, ADD at_doctor TIME NOT NULL, ADD at_duty_officer TIME NOT NULL, ADD shift_end TIME NOT NULL, ADD worked_time TIME NOT NULL, ADD night_work TIME DEFAULT NULL, ADD total_time TIME DEFAULT NULL, ADD kilometers DOUBLE PRECISION NOT NULL, ADD zero_time INT DEFAULT NULL, ADD routes JSON DEFAULT NULL, DROP route, DROP pickup_location, DROP pickup_route_number, DROP in_schedule, DROP from_schedule, DROP dropoff_location, DROP dropoff_route_number');
        $this->addSql('ALTER TABLE shift_schedules ADD name VARCHAR(255) NOT NULL, DROP shift_code, DROP worked_time, DROP night_work, DROP total_time, DROP kilometers, DROP zero_time, DROP at_doctor, DROP at_duty_officer, DROP shift_end');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE shift_schedule_details ADD route INT NOT NULL, ADD pickup_location VARCHAR(255) NOT NULL, ADD pickup_route_number INT NOT NULL, ADD in_schedule TIME NOT NULL, ADD from_schedule TIME NOT NULL, ADD dropoff_location VARCHAR(255) NOT NULL, ADD dropoff_route_number INT NOT NULL, DROP shift_code, DROP at_doctor, DROP at_duty_officer, DROP shift_end, DROP worked_time, DROP night_work, DROP total_time, DROP kilometers, DROP zero_time, DROP routes');
        $this->addSql('ALTER TABLE shift_schedules ADD shift_code VARCHAR(20) NOT NULL, ADD worked_time TIME NOT NULL, ADD night_work TIME DEFAULT NULL, ADD total_time TIME DEFAULT NULL, ADD kilometers DOUBLE PRECISION NOT NULL, ADD zero_time INT DEFAULT NULL, ADD at_doctor TIME NOT NULL, ADD at_duty_officer TIME NOT NULL, ADD shift_end TIME NOT NULL, DROP name');
    }
}
