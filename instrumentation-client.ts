import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://ae1f526cf953a7cd636b5b3051eea259@o4511312166715392.ingest.us.sentry.io/4511312174186496',

  integrations: [Sentry.replayIntegration()],

  tracesSampleRate: 1,
  enableLogs: true,

  replaysSessionSampleRate: 0.1,

  replaysOnErrorSampleRate: 1.0,

  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
