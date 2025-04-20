import React, { useState } from "react";
import "../styles/Chat.css";

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  // Bug: Missing loading state
  // added loading state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

const validateInput = (input) => {
  if (!input.trim()) {
    return "Kindly enter your query.";
  }
  if (input.trim().length < 5) {
    return "Please provide more details.";
  }
  // Find all numbers in the input (supports integers and decimals)
  const numbers = input.match(/\d+(\.\d+)?/g);
  if (!numbers || numbers.length < 2) {
    return "Please provide at least two measurement sizes (your underbust and bust measurements) along with your query.";
  }
  // Convert to numbers and check range
  const invalid = numbers.filter(
    n => Number(n) < 20 || Number(n) > 60
  );
  if (invalid.length > 0) {
    return "Kindly enter valid measurements";
  }
  return null;
};


  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateInput(input);
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError(null); // Clear previous errors

    try {
      const response = await fetch("http://localhost:8000/api/bra-fitting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: input })
      });
      const data = await response.json();
      console.log(data)
      
      if (data.error) {
        setLoading(false);
        setMessages([...messages, {
          text: input,
          isUser: true
        }, {
          text: data.error+". Please try again.",
          isUser: false
        }]);
        setInput("");
        return;
      }

      setLoading(false)

      // Bug: No error handling for failed requests
      // fixed preemptively with inline chat error handling.
      // network error displayed below textbar
      setMessages([...messages, {
        text: input,
        isUser: true
      }, {
        text: `${data.recommendation}`,
        reasoning: data.reasoning,
        fitTips: data.fit_tips,
        issues: data.identified_issues,
        confidence: data.confidence,
        isUser: false
      }]);
      
      setInput("");
    } catch (error) {
      setLoading(false)
      setError("Network error. Please try again.");
      console.error(error);
    }
  };

  return (
    <div className="chat-container">
    {/* Loading indicator */}
    {loading && <div className="loading-indicator">Loading...</div>}
      <div className="messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.isUser ? "user" : "bot"}`}
            style={{
              background: msg.isUser ? "#e0f7fa" : "#f1f8e9",
              alignSelf: msg.isUser ? "flex-end" : "flex-start",
              borderRadius: "10px",
              margin: "8px 0",
              padding: "12px 16px",
              maxWidth: "100%",
              boxShadow: "0 1px 3px rgba(0,0,0,0.07)"
            }}
          >
            {msg.isUser ? (
              <span style={{ fontWeight: "bold" }}>{msg.text}</span>
            ) : (
              <div>
                {/* Error message detection */}
                {msg.text && msg.text.toLowerCase().includes("error") ? (
                  <div style={{ color: "red", fontWeight: "bold" }}>{msg.text}</div>
                ) : (
                  <>
                    <div>
                      <span style={{ fontWeight: "bold" }}>Recommendation:</span>{" "}
                      {msg.text}
                    </div>
                    {msg.reasoning && (
                      <div>
                        <span style={{ fontWeight: "bold" }}>Reasoning:</span>{" "}
                        {msg.reasoning}
                      </div>
                    )}
                    {msg.fitTips && (
                      <div>
                        <span style={{ fontWeight: "bold" }}>Fit Tips:</span>{" "}
                        {msg.fitTips}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter your measurements and fit issues..."
        />
        <button type="submit">Get Recommendation</button>
      </form>
      {/* Error message */}
      {error && (
        <div style={{ color: "red", marginTop: "10px", fontWeight: "bold" }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
