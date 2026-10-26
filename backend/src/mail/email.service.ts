import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter?: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {}

  async verifyConfiguration(): Promise<void> {
    try {
      await this.getTransporter().verify();
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      const smtpError = error as {
        code?: string;
        responseCode?: number;
        command?: string;
      };
      this.logger.error(
        `SMTP verification failed (code=${smtpError.code ?? 'unknown'}, responseCode=${smtpError.responseCode ?? 'none'}, command=${smtpError.command ?? 'unknown'}).`,
      );
      throw new ServiceUnavailableException(
        'Brevo SMTP is not ready. Check the SMTP login, SMTP key, and verified sender settings.',
      );
    }
  }

  async sendCompanyEmployeeConfirmation(
    recipient: string,
    employeeName: string,
    companyName: string,
    token: string,
  ): Promise<void> {
    const transporter = this.getTransporter();
    const from = this.config.get<string>('SMTP_FROM');
    const appUrl = (
      this.config.get<string>('APP_URL') ??
      this.config.get<string>('RENDER_EXTERNAL_URL') ??
      'http://localhost:4200'
    ).replace(
      /\/$/,
      '',
    );
    const confirmationUrl = `${appUrl}/confirm-invite?token=${encodeURIComponent(token)}`;
    const safeEmployeeName = this.escapeHtml(employeeName);
    const safeCompanyName = this.escapeHtml(companyName);
    await transporter.sendMail({
      from,
      to: recipient,
      subject: `Confirm your ${companyName} employee account`,
      text: `Hello ${employeeName},\n\n${companyName} created an employee account for you. Confirm your email and choose a password here: ${confirmationUrl}\n\nThis link expires in 24 hours.`,
      html: `<p>Hello ${safeEmployeeName},</p><p>${safeCompanyName} created an employee account for you.</p><p><a href="${confirmationUrl}">Confirm your email and choose a password</a></p><p>This link expires in 24 hours.</p>`,
    });
  }

  async sendRegistrationConfirmation(recipient: string, name: string, code: string): Promise<void> {
    const transporter = this.getTransporter();
    const from = this.config.get<string>('SMTP_FROM');
    const safeName = this.escapeHtml(name);
    await transporter.sendMail({
      from,
      to: recipient,
      subject: 'Confirm your Workpath email address',
      text: `Hello ${name},\n\nYour Workpath confirmation code is ${code}. It expires in 10 minutes.`,
      html: `<p>Hello ${safeName},</p><p>Your Workpath confirmation code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes.</p>`,
    });
  }

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;
    const host = this.config.get<string>('SMTP_HOST') ?? 'smtp-relay.brevo.com';
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const from = this.config.get<string>('SMTP_FROM');
    if (!from || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw new ServiceUnavailableException(
        'Email is not configured. Set SMTP_FROM to a verified Brevo sender address.',
      );
    }
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');
    if (!user || !pass) {
      throw new ServiceUnavailableException(
        'Brevo SMTP credentials are missing. Set SMTP_USER and SMTP_PASSWORD.',
      );
    }
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: this.config.get<string>('SMTP_SECURE') === 'true' || port === 465,
      auth: { user, pass },
    });
    return this.transporter;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[character];
    });
  }
}
