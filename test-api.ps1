# Test API endpoints
Write-Host "Testing /auth endpoint..." -ForegroundColor Yellow

# Login to get JWT token
$body = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://localhost/auth" -Method POST -Body $body -ContentType "application/json" -SkipCertificateCheck
    $token = $response.token
    Write-Host "✓ Login successful, token: $($token.Substring(0, 20))..." -ForegroundColor Green
    
    # Test GET /users with token
    Write-Host "`nTesting GET /users endpoint..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $token"
        "Accept" = "application/ld+json"
    }
    
    $users = Invoke-RestMethod -Uri "https://localhost/users" -Method GET -Headers $headers -SkipCertificateCheck
    Write-Host "✓ Users loaded successfully:" -ForegroundColor Green
    $users.'hydra:member' | ForEach-Object {
        Write-Host "  - ID: $($_.id), Username: $($_.username)"
    }
    
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
}
