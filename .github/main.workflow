workflow "Build and push Docker container" {
  on = "push"
  resolves = ["Build"]
}

action "Build" {
  uses = "smashwilson/az-infra/actions/azbuild@master"
  secrets = ["DOCKER_REGISTRY_URL", "DOCKER_USERNAME", "DOCKER_PASSWORD"]
  env = {
    IMAGE_NAME = "quay.io/smashwilson/az-pushbot"
  }
}
