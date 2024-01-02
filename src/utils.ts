import type { FileType, Message } from './types.js';

export const errors = {
  invalidRole:
    'Please ensure you are running chat commands asynchronously. You cannot send 2 messages at the same time in the same chat. Use standard Gemini.ask() for this.',
  unsupportedData:
    'It is currently not supported by Google to use non-text data with the chat function. If this feature has been added, please submit an Issue.',
  missingFetch:
    'Fetch was not found in environment, and no polyfill was provided. Please install a polyfill, and put it in the `fetch` property of the Gemini configuration.',
  fetchError: (response: Response) => `There was an HTTP error when fetching Gemini. HTTP status: ${response.status}`,
  streamError: 'There was an error when streaming Gemini',
  invalidMessagePair: 'Message format must be an array of [user, model] pairs. See docs for more information.',
  unsupportedFileType: 'Unknown file type. Please provide a .png, .gif, or .jpeg/.jpg file.',
  blocked: (feedback: object) =>
    `Your prompt was blocked by Google. Here is Gemini's feedback:\n${JSON.stringify(feedback, null, 4)}`,
  invalidFormat: (format: string) => `${format} is not a valid format. Use Gemini.TEXT or Gemini.JSON.`,
};

export let _fetch: typeof fetch;
try {
  _fetch = fetch;
} catch {
  console.warn(errors.missingFetch);
}

export const fileTypeFromBuffer = (buffer: ArrayBuffer): FileType => {
  const array = new Uint8Array(buffer);

  const length = 4;
  if (array.length < length) throw Error(errors.unsupportedFileType);

  let signatureBuffer = new Array(length);
  for (let i = 0; i < length; ++i) signatureBuffer[i] = array[i].toString(16);

  const signature = signatureBuffer.join('').toUpperCase();

  switch (signature) {
    case '89504E47':
      return 'image/png';
    case '47494638':
      return 'image/gif';
    case 'FFD8FFDB':
    case 'FFD8FFE0':
      return 'image/jpeg';
    default:
      throw Error(errors.unsupportedFileType);
  }
};

export const answerPairToParameter = ([user, model]: [string, string]): [Message, Message] => {
  if (user === undefined || model === undefined) throw Error(errors.invalidMessagePair);

  return [
    { parts: [{ text: user }], role: 'user' },
    { parts: [{ text: model }], role: 'model' },
  ];
};
