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
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP INDEX unique_year_month ON calendars');
        $this->addSql('ALTER TABLE calendars DROP month, DROP work_days, DROP work_hours, CHANGE days months_data JSON NOT NULL');
        $this->addSql('CREATE UNIQUE INDEX unique_year ON calendars (year)');
        $this->addSql('ALTER TABLE shift_schedules ADD description LONGTEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP INDEX unique_year ON calendars');
        $this->addSql('ALTER TABLE calendars ADD month INT NOT NULL, ADD work_days INT DEFAULT NULL, ADD work_hours INT DEFAULT NULL, CHANGE months_data days JSON NOT NULL');
        $this->addSql('CREATE UNIQUE INDEX unique_year_month ON calendars (year, month)');
        $this->addSql('ALTER TABLE shift_schedules DROP description');
    }
}
