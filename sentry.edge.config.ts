import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://ae1f526cf953a7cd636b5b3051eea259@o4511312166715392.ingest.us.sentry.io/4511312174186496',

  tracesSampleRate: 1,

  enableLogs: true,

  sendDefaultPii: true,
});
