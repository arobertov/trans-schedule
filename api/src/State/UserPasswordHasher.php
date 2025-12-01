<?php
// api/src/State/UserPasswordHasher.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\User;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * @implements ProcessorInterface<User, User|void>
 */
final readonly class UserPasswordHasher implements ProcessorInterface
{
    public function __construct(
        private ProcessorInterface $processor,
        private UserPasswordHasherInterface $passwordHasher
    )
    {
    }

    /**
     * @param User $data
     */
    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): User
    {
        if (!$data->getPlainPassword()) {
            return $this->processor->process($data, $operation, $uriVariables, $context);
        }

        // For update operations (PATCH/PUT), verify the old password if provided
        if ($operation instanceof \ApiPlatform\Metadata\Patch || $operation instanceof \ApiPlatform\Metadata\Put) {
            if ($data->getOldPassword()) {
                // Get the existing user from database to verify old password
                $existingPassword = $data->getPassword();
                if (!$existingPassword || !$this->passwordHasher->isPasswordValid($data, $data->getOldPassword())) {
                    throw new \Symfony\Component\HttpKernel\Exception\BadRequestHttpException('Старата парола е неправилна');
                }
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