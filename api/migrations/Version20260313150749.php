<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260313150749 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE monthly_schedules ADD link_previous_month_balance TINYINT(1) DEFAULT 0 NOT NULL, ADD weekday_shift_schedule_id INT DEFAULT NULL, ADD holiday_shift_schedule_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE monthly_schedules ADD CONSTRAINT FK_207BDFFD23263938 FOREIGN KEY (weekday_shift_schedule_id) REFERENCES shift_schedules (id)');
        $this->addSql('ALTER TABLE monthly_schedules ADD CONSTRAINT FK_207BDFFD27C6E18A FOREIGN KEY (holiday_shift_schedule_id) REFERENCES shift_schedules (id)');
        $this->addSql('CREATE INDEX IDX_207BDFFD23263938 ON monthly_schedules (weekday_shift_schedule_id)');
        $this->addSql('CREATE INDEX IDX_207BDFFD27C6E18A ON monthly_schedules (holiday_shift_schedule_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE monthly_schedules DROP FOREIGN KEY FK_207BDFFD23263938');
        $this->addSql('ALTER TABLE monthly_schedules DROP FOREIGN KEY FK_207BDFFD27C6E18A');
        $this->addSql('DROP INDEX IDX_207BDFFD23263938 ON monthly_schedules');
        $this->addSql('DROP INDEX IDX_207BDFFD27C6E18A ON monthly_schedules');
        $this->addSql('ALTER TABLE monthly_schedules DROP link_previous_month_balance, DROP weekday_shift_schedule_id, DROP holiday_shift_schedule_id');
    }
}
