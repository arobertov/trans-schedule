<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260108111726 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE matrices (id INT AUTO_INCREMENT NOT NULL, year INT NOT NULL, month INT NOT NULL, start_position INT DEFAULT 1 NOT NULL, header JSON DEFAULT NULL, matrix_rows JSON DEFAULT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at DATETIME DEFAULT NULL, pattern_id INT NOT NULL, INDEX IDX_CD95A3BEF734A20F (pattern_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('ALTER TABLE matrices ADD CONSTRAINT FK_CD95A3BEF734A20F FOREIGN KEY (pattern_id) REFERENCES order_patterns (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE matrices DROP FOREIGN KEY FK_CD95A3BEF734A20F');
        $this->addSql('DROP TABLE matrices');
    }
}
