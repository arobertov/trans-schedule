<?php

namespace App\Serializer;

use App\Entity\ShiftSchedules;
use Symfony\Component\Serializer\Normalizer\DenormalizerInterface;
use Symfony\Component\Serializer\Normalizer\ObjectNormalizer;

class ShiftSchedulesDenormalizer implements DenormalizerInterface
{
    public function __construct(
        private ObjectNormalizer $normalizer
    ) {}

    public function denormalize(mixed $data, string $type, string $format = null, array $context = []): mixed
    {
        if (!is_array($data) || $type !== ShiftSchedules::class) {
            return $this->normalizer->denormalize($data, $type, $format, $context);
        }

        // If zero_time is a string (e.g., "-1:15"), parse and convert to int
        if (isset($data['zero_time']) && is_string($data['zero_time'])) {
            $zeroTimeString = trim($data['zero_time']);
            try {
                if ($zeroTimeString === '' || $zeroTimeString === '0:00' || $zeroTimeString === '-0:00') {
                    $data['zero_time'] = 0;
                } elseif (preg_match('/^(-?)(\d+):(\d{2})$/', $zeroTimeString, $matches)) {
                    $sign = $matches[1] === '-' ? -1 : 1;
                    $hours = (int)$matches[2];
                    $minutes = (int)$matches[3];
                    
                    if ($minutes > 59) {
                        throw new \InvalidArgumentException('Minutes must be 0-59');
                    }
                    
                    $data['zero_time'] = $sign * ($hours * 60 + $minutes);
                } else {
                    throw new \InvalidArgumentException('Format must be "-H:MM" or "H:MM"');
                }
            } catch (\Exception $e) {
                throw new \InvalidArgumentException('zero_time ' . $e->getMessage() . '. Got: ' . $zeroTimeString);
            }
        }

        return $this->normalizer->denormalize($data, $type, $format, $context);
    }

    public function supportsDenormalization(mixed $data, string $type, string $format = null, array $context = []): bool
    {
        return $type === ShiftSchedules::class;
    }

    public function getSupportedTypes(?string $format): array
    {
        return [ShiftSchedules::class => true];
    }
}

