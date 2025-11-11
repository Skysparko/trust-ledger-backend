import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly frontendUrl: string;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private configService: ConfigService) {
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );
    this.fromEmail = this.configService.get<string>(
      'EMAIL_FROM',
      this.configService.get<string>('SMTP_FROM', 'noreply@rwa.com'),
    );
    this.fromName = this.configService.get<string>(
      'SMTP_FROM_NAME',
      'RWA',
    );

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST') || this.configService.get<string>('SMTP_HOST') || 'smtp.ionos.com',
      port: this.configService.get<number>('EMAIL_PORT') || this.configService.get<number>('SMTP_PORT') || 587,
      secure: false, // IONOS typically uses port 587 with TLS
        auth: {
        user: this.configService.get<string>('EMAIL_USER') || this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('EMAIL_PASS') || this.configService.get<string>('SMTP_PASSWORD'),
      },
      tls: {
        // IONOS may require specific TLS settings
        rejectUnauthorized: true, // Keep this true for production
        ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
      },
      // Additional IONOS-specific settings
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000, // 10 seconds
      socketTimeout: 10000, // 10 seconds
    });

    // Verify connection configuration
    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
    } catch (error) {
      this.logger.warn('Failed to verify SMTP connection:', error);
      // Don't throw - allow app to start even if email is not configured
    }
  }

  private getTemplate(templateName: string): string {
    const templatePath = path.join(process.cwd(), 'src', 'email', 'templates', templateName);
    try {
      return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
      this.logger.error(`Failed to load template ${templateName}:`, error);
      throw new Error(`Email template not found: ${templateName}`);
    }
  }

  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      this.logger.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }

  async sendVerificationEmail(email: string, token: string, name: string): Promise<void> {
    try {
      const template = this.getTemplate('email-verification.hbs');
      const compiledTemplate = handlebars.compile(template);

    const verificationUrl = `${this.frontendUrl}/verify-email?token=${token}`;

      const html = compiledTemplate({
        name,
        email,
        verificationUrl,
        year: new Date().getFullYear(),
      });

      const subject = 'Verify Your RWA Email Address';

    await this.sendEmail({
      to: email,
        subject,
      html,
      });

      this.logger.log(`Email verification sent to: ${email}`);
    } catch (error) {
      this.logger.error('Failed to send email verification:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, token: string, name: string): Promise<void> {
    try {
      const template = this.getTemplate('reset-password.hbs');
      const compiledTemplate = handlebars.compile(template);

    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

      const html = compiledTemplate({
        name,
        resetUrl,
        year: new Date().getFullYear(),
      });

      const subject = 'Reset Your RWA Password';

    await this.sendEmail({
      to: email,
        subject,
      html,
      });

      this.logger.log(`Password reset email sent to: ${email}`);
    } catch (error) {
      this.logger.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  async sendNewsletterConfirmation(email: string): Promise<void> {
    try {
      const template = this.getTemplate('newsletter-confirmation.hbs');
      const compiledTemplate = handlebars.compile(template);

      const html = compiledTemplate({
        year: new Date().getFullYear(),
      });

      const subject = 'Newsletter Subscription Confirmed - RWA';

    await this.sendEmail({
      to: email,
        subject,
      html,
    });

      this.logger.log(`Newsletter confirmation sent to: ${email}`);
    } catch (error) {
      this.logger.error('Failed to send newsletter confirmation:', error);
      throw error;
    }
  }

  async sendBrochureRequest(name: string, email: string, interest: string): Promise<void> {
    try {
      const template = this.getTemplate('brochure-request.hbs');
      const compiledTemplate = handlebars.compile(template);

      const html = compiledTemplate({
        name,
        interest: interest.charAt(0).toUpperCase() + interest.slice(1),
        year: new Date().getFullYear(),
      });

      const subject = 'Thank You for Your Interest - RWA';

    await this.sendEmail({
      to: email,
        subject,
      html,
    });

      this.logger.log(`Brochure request confirmation sent to: ${email}`);
    } catch (error) {
      this.logger.error('Failed to send brochure request confirmation:', error);
      throw error;
    }
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
      mintTxHash?: string | null;
      contractAddress?: string | null;
      walletAddress?: string | null;
      adminWalletAddress?: string | null;
      explorerUrl?: string | null;
    },
  ): Promise<void> {
    try {
      const template = this.getTemplate('investment-confirmation.hbs');
      const compiledTemplate = handlebars.compile(template);

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

      // Format addresses for display (show first 6 and last 4 characters)
      const formatAddress = (addr: string | null | undefined) => {
        if (!addr) return '';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
      };

      const formatTxHash = (hash: string | null | undefined) => {
        if (!hash) return '';
        return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
      };

      const html = compiledTemplate({
        name,
        investmentId: investment.investmentId,
        transactionId: investment.transactionId,
        amount: investment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        bonds: investment.bonds,
        investmentOpportunity: investment.investmentOpportunity,
        paymentMethod: paymentMethodDisplay,
        date: formattedDate,
        status: investment.status.toUpperCase(),
        mintTxHash: formatTxHash(investment.mintTxHash),
        contractAddress: formatAddress(investment.contractAddress),
        walletAddress: formatAddress(investment.walletAddress),
        adminWalletAddress: formatAddress(investment.adminWalletAddress),
        explorerUrl: investment.explorerUrl,
        hasBlockchain: !!investment.mintTxHash,
        dashboardUrl: `${this.frontendUrl}/dashboard`,
        year: new Date().getFullYear(),
      });

      const subject = 'Investment Confirmed - RWA';

    await this.sendEmail({
      to: email,
        subject,
      html,
      });

      this.logger.log(`Investment confirmation sent to: ${email}`);
    } catch (error) {
      this.logger.error('Failed to send investment confirmation:', error);
      throw error;
    }
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
    try {
      const template = this.getTemplate('investment-cancellation.hbs');
      const compiledTemplate = handlebars.compile(template);

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

      const html = compiledTemplate({
        name,
        investmentId: investment.investmentId,
        transactionId: investment.transactionId,
        amount: investment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        bonds: investment.bonds,
        investmentOpportunity: investment.investmentOpportunity,
        paymentMethod: paymentMethodDisplay,
        date: formattedDate,
        status: investment.status.toUpperCase(),
        reason: investment.reason,
        hasReason: !!investment.reason,
        dashboardUrl: `${this.frontendUrl}/dashboard`,
        year: new Date().getFullYear(),
      });

      const subject = 'Investment Cancelled - RWA';

    await this.sendEmail({
      to: email,
        subject,
      html,
      });

      this.logger.log(`Investment cancellation sent to: ${email}`);
    } catch (error) {
      this.logger.error('Failed to send investment cancellation:', error);
      throw error;
    }
  }
}
