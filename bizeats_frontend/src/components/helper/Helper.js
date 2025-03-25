export const generateSessionId = () => {
    return "session_" + Math.random().toString(36).substr(2, 9);
  };
  
  export const getOrCreateSessionId = () => {
    let sessionId = localStorage.getItem("session_id");
    if (!sessionId) {
      sessionId = generateSessionId();
      localStorage.setItem("session_id", sessionId);
    }
    return sessionId;
  };