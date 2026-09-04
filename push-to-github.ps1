# Pushes this exported project to https://github.com/Dhanushya1974/bizintel
# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\push-to-github.ps1
#
# Requires Git for Windows:  winget install --id Git.Git -e   (then reopen the terminal)

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/Dhanushya1974/bizintel.git"
$Branch  = "main"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error "git is not installed. Run:  winget install --id Git.Git -e  then reopen the terminal."
}

# This folder's .git is a Lovable cloud-worktree pointer that only works in that container.
# Replace it with a fresh local repo for your own GitHub copy.
if (Test-Path ".git") {
  if ((Get-Item ".git" -Force).PSIsContainer) {
    Write-Host "A real .git directory already exists - leaving it in place."
  } else {
    Move-Item ".git" ".git.lovable.bak" -Force
    Write-Host "Moved Lovable worktree pointer -> .git.lovable.bak"
  }
}

if (-not (Test-Path ".git")) {
  git init
  git branch -M $Branch
}

# Make sure secrets never get committed (in case .gitignore was reverted).
$gi = Get-Content ".gitignore" -Raw -ErrorAction SilentlyContinue
if ($gi -notmatch "(?m)^\.env$") {
  Add-Content ".gitignore" "`n.env`n.env.*`n!.env.example`n"
  Write-Host "Added .env rules to .gitignore"
}

git add -A
git commit -m "BizIntel - export from Lovable" | Out-Host

git remote remove origin 2>$null
git remote add origin $RepoUrl

Write-Host "`nPushing to $RepoUrl ($Branch)..." -ForegroundColor Cyan
Write-Host "If the repo already has commits, this will be rejected - see the note at the end.`n"
git push -u origin $Branch

Write-Host "`nDone. https://github.com/Dhanushya1974/bizintel" -ForegroundColor Green
Write-Host @"

If push was REJECTED because the GitHub repo is not empty (has a README/licence):
  git pull origin $Branch --allow-unrelated-histories   # then resolve any conflicts
  git push -u origin $Branch
-- or, to overwrite the remote with this project (only if the repo has nothing you need):
  git push -u origin $Branch --force
"@
