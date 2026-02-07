<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260207095053 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE train_diagram ADD name VARCHAR(255) NOT NULL, ADD train_schedule_id INT NOT NULL, DROP train_number, DROP start_station, DROP end_station, CHANGE intermediate_stations stations JSON NOT NULL');
        $this->addSql('ALTER TABLE train_diagram ADD CONSTRAINT FK_5376CEFB2AAD00B3 FOREIGN KEY (train_schedule_id) REFERENCES train_schedule (id)');
        $this->addSql('CREATE INDEX IDX_5376CEFB2AAD00B3 ON train_diagram (train_schedule_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE train_diagram DROP FOREIGN KEY FK_5376CEFB2AAD00B3');
        $this->addSql('DROP INDEX IDX_5376CEFB2AAD00B3 ON train_diagram');
        $this->addSql('ALTER TABLE train_diagram ADD train_number VARCHAR(50) NOT NULL, ADD start_station VARCHAR(255) DEFAULT NULL, ADD end_station VARCHAR(255) DEFAULT NULL, DROP name, DROP train_schedule_id, CHANGE stations intermediate_stations JSON NOT NULL');
    }
}
