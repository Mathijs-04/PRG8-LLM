import express from 'express';
import cors from 'cors';
import {AzureChatOpenAI} from "@langchain/openai";
import {HumanMessage, SystemMessage} from "@langchain/core/messages";

const app = express();
const port = 8000;

const model = new AzureChatOpenAI({temperature: 0.5});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.post('/question', async (req, res) => {
    const question = req.body.question;
    const messages = [
        new SystemMessage("You are very smart"),
        new HumanMessage(question)
    ]
    const chat = await model.invoke(messages);
    const cleanedAnswer = chat.content.replace(/\n/g, ' ');
    res.json({
        answer: cleanedAnswer
    });
});

app.post('/joke', async (req, res) => {
    const chat = await model.invoke("Can you tell me a joke?");
    const cleanedJoke = chat.content.replace(/\n/g, ' ');
    res.json({
        joke: cleanedJoke
    });
});

app.listen(port, () => {
    console.log(`Server is listening on http://localhost:${port}`);
});
