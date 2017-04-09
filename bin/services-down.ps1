docker stop postgres
docker rm postgres

Write-Output "Services down"

Remove-Item Env:\DATABASE_URL
