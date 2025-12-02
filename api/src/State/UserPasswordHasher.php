<?php
// api/src/State/UserPasswordHasher.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * @implements ProcessorInterface<User, User|void>
 */
final readonly class UserPasswordHasher implements ProcessorInterface
{
    public function __construct(
        private ProcessorInterface $processor,
        private UserPasswordHasherInterface $passwordHasher,
        private UserRepository $userRepository,
        private Security $security
    )
    {
    }

    /**
     * @param User $data
     */
    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): User
    {
        // Check if roles are being modified (only ROLE_SUPER_ADMIN can do this)
        if ($operation instanceof \ApiPlatform\Metadata\Patch || $operation instanceof \ApiPlatform\Metadata\Put) {
            $userId = $uriVariables['id'] ?? $data->getId();
            $existingUser = $this->userRepository->find($userId);
            
            if ($existingUser && $data->getRoles() !== $existingUser->getRoles()) {
                if (!$this->security->isGranted('ROLE_SUPER_ADMIN')) {
                    throw new AccessDeniedHttpException('Само ROLE_SUPER_ADMIN може да променя ролите на потребителите');
                }
            }
        }

        if (!$data->getPlainPassword()) {
            return $this->processor->process($data, $operation, $uriVariables, $context);
        }

        // Get user ID from URI variables or from data object
        $userId = $uriVariables['id'] ?? $data->getId();

        // For update operations (PATCH/PUT), old password is REQUIRED
        if ($operation instanceof \ApiPlatform\Metadata\Patch || $operation instanceof \ApiPlatform\Metadata\Put) {
            // Old password is required when changing password
            if (!$data->getOldPassword()) {
                throw new \Symfony\Component\HttpKernel\Exception\BadRequestHttpException('Старата парола е задължителна за промяна на паролата');
            }
            
            // Get the existing user from database to verify old password
            $existingUser = $this->userRepository->find($userId);
            
            if (!$existingUser) {
                throw new \Symfony\Component\HttpKernel\Exception\BadRequestHttpException('Потребителят не е намерен');
            }
            
            // Verify old password against the existing hashed password
            $isValid = $this->passwordHasher->isPasswordValid($existingUser, $data->getOldPassword());
            
            if (!$isValid) {
                throw new \Symfony\Component\HttpKernel\Exception\BadRequestHttpException('Старата парола е неправилна');
            }
        }

        $hashedPassword = $this->passwordHasher->hashPassword(
            $data,
            $data->getPlainPassword()
        );
        $data->setPassword($hashedPassword);

        // To avoid leaving sensitive data like the plain password in memory or logs, we manually clear it after hashing.
        $data->setPlainPassword(null);
        $data->setOldPassword(null);

        return $this->processor->process($data, $operation, $uriVariables, $context);
    }
}