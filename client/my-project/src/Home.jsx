import {useState, useEffect, useRef} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function Home() {
    const [humanMessage, setHumanMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState(() => {
        const savedHistory = localStorage.getItem('myChatHistory');
        return savedHistory ? JSON.parse(savedHistory) : [];
    });
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        localStorage.setItem('myChatHistory', JSON.stringify(messages));
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!humanMessage.trim() || loading) return;

        setLoading(true);
        const userMessage = {role: 'human', content: humanMessage};
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setHumanMessage('');

        try {
            const res = await fetch('http://localhost:8000/question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: updatedMessages,
                }),
            });

            if (!res.body) throw new Error('ReadableStream not supported in response.');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let result = '';

            while (true) {
                const {value, done} = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, {stream: true});
                result += chunk;

                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage?.role === 'assistant') {
                        lastMessage.content = result;
                    } else {
                        newMessages.push({role: 'assistant', content: result});
                    }
                    return newMessages;
                });
            }

            setLoading(false);
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [
                ...prev,
                {role: 'assistant', content: 'An error occurred while processing your request.'},
            ]);
            setLoading(false);
        }
    };

    const resetConversation = async () => {
        try {
            await fetch('http://localhost:8000/reset', {
                method: 'POST',
            });
            setMessages([]);
            localStorage.removeItem('myChatHistory');
        } catch (error) {
            console.error('Error resetting conversation:', error);
        }
    };

    const fetchRandomMonster = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/new-monster', {
                method: 'POST',
            });
            const data = await res.json();
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: `**${data.name}**\nAC: ${data.armor_class}\nHP: ${data.hit_points}\nActions: ${data.actions?.slice(0, 3).map(a => a.name).join(', ')}`
                }
            ]);
        } catch (error) {
            console.error('Error fetching random monster:', error);
            setMessages(prev => [
                ...prev,
                {role: 'assistant', content: 'Failed to fetch a random monster.'}
            ]);
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col h-screen bg-gray-900">
            <div
                className="bg-gray-900 p-4 border-b border-gray-700 sticky top-0 z-10 flex justify-between items-center">
                <div className="text-center flex-1">
                    <h1 className="fantasy-title text-5xl text-red-500">D&D-GPT</h1>
                    <p className="fantasy-title text-2xl text-gray-300 mt-2">Your AI Dungeon Master</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchRandomMonster}
                        className="fantasy-title text-xl bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        Random Monster
                    </button>
                    <button
                        onClick={resetConversation}
                        className="fantasy-title text-xl bg-red-800 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        New Game
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 sm:px-4 space-y-4 pt-0">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.role === 'human' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-xl p-4 rounded-lg ${message.role === 'human' ? 'bg-red-800 text-white' : 'bg-black text-gray-100 border border-gray-700'}`}
                        >
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p: ({node, ...props}) => <p {...props} className="text-base whitespace-pre-wrap mb-2"/>,
                                    strong: ({node, ...props}) => <strong {...props} className="text-red-400"/>,
                                    ul: ({node, ...props}) => <ul {...props} className="list-disc pl-6 mb-4"/>,
                                    li: ({node, ...props}) => <li {...props} className="mb-1"/>
                                }}
                            >
                                {message.content.replace(/undefined/g, '—')}
                            </ReactMarkdown>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef}/>
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 bg-gray-900">
                <div className="flex space-x-4">
                    <input
                        type="text"
                        value={humanMessage}
                        onChange={(e) => setHumanMessage(e.target.value)}
                        placeholder="Type your message here..."
                        className="fantasy-title text-xl flex-1 bg-gray-800 text-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 text-base"
                        disabled={loading}
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className={`px-6 py-2 rounded-lg font-medium ${loading ? 'fantasy-title text-xl bg-gray-700 text-gray-400 cursor-not-allowed' : 'fantasy-title text-xl bg-red-600 text-white hover:bg-red-700'} transition-colors`}
                    >
                        {loading ? (
                            <div className="flex items-center">
                                <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg"
                                     fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                            strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Sending...
                            </div>
                        ) : 'Send'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default Home;
