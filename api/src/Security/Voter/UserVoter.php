<?php

namespace App\Security\Voter;

use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfony\Component\Security\Core\User\UserInterface;

class UserVoter extends Voter
{
    public const VIEW = 'USER_VIEW';
    public const EDIT = 'USER_EDIT';
    public const DELETE = 'USER_DELETE';

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::EDIT, self::DELETE])
            && $subject instanceof User;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $currentUser = $token->getUser();

        // User must be logged in
        if (!$currentUser instanceof UserInterface) {
            return false;
        }

        /** @var User $targetUser */
        $targetUser = $subject;

        return match ($attribute) {
            self::VIEW => $this->canView($targetUser, $currentUser),
            self::EDIT => $this->canEdit($targetUser, $currentUser),
            self::DELETE => $this->canDelete($targetUser, $currentUser),
            default => false,
        };
    }

    private function canView(User $targetUser, UserInterface $currentUser): bool
    {
        // ROLE_ADMIN and ROLE_SUPER_ADMIN can view all users
        if (in_array('ROLE_ADMIN', $currentUser->getRoles()) || in_array('ROLE_SUPER_ADMIN', $currentUser->getRoles())) {
            return true;
        }

        // ROLE_USER can only view their own profile
        return $targetUser->getUserIdentifier() === $currentUser->getUserIdentifier();
    }

    private function canEdit(User $targetUser, UserInterface $currentUser): bool
    {
        // ROLE_ADMIN and ROLE_SUPER_ADMIN can edit all users
        if (in_array('ROLE_ADMIN', $currentUser->getRoles()) || in_array('ROLE_SUPER_ADMIN', $currentUser->getRoles())) {
            return true;
        }

        // ROLE_USER can only edit their own profile
        return $targetUser->getUserIdentifier() === $currentUser->getUserIdentifier();
    }

    private function canDelete(User $targetUser, UserInterface $currentUser): bool
    {
        // Only ROLE_SUPER_ADMIN can delete users
        if (in_array('ROLE_SUPER_ADMIN', $currentUser->getRoles())) {
            return true;
        }

        return false;
    }
}
