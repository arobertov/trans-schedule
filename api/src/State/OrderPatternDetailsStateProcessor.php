<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\OrderPatternDetails;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

class OrderPatternDetailsStateProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        #[Autowire(service: 'api_platform.doctrine.orm.state.remove_processor')]
        private ProcessorInterface $removeProcessor,
        private EntityManagerInterface $entityManager
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($operation instanceof Delete) {
            // При масово изтриване, автоматичното пренареждане причинява Deadlock (SQL 1213).
            // Затова просто изтриваме записа, без да пренареждаме останалите.
            // Дупките в номерацията (напр. 1, 2, 5, 6) ще се оправят автоматично
            // при следващото пренареждане (Drag & Drop) от интерфейса.
            
            $this->removeProcessor->process($data, $operation, $uriVariables, $context);
            return null;
        }

        $positionChanged = false;

        // Логика преди запис (изместване на другите елементи)
        if ($data instanceof OrderPatternDetails) {
            $positionChanged = $this->prePersistPosition($data);
        }

        // Стандартен запис
        $result = $this->persistProcessor->process($data, $operation, $uriVariables, $context);

        // Логика след запис (нормализиране 1..N) - само ако позицията е променена
        // if ($data instanceof OrderPatternDetails && $positionChanged) {
        //     $this->postPersistPosition($data);
        // }

        return $result;
    }

    private function prePersistPosition(OrderPatternDetails $detail): bool
    {
        $newValue = $detail->getPositionNumber();
        if ($newValue === null) {
            return false;
        }

        $uow = $this->entityManager->getUnitOfWork();
        $oldValue = null;
        $isNew = $detail->getId() === null;

        // Проверка за редакция
        if (!$isNew) {
            // Изчисляваме промените, за да видим дали position_number е пипнат
            $uow->computeChangeSets();
            $changeSet = $uow->getEntityChangeSet($detail);
            
            if (!isset($changeSet['position_number'])) {
                return false; // Няма промяна в позицията, пропускаме преподреждането
            }
            $oldValue = $changeSet['position_number'][0];
        }

        $repository = $this->entityManager->getRepository(OrderPatternDetails::class);
        $qb = $repository->createQueryBuilder('d');
        
        // Филтриране по родител (OrderPattern)
        if ($detail->getPattern()) {
            $qb->andWhere('d.pattern = :parent')
               ->setParameter('parent', $detail->getPattern());
        }

        if ($isNew) {
            // Нов запис: изместваме всички >= newValue с +1
            $qb->update()
                ->set('d.position_number', 'd.position_number + 1')
                ->andWhere('d.position_number >= :newValue')
                ->setParameter('newValue', $newValue)
                ->getQuery()
                ->execute();
        } else {
            // Редакция
            $conn = $this->entityManager->getConnection();
            $patternId = $detail->getPattern() ? $detail->getPattern()->getId() : null;

            // Стъпка 1: Преместваме текущия елемент на временна позиция (напр. -ID),
            // за да освободим място и да избегнем Unique Constraint Violation
            $conn->executeStatement(
                'UPDATE order_pattern_details SET position_number = :tempPos WHERE id = :id',
                ['tempPos' => -1 * $detail->getId(), 'id' => $detail->getId()]
            );

            if ($newValue < $oldValue) {
                // Местене НАГОРЕ (напр. 5 -> 2): Изместваме [2..4] с +1
                // ORDER BY position_number DESC
                $sql = 'UPDATE order_pattern_details SET position_number = position_number + 1 
                        WHERE position_number >= :newValue AND position_number < :oldValue 
                        AND id != :id';
                
                $params = [
                    'newValue' => $newValue,
                    'oldValue' => $oldValue,
                    'id' => $detail->getId()
                ];

                if ($patternId) {
                    $sql .= ' AND pattern_id = :patternId';
                    $params['patternId'] = $patternId;
                }

                $sql .= ' ORDER BY position_number DESC';

                $conn->executeStatement($sql, $params);

            } elseif ($newValue > $oldValue) {
                // Местене НАДОЛУ (напр. 2 -> 5): Изместваме [3..5] с -1
                // ORDER BY position_number ASC
                $sql = 'UPDATE order_pattern_details SET position_number = position_number - 1 
                        WHERE position_number > :oldValue AND position_number <= :newValue 
                        AND id != :id';
                
                $params = [
                    'oldValue' => $oldValue,
                    'newValue' => $newValue,
                    'id' => $detail->getId()
                ];

                if ($patternId) {
                    $sql .= ' AND pattern_id = :patternId';
                    $params['patternId'] = $patternId;
                }

                $sql .= ' ORDER BY position_number ASC';

                $conn->executeStatement($sql, $params);
            }
        }

        return true;
    }

    private function postRemovePosition(int $deletedPosition, ?\App\Entity\OrderPattern $pattern): void
    {
        $repository = $this->entityManager->getRepository(OrderPatternDetails::class);
        $qb = $repository->createQueryBuilder('d');
        
        $qb->update()
           ->set('d.position_number', 'd.position_number - 1')
           ->where('d.position_number > :position')
           ->setParameter('position', $deletedPosition);

        if ($pattern) {
            $qb->andWhere('d.pattern = :pattern')
               ->setParameter('pattern', $pattern);
        }

        $qb->getQuery()->execute();
    }

    private function postPersistPosition(OrderPatternDetails $detail): void
    {
        // Нормализиране на поредицата (1, 2, 3...) за конкретния родител
        $repository = $this->entityManager->getRepository(OrderPatternDetails::class);
        
        $criteria = [];
        if ($detail->getPattern()) {
            $criteria['pattern'] = $detail->getPattern();
        }

        $details = $repository->findBy($criteria, ['position_number' => 'ASC']);

        $index = 1;
        $needsFlush = false;
        foreach ($details as $item) {
            if ($item->getPositionNumber() !== $index) {
                $item->setPositionNumber($index);
                $needsFlush = true;
            }
            $index++;
        }

        if ($needsFlush) {
            $this->entityManager->flush();
        }
    }
}
