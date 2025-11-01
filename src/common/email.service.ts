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
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpSecure = this.configService.get<boolean>('SMTP_SECURE', false);
    
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
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPassword.replace(/\s+/g, ''), // Remove any spaces from app password
        },
      });
      this.logger.log('Email service initialized with SMTP configuration');
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
      amount: number;
      bonds: number;
      issuance: string;
    },
  ): Promise<void> {
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
            .investment-details { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Investment Confirmed!</h1>
            </div>
            <div class="content">
              <p>Dear ${name},</p>
              <p>We're pleased to confirm that your investment has been successfully processed.</p>
              <div class="investment-details">
                <h3>Investment Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Issuance:</span>
                  <span>${investment.issuance}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Number of Bonds:</span>
                  <span>${investment.bonds}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Investment Amount:</span>
                  <span>€${investment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              <p>You can view your investment details and download documents from your dashboard.</p>
              <p>Thank you for investing with TrustLedger!</p>
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
      subject: 'Investment Confirmed - TrustLedger',
      html,
    });
  }
}

