import { useState } from 'react'
import './App.css'
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, TypingIndicator } from '@chatscope/chat-ui-kit-react';

// Your API key remains unchanged
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
// Adjusted system message to ensure chatbot responds only about Indian law and the Constitution
const systemMessage = {
  "role": "system", 
  "content": `You are a legal advisor specializing in Indian law and the Constitution of India. 
  Please only respond with relevant information about Indian law, and explain it in simple terms that are easy to understand for a 15-year-old. 
  Break down complex legal terms into simple words or relatable examples.
  For any legal situations mentioned (like crimes or legal procedures), focus on providing clear advice specific to Indian law.
  Always respond directly to the question asked, and provide concise, to-the-point answers. 
  Maintain the context throughout the conversation, storing relevant details to make sure your responses remain accurate and relevant to the ongoing discussion.`
}



// Helper function to add a delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry mechanism with delay
async function processMessageToChatGPT(chatMessages, setMessages, setIsTyping) {
  let apiMessages = chatMessages.map((messageObject) => {
    let role = messageObject.sender === "ChatGPT" ? "assistant" : "user";
    return { role: role, content: messageObject.message };
  });

  const apiRequestBody = {
    model: "gpt-3.5-turbo",
    messages: [
      systemMessage, 
      ...apiMessages 
    ]
  };

  let retryAttempts = 5;
  let retryDelay = 5000;

  while (retryAttempts > 0) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(apiRequestBody)
      });

      const data = await response.json();

      console.log('API Response:', data); // Log the entire API response for debugging

      if (response.status === 429) {
        console.log("Rate limit hit. Retrying...");
        await delay(retryDelay);
        retryAttempts -= 1;
        continue;
      }

      if (data.choices && data.choices[0] && data.choices[0].message) {
        let chatGptResponse = data.choices[0].message.content;

        // Log the response to check its content
        console.log('ChatGPT Response:', chatGptResponse);

        // If the response doesn't match the expected criteria, modify it
        if (!chatGptResponse.toLowerCase().includes("indian law") && !chatGptResponse.toLowerCase().includes("constitution of india")) {
          chatGptResponse = "I'm sorry, I can only discuss topics related to Indian law and the Constitution of India.";
        }

        setMessages([...chatMessages, {
          message: chatGptResponse,
          sender: "ChatGPT"
        }]);
      } else {
        setMessages([...chatMessages, {
          message: "Sorry, I couldn't understand the response.",
          sender: "ChatGPT"
        }]);
      }

      setIsTyping(false);
      return;

    } catch (error) {
      console.error("Error:", error);
      setMessages([...chatMessages, {
        message: "An error occurred while communicating with the API.",
        sender: "ChatGPT"
      }]);
      setIsTyping(false);
      return;
    }
  }

  setMessages([...chatMessages, {
    message: "Failed to get a response after multiple attempts. Please try again later.",
    sender: "ChatGPT"
  }]);
  setIsTyping(false);
}


function App() {
  const [messages, setMessages] = useState([
    {
      message: "Hello, I'm BharatNyay! Ask me anything about Indian law or the Constitution of India.",
      sentTime: "just now",
      sender: "ChatGPT"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (message) => {
    const newMessage = {
      message,
      direction: 'outgoing',
      sender: "user"
    };

    const newMessages = [...messages, newMessage];
    
    setMessages(newMessages);

    // Initial system message to determine ChatGPT functionality
    setIsTyping(true);
    await processMessageToChatGPT(newMessages, setMessages, setIsTyping);
  };

  return (
    <div className="App">
      <div style={{ position:"relative", height: "800px", width: "700px"  }}>
        <MainContainer>
          <ChatContainer>       
            <MessageList 
              scrollBehavior="smooth" 
              typingIndicator={isTyping ? <TypingIndicator content="BharatNyay is typing" /> : null}
            >
              {messages.map((message, i) => {
                return <Message key={i} model={message} />
              })}
            </MessageList>
            <MessageInput placeholder="Type message here" onSend={handleSend} />        
          </ChatContainer>
        </MainContainer>
      </div>
    </div>
  )
}

export default App;