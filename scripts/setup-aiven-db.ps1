param(
  [Parameter(Mandatory = $true)]
  [string]$HostName,

  [Parameter(Mandatory = $true)]
  [int]$Port,

  [Parameter(Mandatory = $true)]
  [string]$Database,

  [Parameter(Mandatory = $true)]
  [string]$User,

  [Parameter(Mandatory = $true)]
  [string]$Password,

  [string]$CaPath = "",

  [switch]$TrustServerCertificate
)

$ErrorActionPreference = "Stop"

$env:DB_HOST = $HostName
$env:DB_PORT = "$Port"
$env:DB_NAME = $Database
$env:DB_USER = $User
$env:DB_PASSWORD = $Password
$env:DB_CREATE_DATABASE = "false"
$env:DB_SSL = "true"
$env:DB_SSL_CA_PATH = $CaPath
$env:DB_SSL_REJECT_UNAUTHORIZED = if ($TrustServerCertificate) { "false" } else { "true" }

npm run db:setup
