import "./App.css";
import keyboardJS from "keyboardjs";
import moment from "moment";
import { useState, Fragment, useEffect, useRef } from "react";
import React from "react";
// import last from "lodash/last";

function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

function formatTime(date) {
  return moment(date)
    .format("HHmm")
    .replace(/^0+([1-9]|0$)/, "$1");
}
function parseTime(string) {
  const minutes = parseInt(string.substr(-2, 2), 10);
  const hourString = string.substr(0, string.length - 2);
  const hours = hourString.length === 0 ? 0 : parseInt(hourString, 10);
  if (minutes > 59) {
    throw new Error("Invalid minutes");
  }
  if (hours === 24 && minutes > 0) {
    throw new Error("Invalid hours");
  }
  if (hours > 24) {
    throw new Error("Invalid hours");
  }
  return moment().minutes(minutes).hours(hours);
}

function reformatTime(string) {
  if (string === "2400") {
    return string;
  }
  return formatTime(parseTime(string));
}

const beginningTime = "0000";
function getDurationMinutes(timeStart, timeEnd) {
  const start = parseTime(timeStart);
  const end = parseTime(timeEnd);
  let minutesStart, minutesEnd;
  minutesStart = start.hours() * 60 + start.minutes();
  minutesEnd = end.hours() * 60 + end.minutes();
  if (timeEnd === "2400") {
    minutesEnd = 24 * 60;
  }
  if (timeStart === "2400") {
      minutesStart = 24 * 60;
  }
  return minutesEnd - minutesStart;
}

function formatDuration(minutes) {
  return Math.round(minutes / 6)
    .toFixed(0)
    .replace(".0", "");
}

function App() {
  const [loggedTimes, setLoggedTimes] = useStickyState([], "loggedTimes");
  const [time, setTime] = useState(formatTime(moment()));
  const [lastTimeTouched, setLastTimeTouched] = useState(0);
  const [activity, setActivity] = useState("");
  const [now, setNow] = useState(formatTime(moment()));

  const inputTimeRef = useRef(null);
  const inputActivityRef = useRef(null);

  useEffect(() => {
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        setTime(formatTime(moment()));
        inputActivityRef.current.focus();
      }
    });

    keyboardJS.bind("/", (e) => {
      setTime(formatTime(moment()));
      setLastTimeTouched(0);
      e.preventDefault();
    });
    keyboardJS.bind("enter", (e) => {
      if (e.target.id === "time") {
        inputActivityRef.current.focus();
      }
    });

    const interval = setInterval(() => {
      setNow(formatTime(moment()));
      if (lastTimeTouched < +new Date() - 30000) {
        setTime(formatTime(moment()));
      }
    }, 1000);
    return () => {
      clearInterval(interval);
      keyboardJS.reset();
    };
  }, [lastTimeTouched]);

  let isValidTime = true;
  try {
      parseTime(time);
  } catch (e) {
      isValidTime = false;
  }

  return (
    <>
      <div className="App">
        {loggedTimes.length ? (
          <table className="activities">
            <thead>
              <tr>
                <td className="header">Von</td>
                <td className="header">Bis</td>
                <td className="header">Aktivität</td>
                <td className="header">Summe</td>
                <td className="header">Gesammtsumme</td>
              </tr>
            </thead>
            <tbody>
              {loggedTimes.map(function (loggedTime, i) {
                const startTime =
                  i === 0 ? beginningTime : loggedTimes[i - 1].time;
                const { time, activity } = loggedTime;
                return (
                  <tr key={i}>
                    <td className="activity">{reformatTime(startTime)}</td>
                    <td className="activity">{reformatTime(time)}</td>
                    <td className="activity">{activity}</td>
                    <td className="activity">
                      {formatDuration(getDurationMinutes(startTime, time))}
                    </td>
                    <td className="activity">
                      {formatDuration(
                        loggedTimes.reduce(function (sum, entry, j) {
                          const startTimeX =
                            j === 0 ? beginningTime : loggedTimes[j - 1].time;
                          return (
                            sum +
                            (entry.activity === activity
                              ? getDurationMinutes(startTimeX, entry.time)
                              : 0)
                          );
                        }, 0)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
        <div className="inputs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!time || !activity) {
                return;
              }
              try {
                parseTime(time);
              } catch (e) {
                return;
              }
              // if (loggedTimes.length > 0) {
              //   const lastLoggedTime = parseTime(last(loggedTimes).time);
              //   if (
              //     lastLoggedTime.isAfter(parsedTime) ||
              //     (lastLoggedTime.minutes() === parsedTime.minutes() &&
              //       lastLoggedTime.hours() === parsedTime.hours())
              //   ) {
              //     return;
              //   }
              // }
              setLoggedTimes(loggedTimes.concat({ time, activity }));
              setTime(formatTime(moment()));
              setLastTimeTouched(0);
              setActivity("");
              // inputTimeRef.current.focus();
              inputActivityRef.current.focus();
            }}
          >
            <label htmlFor="time">Zeit</label>
            <input
              ref={inputTimeRef}
              type="text"
              id="time"
              autoComplete="off"
              class={`input-${isValidTime ? 'valid' : 'invalid'}`}
              onChange={(e) => {
                setTime(e.target.value);
                setLastTimeTouched(+new Date());
              }}
              value={time}
            />
            <label htmlFor="activity">Aktivität</label>
            <input
              ref={inputActivityRef}
              autoFocus={true}
              type="text"
              id="activity"
              onChange={(e) => setActivity(e.target.value)}
              value={activity}
            />
            <input type="submit" value="+" />
          </form>
        </div>
      </div>
      <div
        style={{
          position: "fixed",
          textAlign: "center",
          width: "100%",
          bottom: "15px",
        }}
      >
        <button
          onClick={() => {
            setLoggedTimes([]);
          }}
        >
          Alles löschen
        </button>
        <div>Aktuelle Zeit {now}</div>
      </div>
    </>
  );
}

export default App;
