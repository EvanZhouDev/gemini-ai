# Gemini AI

The easiest way to use Google's new powerful and versatile Gemini model.

## Quickstart

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

Read the full docs at https://github.com/EvanZhouDev/gemini-ai.

#### Table of Contents

- [**Getting an API Key**](https://github.com/EvanZhouDev/gemini-ai?tab=readme-ov-file#getting-an-api-key)
- [**Quickstart**](https://github.com/EvanZhouDev/gemini-ai?tab=readme-ov-file#quickstart)
- [**Documentation**](https://github.com/EvanZhouDev/gemini-ai?tab=readme-ov-file#documentation)
  - [Initialization](https://github.com/EvanZhouDev/gemini-ai?tab=readme-ov-file#inititalization)
  - [Method Patterns](https://github.com/EvanZhouDev/gemini-ai?tab=readme-ov-file#method-patterns)
  - [`Gemini.ask()` Method](https://github.com/EvanZhouDev/gemini-ai?tab=readme-ov-file#geminiask)
  - [`Gemini.count()` Method](https://github.com/EvanZhouDev/gemini-ai?tab=readme-ov-file#geminicount)
  - [`Gemini.embed()` Method](https://github.com/EvanZhouDev/gemini-ai?tab=readme-ov-file#geminiembed)
  - [`Gemini.createChat()` Method](https://github.com/EvanZhouDev/gemini-ai?tab=readme-ov-file#geminicreatechat)
- [**FAQ**](https://github.com/EvanZhouDev/gemini-ai?tab=readme-ov-file#faq)
