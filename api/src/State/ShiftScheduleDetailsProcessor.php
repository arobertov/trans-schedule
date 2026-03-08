<?php

namespace App\State;

use App\Entity\ShiftScheduleDetails;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use Symfony\Component\HttpFoundation\Request;

final readonly class ShiftScheduleDetailsProcessor implements ProcessorInterface
{
    public function __construct(
        private ProcessorInterface $processor
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        // Handle zero_time parsing if it comes as string from request
        if ($data instanceof ShiftScheduleDetails) {
            $request = $context['request'] ?? null;
            
            if ($request instanceof Request && in_array($request->getMethod(), ['POST', 'PUT', 'PATCH'])) {
                $payload = json_decode($request->getContent(), true);
                
                if ($payload && isset($payload['zero_time']) && ($payload['zero_time'] === '' || is_string($payload['zero_time']))) {
                    try {
                        $zeroTimeInput = $payload['zero_time'] === '' ? null : $payload['zero_time'];
                        $data->setZeroTime($zeroTimeInput);
                    } catch (\InvalidArgumentException $e) {
                        throw new \InvalidArgumentException('Invalid zero_time format: Expected format like "-1:50", "2:15", or null. ' . $e->getMessage());
                    }
                }

                if ($payload && isset($payload['routes']) && is_array($payload['routes'])) {
                    $normalizedRoutes = [];

                    foreach ($payload['routes'] as $route) {
                        if (!is_array($route)) {
                            $normalizedRoutes[] = $route;
                            continue;
                        }

                        foreach (['pickup_location', 'dropoff_location'] as $field) {
                            if (!array_key_exists($field, $route)) {
                                continue;
                            }

                            $value = $route[$field];

                            if ($value === null) {
                                continue;
                            }

                            if (is_string($value)) {
                                $trimmed = trim($value);
                                $route[$field] = $trimmed === '' ? null : $trimmed;
                            }
                        }

                        if (array_key_exists('route_kilometers', $route)) {
                            $value = $route['route_kilometers'];

                            if (is_string($value)) {
                                $trimmed = trim($value);
                                if ($trimmed === '') {
                                    $route['route_kilometers'] = null;
                                } else {
                                    $normalized = str_replace(',', '.', $trimmed);
                                    if (is_numeric($normalized)) {
                                        $route['route_kilometers'] = round((float) $normalized, 2);
                                    }
                                }
                            } elseif (is_int($value) || is_float($value)) {
                                $route['route_kilometers'] = round((float) $value, 2);
                            }
                        }

                        $normalizedRoutes[] = $route;
                    }

                    $data->setRoutes($normalizedRoutes);
                }
            }
        }

        return $this->processor->process($data, $operation, $uriVariables, $context);
    }
}
