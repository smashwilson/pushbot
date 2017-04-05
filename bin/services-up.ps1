docker run -d -p 5432:5432 -u postgres -e POSTGRES_USER=pushbot -e POSTGRES_PASSWORD=shhh --name postgres postgres:9.6

$env:DATABASE_URL = "postgres://pushbot:shhh@localhost/pushbot?ssl=false"

Write-Output "Services up"
