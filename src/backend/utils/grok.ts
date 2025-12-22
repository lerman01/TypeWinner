import {Groq} from 'groq-sdk';
import {paths} from "./commons";
import fs from "fs";

export const apiKeyPath = `${paths.config}/grokKey`

let groq: Groq;

export const initGroq = (apiKey: string) => {
    groq = new Groq({apiKey});
}

if (fs.existsSync(apiKeyPath)) {
    initGroq(fs.readFileSync(apiKeyPath, 'utf-8'))
}

export const getTextFromImg = async (img: Buffer) => {
    if (!groq) return null
    const base64String = img.toString('base64');

    const chatCompletion = await groq.chat.completions.create({
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `Write me the text in the image,
return the following JSON: {"text": ""}`,
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/png;base64,${base64String}`,
                        },
                    },
                ],
            },
        ],
        response_format: {
            type: 'json_object'
        },
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        stream: false,
    });
    return JSON.parse(chatCompletion?.choices?.[0]?.message?.content ?? "{}")?.text as string ?? ""
}