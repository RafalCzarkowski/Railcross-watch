import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  const config = new DocumentBuilder()
    .setTitle('railcross-watch API')
    .setDescription('API do monitorowania przejazdów kolejowych')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Endpoint z OpenAPI JSON
  app.getHttpAdapter().get('/api/openapi.json', (_req, res) => {
    res.header('Content-Type', 'application/json');
    res.send(JSON.stringify(document));
  });

  // Scalar UI serwowane przez CDN
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

  await app.listen(3001, '0.0.0.0');
}
bootstrap();