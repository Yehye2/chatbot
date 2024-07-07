const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = 'asst_biFCYRdHOYQl81tr5D873Qg6';

app.use(bodyParser.json());

app.post('/chat', async (req, res) => {
    const userMessage = req.body.user_message;

    if (!userMessage) {
        return res.status(400).json({ error: 'User message is required' });
    }

    try {
        // Create a thread
        const threadResponse = await axios.post(
            'https://api.openai.com/v1/threads',
            {},
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'assistants=v2',
                    'Content-Type': 'application/json'
                }
            }
        );
        const threadId = threadResponse.data.id;

        // Add user message to the thread
        await axios.post(
            `https://api.openai.com/v1/threads/${threadId}/messages`,
            {
                role: 'user',
                content: userMessage
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'assistants=v2',
                    'Content-Type': 'application/json'
                }
            }
        );

        // Run the assistant
        const runResponse = await axios.post(
            `https://api.openai.com/v1/threads/${threadId}/runs`,
            {
                assistant_id: ASSISTANT_ID,
                model: 'gpt-4o'  // Ensure the model is supported
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'assistants=v2',
                    'Content-Type': 'application/json'
                }
            }
        );

        const runId = runResponse.data.id;

        // Check the run status until it's completed
        let runStatus;
        do {
            const runStatusResponse = await axios.get(
                `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        'OpenAI-Beta': 'assistants=v2',
                        'Content-Type': 'application/json'
                    }
                }
            );
            runStatus = runStatusResponse.data.status;
        } while (runStatus !== 'completed');

        // Get the assistant's response
        const messagesResponse = await axios.get(
            `https://api.openai.com/v1/threads/${threadId}/messages`,
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'assistants=v2',
                    'Content-Type': 'application/json'
                }
            }
        );

        const assistantMessage = messagesResponse.data.data.find(
            message => message.role === 'assistant'
        ).content;

        const assistantMessageValue = assistantMessage.type === 'text' ? assistantMessage.text.value : assistantMessage;

        res.json({ assistant_message: assistantMessageValue });
    } catch (error) {
        if (error.response) {
            console.error('Error response data:', error.response.data);
            console.error('Error response status:', error.response.status);
            console.error('Error response headers:', error.response.headers);
            res.status(error.response.status).json({ error: error.response.data });
        } else if (error.request) {
            console.error('Error request data:', error.request);
            res.status(500).json({ error: 'No response received from OpenAI API' });
        } else {
            console.error('Error message:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
