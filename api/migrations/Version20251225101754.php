<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251225101754 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE order_pattern_details (id INT AUTO_INCREMENT NOT NULL, position_number INT NOT NULL, `values` JSON NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at DATETIME DEFAULT NULL, pattern_id INT NOT NULL, INDEX IDX_7287D8A6F734A20F (pattern_id), UNIQUE INDEX unique_position_per_pattern (pattern_id, position_number), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('CREATE TABLE order_patterns (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(100) NOT NULL, total_positions INT NOT NULL, is_active TINYINT(1) DEFAULT 0 NOT NULL, description LONGTEXT DEFAULT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at DATETIME DEFAULT NULL, UNIQUE INDEX UNIQ_F0553F615E237E06 (name), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('CREATE TABLE pattern_columns (id INT AUTO_INCREMENT NOT NULL, column_number INT NOT NULL, column_name VARCHAR(100) NOT NULL, label VARCHAR(50) NOT NULL, description LONGTEXT DEFAULT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, pattern_id INT NOT NULL, INDEX IDX_6766D0C7F734A20F (pattern_id), UNIQUE INDEX unique_column_per_pattern (pattern_id, column_number), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('ALTER TABLE order_pattern_details ADD CONSTRAINT FK_7287D8A6F734A20F FOREIGN KEY (pattern_id) REFERENCES order_patterns (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE pattern_columns ADD CONSTRAINT FK_6766D0C7F734A20F FOREIGN KEY (pattern_id) REFERENCES order_patterns (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE order_pattern_details DROP FOREIGN KEY FK_7287D8A6F734A20F');
        $this->addSql('ALTER TABLE pattern_columns DROP FOREIGN KEY FK_6766D0C7F734A20F');
        $this->addSql('DROP TABLE order_pattern_details');
        $this->addSql('DROP TABLE order_patterns');
        $this->addSql('DROP TABLE pattern_columns');
    }
}
