$ErrorActionPreference = "Stop"

$checks = @(
    @{
        Name = "Discovery Server"
        Url = "http://localhost:8761/actuator/health"
        Required = $true
    },
    @{
        Name = "Config Server"
        Url = "http://localhost:8888/actuator/health"
        Required = $true
    },
    @{
        Name = "API Gateway"
        Url = "http://localhost:8080/actuator/health"
        Required = $true
    },
    @{
        Name = "Blockchain Service"
        Url = "http://localhost:8085/health"
        Required = $true
    },
    @{
        Name = "File Service"
        Url = "http://localhost:8083/health"
        Required = $true
    },
    @{
        Name = "AI Service"
        Url = "http://localhost:8084/health"
        Required = $true
    },
    @{
        Name = "Kafka UI"
        Url = "http://localhost:8081"
        Required = $false
    },
    @{
        Name = "Frontend"
        Url = "http://localhost:3000"
        Required = $false
    }
)

$failed = @()

foreach ($check in $checks) {
    try {
        $response = Invoke-WebRequest -Uri $check.Url -Method Get -TimeoutSec 8
        Write-Host ("[OK]   {0,-20} {1} -> HTTP {2}" -f $check.Name, $check.Url, $response.StatusCode)
    } catch {
        $label = if ($check.Required) { "FAIL" } else { "WARN" }
        Write-Host ("[{0}] {1,-20} {2}" -f $label, $check.Name, $check.Url)
        Write-Host ("       " + $_.Exception.Message)
        if ($check.Required) {
            $failed += $check.Name
        }
    }
}

Write-Host ""
Write-Host "Smoke checklist tiep theo:"
Write-Host "1. Tao chien dich moi va xac nhan contract duoc sinh trong blockchain-service."
Write-Host "2. Upload proof co bill + anh hien truong."
Write-Host "3. Kiem tra campaign detail > Cap nhat da hien AI status / score / analysis."
Write-Host "4. Neu proof dang PROCESSING, doi frontend auto refresh toi khi co ket qua."

if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Host ("Required services not healthy: " + ($failed -join ", "))
    exit 1
}

exit 0
