import React, { useState } from "react";
import "../styles/Chat.css";

// Material-UI components for modern design
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Divider,
  Box,
} from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CircularProgress from "@mui/material/CircularProgress";

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  // State for showing a loading indicator during async operations
  const [loading, setLoading] = useState(false);
  // State for displaying validation or network errors
  const [error, setError] = useState(null);

  /**
   * Validates the user's input before sending to backend.
   * - Must not be empty
   * - Must be at least 5 characters
   * - Must contain at least two numbers between 20 and 60
   */
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
    const invalid = numbers.filter((n) => Number(n) < 20 || Number(n) > 60);
    if (invalid.length > 0) {
      return "Kindly enter valid measurements";
    }
    return null;
  };

  /**
   * Handles form submission: validates input, sends request, updates messages.
   */
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
        body: JSON.stringify({ text: input }),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        setLoading(false);
        setError("Received invalid response from server.");
        return;
      }

      if (data.error) {
        setLoading(false);
        setMessages([
          ...messages,
          {
            text: input,
            isUser: true,
          },
          {
            error: data.error + ". Please try again.",
            isUser: false,
          },
        ]);
        setInput("");
        return;
      }

      setLoading(false);
      if (response.ok) {
        // Bug: No error handling for failed requests
        // fixed preemptively with inline chat error handling.
        // network error displayed below textbar
        setMessages([
          ...messages,
          {
            text: input,
            isUser: true,
          },
          {
            text: `${data.recommendation}`,
            reasoning: data.reasoning,
            fitTips: data.fit_tips,
            issues: data.identified_issues,
            confidence: data.confidence,
            isUser: false,
          },
        ]);

        setInput("");
      }
    } catch (error) {
      setLoading(false);
      setError("Network error. Please try again.");
    }
  };

  return (
    <div className="chat-container">
      {/* Chat messages section: user and bot messages styled with Material-UI */}
      <div
        className="messages"
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        {messages.map((msg, index) =>
          msg.isUser ? (
            <Box key={index} sx={{ alignSelf: "flex-end", maxWidth: "70%" }}>
              <Card elevation={2} sx={{ bgcolor: "#e3f2fd", borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="body1" color="primary" fontWeight="bold">
                    {msg.text}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ) : (
            <Box key={index} sx={{ alignSelf: "flex-start", maxWidth: "80%" }}>
              <Card elevation={4} sx={{ borderRadius: 2 }}>
                <CardContent>
                  {/* Show error messages in red with icon, otherwise show recommendation info */}
                  {msg.error ? (
                    <Box display="flex" alignItems="center" gap={1}>
                      <ErrorOutlineIcon color="error" />
                      <Typography color="error" fontWeight="bold">
                        {msg.error}
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <CheckCircleOutlineIcon color="success" />
                        <Typography
                          variant="h6"
                          color="success.main"
                          fontWeight="bold"
                        >
                          {msg.text}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      {/* Show reasoning if present */}
                      {msg.reasoning && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <Chip
                            label="Reasoning"
                            color="info"
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          {msg.reasoning}
                        </Typography>
                      )}
                      {/* Show fit tips if present */}
                      {msg.fitTips && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <Chip
                            label="Fit Tips"
                            color="secondary"
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          {msg.fitTips}
                        </Typography>
                      )}
                      {/* Show confidence score if present */}
                      {typeof msg.confidence === "number" && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <Chip
                            label={`Confidence: ${Math.round(
                              msg.confidence * 100
                            )}%`}
                            color={msg.confidence < 0.6 ? "warning" : "success"}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                        </Typography>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </Box>
          )
        )}
      </div>

      {/* Input form for user queries */}
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={input}
          // Trimming whitespace
          onChange={(e) => setInput(e.target.value.trim())}
          placeholder="Enter your measurements and fit issues..."
        />
        <button type="submit">Get Recommendation</button>
      </form>
      {loading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(255,255,255,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <CircularProgress color="primary" />
            <div
              style={{ marginTop: 16, fontWeight: "bold", color: "#1976d2" }}
            >
              Thinking...
            </div>
          </div>
        </div>
      )}
      {/* Display validation or network errors below the form */}
      {error && (
        <div style={{ color: "red", marginTop: "10px", fontWeight: "bold" }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
