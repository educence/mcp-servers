# Fix Claude Code MCP Config on Windows
# This MERGES the correct mcpServers into your existing config (doesn't wipe other settings)

$configPath = "$env:USERPROFILE\.claude.json"
$backupPath = "$env:USERPROFILE\.claude.json.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# Backup first
if (Test-Path $configPath) {
    Copy-Item $configPath $backupPath
    Write-Host "Backed up to: $backupPath" -ForegroundColor Green
}

# Read existing config
if (Test-Path $configPath) {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
} else {
    $config = @{}
}

# Create correct mcpServers structure
$mcpServers = @{
    filesystem = @{
        command = "cmd"
        args = @("/c", "npx", "-y", "@modelcontextprotocol/server-filesystem", "C:\Users\jense\Documents", "C:\Users\jense\claude-code-bridge")
    }
    notion = @{
        type = "http"
        url = "https://mcp.notion.com/mcp"
    }
}

# Merge (overwrites mcpServers, preserves everything else)
$config | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value $mcpServers -Force

# Write back with proper formatting
$config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8

Write-Host ""
Write-Host "Config updated. mcpServers fixed:" -ForegroundColor Green
Write-Host "  - filesystem: cmd /c wrapper added" -ForegroundColor Cyan
Write-Host "  - notion: HTTP transport configured" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: Run 'claude' then '/mcp' to verify both servers connect." -ForegroundColor Yellow
