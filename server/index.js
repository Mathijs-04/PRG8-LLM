import express from 'express';
import cors from 'cors';
import { AzureChatOpenAI, AzureOpenAIEmbeddings } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { FaissStore } from "@langchain/community/vectorstores/faiss";

const app = express();
const port = 8000;

let vectorStore;

const model = new AzureChatOpenAI({ temperature: 0.5 });
const embeddings = new AzureOpenAIEmbeddings({
    temperature: 0,
    azureOpenAIApiEmbeddingsDeploymentName: process.env.AZURE_EMBEDDING_DEPLOYMENT_NAME,
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Run once for every datasource
// const loader = new TextLoader("./public/example.txt");
// const docs = await loader.load();
// const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 100, chunkOverlap: 50 });
// const splitDocs = await textSplitter.splitDocuments(docs);
// console.log(`Document split into ${splitDocs.length} chunks. Now saving into vector store`);
// vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings);
// await vectorStore.save("./vectordatabase");

app.post('/question', async (req, res) => {
    try {
        vectorStore = await FaissStore.load("./vectordatabase", embeddings);
        const relevantDocs = await vectorStore.similaritySearch("Get your data from this source", 5);
        const context = relevantDocs.map(doc => doc.pageContent).join("\n\n");
        const { system, messages } = req.body;

        const systemMessage = `Only use information from the ${context} datasource, answer in English. Do not use answers which are not included in the datasource.`;
        const formattedMessages = [
            new SystemMessage(systemMessage),
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
