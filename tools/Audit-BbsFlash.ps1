#Requires -Version 7.0
<#
.SYNOPSIS
    BBS Flash — automated audit of the single-file app against the v3.0
    Definition of Done (ROADMAP.md §5) and the CLAUDE.md hardware/safety rules.

.DESCRIPTION
    Static analysis only: reads the HTML, checks for the presence/absence of
    required modules, forbidden APIs, hard-coded physics constants and safety
    gates. Also runs a live numeric check of the gear-limit formula so a
    regression in Reality Check shows up as a red line, not a silent drift.

.EXAMPLE
    pwsh ./tools/Audit-BbsFlash.ps1 -Path ./bbs-flash.html
    pwsh ./tools/Audit-BbsFlash.ps1 -Path ./bbs-flash.html -Json
#>
[CmdletBinding()]
param(
    [string]$Path = (Join-Path $PSScriptRoot '..' 'bbs-flash.html'),
    [switch]$Json
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path $Path)) { throw "File not found: $Path" }

$src   = Get-Content -Path $Path -Raw
$lines = Get-Content -Path $Path

$results = [System.Collections.Generic.List[object]]::new()

function Add-Check {
    param(
        [Parameter(Mandatory)][string]$Id,
        [Parameter(Mandatory)][string]$Area,
        [Parameter(Mandatory)][string]$Title,
        [Parameter(Mandatory)][ValidateSet('PASS','FAIL','WARN','INFO')][string]$Status,
        [ValidateSet('BLOCKER','MAJOR','MINOR','NONE')][string]$Severity = 'NONE',
        [string]$Detail = ''
    )
    $results.Add([pscustomobject]@{
        Id = $Id; Area = $Area; Title = $Title
        Status = $Status; Severity = $Severity; Detail = $Detail
    })
}

function Find-Lines {
    param([string]$Pattern)
    $hits = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match $Pattern) { $hits += ($i + 1) }
    }
    return $hits
}

function Test-Present {
    param(
        [string]$Id, [string]$Area, [string]$Title, [string]$Pattern,
        [string]$Severity = 'MAJOR', [string]$WhenMissing = ''
    )
    $hits = Find-Lines $Pattern
    if ($hits.Count -gt 0) {
        Add-Check -Id $Id -Area $Area -Title $Title -Status PASS -Detail ("line(s): " + ($hits[0..([Math]::Min(4, $hits.Count - 1))] -join ', '))
    } else {
        Add-Check -Id $Id -Area $Area -Title $Title -Status FAIL -Severity $Severity -Detail $WhenMissing
    }
}

