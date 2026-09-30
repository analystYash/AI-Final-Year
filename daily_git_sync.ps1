$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$gitExe = 'C:\Program Files\Git\cmd\git.exe'
$logFile = Join-Path $repoRoot '.git\daily-sync.log'

function Write-Log {
    param([string]$Message)
    Add-Content -Path $logFile -Value "$(Get-Date -Format o) $Message"
}

function Invoke-Git {
    param([string[]]$GitArguments)

    $output = & $gitExe -C $repoRoot @GitArguments 2>&1
    $exitCode = $LASTEXITCODE
    foreach ($line in $output) {
        Add-Content -Path $logFile -Value $line
    }
    if ($exitCode -ne 0) {
        throw "git $($GitArguments -join ' ') failed with exit code $exitCode"
    }
    return $output
}

try {
    $branch = (& $gitExe -C $repoRoot branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw 'Could not determine the current Git branch.'
    }
    if ($branch -ne 'main') {
        throw "Refusing to sync branch '$branch'; expected 'main'."
    }

    $status = & $gitExe -C $repoRoot status --porcelain
    if ($LASTEXITCODE -ne 0) {
        throw 'Could not read Git status.'
    }
    if (-not $status) {
        Write-Log 'No changes to commit.'
        exit 0
    }

    Invoke-Git @('add', '--all') | Out-Null
    & $gitExe -C $repoRoot diff --cached --quiet
    $diffExitCode = $LASTEXITCODE
    if ($diffExitCode -eq 0) {
        Write-Log 'No staged changes to commit.'
        exit 0
    }
    if ($diffExitCode -ne 1) {
        throw "Could not inspect staged changes (exit code $diffExitCode)."
    }

    $commitMessage = "Daily sync $(Get-Date -Format 'yyyy-MM-dd')"
    Invoke-Git @('commit', '-m', $commitMessage) | Out-Null
    Invoke-Git @('push', 'origin', 'main') | Out-Null
    Write-Log "Pushed changes to origin/main: $commitMessage"
}
catch {
    Write-Log "FAILED: $_"
    exit 1
}