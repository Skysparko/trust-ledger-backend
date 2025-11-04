import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly frontendUrl: string;

  constructor(private configService: ConfigService) {
    const smtpHost = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    // Ensure port is parsed as number, handle both string and number
    const smtpPortRaw = this.configService.get<string | number>('SMTP_PORT', 587);
    const smtpPort = typeof smtpPortRaw === 'string' ? parseInt(smtpPortRaw, 10) : smtpPortRaw;
    const smtpSecureRaw = this.configService.get<string | boolean>('SMTP_SECURE', false);
    const smtpSecure = typeof smtpSecureRaw === 'string' 
      ? smtpSecureRaw.toLowerCase() === 'true' 
      : smtpSecureRaw;
    
    // Support both EMAIL_USER/EMAIL_PASS and SMTP_USER/SMTP_PASSWORD
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPass = this.configService.get<string>('EMAIL_PASS');
    const smtpUser = emailUser || this.configService.get<string>('SMTP_USER');
    const smtpPassword = emailPass || this.configService.get<string>('SMTP_PASSWORD');

    this.fromEmail = this.configService.get<string>(
      'EMAIL_FROM',
      this.configService.get<string>('SMTP_FROM', 'noreply@trustledger.com'),
    );
    this.fromName = this.configService.get<string>(
      'SMTP_FROM_NAME',
      'TrustLedger',
    );
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );

    if (smtpUser && smtpPassword) {
      const transporterConfig: any = {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPassword.replace(/\s+/g, ''), // Remove any spaces from app password
        },
      };

      // For port 587 (STARTTLS), explicitly configure STARTTLS
      // Port 587 uses STARTTLS: connection starts plain, then upgrades to TLS
      if (smtpPort === 587) {
        transporterConfig.secure = false; // Must be false - we start with plain connection
        transporterConfig.requireTLS = true; // Require TLS upgrade via STARTTLS command
        // Don't set ignoreTLS or tls options - let nodemailer handle STARTTLS negotiation
      }

      // For port 465 (SSL/TLS), ensure secure is true
      if (smtpPort === 465) {
        transporterConfig.secure = true;
        transporterConfig.requireTLS = false;
        transporterConfig.ignoreTLS = true;
      }

      this.transporter = nodemailer.createTransport(transporterConfig);
      this.logger.log(
        `Email service initialized with SMTP configuration: ${smtpHost}:${smtpPort} (secure: ${smtpSecure})`,
      );
    } else {
      this.logger.warn(
        'SMTP credentials not configured. Email service will use console logging.',
      );
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      this.logger.log('Email would be sent (SMTP not configured):');
      this.logger.log(`To: ${options.to}`);
      this.logger.log(`Subject: ${options.subject}`);
      this.logger.log(`Body: ${options.text || options.html}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      this.logger.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }

  async sendVerificationEmail(email: string, token: string, name: string): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to TrustLedger!</h1>
            </div>
            <div class="content">
              <p>Hello ${name},</p>
              <p>Thank you for signing up with TrustLedger. Please verify your email address by clicking the button below:</p>
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
              <p>Or copy and paste this link into your browser:</p>
              <p>${verificationUrl}</p>
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't create an account with TrustLedger, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} TrustLedger. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Welcome to TrustLedger!
      
      Hello ${name},
      
      Thank you for signing up with TrustLedger. Please verify your email address by visiting:
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create an account with TrustLedger, please ignore this email.
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verify Your TrustLedger Email Address',
      html,
      text,
    });
  }

  async sendPasswordResetEmail(email: string, token: string, name: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .warning { background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello ${name},</p>
              <p>We received a request to reset your password for your TrustLedger account.</p>
              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>Or copy and paste this link into your browser:</p>
              <p>${resetUrl}</p>
              <div class="warning">
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} TrustLedger. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Password Reset Request
      
      Hello ${name},
      
      We received a request to reset your password for your TrustLedger account.
      
      Visit this link to reset your password:
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request a password reset, please ignore this email.
    `;

    await this.sendEmail({
      to: email,
      subject: 'Reset Your TrustLedger Password',
      html,
      text,
    });
  }

  async sendNewsletterConfirmation(email: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Newsletter Subscription Confirmed</h1>
            </div>
            <div class="content">
              <p>Thank you for subscribing to the TrustLedger newsletter!</p>
              <p>You will now receive updates about:</p>
              <ul>
                <li>New investment opportunities</li>
                <li>Project updates</li>
                <li>Market insights</li>
                <li>Upcoming webinars and events</li>
              </ul>
              <p>We're excited to have you as part of our community!</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} TrustLedger. All rights reserved.</p>
              <p>You can unsubscribe at any time by clicking the link in any newsletter email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Newsletter Subscription Confirmed - TrustLedger',
      html,
    });
  }

  async sendBrochureRequest(name: string, email: string, interest: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .info-box { background-color: #e3f2fd; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Thank You for Your Interest!</h1>
            </div>
            <div class="content">
              <p>Dear ${name},</p>
              <p>Thank you for requesting our brochure. We're delighted that you're interested in ${interest} energy investments.</p>
              <div class="info-box">
                <p><strong>Your Interest:</strong> ${interest.charAt(0).toUpperCase() + interest.slice(1)} Energy</p>
              </div>
              <p>Our team will be in touch with you shortly with detailed information about our ${interest} energy investment opportunities.</p>
              <p>In the meantime, feel free to explore our platform and learn more about how TrustLedger is revolutionizing renewable energy investments.</p>
              <p>Best regards,<br>The TrustLedger Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} TrustLedger. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Thank You for Your Interest - TrustLedger',
      html,
    });
  }

  async sendInvestmentConfirmation(
    email: string,
    name: string,
    investment: {
      investmentId: string;
      transactionId?: string;
      amount: number;
      bonds: number;
      investmentOpportunity: string;
      paymentMethod?: string;
      date: string;
      status: string;
    },
  ): Promise<void> {
    const formattedDate = new Date(investment.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const paymentMethodDisplay = investment.paymentMethod
      ? investment.paymentMethod.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
      : 'Not specified';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .investment-details { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .status-badge { display: inline-block; padding: 5px 15px; background-color: #4CAF50; color: white; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .info-box { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Investment Confirmed!</h1>
            </div>
            <div class="content">
              <p>Dear ${name},</p>
              <p>We're pleased to confirm that your investment has been successfully processed and confirmed.</p>
              
              <div class="investment-details">
                <h3 style="margin-top: 0; color: #4CAF50;">Investment Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Investment ID:</span>
                  <span class="detail-value">${investment.investmentId}</span>
                </div>
                ${investment.transactionId ? `
                <div class="detail-row">
                  <span class="detail-label">Transaction ID:</span>
                  <span class="detail-value">${investment.transactionId}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                  <span class="detail-label">Investment Opportunity:</span>
                  <span class="detail-value">${investment.investmentOpportunity}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Investment Amount:</span>
                  <span class="detail-value"><strong>$${investment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Number of Bonds:</span>
                  <span class="detail-value">${investment.bonds}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Payment Method:</span>
                  <span class="detail-value">${paymentMethodDisplay}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Transaction Date:</span>
                  <span class="detail-value">${formattedDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Status:</span>
                  <span class="status-badge">${investment.status.toUpperCase()}</span>
                </div>
              </div>

              <div class="info-box">
                <p><strong>What's Next?</strong></p>
                <p>Your investment has been confirmed and your bonds have been added to your portfolio. You can view your investment details, download documents, and track your returns from your dashboard.</p>
              </div>

              <p>You can view your investment details and download documents from your dashboard at <a href="${this.frontendUrl}/dashboard">${this.frontendUrl}/dashboard</a>.</p>
              
              <p>Thank you for investing with TrustLedger!</p>
              
              <p>Best regards,<br>The TrustLedger Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} TrustLedger. All rights reserved.</p>
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Investment Confirmed - TrustLedger
      
      Dear ${name},
      
      We're pleased to confirm that your investment has been successfully processed and confirmed.
      
      Investment Details:
      - Investment ID: ${investment.investmentId}
      ${investment.transactionId ? `- Transaction ID: ${investment.transactionId}\n` : ''}
      - Investment Opportunity: ${investment.investmentOpportunity}
      - Investment Amount: $${investment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      - Number of Bonds: ${investment.bonds}
      - Payment Method: ${paymentMethodDisplay}
      - Transaction Date: ${formattedDate}
      - Status: ${investment.status.toUpperCase()}
      
      Your investment has been confirmed and your bonds have been added to your portfolio. You can view your investment details and download documents from your dashboard.
      
      Thank you for investing with TrustLedger!
      
      Best regards,
      The TrustLedger Team
    `;

    await this.sendEmail({
      to: email,
      subject: 'Investment Confirmed - TrustLedger',
      html,
      text,
    });
  }

  async sendInvestmentCancellation(
    email: string,
    name: string,
    investment: {
      investmentId: string;
      transactionId?: string;
      amount: number;
      bonds: number;
      investmentOpportunity: string;
      paymentMethod?: string;
      date: string;
      status: string;
      reason?: string;
    },
  ): Promise<void> {
    const formattedDate = new Date(investment.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const paymentMethodDisplay = investment.paymentMethod
      ? investment.paymentMethod.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
      : 'Not specified';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .investment-details { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .status-badge { display: inline-block; padding: 5px 15px; background-color: #f44336; color: white; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .warning-box { background-color: #ffebee; padding: 15px; border-left: 4px solid #f44336; margin: 20px 0; }
            .info-box { background-color: #e3f2fd; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Investment Cancelled</h1>
            </div>
            <div class="content">
              <p>Dear ${name},</p>
              <p>We regret to inform you that your investment has been cancelled.</p>
              
              <div class="investment-details">
                <h3 style="margin-top: 0; color: #f44336;">Investment Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Investment ID:</span>
                  <span class="detail-value">${investment.investmentId}</span>
                </div>
                ${investment.transactionId ? `
                <div class="detail-row">
                  <span class="detail-label">Transaction ID:</span>
                  <span class="detail-value">${investment.transactionId}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                  <span class="detail-label">Investment Opportunity:</span>
                  <span class="detail-value">${investment.investmentOpportunity}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Investment Amount:</span>
                  <span class="detail-value"><strong>$${investment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Number of Bonds:</span>
                  <span class="detail-value">${investment.bonds}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Payment Method:</span>
                  <span class="detail-value">${paymentMethodDisplay}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Transaction Date:</span>
                  <span class="detail-value">${formattedDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Status:</span>
                  <span class="status-badge">${investment.status.toUpperCase()}</span>
                </div>
              </div>

              ${investment.reason ? `
              <div class="warning-box">
                <p><strong>Reason for Cancellation:</strong></p>
                <p>${investment.reason}</p>
              </div>
              ` : ''}

              <div class="info-box">
                <p><strong>What Happens Next?</strong></p>
                <p>Your transaction has been marked as cancelled. If any payment was processed, it will be refunded to your original payment method within 5-7 business days.</p>
                <p>If you have any questions or concerns, please contact our support team.</p>
              </div>

              <p>You can view your transaction history and investment status from your dashboard at <a href="${this.frontendUrl}/dashboard">${this.frontendUrl}/dashboard</a>.</p>
              
              <p>If you have any questions, please don't hesitate to contact our support team.</p>
              
              <p>Best regards,<br>The TrustLedger Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} TrustLedger. All rights reserved.</p>
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Investment Cancelled - TrustLedger
      
      Dear ${name},
      
      We regret to inform you that your investment has been cancelled.
      
      Investment Details:
      - Investment ID: ${investment.investmentId}
      ${investment.transactionId ? `- Transaction ID: ${investment.transactionId}\n` : ''}
      - Investment Opportunity: ${investment.investmentOpportunity}
      - Investment Amount: $${investment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      - Number of Bonds: ${investment.bonds}
      - Payment Method: ${paymentMethodDisplay}
      - Transaction Date: ${formattedDate}
      - Status: ${investment.status.toUpperCase()}
      
      ${investment.reason ? `Reason for Cancellation: ${investment.reason}\n\n` : ''}
      
      Your transaction has been marked as cancelled. If any payment was processed, it will be refunded to your original payment method within 5-7 business days.
      
      If you have any questions or concerns, please contact our support team.
      
      Best regards,
      The TrustLedger Team
    `;

    await this.sendEmail({
      to: email,
      subject: 'Investment Cancelled - TrustLedger',
      html,
      text,
    });
  }
}

