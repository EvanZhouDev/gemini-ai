import { describe, expect, it, vi } from 'vitest';
import { createGemini, Gemini } from '../src/index.js';
import * as fs from 'fs';

const ApiKey = 'demo-key';

const ExampleImage = fs.readFileSync(`${__dirname}/assets/test.jpg`);

const createFetchResponse = <T>(data: T) => Promise.resolve({ ok: true, status: 200, json: () => data });

const generateContentResponse: Gemini.AskResponse<'json'> = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: 'Hi!',
          },
        ],
        role: 'model',
      },
      finishReason: 'STOP',
      index: 0,
      safetyRatings: [
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          probability: 'NEGLIGIBLE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          probability: 'NEGLIGIBLE',
        },
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          probability: 'NEGLIGIBLE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          probability: 'NEGLIGIBLE',
        },
      ],
    },
  ],
  promptFeedback: {
    safetyRatings: [
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        probability: 'NEGLIGIBLE',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        probability: 'NEGLIGIBLE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        probability: 'NEGLIGIBLE',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        probability: 'NEGLIGIBLE',
      },
    ],
  },
};

const embedResponse: Gemini.EmbedCommandResponse = {
  embedding: {
    values: [
      0.014044438, -0.011704044, -0.018803535, -0.048892725, 0.022579819, -0.016828904, 0.011517917, -0.016417248,
      0.011250305, 0.011978445, 0.031157818, 0.025343899, -0.047962807, -0.063322045, -0.005137718, 0.008065381,
      -0.00017694874, 0.017470561, 0.013532051, -0.038209703, 0.037120644, 0.026667157, -0.017722601, -0.0010618581,
      0.030567544, -0.03298854, 0.024693856, -0.0370975, -0.01611108, 0.057226874, -0.05051742, 0.036884498,
      -0.047414415, 0.022458693, 0.040530328, -0.072351374, 0.02665654, 0.012197285, 0.000016500444, 0.02797742,
      0.010530767, -0.060864512, -0.04457948, -0.029662767, 0.076340064, 0.009669548, -0.0010741071, -0.0023528866,
      0.012694015, -0.079040535, 0.06463687, 0.026766198, 0.054658398, -0.030968785, -0.00001953755, -0.027745219,
      0.056554865, 0.036906246, -0.05513593, 0.0065768175, 0.01616738, -0.005334424, 0.009452938, 0.05314088,
      -0.000057788835, -0.031838022, -0.052407447, 0.05180814, 0.06213737, -0.04733165, 0.009995038, -0.03361987,
      0.02604144, -0.055180177, -0.0373175, -0.06338739, -0.028761469, 0.04601338, -0.018068837, 0.0042963596,
      -0.06271582, -0.045467824, -0.030648112, -0.029735725, -0.09404711, 0.025685286, -0.027763775, 0.038561326,
      -0.006864921, 0.06626557, 0.0010105363, -0.04073707, 0.024873924, -0.065746, -0.046836168, 0.028527575,
      -0.030801788, -0.016529603, -0.004603163, -0.058260962,
    ],
  },
};

const countResponse: Gemini.CountCommandResponse = { totalTokens: 2 };

vi.mock('../src/utils.js', async importOriginal => {
  const actual: object = await importOriginal();

  return {
    ...actual,
    _fetch: vi
      .fn()
      .mockReturnValueOnce(Promise.resolve({ ok: true, status: 200, json: () => generateContentResponse })),
  };
});

describe('Gemini - Test suite', () => {
  it('Fetch load default fetch mechanism', async () => {
    const gemini = createGemini(ApiKey);

    expect(await gemini.ask('Hello!')).toBe('Hi!');
  });

  it('Gemini.ask()', async () => {
    const fetch = vi.fn().mockReturnValueOnce(createFetchResponse(generateContentResponse));

    const gemini = createGemini(ApiKey, { fetch });
    expect(await gemini.ask('Hello!')).toBe('Hi!');
  });

  it('Gemini.ask() with Previous Messages', async () => {
    const fetch = vi.fn().mockReturnValueOnce(createFetchResponse(generateContentResponse));

    const gemini = createGemini(ApiKey, { fetch });

    expect(
      await gemini.ask('What does this show?', {
        format: Gemini.JSON,
        data: [ExampleImage],
        messages: [['Hi', 'Sup?']],
      }),
    ).toBe(generateContentResponse);
  });

  it('Gemini.ask() with Data', async () => {
    const fetch = vi.fn().mockReturnValueOnce(createFetchResponse(generateContentResponse));
    const gemini = createGemini(ApiKey, { fetch });

    expect(
      await gemini.ask('What does this show?', {
        format: Gemini.JSON,
        data: [ExampleImage],
      }),
    ).toBe(generateContentResponse);
  });

  it('Gemini.ask() with JSON Response', async () => {
    const fetch = vi.fn().mockReturnValueOnce(createFetchResponse(generateContentResponse));

    const gemini = createGemini(ApiKey, { fetch });

    expect(
      await gemini.ask('Hello!', {
        format: Gemini.JSON,
      }),
    ).toBe(generateContentResponse);
  });

  it('Gemini.embed()', async () => {
    const fetch = vi.fn().mockReturnValueOnce(createFetchResponse(embedResponse));

    const gemini = createGemini(ApiKey, { fetch });

    expect(await gemini.embed('Hello')).toBe(embedResponse.embedding.values);
  });

  it('Gemini.count()', async () => {
    const fetch = vi.fn().mockReturnValueOnce(createFetchResponse(countResponse));

    const gemini = createGemini(ApiKey, { fetch });

    expect(await gemini.count('Hi')).toBe(countResponse.totalTokens);
  });

  it('Gemini.createChat()', async () => {
    const fetch = vi.fn().mockReturnValueOnce(createFetchResponse(generateContentResponse));

    const gemini = createGemini(ApiKey, { fetch });
    const chat = gemini.createChat();

    expect(await chat.ask('Hello!')).toBe('Hi!');

    expect(chat.messages).toStrictEqual([
      {
        parts: [
          {
            text: 'Hello!',
          },
        ],
        role: 'user',
      },
      {
        parts: [
          {
            text: 'Hi!',
          },
        ],
        role: 'model',
      },
    ]);
  });

  it('Gemini.createChat() with JSON', async () => {
    const fetch = vi.fn().mockReturnValueOnce(createFetchResponse(generateContentResponse));

    const gemini = createGemini(ApiKey, { fetch });
    const chat = gemini.createChat();

    expect(await chat.ask('Hello!', { format: Gemini.JSON })).toBe(generateContentResponse);
  });
});
