import {useState} from 'react';

function Home() {
    const [systemMessage, setSystemMessage] = useState('');
    const [humanMessage, setHumanMessage] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setResponse('');

        try {
            const res = await fetch('http://localhost:8000/question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    system: systemMessage,
                    question: humanMessage,
                }),
            });

            if (!res.body) throw new Error('ReadableStream not supported in response.');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let result = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                result += chunk;
                setResponse(prev => prev + chunk);
            }

            setLoading(false);
        } catch (error) {
            console.error('Error:', error);
            setResponse('An error occurred while processing your request.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Crack-GPT 3.5</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            System Message:
                        </label>
                        <textarea
                            value={systemMessage}
                            onChange={(e) => setSystemMessage(e.target.value)}
                            rows="3"
                            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Human Message:
                        </label>
                        <textarea
                            value={humanMessage}
                            onChange={(e) => setHumanMessage(e.target.value)}
                            rows="3"
                            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        type="submit"
                        className={`w-full font-medium py-2 rounded-md transition ${
                            loading ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                        disabled={loading}
                    >
                        Send
                    </button>
                </form>
                {response && (
                    <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
                        <h2 className="text-lg font-semibold text-gray-800 mb-2">Response:</h2>
                        <p className="text-gray-700">{response}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Home;
