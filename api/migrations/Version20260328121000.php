<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260328121000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create app_settings table for global runtime settings';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE app_settings (setting_key VARCHAR(100) NOT NULL, setting_value VARCHAR(20) NOT NULL, updated_at DATETIME NOT NULL, PRIMARY KEY(setting_key)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE app_settings');
    }
}
