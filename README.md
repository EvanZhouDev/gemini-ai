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