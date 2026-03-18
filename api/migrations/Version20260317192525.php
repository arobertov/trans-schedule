<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260317192525 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE personal_accounts (id INT AUTO_INCREMENT NOT NULL, employee_name VARCHAR(255) NOT NULL, year INT NOT NULL, month INT NOT NULL, individual_norm_minutes INT DEFAULT 0 NOT NULL, worked_time_minutes INT DEFAULT 0 NOT NULL, night_work_minutes INT DEFAULT 0 NOT NULL, night_correction_1143_minutes INT DEFAULT 0 NOT NULL, worked_with_correction_minutes INT DEFAULT 0 NOT NULL, kilometers_total DOUBLE PRECISION DEFAULT 0 NOT NULL, night_work_x24 NUMERIC(10, 2) DEFAULT 0 NOT NULL, previous_month_balance_minutes INT DEFAULT 0 NOT NULL, current_month_balance_minutes INT DEFAULT 0 NOT NULL, period_total_minutes INT DEFAULT 0 NOT NULL, detail_rows JSON DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME DEFAULT NULL, employee_id INT NOT NULL, position_id INT NOT NULL, monthly_schedule_id INT NOT NULL, INDEX IDX_66F740E58C03F15C (employee_id), INDEX IDX_66F740E5DD842E46 (position_id), INDEX IDX_66F740E53910A81A (monthly_schedule_id), UNIQUE INDEX uniq_personal_account_month (employee_id, position_id, year, month), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('ALTER TABLE personal_accounts ADD CONSTRAINT FK_66F740E58C03F15C FOREIGN KEY (employee_id) REFERENCES employees (id)');
        $this->addSql('ALTER TABLE personal_accounts ADD CONSTRAINT FK_66F740E5DD842E46 FOREIGN KEY (position_id) REFERENCES positions (id)');
        $this->addSql('ALTER TABLE personal_accounts ADD CONSTRAINT FK_66F740E53910A81A FOREIGN KEY (monthly_schedule_id) REFERENCES monthly_schedules (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE personal_accounts DROP FOREIGN KEY FK_66F740E58C03F15C');
        $this->addSql('ALTER TABLE personal_accounts DROP FOREIGN KEY FK_66F740E5DD842E46');
        $this->addSql('ALTER TABLE personal_accounts DROP FOREIGN KEY FK_66F740E53910A81A');
        $this->addSql('DROP TABLE personal_accounts');
    }
}
