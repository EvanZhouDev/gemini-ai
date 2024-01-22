import { _fetch, answerPairToParameter, errors, fileTypeFromBuffer } from './utils.js';
import type { Candidate, Command, Format, Message, Model, PromptFeedback } from './types.js';
import type { Dispatcher } from 'undici';

export class Chat {
  gemini: Gemini;
  configuration: Chat.Configuration;
  messages: Message[];

  constructor(gemini: Gemini, configuration?: Partial<Chat.Configuration>) {
    this.gemini = gemini;
    this.configuration = {
      messages: configuration?.messages ?? [],
      temperature: configuration?.temperature ?? 1,
      topP: configuration?.topP ?? 0.8,
      topK: configuration?.topK ?? 10,
      model: configuration?.model ?? 'gemini-pro',
      maxOutputTokens: configuration?.maxOutputTokens ?? 800,
    };
    this.messages = this.configuration.messages.flatMap(answerPairToParameter);
  }

  async ask<F extends Format = typeof Gemini.TEXT>(
    message: string,
    options?: Partial<Chat.AskOptions<F>>,
  ): Promise<Gemini.AskResponse<F>> {
    if (this.messages[this.messages.length - 1]?.role === 'user') throw Error(errors.invalidRole);

    const configuration: Chat.Configuration & Chat.AskOptions<F> = {
      ...this.configuration,
      model: this.configuration?.model ?? options?.data?.length ? 'gemini-pro-vision' : 'gemini-pro',
      format: options?.format ?? (Gemini.TEXT as F),
      data: options?.data ?? [],
      stream: options?.stream,
    };

    if (configuration.data.length) console.error(errors.unsupportedData);

    this.messages.push({ parts: [{ text: message }], role: 'user' });

    const body = {
      contents: this.messages,
      generationConfig: {
        maxOutputTokens: configuration.maxOutputTokens,
        temperature: configuration.temperature,
        topP: configuration.topP,
        topK: configuration.topK,
      },
    };

    if (configuration.stream) {
      let finalJSON: Gemini.AskCommandResponse = {} as Gemini.AskCommandResponse;

      await this.gemini.queryStream(
        configuration.model || (configuration.data.length ? 'gemini-pro-vision' : 'gemini-pro'),
        'streamGenerateContent',
        body,
        streamContent => {
          finalJSON = streamContent;

          if (streamContent.promptFeedback?.blockReason) {
            this.messages.pop();
            throw Error(errors.blocked(streamContent.promptFeedback));
          }

          configuration.stream!(this.gemini.handleAskFormat(configuration.format, streamContent));
        },
      );

      this.messages.push(finalJSON.candidates[0].content);

      return this.gemini.handleAskFormat(configuration.format, finalJSON);
    }
    const response = await this.gemini.queryJSON(configuration.model, 'generateContent', body);

    if (response.promptFeedback.blockReason) {
      this.messages.pop();
      throw Error(errors.blocked(response.promptFeedback));
    }

    this.messages.push(response.candidates[0].content);

    return this.gemini.handleAskFormat(configuration.format, response) as Gemini.AskResponse<F>;
  }
}

export namespace Chat {
  export interface Configuration {
    messages: [string, string][];
    temperature: number;
    topP: number;
    topK: number;
    model: Model;
    maxOutputTokens: number;
  }

  export interface AskOptions<F extends Format> {
    format: F;
    data: ArrayBuffer[];

    stream?(stream: Gemini.AskResponse<F>): void;
  }
}

export class Gemini {
  fetch: typeof fetch;
  key: string;
  dispatcher?: Dispatcher;

  static JSON: Format = 'json';
  static TEXT: Format = 'markdown';

  constructor(key: string, configuration?: Partial<Gemini.Configuration>) {
    this.fetch = configuration?.fetch ?? _fetch;
    if (!this.fetch) throw Error(errors.missingFetch);
    this.key = key;
    this.dispatcher = configuration?.dispatcher ?? undefined;
  }

  handleAskFormat<F extends Format>(format: F, response: Gemini.AskCommandResponse): Gemini.AskResponse<F> {
    switch (format) {
      case Gemini.TEXT:
        return response.candidates[0].content.parts[0].text as Gemini.AskResponse<F>;
      case Gemini.JSON:
        return response as Gemini.AskResponse<F>;
      default:
        throw Error(errors.invalidFormat(format));
    }
  }

  async query<C extends Command>(model: Model, command: C, body: Gemini.ResponseBodyMap[C]): Promise<Response> {
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      dispatcher: this.dispatcher,
    };

