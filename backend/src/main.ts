import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.getHttpAdapter().getInstance().use(express.json({ limit: '5mb' }));
  app.enableCors({ origin: true });

  if (process.env['NODE_ENV'] === 'production') app.setGlobalPrefix('api');

  const staticDir = process.env['STATIC_DIR'];
  if (staticDir && existsSync(join(staticDir, 'index.html'))) {
    const server = app.getHttpAdapter().getInstance();
    server.use(express.static(staticDir));
    server.use((request: express.Request, response: express.Response, next: express.NextFunction) => {
      const isApiRequest = request.path === '/api' || request.path.startsWith('/api/');
      const isSocketRequest = request.path === '/socket.io' || request.path.startsWith('/socket.io/');
      if (request.method === 'GET' && !isApiRequest && !isSocketRequest && request.accepts('html')) {
        response.sendFile(join(staticDir, 'index.html'));
        return;
      }
      next();
    });
  }

  const port = Number(process.env['PORT'] ?? 3000);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
