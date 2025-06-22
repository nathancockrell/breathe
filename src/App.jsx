import React, { useState, useEffect, useRef } from "react";
import "./App.css";

export default function App() {
  const [showAltUI, setShowAltUI] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [lastActionTime, setLastActionTime] = useState(null);
  const [now, setNow] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const animationRef = useRef(null);

  const STORAGE_KEY = "breath_sessions";

  const toggleUI = () => {
    setShowAltUI((prev) => !prev);
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    const milliseconds = (ms % 1000).toFixed(0).padStart(3, "0");
    return `${minutes}:${seconds}.${milliseconds}`;
  };

  const formatMsElapsed = (ms) => {
    return (ms / 1000).toFixed(3);
  };

  const formatDateTime = (dateObj) => {
    const date = dateObj.toLocaleDateString();
    const time = dateObj.toLocaleTimeString();
    return `${date} ${time}`;
  };

  const update = () => {
    setNow(performance.now());
    animationRef.current = requestAnimationFrame(update);
  };

  const startTimer = () => {
    if (!running) {
      const now = performance.now();
      setStartTime(now);
      setNow(now);
      setRunning(true);
      animationRef.current = requestAnimationFrame(update);
    }
  };

  const handleAction = (actionName) => {
    const current = performance.now();

    startTimer();

    if (lastAction && lastActionTime) {
      const duration = current - lastActionTime;
      setBlocks((prev) => [
        ...prev,
        { state: lastAction, duration: Math.round(duration) }
      ]);
    }

    setLastAction(actionName);
    setLastActionTime(current);
  };

  const stopAndReset = () => {
    const current = performance.now();

    cancelAnimationFrame(animationRef.current);
    setRunning(false);

    let newBlocks = [...blocks];
    if (lastAction && lastActionTime) {
      const duration = current - lastActionTime;
      newBlocks.push({ state: lastAction, duration: Math.round(duration) });
    }

    if (startTime) {
      const totalDuration = Math.round(current - startTime);
      const realStart = new Date(performance.timeOrigin + startTime);

      const session = {
        id: realStart.getTime(),
        startTime: realStart.toISOString(),
        length: totalDuration,
        blocks: newBlocks
      };

      const updatedSessions = [...sessions, session];
      setSessions(updatedSessions);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
    }

    // Reset
    setStartTime(null);
    setElapsedMs(0);
    setLastAction(null);
    setLastActionTime(null);
    setBlocks([]);
    setNow(null);
  };

  useEffect(() => {
    if (running && startTime !== null && now !== null) {
      setElapsedMs(now - startTime);
    }
  }, [now, running, startTime]);

  useEffect(() => {
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  // Load from localStorage on first mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
      } catch (err) {
        console.error("Failed to load saved sessions:", err);
      }
    }
  }, []);

  const msSinceAction =
    lastActionTime && now ? now - lastActionTime : 0;

  return (
    <div className={`container ${showAltUI ? "alt" : ""}`}>
      <button className="menu-btn" onClick={toggleUI}>Menu</button>
      <div className="timer">{formatTime(elapsedMs)}</div>

      {lastAction && (
        <div className="status">
          Last action: <strong>{lastAction}</strong> — {formatMsElapsed(msSinceAction)} sec ago
        </div>
      )}
      {!lastAction && (
        <div className="status">
          press an action to start
        </div>
      )}

      <div className="buttons">
        <button className="btn" onClick={stopAndReset}>stop</button>
        <button className="btn" onClick={() => handleAction("In")}>In</button>
        <button className="btn" onClick={() => handleAction("Hold")}>Hold</button>
        <button className="btn" onClick={() => handleAction("Out")}>Out</button>
      </div>

      <div className="sessions">
        <h4>Past Sessions:</h4>
        {sessions.length === 0 ? (
          <p>No sessions yet</p>
        ) : (
          <ul>
            {sessions.map((s, index) => (
              <li key={index}>
                <strong>{formatMsElapsed(s.length)}s</strong> —{" "}
                {formatDateTime(new Date(s.startTime))}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
