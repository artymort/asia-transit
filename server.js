import { createApp } from './src/app.js';

const port = Number(process.env.PORT || 4173);
const app = createApp();

app.listen(port, '0.0.0.0', () => {
  console.log(`DK AUTO: http://127.0.0.1:${port}`);
});
