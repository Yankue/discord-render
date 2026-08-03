import { render } from '../src/index.js';

async function assertImageType(): Promise<Buffer> {
  return render({ content: 'hello' }, { format: 'image' });
}

async function assertHtmlType(): Promise<string> {
  return render({ content: 'hello' }, { format: 'html' });
}

void assertImageType;
void assertHtmlType;
