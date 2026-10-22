import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter?: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {}

  async verifyConfiguration(): Promise<void> {
    try {
      await this.getTransporter().verify();
    } catch {
      throw new ServiceUnavailableException(
        'The SMTP server is not ready. Check the email settings before creating an employee.',
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
    const appUrl = (this.config.get<string>('APP_URL') ?? 'http://localhost:4200').replace(
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

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const from = this.config.get<string>('SMTP_FROM');
    if (!host || !from || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw new ServiceUnavailableException(
        'Company invitations are unavailable until SMTP_HOST, SMTP_PORT, and SMTP_FROM are configured.',
      );
    }
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: this.config.get<string>('SMTP_SECURE') === 'true' || port === 465,
      ...(user && pass ? { auth: { user, pass } } : {}),
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
