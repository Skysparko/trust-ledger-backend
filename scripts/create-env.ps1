# PowerShell script to create .env file

Write-Host "Creating .env file..." -ForegroundColor Cyan

# Check if .env already exists
if (Test-Path .env) {
    $response = Read-Host ".env file already exists. Do you want to overwrite it? (y/N)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Host "Aborted." -ForegroundColor Yellow
        exit 1
    }
}

# Create .env file
@"
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=trust_ledger
DB_SYNCHRONIZE=true
DB_LOGGING=false

# JWT Configuration
JWT_SECRET=change-this-to-a-strong-secret-in-production-minimum-32-characters
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=shubhamrakhecha5@gmail.com
EMAIL_PASS=adqv ybmo qoju tlql
EMAIL_FROM=shubhamrakhecha5@gmail.com
SMTP_FROM_NAME=TrustLedger

# Application URLs
FRONTEND_URL=http://localhost:3001
API_URL=http://localhost:3000

# Email Verification
EMAIL_VERIFICATION_ENABLED=true
EMAIL_VERIFICATION_TOKEN_EXPIRY=24

# Password Reset
PASSWORD_RESET_TOKEN_EXPIRY=1
"@ | Out-File -FilePath .env -Encoding utf8

Write-Host "✅ .env file created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "1. Update database credentials in .env"
Write-Host "2. Generate a strong JWT_SECRET"
Write-Host "3. Configure SMTP settings for email functionality"
Write-Host "4. Review SETUP.md for detailed configuration instructions"
Write-Host ""

