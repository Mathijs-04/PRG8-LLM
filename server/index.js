import express from 'express';
import cors from 'cors';
import {AzureChatOpenAI} from "@langchain/openai";
import {HumanMessage, SystemMessage, AIMessage} from "@langchain/core/messages";

const app = express();
const port = 8000;

const model = new AzureChatOpenAI({temperature: 0.5});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.post('/question', async (req, res) => {
    const {system, messages} = req.body;

    try {
        const formattedMessages = [
            new SystemMessage(system),
            ...messages.map((msg) =>
                msg.role === 'human'
                    ? new HumanMessage(msg.content)
                    : new AIMessage(msg.content)
            ),
        ];

        const stream = await model.stream(formattedMessages);
        res.setHeader('Content-Type', 'text/plain');

        for await (const chunk of stream) {
            res.write(chunk.content);
            await new Promise((resolve) => setTimeout(resolve, 50));
        }

        res.end();
    } catch (error) {
        console.error('Error during streaming:', error);
        res.status(500).send('An error occurred while streaming.');
    }
});

app.listen(port, () => {
    console.log(`Server is listening on http://localhost:${port}`);
});
