param(
    [string]$SmtpUser,
    [string]$SmtpPass,
    [string]$ToEmail,
    [string]$FromEmail,
    [string]$SmtpHost,
    [int]$SmtpPort = 0,
    [string]$SmtpSecure,
    [switch]$DoNotForceAlert
)

$ErrorActionPreference = "Stop"

# Load .env.mail.local from the repo root (never committed to source control)
$envFile = Join-Path $PSScriptRoot ".env.mail.local"
$fileVars = @{}
if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
        if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
        $parts = $line.Split('=', 2)
        $fileVars[$parts[0].Trim()] = $parts[1].Trim()
    }
} else {
    Write-Warning ".env.mail.local not found. Using only command-line parameters."
}

function Resolve-Value([string]$paramValue, [string]$fileKey, [string]$default = "") {
    if (-not [string]::IsNullOrWhiteSpace($paramValue)) { return $paramValue }
    if ($fileVars.ContainsKey($fileKey) -and -not [string]::IsNullOrWhiteSpace($fileVars[$fileKey])) { return $fileVars[$fileKey] }
    return $default
}

$resolvedSmtpUser    = Resolve-Value $SmtpUser    "SMTP_USER"
$resolvedSmtpPass    = Resolve-Value $SmtpPass    "SMTP_PASS"
$resolvedToEmail     = Resolve-Value $ToEmail     "ALERT_TO_EMAIL"
$resolvedFromEmail   = Resolve-Value $FromEmail   "ALERT_FROM_EMAIL"
$resolvedSmtpHost    = Resolve-Value $SmtpHost    "SMTP_HOST"    "smtp.mailersend.net"
$resolvedSmtpPort    = if ($SmtpPort -ne 0) { $SmtpPort } elseif ($fileVars.ContainsKey("SMTP_PORT")) { [int]$fileVars["SMTP_PORT"] } else { 587 }
$resolvedSmtpSecure  = Resolve-Value $SmtpSecure  "SMTP_SECURE"  "false"

if ([string]::IsNullOrWhiteSpace($resolvedSmtpUser)) { throw "SMTP_USER is required. Set it in .env.mail.local or pass -SmtpUser." }
if ([string]::IsNullOrWhiteSpace($resolvedSmtpPass)) { throw "SMTP_PASS is required. Set it in .env.mail.local or pass -SmtpPass." }
if ([string]::IsNullOrWhiteSpace($resolvedToEmail))  { throw "ALERT_TO_EMAIL is required. Set it in .env.mail.local or pass -ToEmail." }

$keys = @(
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "SMTP_USER",
    "SMTP_PASS",
    "ALERT_FROM_EMAIL",
    "ALERT_TO_EMAIL",
    "FORCE_EMAIL_ALERT"
)

$previous = @{}
foreach ($key in $keys) {
    $previous[$key] = [Environment]::GetEnvironmentVariable($key, "Process")
}

Push-Location $PSScriptRoot
try {
    $env:SMTP_HOST         = $resolvedSmtpHost
    $env:SMTP_PORT         = $resolvedSmtpPort.ToString()
    $env:SMTP_SECURE       = $resolvedSmtpSecure
    $env:SMTP_USER         = $resolvedSmtpUser
    $env:SMTP_PASS         = $resolvedSmtpPass
    $env:ALERT_FROM_EMAIL  = if ([string]::IsNullOrWhiteSpace($resolvedFromEmail)) { $resolvedSmtpUser } else { $resolvedFromEmail }
    $env:ALERT_TO_EMAIL    = $resolvedToEmail
    $env:FORCE_EMAIL_ALERT = if ($DoNotForceAlert) { "false" } else { "true" }

    Write-Host "Running local mail test..."
    Write-Host "SMTP host: $($env:SMTP_HOST):$($env:SMTP_PORT) secure=$($env:SMTP_SECURE)"
    Write-Host "From: $($env:ALERT_FROM_EMAIL)"
    Write-Host "To: $($env:ALERT_TO_EMAIL)"
    Write-Host "FORCE_EMAIL_ALERT: $($env:FORCE_EMAIL_ALERT)"

    node check_ski.js
}
finally {
    foreach ($key in $keys) {
        if ($null -eq $previous[$key]) {
            Remove-Item "Env:$key" -ErrorAction SilentlyContinue
        }
        else {
            Set-Item "Env:$key" $previous[$key]
        }
    }
    Pop-Location
}
