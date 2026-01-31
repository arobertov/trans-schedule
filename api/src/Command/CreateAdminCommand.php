<?php
// src/Command/CreateAdminCommand.php

namespace App\Command;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Question\Question;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:create-admin',
    description: 'Създава нов администраторски потребител'
)]
class CreateAdminCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $helper = $this->getHelper('question');

        $io->title('Създаване на администраторски потребител');

        // Потребителско име
        $usernameQuestion = new Question('Потребителско име: ');
        $usernameQuestion->setValidator(function ($answer) {
            if (empty($answer)) {
                throw new \RuntimeException('Потребителското име не може да бъде празно');
            }
            
            // Проверка дали вече съществува
            $existingUser = $this->entityManager->getRepository(User::class)
                ->findOneBy(['username' => $answer]);
            
            if ($existingUser) {
                throw new \RuntimeException('Потребител с това име вече съществува');
            }
            
            return $answer;
        });
        $username = $helper->ask($input, $output, $usernameQuestion);

        // Първо име
        $firstNameQuestion = new Question('Първо име: ');
        $firstNameQuestion->setValidator(function ($answer) {
            if (empty($answer)) {
                throw new \RuntimeException('Първото име е задължително');
            }
            return $answer;
        });
        $firstName = $helper->ask($input, $output, $firstNameQuestion);

        // Фамилно име
        $lastNameQuestion = new Question('Фамилно име: ');
        $lastNameQuestion->setValidator(function ($answer) {
            if (empty($answer)) {
                throw new \RuntimeException('Фамилното име е задължително');
            }
            return $answer;
        });
        $lastName = $helper->ask($input, $output, $lastNameQuestion);

        // Парола
        $passwordQuestion = new Question('Парола (минимум 6 символа): ');
        $passwordQuestion->setHidden(true);
        $passwordQuestion->setHiddenFallback(false);
        $passwordQuestion->setValidator(function ($answer) {
            if (empty($answer)) {
                throw new \RuntimeException('Паролата не може да бъде празна');
            }
            if (strlen($answer) < 6) {
                throw new \RuntimeException('Паролата трябва да бъде минимум 6 символа');
            }
            return $answer;
        });
        $password = $helper->ask($input, $output, $passwordQuestion);

        // Потвърждаване на паролата
        $confirmPasswordQuestion = new Question('Потвърдете паролата: ');
        $confirmPasswordQuestion->setHidden(true);
        $confirmPasswordQuestion->setHiddenFallback(false);
        $confirmPasswordQuestion->setValidator(function ($answer) use ($password) {
            if ($answer !== $password) {
                throw new \RuntimeException('Паролите не съвпадат');
            }
            return $answer;
        });
        $helper->ask($input, $output, $confirmPasswordQuestion);

        // Роля
        $io->section('Изберете роля');
        $io->listing([
            '1. ROLE_ADMIN - Администратор',
            '2. ROLE_SUPER_ADMIN - Супер администратор'
        ]);
        
        $roleQuestion = new Question('Изберете роля (1 или 2) [1]: ', '1');
        $roleQuestion->setValidator(function ($answer) {
            if (!in_array($answer, ['1', '2'])) {
                throw new \RuntimeException('Моля изберете 1 или 2');
            }
            return $answer;
        });
        $roleChoice = $helper->ask($input, $output, $roleQuestion);
        
        $role = $roleChoice === '2' ? 'ROLE_SUPER_ADMIN' : 'ROLE_ADMIN';

        // Създаване на потребителя
        $io->section('Потвърждение');
        $io->table(
            ['Поле', 'Стойност'],
            [
                ['Потребителско име', $username],
                ['Първо име', $firstName],
                ['Фамилно име', $lastName],
                ['Роля', $role]
            ]
        );

        $confirmQuestion = new Question('Потвърдете създаването (yes/no) [yes]: ', 'yes');
        $confirm = $helper->ask($input, $output, $confirmQuestion);

        if (strtolower($confirm) !== 'yes') {
            $io->warning('Операцията е отменена');
            return Command::FAILURE;
        }

        try {
            $user = new User();
            $user->setUsername($username);
            $user->setFirstName($firstName);
            $user->setLastName($lastName);
            
            $hashedPassword = $this->passwordHasher->hashPassword($user, $password);
            $user->setPassword($hashedPassword);
            $user->setRoles([$role]);

            $this->entityManager->persist($user);
            $this->entityManager->flush();

            $io->success([
                'Администраторът е създаден успешно!',
                sprintf('Потребителско име: %s', $username),
                sprintf('Роля: %s', $role)
            ]);

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $io->error([
                'Грешка при създаване на потребителя',
                $e->getMessage()
            ]);
            return Command::FAILURE;
        }
    }
}
