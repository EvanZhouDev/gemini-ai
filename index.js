import { fileTypeFromBuffer } from 'file-type';

export class Gemini {
    #fetch;

    static JSON = "json";
    static TEXT = "markdown"

    constructor(key, rawConfig = {}) {
        let defaultFetch;

        try {
            defaultFetch = fetch
        } catch { }

        let config = this.#parseConfig(rawConfig, {
            fetch: defaultFetch,
        })

        if (!config.fetch) throw new Error("Fetch was not found in environment, and no polyfill was provided. Please install a polyfill, and put it in the `fetch` property of the Gemini configuration.")

        this.#fetch = config.fetch;
        this.key = key;
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
            body: JSON.stringify(body)
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
            data: undefined,
        })

        const body = {
            contents: [{
                parts: [
                    { text: message }
                ],
                role: "user"
            }],
            generationConfig: {
                temperature: config.temperature,
                maxOutputTokens: config.maxOutputTokens,
                topP: config.topP,
                topK: config.topK,
            }
        }

        if (config.data) {
            body.contents.at(-1).parts.push({
                inline_data: {
                    mime_type: (await fileTypeFromBuffer(config.data)).mime,
                    data: config.data.toString("base64")
                }
            })
        }

        const response = await this.#query(config.model || (config.data ? "gemini-pro-vision" : "gemini-pro"), "generateContent", body)

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
            contents: [{
                parts: [
                    { text: message }
                ],
                role: "user"
            }],
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
                this.messages = this.config.messages
            }

            async ask(message, rawConfig) {
                let config = {
                    ...this.config,
                    ...this.gemini.#parseConfig(rawConfig, {
                        format: Gemini.TEXT,
                        data: undefined,
                    })
                }

                let currentMessage = {
                    parts: [
                        { text: message }
                    ],
                    role: "user"
                }

                if (config.data) {
                    console.error("It is currently not supported by Google to use non-text data with the chat function. If this feature has been added, please submit an Issue.");
                    // this.config.model = "gemini-pro-vision";
                    // currentMessage.parts.push({
                    //     inline_data: {
                    //         mime_type: (await fileTypeFromBuffer(config.data)).mime,
                    //         data: config.data.toString("base64")
                    //     }
                    // })
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

                let response = await this.gemini.#query(config.model || (config.data ? "gemini-pro-vision" : "gemini-pro"), "generateContent", body)

                this.messages.push(response.candidates[0].content)
                console.log(this.messages);

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