function Test-Absent {
    param(
        [string]$Id, [string]$Area, [string]$Title, [string]$Pattern,
        [string]$Severity = 'MAJOR', [string]$WhenFound = ''
    )
    $hits = Find-Lines $Pattern
    if ($hits.Count -eq 0) {
        Add-Check -Id $Id -Area $Area -Title $Title -Status PASS
    } else {
        Add-Check -Id $Id -Area $Area -Title $Title -Status FAIL -Severity $Severity `
            -Detail ("$WhenFound  line(s): " + ($hits -join ', '))
    }
}

# ---------------------------------------------------------------- 1. SAFETY
Test-Present -Id 'S1' -Area 'Safety' -Title 'Write All blocked without a backup' `
    -Pattern 'lastKnownGood' -Severity BLOCKER `
    -WhenMissing 'No backup guard found before Write All.'

# Every per-tab Write button must route through the gate, not call writeBlock directly.
$ungated = Find-Lines "el\('(bas|pas|thr)Write'\)\.onclick\s*=\s*\(\)\s*=>\s*writeBlock"
$gated   = Find-Lines "el\('(bas|pas|thr)Write'\)\.onclick\s*=\s*\(\)\s*=>\s*(guardedWriteBlock|safetyGate)"
if ($ungated.Count -gt 0) {
    Add-Check -Id 'S2' -Area 'Safety' -Title 'Per-block Write also gated by confirm + backup' `
        -Status FAIL -Severity BLOCKER `
        -Detail ("basWrite/pasWrite/thrWrite call writeBlock directly, with no confirm and no backup check (lines " + ($ungated -join ', ') + ").")
} elseif ($gated.Count -ge 3) {
    Add-Check -Id 'S2' -Area 'Safety' -Title 'Per-block Write also gated by confirm + backup' `
        -Status PASS -Detail ("all three routed through the gate: lines " + ($gated -join ', '))
} else {
    Add-Check -Id 'S2' -Area 'Safety' -Title 'Per-block Write also gated by confirm + backup' `
        -Status FAIL -Severity BLOCKER -Detail 'Could not confirm all three per-tab Write buttons are gated.'
}

Test-Present -Id 'S3' -Area 'Safety' -Title 'Delta preview before write' `
    -Pattern 'function computeDelta|previewDelta|renderWriteDelta|deltaPreview' -Severity MAJOR `
    -WhenMissing 'DoD requires showing what changes before the frame goes out. Currently the confirm() is text-only.'

Test-Present -Id 'S4' -Area 'Safety' -Title 'AutoDetect model -> current ceiling (18/25/30A)' `
    -Pattern 'autoDetect|AutoDetect|BBSHD|detectModel' -Severity BLOCKER `
    -WhenMissing 'Ceiling comes only from GEN byte[17]; BBS01/02/HD is never identified, so an 18A controller can be handed a 25A table.'

Test-Present -Id 'S5' -Area 'Safety' -Title 'Write timeout / cable-pull handling' `
    -Pattern 'setTimeout\([^)]*pending|writeTimeout|ACK_TIMEOUT' -Severity MAJOR `
    -WhenMissing 'No ACK timeout: if the cable is pulled mid-write the UI waits forever with no error.'

# ------------------------------------------------------- 2. REALITY CHECK
Test-Present -Id 'R1' -Area 'RealityCheck' -Title 'Gear-based speed limit (chainring/cog/cadence)' `
    -Pattern 'gearLimit|v_gear|chainring|cogTeeth|realityCheck' -Severity BLOCKER `
    -WhenMissing 'Top speed is capped by a hard-coded REF_MAX_KMH, not by transmission ratio x max RPM. This is the headline feature of v3.0 and it is absent.'

Test-Absent -Id 'R2' -Area 'RealityCheck' -Title 'No hard-coded reference top speed' `
    -Pattern 'REF_MAX_KMH\s*=' -Severity BLOCKER `
    -WhenFound 'REF_MAX_KMH is a fixed 45 km/h constant used as the ceiling for every profile and every wheel size.'

# Must be an actual code path, not the word "thermal" inside a preset description.
Test-Present -Id 'R3' -Area 'RealityCheck' -Title 'Thermal heuristic (>=22A AND cadence <60)' `
    -Pattern '(thermalWarn|heatWarn|thermalLoad|isOverheatRisk)|(>=?\s*22\b[^\n]*&&[^\n]*<\s*60\b)' -Severity MAJOR `
    -WhenMissing 'No thermal warning code path. Overheating on climbs is the stated pain #1 and nothing in the UI warns about it. (The word "thermal" appears only in preset prose.)'

Test-Absent -Id 'R4' -Area 'RealityCheck' -Title 'Crr / CdA are selectable, not constants' `
    -Pattern 'const\s+G\s*=.*CRR\s*=|CRR\s*=\s*0\.\d+\s*,' -Severity MAJOR `
    -WhenFound 'Crr and CdA are frozen at 0.006 / 0.55. ROADMAP P1 requires surface presets (asphalt/gravel/dirt/mud).'

Test-Absent -Id 'R5' -Area 'RealityCheck' -Title 'Controller max current not hard-coded in the simulator' `
    -Pattern 'CONTROLLER_MAX_A\s*=\s*\d+' -Severity MAJOR `
    -WhenFound 'Simulator clamps at a literal 25A regardless of what the connected controller reported.'

# ---------------------------------------------------------- 3. HARD LIMITS
# A temperature READOUT is the violation. Prose stating that no sensor exists is
# the opposite of a violation, so lines carrying a negation are not evidence.
$tempHits = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    $ln = $lines[$i]
    if ($ln -match '(?i)motor\s*temp|temp(erature)?\s*(gauge|readout|display|value)|id="[^"]*[Tt]emp') {
        if ($ln -notmatch '(?i)\bno\b|\bnot\b|\bnever\b|does\s+not|has\s+no|нет|не ') { $tempHits += ($i + 1) }
    }
}
if ($tempHits.Count -eq 0) {
    Add-Check -Id 'H1' -Area 'HardwareTruth' -Title 'No motor-temperature telemetry in UI' -Status PASS
} else {
    Add-Check -Id 'H1' -Area 'HardwareTruth' -Title 'No motor-temperature telemetry in UI' `
        -Status FAIL -Severity BLOCKER `
        -Detail ('BBS02 has no temperature sensor. Showing one is a fabricated reading. line(s): ' + ($tempHits -join ', '))
}

Test-Absent -Id 'H2' -Area 'HardwareTruth' -Title 'No cadence presented as live telemetry' `
    -Pattern '(?i)(live|actual|measured)\s*cadence' -Severity BLOCKER `
    -WhenFound 'Cadence is never sent out by the controller. It may only appear as a simulator estimate.'

# --------------------------------------------------------- 4. PERSISTENCE
Test-Absent -Id 'P1' -Area 'Persistence' -Title 'Zero localStorage' `
    -Pattern '\blocalStorage\b' -Severity BLOCKER `
    -WhenFound 'localStorage is banned by the project rules and fails in artifact environments.'

Test-Absent -Id 'P2' -Area 'Persistence' -Title 'Zero sessionStorage' `
    -Pattern '\bsessionStorage\b' -Severity MAJOR `
    -WhenFound 'sessionStorage carries the same environment restriction as localStorage. Use an in-memory flag or IndexedDB.'

Test-Present -Id 'P3' -Area 'Persistence' -Title 'IndexedDB used for backups/history' `
    -Pattern 'indexedDB' -Severity MAJOR `
    -WhenMissing 'Backups are only pushed to Downloads. Nothing survives a reload inside the app.'

# ------------------------------------------------------------------ 5. UX
Test-Present -Id 'U1' -Area 'UX' -Title 'Russian localization of UI' `
    -Pattern '[А-я]{4,}' -Severity MAJOR `
    -WhenMissing 'CLAUDE.md: UI and tooltips must be Russian. The whole app is English.'

Test-Present -Id 'U2' -Area 'UX' -Title 'Parameter tooltips (what / up / down / risk)' `
    -Pattern 'class="tip"|data-tip|TOOLTIPS|role="tooltip"' -Severity MAJOR `
    -WhenMissing 'No tooltip system. DoD requires one on all 20+ parameters.'

Test-Present -Id 'U3' -Area 'UX' -Title 'Theme toggle on shared CSS variables' `
    -Pattern 'data-theme|themeToggle|prefers-color-scheme' -Severity MINOR `
    -WhenMissing 'Single fixed theme; DoD wants light rally by default plus a dark switch.'

Test-Present -Id 'U4' -Area 'UX' -Title 'prefers-reduced-motion respected' `
    -Pattern 'prefers-reduced-motion' -Severity MINOR `
    -WhenMissing 'The bike/gauge animation runs unconditionally.'

Test-Present -Id 'U5' -Area 'UX' -Title 'Graceful message when Web Serial is missing' `
    -Pattern "serial' in navigator|serialWarning" -Severity MAJOR `
    -WhenMissing 'No fallback message for Firefox/Safari/mobile.'

# Colour inversion for "worse is higher" metrics
function Get-FunctionBody {
    param([string]$Text, [string]$Name)
    $start = $Text.IndexOf("function $Name(")
    if ($start -lt 0) { return '' }
    $open = $Text.IndexOf('{', $start)
    if ($open -lt 0) { return '' }
    $depth = 0
    for ($i = $open; $i -lt $Text.Length; $i++) {
        if ($Text[$i] -eq '{') { $depth++ }
        elseif ($Text[$i] -eq '}') { $depth--; if ($depth -eq 0) { return $Text.Substring($start, $i - $start + 1) } }
    }
    return ''
}
$diffBlock = Get-FunctionBody -Text $src -Name 'renderDiff'
if ($diffBlock -and $diffBlock -notmatch "polarity|'worse'|worse|heat") {
    Add-Check -Id 'U6' -Area 'UX' -Title 'ComparativeBars invert colour for peak current / heat' `
        -Status FAIL -Severity MAJOR `
        -Detail 'renderDiff renders every delta in the same neutral style. A rise in current limit reads the same as a rise in speed, which nudges the rider toward overheating.'
} elseif (-not $diffBlock) {
    Add-Check -Id 'U6' -Area 'UX' -Title 'ComparativeBars invert colour for peak current / heat' `
        -Status FAIL -Severity MAJOR -Detail 'renderDiff not found.'
} else {
    Add-Check -Id 'U6' -Area 'UX' -Title 'ComparativeBars invert colour for peak current / heat' -Status PASS
}

# ------------------------------------------------------------ 6. PROTOCOL
Test-Present -Id 'C1' -Area 'Protocol' -Title 'Checksum computed on write frames' `
    -Pattern 'f\[\d+\]\s*=\s*checksum' -Severity BLOCKER `
    -WhenMissing 'Frames sent without checksum.'

Test-Present -Id 'C2' -Area 'Protocol' -Title 'Checksum verified on received frames' `
    -Pattern 'function verifyRxChecksum|checksum\(.*\)\s*[!=]==' -Severity MAJOR `
    -WhenMissing 'Incoming frames are parsed without verifying their checksum — a garbled read can silently become your new settings.'

Test-Present -Id 'C3' -Area 'Protocol' -Title '.el export is byte-compatible with Penov tool' `
    -Pattern 'function stateToEl' -Severity MAJOR

# ----------------------------------------------- 7. NUMERIC: GEAR LIMIT
# Reference rig: 32T front, 11T rear, 27.5 x 2.8 -> DoD expects 44-48 km/h.
function Get-GearLimitKmh {
    param(
        [int]$Chainring = 32, [int]$Cog = 11,
        # 27.5" rim ETRTO 584 mm + 2 x 2.8" (71 mm) casing = 726 mm outer.
        [double]$WheelDiameterM = 0.726,
        [int]$MaxRpm = 120                 # BBS02 crank RPM ceiling
    )
    $circ = [Math]::PI * $WheelDiameterM
    $crankRpm = $MaxRpm
    $wheelRpm = $crankRpm * ($Chainring / $Cog)
    return [Math]::Round(($wheelRpm * $circ * 60) / 1000, 1)
}

$gl = Get-GearLimitKmh
if ($gl -ge 44 -and $gl -le 48) {
    Add-Check -Id 'N1' -Area 'Numeric' -Title 'Reference rig 32T/11T/27.5x2.8 lands in 44-48 km/h' `
        -Status PASS -Detail "$gl km/h at 120 crank rpm (formula verified here; app does not implement it yet)"
} else {
    Add-Check -Id 'N1' -Area 'Numeric' -Title 'Reference rig 32T/11T/27.5x2.8 lands in 44-48 km/h' `
        -Status FAIL -Severity BLOCKER -Detail "Formula yields $gl km/h, outside the 44-48 band."
}

# Sanity: what the current app would claim instead
if ($src -match 'REF_MAX_KMH\s*=\s*(\d+)') {
    $ref = [int]$Matches[1]
    Add-Check -Id 'N2' -Area 'Numeric' -Title 'App-reported ceiling vs physical gear limit' `
        -Status WARN -Severity MAJOR `
        -Detail "App caps every profile at $ref km/h; physical limit for the reference rig is $gl km/h. Error: $([Math]::Round($gl - $ref,1)) km/h, and it does not move when wheel or gearing changes."
}

# ------------------------------------------------------------- REPORT
if ($Json) {
    $results | ConvertTo-Json -Depth 4
    return
}

$blockers = @($results | Where-Object { $_.Status -eq 'FAIL' -and $_.Severity -eq 'BLOCKER' })
$majors   = @($results | Where-Object { $_.Status -in 'FAIL','WARN' -and $_.Severity -eq 'MAJOR' })
$minors   = @($results | Where-Object { $_.Status -in 'FAIL','WARN' -and $_.Severity -eq 'MINOR' })
$passed   = @($results | Where-Object { $_.Status -eq 'PASS' })

Write-Host ''
Write-Host '  BBS FLASH — v3.0 Definition-of-Done audit' -ForegroundColor Cyan
Write-Host "  file: $(Resolve-Path $Path)" -ForegroundColor DarkGray
Write-Host "  size: $([Math]::Round((Get-Item $Path).Length/1KB,1)) KB  ·  $($lines.Count) lines" -ForegroundColor DarkGray
Write-Host ''

foreach ($group in $results | Group-Object Area) {
    Write-Host "  $($group.Name)" -ForegroundColor White
    foreach ($r in $group.Group) {
        $mark, $colour = switch ($r.Status) {
            'PASS' { '  ok  ', 'Green' }
            'FAIL' { ' FAIL ', 'Red' }
            'WARN' { ' warn ', 'Yellow' }
            default { ' info ', 'Gray' }
        }
        Write-Host "   [$mark] " -ForegroundColor $colour -NoNewline
        Write-Host "$($r.Id.PadRight(3)) $($r.Title)"
        if ($r.Detail -and $r.Status -ne 'PASS') {
            Write-Host "          $($r.Detail)" -ForegroundColor DarkGray
        }
    }
    Write-Host ''
}

Write-Host '  ─────────────────────────────────────────────' -ForegroundColor DarkGray
Write-Host "  PASS $($passed.Count)   BLOCKER $($blockers.Count)   MAJOR $($majors.Count)   MINOR $($minors.Count)"
$verdict = if ($blockers.Count -gt 0) { 'NOT READY FOR v3.0 RELEASE' } elseif ($majors.Count -gt 0) { 'RELEASABLE WITH KNOWN GAPS' } else { 'DoD MET' }
$vColour = if ($blockers.Count -gt 0) { 'Red' } elseif ($majors.Count -gt 0) { 'Yellow' } else { 'Green' }
Write-Host "  verdict: $verdict" -ForegroundColor $vColour
Write-Host ''

exit ([Math]::Min($blockers.Count, 250))
