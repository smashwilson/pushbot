if (!$env:DEV_USERNAME) {
  $env:DEV_USERNAME = $env:USERNAME
}

$env:HUBOT_AUTH_ADMIN = "1"

docker-compose run --service-ports pushbot
