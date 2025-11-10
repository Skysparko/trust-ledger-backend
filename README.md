# RWA Backend API

Backend API for RWA - Investment Platform for Renewable Energy Projects (Wind & Solar).

## Technology Stack

- **NestJS 11** - Progressive Node.js framework
- **TypeORM** - ORM for database management
- **PostgreSQL** - Database
- **JWT** - Authentication
- **TypeScript** - Programming language
- **bcrypt** - Password hashing
- **Multer** - File upload handling
- **Nodemailer** - Email service
- **Swagger/OpenAPI** - API documentation
- **Winston** (via NestJS Logger) - Logging

## Features

### Authentication
- User authentication (login, signup, password reset)
- Admin authentication
- JWT-based session management
- Password hashing with bcrypt

### User Portal
- Profile management
- KYC document upload
- Investment management
- Transaction history
- Asset tracking
- Notifications

### Admin Panel
- User management
- Investment confirmation/cancellation
- Transaction management
- Issuance management
- Project management
- Document management
- Webinar management
- Post/blog management
- Dashboard with statistics

### Public API
- Issuance listings
- Project listings
- Blog posts
- Webinars
- Newsletter subscription
- Brochure requests

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd trust-ledger-backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables

**Option 1: Use the setup script (Recommended)**

**Linux/Mac:**
```bash
chmod +x scripts/create-env.sh
./scripts/create-env.sh
```

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/create-env.ps1
```

**Option 2: Manual creation**

Create a `.env` file in the root directory with the following content:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=trust_ledger
DB_SYNCHRONIZE=true
DB_LOGGING=false

# JWT
JWT_SECRET=your-secret-key-change-in-production-minimum-32-characters
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# File Upload
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

**Important:** For Gmail SMTP setup:
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password in `SMTP_PASSWORD`

**⚠️ Security Note**: After creating the `.env` file:
- Generate a strong `JWT_SECRET` using: `openssl rand -base64 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Update database credentials
- Configure SMTP settings for email functionality
- See `SETUP.md` for detailed configuration instructions

4. Create the database
```bash
createdb trust_ledger
```

5. Run the application
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User signup
- `POST /api/auth/reset-password` - Request password reset
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/change-password` - Change password (authenticated)
- `POST /api/admin/login` - Admin login

### User Endpoints
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `POST /api/user/kyc-upload` - Upload KYC document
- `PUT /api/user/agreement-sign` - Sign agreement
- `PUT /api/user/two-factor` - Toggle 2FA
- `PUT /api/user/wallet` - Update wallet settings
- `GET /api/user/investments` - Get investments
- `POST /api/user/investments` - Create investment
- `GET /api/user/transactions` - Get transactions
- `GET /api/user/assets` - Get assets
- `GET /api/user/notifications` - Get notifications
- `PUT /api/user/notifications/:id/read` - Mark notification as read
- `PUT /api/user/notifications/read-all` - Mark all as read

### Public Endpoints
- `GET /api/issuances` - List issuances (with filters)
- `GET /api/issuances/:id` - Get issuance details
- `GET /api/projects` - List projects (with filters)
- `GET /api/posts` - List posts (with category filter)
- `GET /api/posts/:id` - Get post details
- `GET /api/webinars` - List webinars
- `POST /api/newsletter/subscribe` - Subscribe to newsletter
- `POST /api/brochure/request` - Request brochure

### Admin Endpoints
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/users` - List users (with filters and pagination)
- `PUT /api/admin/users/:id/kyc` - Update user KYC status
- `PUT /api/admin/users/:id/status` - Update user status
- `GET /api/admin/transactions` - List transactions (with filters)
- `GET /api/admin/issuances` - List issuances
- `POST /api/admin/issuances` - Create issuance
- `PUT /api/admin/issuances/:id` - Update issuance
- `DELETE /api/admin/issuances/:id` - Delete issuance
- `GET /api/admin/projects` - List projects
- `POST /api/admin/projects` - Create project
- `PUT /api/admin/projects/:id` - Update project
- `DELETE /api/admin/projects/:id` - Delete project
- `GET /api/admin/documents` - List documents
- `POST /api/admin/documents` - Upload document
- `GET /api/admin/documents/:id/download` - Download document
- `DELETE /api/admin/documents/:id` - Delete document
- `GET /api/admin/webinars` - List webinars
- `POST /api/admin/webinars` - Create webinar
- `PUT /api/admin/webinars/:id` - Update webinar
- `DELETE /api/admin/webinars/:id` - Delete webinar
- `GET /api/admin/posts` - List posts
- `POST /api/admin/posts` - Create post
- `PUT /api/admin/posts/:id` - Update post
- `DELETE /api/admin/posts/:id` - Delete post
- `PUT /api/admin/investments/:id/confirm` - Confirm investment
- `PUT /api/admin/investments/:id/cancel` - Cancel investment

