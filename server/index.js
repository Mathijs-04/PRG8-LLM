import express from 'express';
import cors from 'cors';
import { AzureChatOpenAI, AzureOpenAIEmbeddings } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { FaissStore } from '@langchain/community/vectorstores/faiss';

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

const processPDF = async () => {
    try {
        console.log('Starting PDF processing...');

        const loader = new PDFLoader('./public/5e.pdf', { splitPages: false });

        console.log('Loading PDF...');
        const docs = await loader.load();

        console.log(`Original document loaded with ${docs.length} pages`);

        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        console.log('Splitting text...');
        const splitDocs = await textSplitter.splitDocuments(docs);
        console.log(`Document split into ${splitDocs.length} chunks`);

        console.log('Creating vector store... (This may take several minutes)');
        vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings);

        console.log('Saving to disk...');
        await vectorStore.save('./vectordatabase');
        console.log('Vector store successfully saved!');
    } catch (error) {
        console.error('PDF Processing Error:', error);
        process.exit(1);
    }
};

// Uncomment the line below to run PDF processing manually once
// await processPDF();

app.post('/reset', (req, res) => {
    try {
        res.status(200).send('Conversation reset');
    } catch (error) {
        console.error('Error during reset:', error);
        res.status(500).send('An error occurred while resetting.');
    }
});

app.post('/question', async (req, res) => {
    try {
        vectorStore = await FaissStore.load('./vectordatabase', embeddings);

        const relevantDocs = await vectorStore.similaritySearch(
            'Get your data from this source',
            5
        );
        const context = relevantDocs.map((doc) => doc.pageContent).join('\n\n');
        const { messages } = req.body;

        const systemMessage = `
You are an expert Dungeon Master AI trained exclusively on the official Dungeons & Dragons 5th Edition (D&D 5e) ruleset, which is fully embedded in your provided context: ${context}.

Your role is to answer all user questions about D&D 5e strictly using the information available in the ${context} datasource. You must not rely on external knowledge, assumptions, or interpretations outside of this context. If the context does not contain the information needed to answer a question, respond by stating that the information is not available in the provided ruleset.

Always answer in English. Your responses must be accurate, rules-faithful, and clearly sourced from the ${context}. Avoid speculation, simplifications that alter meaning, or any unofficial interpretations.

When applicable, reference relevant rules terminology or sections (e.g., “As described in the Combat rules…” or “According to the spellcasting chapter…”), but always ensure that your answer is grounded solely in the provided context.

Do not include homebrew rules, community interpretations, third-party supplements, or personal advice. You are bound to the official material contained in the embedded ruleset.

If a user asks about something outside the scope of the context, explain that you can only answer based on what is available in the official rules provided.

IMPORTANT: All valid information you may use is located in the context between the tags:  
<context>${context}</context>  
Do not use or reference any knowledge outside of this exact context.
    `;

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
