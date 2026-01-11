param(
  [string]$RepoRoot = (Resolve-Path "$PSScriptRoot\..")
)

Set-Location $RepoRoot

npm install
npm run init-db
npm start