## Database Schema

The application uses the following main entities:

- **User** - User accounts
- **UserProfile** - User profile information
- **Issuance** - Investment opportunities
- **Project** - Renewable energy projects
- **Investment** - User investments
- **Transaction** - Financial transactions
- **Asset** - User-owned assets
- **Post** - Blog/news posts
- **Webinar** - Webinar listings
- **Notification** - User notifications
- **Document** - Admin documents
- **Admin** - Admin accounts

## File Upload

- KYC documents: Max 10MB, formats: PDF, JPG, PNG
- Admin documents: Max 10MB, formats: PDF, DOC, XLS, etc.
- Files are stored in `./uploads/kyc` and `./uploads/documents`

## Business Logic

### Investment Flow
1. User creates investment (pending status)
2. Transaction is created (pending status)
3. Admin confirms investment
4. Transaction status updated to completed
5. Issuance funding updated
6. Asset created for user
7. If funding target reached, issuance status changed to closed

### Status Management
- Investments: pending → confirmed/cancelled
- Transactions: pending → completed/failed
- Issuances: upcoming → open → closed
- KYC: pending → approved/rejected

## Security

- JWT tokens for authentication
- Password hashing with bcrypt
- Input validation with class-validator
- CORS configuration
- File upload validation
- Email verification tokens
- Password reset tokens with expiration

## Email Service

The application includes a complete email service using Nodemailer for:

- **Email Verification**: Sent after user signup (optional, configurable)
- **Password Reset**: Secure password reset links with expiration
- **Newsletter Subscriptions**: Confirmation emails for newsletter signups
- **Brochure Requests**: Confirmation emails when users request brochures
- **Investment Confirmations**: Email notifications when investments are confirmed

### Email Configuration

Configure SMTP settings in `.env`:
- `SMTP_HOST`: Your SMTP server host
- `SMTP_PORT`: SMTP port (587 for TLS, 465 for SSL)
- `SMTP_SECURE`: Set to `true` for SSL (port 465), `false` for TLS (port 587)
- `SMTP_USER`: Your SMTP username/email
- `SMTP_PASSWORD`: Your SMTP password or app password
- `SMTP_FROM`: Sender email address
- `SMTP_FROM_NAME`: Sender display name

**Note**: If SMTP credentials are not configured, the email service will log emails to the console instead of sending them (useful for development).

## API Documentation

### Swagger/OpenAPI

Interactive API documentation is available at `/api/docs` when running in non-production mode.

Features:
- Complete API endpoint documentation
- Interactive testing interface
- Authentication support (JWT Bearer tokens)
- Request/response schemas
- Error responses

Access: `http://localhost:3000/api/docs`

## Health Check

Health check endpoints are available:

- `GET /` - Simple health check
- `GET /health` - Detailed health check with database status and system metrics

## Static File Serving

Uploaded files are served statically at:

- `/uploads/kyc/*` - KYC documents
- `/uploads/documents/*` - Admin documents

Files are accessible via direct URL after upload.

## Development

### Running tests
```bash
npm run test
npm run test:e2e
```

### Code formatting
```bash
npm run format
```

### Linting
```bash
npm run lint
```

## Logging

The application includes comprehensive logging:

- **Request/Response Logging**: All HTTP requests are logged with method, URL, IP, status code, and response time
- **Error Logging**: All errors are logged with full stack traces
- **Logger Levels**: Configured for development and production

Logging uses NestJS built-in Logger with different log levels:
- `log` - General information
- `error` - Errors and exceptions
- `warn` - Warnings
- `debug` - Debug information (development only)
- `verbose` - Verbose information (development only)

## License

Private/Unlicensed
