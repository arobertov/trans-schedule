<?php

namespace App\Service;

use DateTimeImmutable;
use DOMDocument;
use DOMXPath;
use Psr\Log\LoggerInterface;

class CalendarService
{
    public const DEFAULT_URL = 'https://kik-info.com/spravochnik/calendar';

    public function __construct(
        private LoggerInterface $logger
    ) {}

    public function getYearlyCalendarData(int $year, array $options = []): array
    {
        $monthsData = [];
        
        for ($m = 1; $m <= 12; $m++) {
            $monthsData[$m] = $this->getCalendarData($year, $m, $options);
            // Sleep slightly to avoid rate limiting if scraping
            if (isset($monthsData[$m]['scraped']) && $monthsData[$m]['scraped']) {
                usleep(500000); // 0.5s delay
            }
        }
        
        return $monthsData;
    }

    public function getCalendarData(int $year, int $month, array $options = []): array
    {
        $provider = $options['provider'] ?? 'scrape';
        $useBackup = $options['useBackup'] ?? false; // Default false to allow specific control, or true? 
        // If we want existing calls (without options) to work as before, default needed.
        // Existing calls in usage passed nothing. So $options is []. 
        // Previously it ALWAYS fell back. 
        // If I set $useBackup = true default, it mimics old behavior. 
        // If the user specifically sends 'useBackup' => false, it will throw.
        
        // However, the Calendar Entity has $useBackup=false default.
        // So I should probably check if key exists or just trust the value.
        // If called from Processor, options are populated from Entity.
        
        // Let's use strict logic:
        if ($provider === 'fallback') {
            return $this->generateFallback($year, $month);
        }

        $url = $options['sourceUrl'] ?? self::DEFAULT_URL;
        if (empty($url)) {
             $url = self::DEFAULT_URL;
        }

        try {
            if ($provider === 'api') {
                $data = $this->fetchFromApi($url, $year, $month);
            } else {
                $data = $this->fetchFromExternal($year, $month, $url);
            }
            $data['scraped'] = true;
            $data['source'] = $provider;
            $data['provider_url'] = $url;
            return $data;
        } catch (\Throwable $e) {
            if ($useBackup) {
                $this->logger->warning("Failed to fetch data ($provider) for $year-$month, using fallback: " . $e->getMessage());
                $data = $this->generateFallback($year, $month);
                $data['source'] = 'fallback_error';
                $data['error_details'] = $e->getMessage();
                return $data;
            }
            
            throw new \RuntimeException("Неуспешна връзка с източника ($url). Моля проверете интернет връзката или изберете опцията за резервна логика. Грешка: " . $e->getMessage());
        }
    }

    private function fetchFromApi(string $baseUrl, int $year, int $month): array
    {
        // Example API implementation
        // Expects JSON response
        $url = sprintf('%s?year=%d&month=%d', $baseUrl, $year, $month);
        
        $context = stream_context_create([
            'http' => [
                'timeout' => 5,
                'header' => "Accept: application/json\r\n"
            ]
        ]);

        $json = @file_get_contents($url, false, $context);
        
        if ($json === false) {
             throw new \RuntimeException("Could not fetch API: $url");
        }

        $data = json_decode($json, true);
        if (!$data || !isset($data['days'])) {
             throw new \RuntimeException("Invalid API response from $url");
        }

        return $data;
    }

