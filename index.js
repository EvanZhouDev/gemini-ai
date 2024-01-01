let fileTypeFromBuffer = (arrayBuffer) => {
    const uint8arr = new Uint8Array(arrayBuffer)

    const len = 4
    if (uint8arr.length >= len) {
        let signatureArr = new Array(len)
        for (let i = 0; i < len; i++)
            signatureArr[i] = (new Uint8Array(arrayBuffer))[i].toString(16)
        const signature = signatureArr.join('').toUpperCase()
        switch (signature) {
            case '89504E47':
                return 'image/png'
            case '47494638':
                return 'image/gif'
            case 'FFD8FFDB':
            case 'FFD8FFE0':
                return 'image/jpeg'
            default:
                throw new Error("Unknown file type. Please provide a .png, .gif, or .jpeg/.jpg file.")
        }
    }
    throw new Error("Unknown file type. Please provide a .png, .gif, or .jpeg/.jpg file.")
}

let answerPairToParameter = (message) => {
    if (message.length !== 2) {
        throw new Error("Message format must be an array of [user, model] pairs. See docs for more information.")
    }
    return [
        {
            parts: [
                { text: message[0] }
            ],
            role: "user"
        },
        {
            parts: [
                { text: message[1] }
            ],
            role: "model"
        }
    ]
}

export default class Gemini {
    #fetch;
    #dispatcher;

    static JSON = "json";
    static TEXT = "markdown"

    constructor(key, rawConfig = {}) {
        let defaultFetch;

        try {
            defaultFetch = fetch
        } catch { }

        let config = this.#parseConfig(rawConfig, {
            fetch: defaultFetch,
            dispatcher: undefined
        })

        if (!config.fetch) throw new Error("Fetch was not found in environment, and no polyfill was provided. Please install a polyfill, and put it in the `fetch` property of the Gemini configuration.")

        this.#fetch = config.fetch;
        this.key = key;
        this.#dispatcher = config.dispatcher
    }

    #parseConfig(raw = {}, defaults = {}) {
        let extras = Object.keys(raw).filter(item => !Object.keys(defaults).includes(item));
        if (extras.length) throw new Error(`These following configurations are not available on this function: ${extras.join(", ")}`)
        return { ...defaults, ...raw };
    }

    async #query(model, command, body) {
        const opts = {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            dispatcher: this.#dispatcher
        }


        const response = await this.#fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${command}?key=${this.key}`, opts);

        let json = await response.json()
        if (!response.ok) throw new Error("An error occurred when fetching Gemini: \n" + json.error.message);

        return json
    }

    async ask(message, rawConfig = {}) {
        const config = this.#parseConfig(rawConfig, {
            temperature: 1,
            topP: 0.8,
            topK: 10,
            format: Gemini.TEXT,
            maxOutputTokens: 800,
            model: undefined,
            data: [],
            messages: []
        })

        const body = {
            contents: [
                ...config.messages.flatMap(answerPairToParameter),
                {
                    parts: [
                        { text: message }
                    ],
                    role: "user"
                },
            ],
            generationConfig: {
                temperature: config.temperature,
                maxOutputTokens: config.maxOutputTokens,
                topP: config.topP,
                topK: config.topK,
            }
        }

        if (config.data.length) {
            for (let data of config.data) {
                body.contents.at(-1).parts.push({
                    inline_data: {
                        mime_type: fileTypeFromBuffer(data),
                        data: data.toString("base64")
                    }
                })
            }
        }

        const response = await this.#query(config.model || (config.data.length ? "gemini-pro-vision" : "gemini-pro"), "generateContent", body)

        if (response.promptFeedback.blockReason) {
            throw new Error("Your prompt was blocked by Google. Here is Gemini's feedback: \n" + JSON.stringify(response.promptFeedback, null, 4));
        }

        switch (config.format) {
            case Gemini.TEXT:
                return response.candidates[0].content.parts[0].text
            case Gemini.JSON:
                return response;
            default:
                throw new Error(`${config.format} is not a valid format. Use Gemini.TEXT or Gemini.JSON.`)
        }
    }

    async count(message, rawConfig = {}) {
        let config = this.#parseConfig(rawConfig, {
            model: "gemini-pro"
        })

        let body = {
            contents: [{
                parts: [
                    { text: message }
                ],
                role: "user"
            }],
        }

        let response = await this.#query(config.model, "countTokens", body)

        return response.totalTokens;
    }

    async embed(message, rawConfig = {}) {
        let config = this.#parseConfig(rawConfig, {
            model: "embedding-001"
        })

        let body = {
            model: `models/${config.model}`,
            content: {
                parts: [
                    { text: message }
                ],
                role: "user"
            },
        }

        let response = await this.#query(config.model, "embedContent", body)

        return response.embedding.values;
    }

    createChat(rawChatConfig) {
        class Chat {
            constructor(gemini, rawConfig = {}) {
                this.gemini = gemini;
                this.config = this.gemini.#parseConfig(rawConfig, {
                    messages: [],
                    temperature: 1,
                    topP: 0.8,
                    topK: 10,
                    model: "gemini-pro",
                    maxOutputTokens: 800,
                })
                this.messages = this.config.messages.flatMap(answerPairToParameter);
            }


            async ask(message, rawConfig) {
                let config = {
                    ...this.config,
                    ...this.gemini.#parseConfig(rawConfig, {
                        format: Gemini.TEXT,
                        data: [],
                    })
                }

                if (this.messages.at(-1)?.role === "user") {
                    throw new Error("Please ensure you are running chat commands asynchronously. You cannot send 2 messages at the same time in the same chat. Use standard Gemini.ask() for this.")
                }

                let currentMessage = {
                    parts: [
                        { text: message }
                    ],
                    role: "user"
                }

                if (config.data.length) {
                    console.error("It is currently not supported by Google to use non-text data with the chat function. If this feature has been added, please submit an Issue.");
                    // this.config.model = "gemini-pro-vision";
                    // for (let data of config.data) {
                    //     currentMessage.parts.push({
                    //         inline_data: {
                    //             mime_type: (fileTypeFromBuffer(data)).mime,
                    //             data: data.toString("base64")
                    //         }
                    //     })
                    // }
                }

                this.messages.push(currentMessage)

                let body = {
                    contents: [this.messages],
                    generationConfig: {
                        temperature: config.temperature,
                        maxOutputTokens: config.maxOutputTokens,
                        topP: config.topP,
                        topK: config.topK,
                    }
                }

                let response = await this.gemini.#query(config.model || (config.data.length ? "gemini-pro-vision" : "gemini-pro"), "generateContent", body)

                if (response.promptFeedback.blockReason) {
                    this.messages.pop();
                    throw new Error("Your prompt was blocked by Google. Here is Gemini's feedback: \n" + JSON.stringify(response.promptFeedback, null, 4));
                }

                this.messages.push(response.candidates[0].content)

                switch (config.format) {
                    case Gemini.TEXT:
                        return response.candidates[0].content.parts[0].text
                    case Gemini.JSON:
                        return response;
                    default:
                        throw new Error(`${config.format} is not a valid format. Use Gemini.TEXT or Gemini.JSON.`)
                }
            }
        }

        return (new Chat(this, rawChatConfig));
    }
}