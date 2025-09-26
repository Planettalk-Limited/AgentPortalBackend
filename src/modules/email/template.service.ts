import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface TemplateData {
  [key: string]: any;
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private templateCache = new Map<string, HandlebarsTemplateDelegate>();
  private partialsRegistered = false;

  constructor() {
    this.registerHelpers();
    this.registerPartials();
  }

  /**
   * Render an email template with data
   */
  async renderTemplate(templateName: string, data: TemplateData): Promise<string> {
    try {
      const template = await this.getTemplate(templateName);
      
      // Add common data
      const templateData = {
        ...data,
        currentYear: new Date().getFullYear(),
        showSupport: true,
        showSocial: false,
      };

      return template(templateData);
    } catch (error) {
      this.logger.error(`Failed to render template ${templateName}:`, error);
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Get compiled template (with caching)
   */
  private async getTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    const templatePath = path.join(process.cwd(), 'src', 'templates', 'email', `${templateName}.hbs`);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }

    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const layoutContent = await this.getLayout('base');
    
    // Wrap template content in layout
    const fullTemplate = layoutContent.replace('{{{body}}}', templateContent);
    const compiledTemplate = Handlebars.compile(fullTemplate);
    
    this.templateCache.set(templateName, compiledTemplate);
    return compiledTemplate;
  }

  /**
   * Get layout template
   */
  private async getLayout(layoutName: string): Promise<string> {
    const layoutPath = path.join(process.cwd(), 'src', 'templates', 'email', 'layouts', `${layoutName}.hbs`);
    
    if (!fs.existsSync(layoutPath)) {
      throw new Error(`Layout file not found: ${layoutPath}`);
    }

    return fs.readFileSync(layoutPath, 'utf8');
  }

  /**
   * Register Handlebars partials
   */
  private registerPartials(): void {
    if (this.partialsRegistered) return;

    const partialsPath = path.join(process.cwd(), 'src', 'templates', 'email', 'components');
    
    if (!fs.existsSync(partialsPath)) {
      this.logger.warn('Partials directory not found');
      return;
    }

    const partialFiles = fs.readdirSync(partialsPath).filter(file => file.endsWith('.hbs'));
    
    partialFiles.forEach(file => {
      const partialName = path.basename(file, '.hbs');
      const partialPath = path.join(partialsPath, file);
      const partialContent = fs.readFileSync(partialPath, 'utf8');
      
      Handlebars.registerPartial(partialName, partialContent);
      this.logger.log(`Registered partial: ${partialName}`);
    });

    this.partialsRegistered = true;
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    // Equality helper
    Handlebars.registerHelper('eq', function(a, b) {
      return a === b;
    });

    // Not equal helper
    Handlebars.registerHelper('neq', function(a, b) {
      return a !== b;
    });

    // Greater than helper
    Handlebars.registerHelper('gt', function(a, b) {
      return a > b;
    });

    // Less than helper
    Handlebars.registerHelper('lt', function(a, b) {
      return a < b;
    });

    // Format currency helper
    Handlebars.registerHelper('currency', function(amount, currency = 'USD') {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      });
      return formatter.format(amount);
    });

    // Format date helper
    Handlebars.registerHelper('formatDate', function(date, format = 'long') {
      if (!date) return '';
      
      const d = new Date(date);
      const options: Intl.DateTimeFormatOptions = {};
      
      switch (format) {
        case 'short':
          options.year = 'numeric';
          options.month = 'short';
          options.day = 'numeric';
          break;
        case 'long':
          options.year = 'numeric';
          options.month = 'long';
          options.day = 'numeric';
          break;
        case 'datetime':
          options.year = 'numeric';
          options.month = 'short';
          options.day = 'numeric';
          options.hour = '2-digit';
          options.minute = '2-digit';
          break;
        default:
          options.year = 'numeric';
          options.month = 'long';
          options.day = 'numeric';
      }
      
      return d.toLocaleDateString('en-US', options);
    });

    // Capitalize helper
    Handlebars.registerHelper('capitalize', function(str) {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // Upper case helper
    Handlebars.registerHelper('upper', function(str) {
      return str ? str.toUpperCase() : '';
    });

    // Lower case helper
    Handlebars.registerHelper('lower', function(str) {
      return str ? str.toLowerCase() : '';
    });

    // Conditional block helper
    Handlebars.registerHelper('if_eq', function(a, b, options) {
      if (a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    // Math helpers
    Handlebars.registerHelper('add', function(a, b) {
      return a + b;
    });

    Handlebars.registerHelper('subtract', function(a, b) {
      return a - b;
    });

    Handlebars.registerHelper('multiply', function(a, b) {
      return a * b;
    });

    Handlebars.registerHelper('divide', function(a, b) {
      return b !== 0 ? a / b : 0;
    });

    // Percentage helper
    Handlebars.registerHelper('percentage', function(value, total) {
      if (total === 0) return '0%';
      return Math.round((value / total) * 100) + '%';
    });

    this.logger.log('Handlebars helpers registered');
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache(): void {
    this.templateCache.clear();
    this.logger.log('Template cache cleared');
  }

  /**
   * Get available templates
   */
  getAvailableTemplates(): string[] {
    const templatesPath = path.join(process.cwd(), 'src', 'templates', 'email');
    
    if (!fs.existsSync(templatesPath)) {
      return [];
    }

    return fs.readdirSync(templatesPath)
      .filter(file => file.endsWith('.hbs') && !file.startsWith('_'))
      .map(file => path.basename(file, '.hbs'));
  }

  /**
   * Validate template exists
   */
  templateExists(templateName: string): boolean {
    const templatePath = path.join(process.cwd(), 'src', 'templates', 'email', `${templateName}.hbs`);
    return fs.existsSync(templatePath);
  }
}
