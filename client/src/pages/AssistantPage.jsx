import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  BriefcaseBusiness,
  FileSearch,
  MessageSquareText,
  Plus,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { api } from "../lib/api";

const suggestions = [
  "Which applicants best match the open engineering roles?",
  "Summarize the strengths across recent interviews.",
  "What skills are most common in this pipeline?",
];

export default function AssistantPage() {
  const [threads, setThreads] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const messageEnd = useRef(null);

  async function loadThreads() {
    try {
      const result = await api.get("/rag/threads");
      setThreads(result.threads || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load conversations.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadThreads();
  }, []);
  useEffect(() => {
    messageEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function openThread(id) {
    setError("");
    try {
      const result = await api.get(`/rag/threads/${id}`);
      setThreadId(id);
      setMessages(result.thread.messages || []);
    } catch (requestError) {
      setError(requestError.message);
    }
  }
  function newConversation() {
    setThreadId(null);
    setMessages([]);
    setError("");
  }

  async function ask(value = question) {
    const prompt = value.trim();
    if (!prompt || sending) return;
    const optimistic = {
      sender: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    setQuestion("");
    setSending(true);
    setError("");
    try {
      const result = await api.post("/rag/query", {
        question: prompt,
        threadId,
      });
      setThreadId(result.threadId);
      setMessages(
        result.messages || [
          ...messages,
          optimistic,
          {
            sender: "assistant",
            content: result.answer,
            sources: result.sources || [],
            createdAt: new Date().toISOString(),
          },
        ],
      );
      loadThreads();
    } catch (requestError) {
      setError(
        requestError.message || "The assistant could not answer right now.",
      );
      setMessages((current) => [
        ...current,
        {
          sender: "assistant",
          content:
            "I could not retrieve an answer for that question. Please try again.",
          sources: [],
          failed: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }
  function submitQuestion(event) {
    event.preventDefault();
    ask();
  }

  return (
    <>
      <div className="page-heading assistant-heading">
        <div>
          <p className="eyebrow">RECRUITER INTELLIGENCE</p>
          <h1>Recruitment assistant</h1>
          <p>
            Ask questions about your hiring workspace and inspect the sources
            behind each response.
          </p>
        </div>
        <button className="button" onClick={newConversation}>
          <Plus size={14} /> New conversation
        </button>
      </div>
      {error && (
        <div className="notice error page-notice">
          {error}
          <button
            className="notice-close"
            onClick={() => setError("")}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="assistant-layout">
        <aside className="panel assistant-history">
          <div className="assistant-history-top">
            <div>
              <h2>Conversations</h2>
              <p>Private to your workspace</p>
            </div>
            <button
              className="icon-button"
              title="New conversation"
              aria-label="New conversation"
              onClick={newConversation}
            >
              <Plus size={16} />
            </button>
          </div>
          {loading ? (
            <div className="loading-block">Loading…</div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread._id}
                className={`thread-button ${thread._id === threadId ? "selected" : ""}`}
                onClick={() => openThread(thread._id)}
              >
                <MessageSquareText size={15} />
                <span>
                  <strong>{thread.title || "New conversation"}</strong>
                  <small>
                    {thread.updatedAt
                      ? new Date(thread.updatedAt).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" },
                        )
                      : "Just now"}
                  </small>
                </span>
              </button>
            ))
          )}
          {!loading && !threads.length && (
            <p className="history-empty">
              Your saved conversations will appear here.
            </p>
          )}
        </aside>
        <section className="panel assistant-workspace">
          <div className="assistant-context">
            <span className="assistant-context-icon">
              <Sparkles size={16} />
            </span>
            <div>
              <strong>Workspace knowledge</strong>
              <small>
                Answers use authorized resumes, roles, and interview records.
              </small>
            </div>
            <span className="context-status">
              <i /> Context ready
            </span>
          </div>
          <div className="assistant-messages">
            {messages.length ? (
              messages.map((message, index) => (
                <div
                  className={`chat-message ${message.sender === "user" ? "from-user" : "from-assistant"}`}
                  key={`${message.createdAt}-${index}`}
                >
                  <span
                    className={`chat-avatar ${message.sender === "user" ? "user-avatar" : ""}`}
                  >
                    {message.sender === "user" ? (
                      <UserRound size={15} />
                    ) : (
                      <Bot size={16} />
                    )}
                  </span>
                  <div className="chat-message-content">
                    <span className="chat-sender">
                      {message.sender === "user"
                        ? "You"
                        : "TalentPulse assistant"}
                    </span>
                    <p>{message.content}</p>
                    {message.sources?.length > 0 && (
                      <div className="source-list">
                        <span className="source-heading">
                          <FileSearch size={12} /> SOURCES
                        </span>
                        {message.sources.map((source, sourceIndex) => (
                          <div
                            className="source-item"
                            key={`${source.title || source.sourceType}-${sourceIndex}`}
                          >
                            <span className="source-icon">
                              <BriefcaseBusiness size={13} />
                            </span>
                            <span>
                              <strong>
                                {source.title ||
                                  source.sourceType ||
                                  "Workspace document"}
                              </strong>
                              <small>
                                {source.type ||
                                  source.documentType ||
                                  "Recruitment record"}
                              </small>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="assistant-empty">
                <span className="assistant-empty-icon">
                  <Sparkles size={20} />
                </span>
                <p className="eyebrow">A GROUNDED SECOND OPINION</p>
                <h2>What would you like to understand?</h2>
                <p>
                  Ask a question about your hiring data. Responses should
                  support human review, never replace it.
                </p>
                <div className="suggestion-list">
                  {suggestions.map((suggestion) => (
                    <button key={suggestion} onClick={() => ask(suggestion)}>
                      {suggestion}
                      <ArrowUp size={13} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {sending && (
              <div className="assistant-thinking">
                <span className="thinking-dots">
                  <i />
                  <i />
                  <i />
                </span>
                Checking authorized workspace sources…
              </div>
            )}
            <div ref={messageEnd} />
          </div>
          <form className="assistant-composer" onSubmit={submitQuestion}>
            <textarea
              aria-label="Ask the recruitment assistant"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitQuestion(event);
                }
              }}
              placeholder="Ask about candidates, roles, or interview feedback…"
              rows="2"
              maxLength={2000}
            />
            <div className="composer-footer">
              <span>AI responses are assistive and may be incomplete.</span>
              <button
                className="send-question"
                type="submit"
                aria-label="Send question"
                disabled={!question.trim() || sending}
              >
                <ArrowUp size={17} />
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