    const response = await this.fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:${command}?key=${this.key}`,
      options,
    );

    if (!response.ok) throw Error(errors.fetchError(response));

    return response;
  }

  async queryJSON<C extends Command>(
    model: Model,
    command: C,
    body: Gemini.ResponseBodyMap[C],
  ): Promise<Gemini.QueryCommandMap[C]> {
    const response = await this.query(model, command, body);

    return await response.json();
  }

  async queryStream<C extends Command>(
    model: Model,
    command: C,
    body: Gemini.ResponseBodyMap[C],
    streamFn: (json: Gemini.QueryCommandMap[C]) => void,
  ) {
    const response = await this.query(model, command, body);
    if (!response.body) throw Error(errors.fetchError(response));

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let jsonString = '';
    let json;

    await reader.read().then(function processText({ done, value }) {
      if (done) return;

      jsonString += decoder.decode(value, { stream: true });

      try {
        const parsedJSON = JSON.parse(`${jsonString}]`);
        json = { ...json, ...parsedJSON[parsedJSON.length - 1] };
        streamFn(json);
      } catch {
        console.warn(errors.streamError);
      }

      return reader.read().then(processText);
    });
  }

  async ask<F extends Format = typeof Gemini.TEXT>(
    message: string,
    options?: Partial<Gemini.AskOptions<F>>,
  ): Promise<Gemini.AskResponse<F>> {
    const config = {
      temperature: options?.temperature ?? 1,
      topP: options?.topP ?? 0.8,
      topK: options?.topK ?? 10,
      format: options?.format ?? Gemini.TEXT,
      maxOutputTokens: options?.maxOutputTokens ?? 800,
      model: options?.model ?? options?.data?.length ? 'gemini-pro-vision' : 'gemini-pro',
      data: options?.data ?? [],
      messages: options?.messages ?? [],
      stream: options?.stream,
    };

    const contents: Message[] = config.messages.flatMap(answerPairToParameter);
    contents.push({ parts: [{ text: message }], role: 'user' });

    const body: Gemini.ResponseBodyMap['generateContent'] = {
      contents,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
        topP: config.topP,
        topK: config.topK,
      },
    };

    if (config.data.length) {
      for (const data of config.data) {
        body.contents[body.contents.length - 1].parts.push({
          inline_data: { mime_type: fileTypeFromBuffer(data), data: data.toString('base64') },
        });
      }
    }

    if (config.stream) {
      let finalJSON: Gemini.AskCommandResponse = undefined!;

      await this.queryStream(config.model, 'streamGenerateContent', body, content => {
        if (!finalJSON) finalJSON = content;
        else finalJSON.candidates[0].content.parts[0].text += content.candidates[0].content.parts[0].text;

        if (content.promptFeedback.blockReason) throw Error(errors.blocked(response.promptFeedback));

        config.stream!(this.handleAskFormat(config.format as F, content));
      });

      return this.handleAskFormat<F>(config.format as F, finalJSON);
    }

    const response = await this.queryJSON(config.model, 'generateContent', body);

    if (response.promptFeedback.blockReason) throw Error(errors.blocked(response.promptFeedback));

    return this.handleAskFormat(config.format, response) as Gemini.AskResponse<F>;
  }

  async count(message: string, options?: Partial<Gemini.CountOptions>): Promise<Gemini.CountResponse> {
    const model = options?.model ?? 'gemini-pro';

    const response = await this.queryJSON(model, 'countTokens', {
      contents: [{ parts: [{ text: message }], role: 'user' }],
    });

    return response.totalTokens;
  }

  async embed(message: string, options?: Partial<Gemini.EmbedOptions>): Promise<Gemini.EmbedResponse> {
    const model = options?.model ?? 'embedding-001';

    const response = await this.queryJSON(model, 'embedContent', {
      content: { parts: [{ text: message }], role: 'user' },
      model: `models/${model}`,
    });

    return response.embedding.values;
  }

  createChat(configuration?: Chat.Configuration): Chat {
    return new Chat(this, configuration);
  }
}

export namespace Gemini {
  export type AskOptions<F extends Format> = {
    temperature: number;
    topP: number;
    topK: number;
    format: F;
    maxOutputTokens: number;
    model: Model;
    data: Buffer[];
    messages: [string, string][];
    stream?(stream: AskResponse<F>): void;
  };
  export type AskResponse<F extends Format> = F extends typeof Gemini.JSON ? AskCommandResponse : string;
  export type AskCommandResponse = { candidates: Candidate[]; promptFeedback: PromptFeedback };

  export type EmbedOptions = { model: Model };
  export type EmbedCommandResponse = {
    embedding: { values: number[] };
  };
  export type EmbedResponse = number[];

  export type CountOptions = { model: Model };
  export type CountCommandResponse = {
    totalTokens: number;
  };
  export type CountResponse = number;

  export type QueryCommandMap = {
    streamGenerateContent: AskCommandResponse;
    generateContent: AskCommandResponse;
    embedContent: EmbedCommandResponse;
    countTokens: CountCommandResponse;
  };

  export type ResponseBodyMap = {
    streamGenerateContent: {
      contents: Message[];
      generationConfig: {
        maxOutputTokens: number;
        temperature: number;
        topP: number;
        topK: number;
      };
    };
    generateContent: {
      contents: Message[];
      generationConfig: {
        maxOutputTokens: number;
        temperature: number;
        topP: number;
        topK: number;
      };
    };
    countTokens: { contents: Message[] };
    embedContent: { model: Model; content: Message };
  };

  export interface Configuration {
    fetch: typeof fetch;
    dispatcher: Dispatcher;
  }
}

export const createGemini = (key: string, configuration?: Partial<Gemini.Configuration>): Gemini =>
  new Gemini(key, configuration);

export default Gemini;
