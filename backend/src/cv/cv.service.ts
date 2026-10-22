import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import PDFDocument = require('pdfkit');
import { CvDocument, CvRecord } from './cv.schema';
import { Profile, ProfileDocument } from '../profiles/profile.schema';
import { User, UserDocument } from '../users/user.schema';

type CvInput = {
  skills?: unknown;
  projects?: unknown;
  education?: unknown;
  certificates?: unknown;
};

const templates = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Bold color header and clear skill highlights.',
    accent: '#2864dc',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional serif headings and a formal layout.',
    accent: '#27364b',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Lightweight typography with a quiet teal accent.',
    accent: '#26766e',
  },
] as const;

@Injectable()
export class CvService {
  constructor(
    @InjectModel(CvRecord.name) private readonly cvs: Model<CvDocument>,
    @InjectModel(Profile.name) private readonly profiles: Model<ProfileDocument>,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
  ) {}

  listTemplates() {
    return templates;
  }

  async mine(userId: string) {
    const cv = await this.cvs.findOne({ userId }).lean();
    return {
      skills: cv?.skills ?? [],
      projects: cv?.projects ?? [],
      education: cv?.education ?? [],
      certificates: cv?.certificates ?? [],
    };
  }

  async save(userId: string, input: CvInput) {
    if (!input || typeof input !== 'object') throw new BadRequestException('CV data is required.');
    const data = {
      skills: this.stringArray(input.skills, 80, 40),
      projects: this.objectArray(input.projects, 40, {
        title: 160,
        description: 3000,
        link: 500,
        skills: 40,
      }),
      education: this.objectArray(input.education, 30, { school: 160, degree: 160, period: 120 }),
      certificates: this.objectArray(input.certificates, 40, { name: 160, issuer: 160, year: 40 }),
    };
    await this.cvs.findOneAndUpdate(
      { userId },
      { $set: { userId, ...data } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    return data;
  }

  async generatePdf(userId: string, templateId: string): Promise<Buffer> {
    const template = templates.find((item) => item.id === templateId);
    if (!template) throw new BadRequestException('Choose one of the available CV designs.');
    const [data, profile, user] = await Promise.all([
      this.mine(userId),
      this.profiles.findOne({ userId }).lean(),
      this.users.findById(userId).select('name email').lean(),
    ]);
    if (!user) throw new NotFoundException('User not found.');
    const palette = {
      modern: { accent: '#2864dc', text: '#172033', muted: '#627086', serif: false },
      classic: { accent: '#27364b', text: '#202020', muted: '#666666', serif: true },
      minimal: { accent: '#26766e', text: '#263238', muted: '#6b7777', serif: false },
    }[template.id] ?? { accent: '#2864dc', text: '#172033', muted: '#627086', serif: false };

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 52, bottom: 52, left: 54, right: 54 },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    const output = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    if (template.id === 'modern') {
      doc.save().rect(0, 0, doc.page.width, 170).fill(palette.accent).restore();
      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(27)
        .text(user.name, 54, 48, { width: pageWidth });
      doc
        .moveDown(0.3)
        .font('Helvetica')
        .fontSize(12)
        .fillColor('#e4edff')
        .text(profile?.headline || 'Professional profile');
      doc
        .moveDown(0.7)
        .fontSize(9)
        .fillColor('#ffffff')
        .text(
          [user.email, profile?.phone, profile?.location, profile?.website]
            .filter(Boolean)
            .join('  ·  '),
        );
      doc.y = 198;
    } else {
      doc
        .fillColor(palette.text)
        .font(palette.serif ? 'Times-Bold' : 'Helvetica-Bold')
        .fontSize(template.id === 'classic' ? 28 : 26)
        .text(user.name);
      doc
        .moveDown(0.25)
        .font(palette.serif ? 'Times-Italic' : 'Helvetica')
        .fontSize(12)
        .fillColor(palette.accent)
        .text(profile?.headline || 'Professional profile');
      doc
        .moveDown(0.45)
        .font('Helvetica')
        .fontSize(9)
        .fillColor(palette.muted)
        .text(
          [user.email, profile?.phone, profile?.location, profile?.website]
            .filter(Boolean)
            .join('  ·  '),
        );
      doc
        .moveDown(0.8)
        .strokeColor(palette.accent)
        .lineWidth(template.id === 'classic' ? 1.5 : 0.7)
        .moveTo(54, doc.y)
        .lineTo(doc.page.width - 54, doc.y)
        .stroke();
      doc.moveDown(0.8);
    }

    const heading = (title: string) => {
      doc
        .moveDown(0.75)
        .fillColor(palette.accent)
        .font(palette.serif ? 'Times-Bold' : 'Helvetica-Bold')
        .fontSize(12)
        .text(title.toUpperCase(), { characterSpacing: template.id === 'minimal' ? 1.2 : 0.4 });
      doc
        .moveDown(0.35)
        .fillColor(palette.text)
        .font(palette.serif ? 'Times-Roman' : 'Helvetica')
        .fontSize(10);
    };
    if (profile?.about) {
      heading('Profile');
      doc.text(profile.about, { lineGap: 3 });
    }
    if (profile?.experience) {
      heading('Experience');
      doc.text(profile.experience, { lineGap: 3 });
    }
    if (data.skills.length) {
      heading('Skills');
      doc.text(data.skills.join('  •  '), { lineGap: 3 });
    }
    if (data.projects.length) {
      heading('Projects');
      for (const project of data.projects) {
        doc
          .font(palette.serif ? 'Times-Bold' : 'Helvetica-Bold')
          .fontSize(10)
          .fillColor(palette.text)
          .text(project.title);
        doc
          .font(palette.serif ? 'Times-Roman' : 'Helvetica')
          .fontSize(9)
          .fillColor(palette.muted);
        if (project.description) doc.text(project.description, { lineGap: 2 });
        if (project.skills?.length) doc.text(`Skills: ${project.skills.join(', ')}`);
        if (project.link) doc.fillColor(palette.accent).text(project.link);
        doc.moveDown(0.55);
      }
    }
    if (data.education.length) {
      heading('Education');
      for (const item of data.education) {
        doc
          .font(palette.serif ? 'Times-Bold' : 'Helvetica-Bold')
          .fillColor(palette.text)
          .text(item.degree);
        doc
          .font(palette.serif ? 'Times-Roman' : 'Helvetica')
          .fontSize(9)
          .fillColor(palette.muted)
          .text([item.school, item.period].filter(Boolean).join('  ·  '));
        doc.moveDown(0.4);
      }
    }
    if (data.certificates.length) {
      heading('Certifications');
      for (const item of data.certificates) {
        doc
          .font(palette.serif ? 'Times-Bold' : 'Helvetica-Bold')
          .fillColor(palette.text)
          .text(item.name);
        doc
          .font(palette.serif ? 'Times-Roman' : 'Helvetica')
          .fontSize(9)
          .fillColor(palette.muted)
          .text([item.issuer, item.year].filter(Boolean).join('  ·  '));
        doc.moveDown(0.35);
      }
    }
    doc.end();
    return output;
  }

  private stringArray(value: unknown, maxItems: number, maxLength: number): string[] {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > maxItems)
      throw new BadRequestException('Invalid CV list.');
    return value
      .map((item) => {
        if (typeof item !== 'string' || item.length > maxLength)
          throw new BadRequestException('Invalid CV text.');
        return item.trim();
      })
      .filter(Boolean);
  }

  private objectArray(
    value: unknown,
    maxItems: number,
    fields: Record<string, number>,
  ): Record<string, any>[] {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > maxItems)
      throw new BadRequestException('Invalid CV section.');
    return value.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item))
        throw new BadRequestException('Invalid CV entry.');
      const result: Record<string, any> = {};
      for (const [key, maxLength] of Object.entries(fields)) {
        const field = (item as Record<string, unknown>)[key];
        if (key === 'skills') result[key] = this.stringArray(field, 30, maxLength);
        else {
          if (field !== undefined && (typeof field !== 'string' || field.length > maxLength))
            throw new BadRequestException(`Invalid CV ${key}.`);
          result[key] = typeof field === 'string' ? field.trim() : '';
        }
      }
      if (!result.title && !result.school && !result.name)
        throw new BadRequestException('CV entries need a title or name.');
      return result;
    });
  }
}
