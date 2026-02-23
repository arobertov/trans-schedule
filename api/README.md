# API

The API Platform 4 application with Symfony 7.2 + Doctrine ORM.

Refer to the [Getting Started Guide](https://api-platform.com/docs/distribution) for more information.

## API Testing

The API is accessible at **https://localhost/api** (standard API Platform routing).

### Examples:

- **Get all shifts**: `curl -k https://localhost/api/shift_schedules`
- **Create shift with zero_time**: 
  ```bash
  curl -k -X POST https://localhost/api/shift_schedules \
    -H "Content-Type: application/ld+json" \
    -d '{
      "shift_code": "SM1-L",
      "at_doctor": "08:00",
      "at_duty_officer": "12:00",
      "shift_end": "16:00",
      "worked_time": "08:00",
      "night_work": "00:00",
      "kilometers": 0.00,
      "zero_time": "-1:15"
    }'
  ```

### zero_time Format

- Accepts signed duration strings: `-H:MM` or `H:MM`
- Examples: `-1:50`, `2:15`, `0:00`, `null`
- Stored as INT (minutes) in database
- Returns as string format `-H:MM` in API response
