import arcjet, { shield, detectBot } from '@arcjet/node';

const mode = process.env.NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN';

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({ mode }),
    detectBot({
      mode,
      allow: [
        'CATEGORY:SEARCH_ENGINE',
        'CATEGORY:PREVIEW',
      ],
    }),
  ],
});

export { mode as arcjetMode };
export default aj;
