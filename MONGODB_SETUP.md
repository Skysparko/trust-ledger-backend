# MongoDB Setup Instructions

## Environment File Configuration

Since `.env` files are in `.gitignore` (for security), you need to create it manually.

### Create `.env` File

Create a `.env` file in the root directory with the following content:

```env
# Database Configuration (MongoDB)
MONGODB_URI=mongodb+srv://shubhamrakhecha5_db_user:yIMmDbng1DWULd00@trustledger.llkjm9q.mongodb.net/?appName=trustledger
DB_NAME=trust_ledger

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
SMTP_FROM=noreply@trustledger.com
SMTP_FROM_NAME=TrustLedger

# Application URLs
FRONTEND_URL=http://localhost:3001
API_URL=http://localhost:3000

# Email Verification
EMAIL_VERIFICATION_ENABLED=true
EMAIL_VERIFICATION_TOKEN_EXPIRY=24

# Password Reset
PASSWORD_RESET_TOKEN_EXPIRY=1
```

## Quick Setup Commands

### Windows (PowerShell)
```powershell
@"
# Database Configuration (MongoDB)
MONGODB_URI=mongodb+srv://shubhamrakhecha5_db_user:yIMmDbng1DWULd00@trustledger.llkjm9q.mongodb.net/?appName=trustledger
DB_NAME=trust_ledger

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
SMTP_FROM=noreply@trustledger.com
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
```

### Linux/Mac
```bash
cat > .env << 'EOF'
# Database Configuration (MongoDB)
MONGODB_URI=mongodb+srv://shubhamrakhecha5_db_user:yIMmDbng1DWULd00@trustledger.llkjm9q.mongodb.net/?appName=trustledger
DB_NAME=trust_ledger

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
SMTP_FROM=noreply@trustledger.com
SMTP_FROM_NAME=TrustLedger

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

## MongoDB Connection String

Your MongoDB Atlas connection string is already configured:
- **URI**: `mongodb+srv://shubhamrakhecha5_db_user:yIMmDbng1DWULd00@trustledger.llkjm9q.mongodb.net/?appName=trustledger`
- **Database Name**: `trust_ledger`

The connection string will automatically use the `DB_NAME` for the database.

## Important Notes

1. **Generate JWT_SECRET**: 
   ```bash
   # Generate a strong secret
   openssl rand -base64 32
   # or
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Configure Email**: Update SMTP settings if you want email functionality

3. **Install Dependencies**: After creating `.env`, run:
   ```bash
   npm install
   ```

## Next Steps

1. Create the `.env` file using one of the methods above
2. Install dependencies: `npm install`
3. Start the application: `npm run start:dev`
4. The application will automatically connect to MongoDB Atlas

## Troubleshooting

### Connection Issues
- Ensure your IP address is whitelisted in MongoDB Atlas
- Check if the connection string is correct
- Verify network connectivity

### Database Name
The `DB_NAME` will be appended to the connection string. If your MongoDB URI already includes a database name, the `DB_NAME` will override it.

