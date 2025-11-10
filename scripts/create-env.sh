#!/bin/bash

# Script to create .env file from template

echo "Creating .env file..."

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Create .env file
cat > .env << 'EOF'
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
SMTP_FROM_NAME=RWA

# Application URLs
FRONTEND_URL=http://localhost:3001
API_URL=http://localhost:3000

# Email Verification
EMAIL_VERIFICATION_ENABLED=true
EMAIL_VERIFICATION_TOKEN_EXPIRY=24

# Password Reset
PASSWORD_RESET_TOKEN_EXPIRY=1
EOF

echo "✅ .env file created successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Update database credentials in .env"
echo "2. Generate a strong JWT_SECRET (use: openssl rand -base64 32)"
echo "3. Configure SMTP settings for email functionality"
echo "4. Review SETUP.md for detailed configuration instructions"
echo ""

