import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import fastifyPassport from '@fastify/passport';
import fastifySecureSession from '@fastify/secure-session';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';

async function bootstrap() {
  if (!process.env.API_JWT_SECRET) {
    throw new Error('API_JWT_SECRET env var is required');
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  await app.register(fastifyCookie as any);
  await app.register(fastifyMultipart as any, { limits: { fileSize: 2 * 1024 * 1024 * 1024 } });
  await app.register(fastifySecureSession as any, {
    key: Buffer.from(process.env.API_JWT_SECRET.padEnd(32).slice(0, 32)),
    salt: 'railcross-salt!!',
    cookie: { path: '/', httpOnly: true },
  });
  await app.register(fastifyPassport.initialize() as any);
  await app.register(fastifyPassport.secureSession() as any);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.get(AuthService).ensureSuperAdmin();

  const config = new DocumentBuilder()
    .setTitle('railcross-watch API')
    .setDescription('API do monitorowania przejazdów kolejowych')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  if (process.env.NODE_ENV !== 'production') {
    app.getHttpAdapter().get('/api/openapi.json', (_req, res) => {
      res.header('Content-Type', 'application/json');
      res.send(JSON.stringify(document));
    });

    app.getHttpAdapter().get('/api/docs', (_req, res) => {
      res.header('Content-Type', 'text/html');
      res.send(`<!doctype html>
<html>
  <head>
    <title>railcross-watch API</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/api/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`);
    });
  }

  await app.listen(3001, '::');
}
bootstrap();
