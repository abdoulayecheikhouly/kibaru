import fs from 'node:fs/promises';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
const result = await postcss([tailwind()]).process(await fs.readFile('src/styles.css', 'utf8'), {
  from: 'src/styles.css',
});
await fs.writeFile('src/generated-styles.css', result.css);
