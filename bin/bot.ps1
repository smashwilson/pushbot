param (
  [string]$configuration = ""
)

if (!$env:DEV_USERNAME) {
  $env:DEV_USERNAME = $env:USERNAME
}

if (Test-Path -Path "secrets\botrc.ps1") {
  $secrets = "secrets\botrc.ps1"
} else {
  $secrets = "secrets\botrc.example.ps1"
}

if ($configuration -ne "") {
  $secrets = "secrets\botrc.$configuration.ps1"
}

. $secrets

docker-compose --service-ports pushbot
