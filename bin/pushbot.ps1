if (!$env:DEV_USERNAME) {
  $env:DEV_USERNAME = $env:USERNAME
}

. ./botrc.ps1

docker-compose run --service-ports pushbot
