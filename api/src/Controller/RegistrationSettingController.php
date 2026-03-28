<?php

namespace App\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

#[AsController]
final readonly class RegistrationSettingController
{
    private const SETTING_KEY = 'allow_registration';

    public function __construct(private Connection $connection)
    {
    }

    #[Route('/registration-setting', name: 'registration_setting_get', methods: ['GET'])]
    public function getSetting(): JsonResponse
    {
        $value = $this->connection->fetchOne(
            'SELECT setting_value FROM app_settings WHERE setting_key = :setting_key',
            ['setting_key' => self::SETTING_KEY]
        );

        $enabled = $value === false ? true : $value === 'true';

        return new JsonResponse([
            'enabled' => $enabled,
        ]);
    }

    #[Route('/registration-setting', name: 'registration_setting_put', methods: ['PUT'])]
    public function updateSetting(Request $request, Security $security): JsonResponse
    {
        if (!$security->isGranted('ROLE_ADMIN') && !$security->isGranted('ROLE_SUPER_ADMIN')) {
            throw new AccessDeniedHttpException('Само администратор може да променя настройката за регистрация.');
        }

        $payload = json_decode((string) $request->getContent(), true);
        if (!\is_array($payload) || !\array_key_exists('enabled', $payload) || !\is_bool($payload['enabled'])) {
            throw new BadRequestHttpException('Полето enabled е задължително и трябва да бъде булева стойност.');
        }

        $enabled = $payload['enabled'];

        $this->connection->executeStatement(
            'INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES (:setting_key, :setting_value, NOW())
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = VALUES(updated_at)',
            [
                'setting_key' => self::SETTING_KEY,
                'setting_value' => $enabled ? 'true' : 'false',
            ]
        );

        return new JsonResponse([
            'enabled' => $enabled,
            'message' => 'Настройката за регистрация е обновена успешно.',
        ]);
    }
}