    private function fetchFromExternal(int $year, int $month, string $baseUrl = self::DEFAULT_URL): array
    {
        // Adjust URL structure if needed. Assuming base url allows appending /year/
        // Original: https://kik-info.com/spravochnik/calendar/2026/
        // If user provides a different base URL for scraping, we assume same structure?
        // Risky, but that's what generic 'web address' implies for scraping.
        // Or maybe just use the given URL directly if it contains the year?
        
        // Let's assume the user changes the domain but same site structure (mirrors?)
        // Or they paste the FULL url?
        
        // If baseUrl ends in /, append year.
        $url = rtrim($baseUrl, '/') . '/' . $year . '/';
        
        $context = stream_context_create([
            'http' => [
                'timeout' => 5,
                'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'header' => "Accept-language: bg\r\n"
            ]
        ]);

        $html = @file_get_contents($url, false, $context);
        
        if ($html === false) {
            throw new \RuntimeException("Could not fetch URL: $url");
        }

        $dom = new DOMDocument();
        @$dom->loadHTML($html);
        $xpath = new DOMXPath($dom);

        // Find the month card container
        // Class contains "cal-month" and "m_{month}" e.g., "m_1" for January
        $monthQuery = sprintf('//div[contains(@class, "cal-month") and contains(@class, "m_%d")]', $month);
        $monthDiv = $xpath->query($monthQuery)->item(0);

        if (!$monthDiv) {
            throw new \RuntimeException("Could not find data for month $month in year $year");
        }

        $days = [];
        
        // Find all day cells within the month table
        $tds = $xpath->query('.//table//td', $monthDiv);
        
        foreach ($tds as $td) {
            $text = trim($td->nodeValue);
            // Skip empty cells or headers
            if (!is_numeric($text)) {
                continue;
            }

            $day = (int) $text;
            $class = $td->getAttribute('class');
            $title = $td->getAttribute('title');

            $type = 'work'; // Default
            $note = null;

            if (str_contains($class, 'cal-item')) {
                // Official Holiday
                $type = 'holiday';
                $note = $title ?: 'Празник';
            } elseif (str_contains($class, 'table-active')) {
                // Weekend / Non-working
                $type = 'weekend';
            }

            // Note: Official working Saturdays (shifted days) might appear.
            // On kik-info, working saturdays usually have specific styling or lack 'table-active'.
            // For now, we trust the 'table-active' class which usually means "Non-Working".

            $days[$day] = [
                'day' => $day,
                'type' => $type,
                'note' => $note
            ];
        }

        // Parse Totals
        // The totals are in a sibling div or nearby.
        // Based on analysis: <div class="text-primary text-center text-small">...</div>
        // It appears immediately AFTER the card.
        
        // We can look for the next sibling element that matches or search within the month's parent column if wrapped.
        
        $workDays = null;
        $workHours = null;

        // Attempt 1: Check standard structure (sibling)
        // XPath to get the following sibling div with class
        $totalsQuery = './/following-sibling::div[contains(@class, "text-primary")]';
        $totalsDiv = $xpath->query($totalsQuery, $monthDiv)->item(0);
        
        if ($totalsDiv) {
            $content = $totalsDiv->nodeValue;
            // Parse "20 работни дни"
            if (preg_match('/(\d+)\s+работни дни/', $content, $m)) {
                $workDays = (int) $m[1];
            }
            // Parse "160 часа"
            if (preg_match('/(\d+)\s+часа/', $content, $m)) {
                $workHours = (int) $m[1];
            }
        }
        
        // Sort days by key to ensure order
        ksort($days);

        return [
            'days' => array_values($days),
            'workDays' => $workDays,
            'workHours' => $workHours
        ];
    }

    private function generateFallback(int $year, int $month): array
    {
        $daysInMonth = (int) (new DateTimeImmutable("$year-$month-01"))->format('t');
        $holidays = $this->getBulgarianHolidays($year);
        
        $days = [];
        $workDaysCount = 0;

        for ($d = 1; $d <= $daysInMonth; $d++) {
            $date = sprintf('%04d-%02d-%02d', $year, $month, $d);
            $dt = new DateTimeImmutable($date);
            $weekday = (int) $dt->format('N'); // 1 (Mon) - 7 (Sun)
            
            $type = 'work';
            $note = null;

            if (in_array($date, $holidays)) {
                $type = 'holiday';
                $note = 'Официален празник';
            } elseif ($weekday >= 6) {
                $type = 'weekend';
            }

            if ($type === 'work') {
                $workDaysCount++;
            }

            $days[] = [
                'day' => $d,
                'type' => $type,
                'note' => $note
            ];
        }

        return [
            'days' => $days,
            'workDays' => $workDaysCount,
            'workHours' => $workDaysCount * 8
        ];
    }

    /**
     * Copy of logic from MatrixGenerator
     */
    private function getBulgarianHolidays(int $year): array
    {
        $holidays = [
            "$year-01-01", 
            "$year-03-03", 
            "$year-05-01", 
            "$year-05-06", 
            "$year-05-24", 
            "$year-09-06", 
            "$year-09-22", 
            "$year-12-24", 
            "$year-12-25", 
            "$year-12-26", 
        ];

        // Orthodox Easter
        $a = $year % 4;
        $b = $year % 7;
        $c = $year % 19;
        $d = (19 * $c + 15) % 30;
        $e = (2 * $a + 4 * $b - $d + 34) % 7;
        $month = floor(($d + $e + 114) / 31);
        $day = (($d + $e + 114) % 31) + 1;
        
        $easterDate = new DateTimeImmutable("$year-$month-$day");
        $easterDate = $easterDate->modify('+13 days');
        
        $holidays[] = $easterDate->modify('-2 days')->format('Y-m-d'); // Good Friday
        $holidays[] = $easterDate->modify('-1 day')->format('Y-m-d');  // Holy Saturday
        $holidays[] = $easterDate->format('Y-m-d');                    // Easter Sunday
        $holidays[] = $easterDate->modify('+1 day')->format('Y-m-d');  // Easter Monday

        return $holidays;
    }
}
