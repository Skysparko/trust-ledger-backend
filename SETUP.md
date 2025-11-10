# Environment Setup Guide

## Creating the .env File

Since the `.env` file contains sensitive information, it's not tracked in Git. Follow these steps to create it:

### Step 1: Copy the Example File

Create a `.env` file in the root directory and copy the following content:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=trust_ledger
DB_SYNCHRONIZE=true
DB_LOGGING=false

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production-minimum-32-characters
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
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@rwa.com
SMTP_FROM_NAME=RWA

# Application URLs
FRONTEND_URL=http://localhost:3001
API_URL=http://localhost:3000

# Email Verification
EMAIL_VERIFICATION_ENABLED=true
EMAIL_VERIFICATION_TOKEN_EXPIRY=24

# Password Reset
PASSWORD_RESET_TOKEN_EXPIRY=1
```

### Step 2: Update Configuration Values

#### Database Configuration
```env
DB_HOST=localhost          # Your PostgreSQL host
DB_PORT=5432               # PostgreSQL port (default: 5432)
DB_USERNAME=postgres       # Your PostgreSQL username
DB_PASSWORD=yourpassword   # Your PostgreSQL password
DB_NAME=trust_ledger       # Database name
DB_SYNCHRONIZE=true        # Set to false in production!
DB_LOGGING=false           # Set to true for debugging
```

#### JWT Configuration
```env
JWT_SECRET=your-super-secret-key-at-least-32-characters-long-change-this-in-production
JWT_EXPIRES_IN=7d          # Token expiration (e.g., 7d, 24h, 1h)
```

**⚠️ IMPORTANT**: Generate a strong random secret for production:
```bash
# Generate a secure random string (Linux/Mac)
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Email Configuration

**For Gmail:**
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the generated 16-character password
3. Update your `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx  # Use the app password here
SMTP_FROM=noreply@rwa.com
SMTP_FROM_NAME=RWA
```

**For Other SMTP Providers:**

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

**Mailgun:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASSWORD=your-mailgun-password
```

**AWS SES:**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-aws-access-key
SMTP_PASSWORD=your-aws-secret-key
```

#### Production Configuration

For production, update these values:

```env
NODE_ENV=production
DB_SYNCHRONIZE=false          # Never use true in production!
DB_LOGGING=false
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
JWT_SECRET=your-strong-production-secret
```

### Step 3: Create Required Directories

The upload directories will be created automatically, but you can create them manually:

```bash
mkdir -p uploads/kyc
mkdir -p uploads/documents
```

### Step 4: Verify Configuration

After creating the `.env` file, start the application:

```bash
npm run start:dev
```

Check the logs to ensure:
- ✅ Database connection successful
- ✅ Application started on correct port
- ✅ Email service initialized (will log warning if not configured)

## Quick Setup Commands

### Windows (PowerShell)
```powershell
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
JWT_SECRET=change-this-to-a-strong-secret-in-production
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Email Configuration (SMTP) - Configure as needed
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@rwa.com
SMTP_FROM_NAME=RWA

# Application URLs
FRONTEND_URL=http://localhost:3001
API_URL=http://localhost:3000

# Email Verification
EMAIL_VERIFICATION_ENABLED=true
EMAIL_VERIFICATION_TOKEN_EXPIRY=24

# Password Reset
PASSWORD_RESET_TOKEN_EXPIRY=1
"@ | Out-File -FilePath .env -Encoding utf8
```

### Linux/Mac
```bash
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
JWT_SECRET=change-this-to-a-strong-secret-in-production
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Email Configuration (SMTP) - Configure as needed
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@rwa.com
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
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Verify credentials are correct
- Check if database `trust_ledger` exists (create it if not: `createdb trust_ledger`)

### Email Service Issues
- If SMTP credentials are not configured, emails will be logged to console (development mode)
- Verify SMTP credentials are correct
- For Gmail, ensure you're using an App Password, not your regular password
- Check firewall/network settings for SMTP ports

### File Upload Issues
- Ensure upload directory has write permissions
- Check `MAX_FILE_SIZE` matches your needs (default: 10MB)

## Security Notes

1. **Never commit `.env` to version control** - It's already in `.gitignore`
2. **Use strong JWT secrets** in production
3. **Set `DB_SYNCHRONIZE=false`** in production
4. **Restrict `CORS_ORIGIN`** to your actual frontend domain in production
5. **Use environment-specific `.env` files** for different environments

