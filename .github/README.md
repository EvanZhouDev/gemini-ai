<picture>

  <source media="(prefers-color-scheme: dark)" srcset="../assets/banner@dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="../assets/banner@light.svg">
  <img alt="Gemini AI Banner" src="../assets/banner@light.svg">
</picture>
<p align="center">
  <a aria-label="NPM Version" href="https://www.npmjs.com/package/palm-api">
    <img alt="" src="https://img.shields.io/npm/v/gemini-ai.svg?label=NPM&logo=npm&style=for-the-badge&color=0470FF&logoColor=white">
  </a>
  <a aria-label="NPM Download Count" href="https://www.npmjs.com/package/palm-api">
    <img alt="" src="https://img.shields.io/npm/dt/gemini-ai?label=Downloads&style=for-the-badge&color=67ACF3">
  </a>
  <a aria-label="palm-api Size" href="https://www.npmjs.com/package/palm-api">
    <img alt="" src="https://img.shields.io/bundlephobia/minzip/gemini-ai?style=for-the-badge&color=F9DBBC">
  </a>
</p>
<p align="center">
  <a href="#documentation">Docs</a> | <a href="https://github.com/evanzhoudev/palm-api">GitHub</a> | <a href="#frequently-asked-questions">FAQ</a>
</p>

## Features

- 🌎 [**Multimodal**](#documentation): Interact with text, images, and more.
- 🌐 [**Contextual Conversations**](#palmcreatechat): Chat with Gemini, built in.
- 🧪 [**Parameter**](#config-1): Easily modify `temperature`, `topP`, and more

### Highlights

Gemini AI v1.0 compared to Google's [own API](https://www.npmjs.com/package/@google/generative-ai)

- ⚡ [**Native REST API**](#NEEDED): Have simplicity without compromises
- 🚀 [**Easy**](#NEEDED): Auto model selection based on context
- 🎯 [**Concise**](#NEEDED): _**4x**_ less code needed

### Getting an API Key

1. Go to [Google Makersuite](https://makersuite.google.com)
2. Click "Get API key" at the top, and follow the steps to get your key
3. Copy this key, and use it below when `API_KEY` is mentioned.

> [!CAUTION]
> Do not share this key with other people! It is recommended to store it in a `.env` file.

### Quickstart

Make a text request (`gemini-pro`):

```javascript
import Gemini from "gemini-ai";

const gemini = new Gemini(API_KEY);

console.log(await gemini.ask("Hi!"));
```

Chat with Gemini (`gemini-pro`):

```javascript
import fs from "fs";

const gemini = new Gemini(API_KEY);
const chat = gemini.createChat();

console.log(await chat.ask("Hi!"));
console.log(await chat.ask("What's the last thing I said?"));
```

#### Other useful features

<details>
<summary>Make a text request with images (<code>gemini-pro-vision</code>):</summary>
<br>

```javascript
import fs from "fs";
import Gemini from "gemini-ai";

const gemini = new Gemini(API_KEY);

console.log(
	gemini.ask("What's this show?", {
		data: [fs.readFileSync("./test.png")],
	})
);
```

</details>

<details>
<summary>Make a text request with custom parameters (<code>gemini-pro</code>):</summary>
<br>

```javascript
import Gemini from "gemini-ai";

const gemini = new Gemini(API_KEY);

console.log(
	gemini.ask("Hello!", {
		temperature: 0.5,
		topP: 1,
		topK: 10,
	})
);
```

</details>

<details>
<summary>Embed Text (<code>`embedding-001`</code>):</summary>
<br>

```javascript
import fs from "fs";

const gemini = new Gemini(API_KEY);

gemini.embed("Hi!");
```

</details>

### Documentation

#### Inititalization

To start any project, include the following lines:

```javascript
// Import Gemini AI
import Gemini from "gemini-ai";

// Initialize your key
const gemini = new Gemini(API_KEY);
```

#### Method Patterns

All model calling methods have a main parameter first (typically the text as input), and a `config` second, as a JSON. A detailed list of all config can be found along with the method. An example call of a function may look like this:

```javascript
gemini.ask("Hi!", {
	// Config
	temperature: 0.5,
	topP: 1,
	topK: 10,
});
```

> [!NOTE]  
> All methods are async! This means you should call them something like this: `await gemini.ask(...)`

Note that the output to `Gemini.JSON` varies depending on the model and command, and is not documented here in detail due to the fact that it is unnecessary to use in most scenarios. You can find more information about the REST API's raw output [here](https://ai.google.dev/tutorials/rest_quickstart).

#### `Gemini.ask()`

This method uses the `generateContent` command to get Gemini's response to your input.

Config available:
| Field Name | Description | Default Value |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `format` | Whether to return the detailed, raw JSON output. Typically not recommended, unless you are an expert. Can either be `Gemini.JSON` or `Gemini.TEXT` | `Gemini.TEXT` |
| `topP` | See [Google's parameter explanations](https://cloud.google.com/vertex-ai/docs/generative-ai/start/quickstarts/api-quickstart#parameter_definitions) | `0.8` |
| `topK` | See [Google's parameter explanations](https://cloud.google.com/vertex-ai/docs/generative-ai/start/quickstarts/api-quickstart#parameter_definitions) | `10` |
| `temperature` | See [Google's parameter explanations](https://cloud.google.com/vertex-ai/docs/generative-ai/start/quickstarts/api-quickstart#parameter_definitions) | `1` |
| `model` | Which model to use. Can be any model Google has available, but certain features are not available on some models. Currently: `gemini-pro` and `gemini-pro-vision` | Automatic based on Context |
| `maxOutputTokens` | Max tokens to output | `800` |
| `data` | Max tokens to output | `800` |
| `messages` | Array of `[userInput, modelOutput]` pairs to show how the bot is supposed to behave | `[]` |
| `data` | An array of `Buffer`s to input to the model. Automatically toggles model to `gemini-pro-vision` | `[]` |

Example Usage:

```javascript
import Gemini from "gemini-ai";

const gemini = new Gemini(API_KEY);

console.log(
	gemini.ask("Hello!", {
		temperature: 0.5,
		topP: 1,
		topK: 10,
	})
);
```

#### `Gemini.count()`

This method uses the `countTokens` command to figure out the number of tokens _in your input_.

Config available:
| Field Name | Description | Default Value |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `model` | Which model to use. Can be any model Google has available, but reasonably must be `gemini-pro` | Automatic based on Context |

Example Usage:

```javascript
import Gemini from "gemini-ai";

const gemini = new Gemini(API_KEY);

console.log(gemini.count("Hello!"));
```

#### `Gemini.embed()`

This method uses the `embedContent` command (currently **only on `embedding-001`**) to generate an embedding matrix for your input.

Config available:
| Field Name | Description | Default Value |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `model` | Which model to use. Can be any model Google has available, but reasonably must be `embedding-001` | `embedding-001` |

Example Usage:

```javascript
import Gemini from "gemini-ai";

const gemini = new Gemini(API_KEY);

console.log(gemini.embed("Hello!"));
```
