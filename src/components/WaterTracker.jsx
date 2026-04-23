import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { UserContext } from "../context/user.context";
import "./WaterTracker.css";

const STAGES = {
  SAD: "sad",           // 0-2
  NEUTRAL: "neutral",   // 3-5
  EXCITED: "excited",   // 6-7
  MEDAL: "medal"        // 8+
};

const MESSAGES = {
  sad: [
    "You need water! Start sipping.",
    "Hydration is key. Drink up!",
    "Your body is craving water.",
    "Time for a water break!",
    "Don't let yourself dry out."
  ],
  neutral: [
    "Doing okay, keep going!",
    "Halfway there. Sip sip!",
    "You're on the right track.",
    "Keep up the good hydration.",
    "Water is life. Keep drinking."
  ],
  excited: [
    "Almost there! Just a bit more.",
    "Great job, finish strong!",
    "You're doing fantastic!",
    "One or two more to reach your goal!",
    "You are a hydration champion!"
  ],
  medal: [
    "Goal achieved! Amazing job!",
    "You crushed your daily goal!",
    "Perfect hydration today!",
    "Look at you go! Goal met.",
    "Awesome work! You are fully hydrated."
  ]
};

const EMOJIS = {
  sad: "😢",
  neutral: "😐",
  excited: "😃",
  medal: "🏅"
};

const getStage = (cups) => {
  if (cups <= 2) return STAGES.SAD;
  if (cups <= 5) return STAGES.NEUTRAL;
  if (cups <= 7) return STAGES.EXCITED;
  return STAGES.MEDAL;
};

const getRandomMessage = (stage, prevMessageId) => {
  const options = MESSAGES[stage];
  let newIdx;
  do {
    newIdx = Math.floor(Math.random() * options.length);
  } while (newIdx === prevMessageId && options.length > 1);
  return { text: options[newIdx], id: newIdx };
};

const getLocalDateString = () => new Date().toLocaleDateString();

const WaterTracker = () => {
  const { currentUser } = useContext(UserContext);
  const [glasses, setGlasses] = useState(0);
  const [stage, setStage] = useState(STAGES.SAD);
  const [message, setMessage] = useState(() => getRandomMessage(STAGES.SAD, null));
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const reminderTimerRef = useRef(null);

  // Initialize from LocalStorage
  useEffect(() => {
    const today = getLocalDateString();
    const storedDataStr = localStorage.getItem("water_tracker_data");
    if (storedDataStr) {
      try {
        const storedData = JSON.parse(storedDataStr);
        const userId = currentUser ? currentUser.id : "guest";
        if (storedData.date === today && storedData.userId === userId) {
          setGlasses(storedData.glasses || 0);
        } else {
          localStorage.setItem("water_tracker_data", JSON.stringify({
            date: today,
            userId,
            glasses: 0
          }));
        }
      } catch (e) {
        console.error("Failed to parse water tracker data", e);
      }
    }
  }, [currentUser]);

  // Persist and Sync to Backend
  const updateIntake = useCallback(async (newGlasses) => {
    setGlasses(newGlasses);
    
    const today = getLocalDateString();
    const userId = currentUser ? currentUser.id : "guest";
    localStorage.setItem("water_tracker_data", JSON.stringify({
      date: today,
      userId,
      glasses: newGlasses
    }));

    if (currentUser && currentUser.id) {
       try {
         const response = await fetch('http://localhost/api/water-intake', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             user_id: currentUser.id,
             glasses_consumed: newGlasses
           })
         });
         const data = await response.json();
         if (!response.ok) {
           throw new Error(data.error || 'Failed to sync water intake');
         }
       } catch (error) {
         console.warn('Silent fallback: Error saving water intake to backend:', error);
       }
    }
  }, [currentUser]);

  // Update Stage and Message
  useEffect(() => {
    const newStage = getStage(glasses);
    if (newStage !== stage) {
      setStage(newStage);
      setMessage(getRandomMessage(newStage, message.id));
      
      if (newStage === STAGES.MEDAL) {
        window.dispatchEvent(new CustomEvent('waterGoalReached', { detail: { glasses } }));
        console.log('Event: waterGoalReached');
      }
    }
  }, [glasses, stage, message.id]);

  const increment = () => {
    if (glasses < 8) updateIntake(glasses + 1);
  };

  const decrement = () => {
    if (glasses > 0) updateIntake(glasses - 1);
  };

  // Reminder Logic
  useEffect(() => {
    if (remindersEnabled) {
      reminderTimerRef.current = setInterval(() => {
        setGlasses((prev) => {
           if (prev < 8) {
               console.log("Hydration Reminder: Time to drink water!");
               if ("Notification" in window && Notification.permission === "granted") {
                   new Notification("Time to hydrate! 💧", { body: "Don't forget your daily water goal." });
               } else {
                   alert("Hydration Reminder: Time to drink water! 💧");
               }
           }
           return prev; 
        });
      }, 60 * 60 * 1000); 
    } else {
      if (reminderTimerRef.current) clearInterval(reminderTimerRef.current);
    }
    return () => {
      if (reminderTimerRef.current) clearInterval(reminderTimerRef.current);
    };
  }, [remindersEnabled]);

  const toggleReminders = () => {
    if (!remindersEnabled) {
       if ("Notification" in window) {
           Notification.requestPermission().then(permission => {
               console.log("Notification permission:", permission);
           });
       }
    }
    setRemindersEnabled(!remindersEnabled);
  };

  const handleManualMessageUpdate = () => {
     setMessage(getRandomMessage(stage, message.id));
  };


  return (
    <div className="water-tracker" aria-labelledby="tracker-heading">
      <h3 id="tracker-heading">Daily Water Intake</h3>
      
      <div className={`emotion-display stage-${stage}`} aria-label={`Current hydration stage: ${stage}`}>
        <div className={`emoji-visual ${stage === STAGES.MEDAL ? 'medal-animation' : ''}`}>
           {EMOJIS[stage]}
        </div>
        <p className="microcopy" onClick={handleManualMessageUpdate} aria-live="polite">
          {message.text}
        </p>
      </div>

      <div className="tracker-controls">
        <button onClick={decrement} aria-label="Decrease water glasses">−</button>
        <span data-testid="tracker-count" aria-live="polite" aria-atomic="true">{glasses} / 8</span>
        <button onClick={increment} aria-label="Increase water glasses" disabled={glasses >= 8}>+</button>
      </div>

      <div className="glass-display">
        {[...Array(8)].map((_, index) => (
          <div
            key={index}
            className={`glass ${index < glasses ? "filled" : ""}`}
          ></div>
        ))}
      </div>

      <div className="reminder-toggle" style={{ marginTop: '1.5em' }}>
         <label>
           <input 
             type="checkbox" 
             checked={remindersEnabled} 
             onChange={toggleReminders} 
             aria-label="Toggle hydration reminders"
           />
           Enable Reminders
         </label>
      </div>
    </div>
  );
};

export default WaterTracker;