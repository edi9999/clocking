import "./App.css";
import keyboardJS from "keyboardjs";
import moment from "moment";
import { useState, Fragment, useEffect, useRef } from "react";
import React from "react";
import last from "lodash/last";
import map from "lodash/map";
import reduce from "lodash/reduce";
import uniqBy from "lodash/uniqBy";
import sortBy from "lodash/sortBy";

function useDocumentTitle(title) {
	useEffect(() => {
		window.document.title = title;
	}, [title]);
}

function useInterval(callback, delay) {
	const savedCallback = useRef();

	// Remember the latest callback.
	useEffect(() => {
		savedCallback.current = callback;
	}, [callback]);

	// Set up the interval.
	useEffect(() => {
		function tick() {
			savedCallback.current();
		}
		if (delay !== null) {
			let id = setInterval(tick, delay);
			return () => clearInterval(id);
		}
	}, [delay]);
}

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
	return Math.round(minutes / 6).toFixed(0);
}

function App() {
	const todaysDate = moment().format("YYYYMMDD");
	const [loggedTimes, setLoggedTimes] = useStickyState([], "loggedTimes");
	const [comment, setComment] = useState("");
	const [lastTimeTouched, setLastTimeTouched] = useState(0);
	const [activity, setActivity] = useState("");
	const stuckAt24 =
		loggedTimes.length > 0 && todaysDate !== loggedTimes[0].date;
	const formatNow = function () {
		if (stuckAt24) {
			return "2400";
		}
		return formatTime(moment());
	};
	const [time, setTime] = useState(formatNow());
	const [importData, setImportData] = useState("");
	const [now, setNow] = useState(formatNow());
	var lastLoggedTime = beginningTime;

	if (loggedTimes.length > 0) {
		lastLoggedTime = last(loggedTimes).time;
	}

	let isValidTime = true;
	try {
		parseTime(time);
	} catch (e) {
		isValidTime = false;
	}
	let durationDefaultValue = isValidTime
		? getDurationMinutes(lastLoggedTime, time)
		: 0;
	const [partialDuration, setPartialDuration] = useState(durationDefaultValue);

	function touchTime() {
		setLastTimeTouched(+new Date());
	}

	const inputTimeRef = useRef(null);
	const activitiesRef = useRef(null);
	const inputActivityRef = useRef(null);
	if (loggedTimes.length > 0) {
		lastLoggedTime = last(loggedTimes).time;
	}

	useEffect(() => {
		activitiesRef.current.scroll({ top: 10000000 });
	});
	useDocumentTitle("PClock " + getDurationMinutes(lastLoggedTime, now));

	useInterval(() => {
		if (!stuckAt24) {
			setNow(formatNow());
		}
		if (lastTimeTouched < +new Date() - 30000) {
			const formattedTime = formatNow();
			setTime(formattedTime);
			const duration = getDurationMinutes(lastLoggedTime, formattedTime);
			setPartialDuration(duration);
		}
	}, 1000);

	useEffect(() => {
		function visibilityChangeFunction() {
			if (!document.hidden) {
				const formattedTime = formatNow();
				setTime(formattedTime);
				const duration = getDurationMinutes(lastLoggedTime, formattedTime);
				setPartialDuration(duration);
				inputActivityRef.current.focus();
			}
		}
		document.addEventListener("visibilitychange", visibilityChangeFunction);

		keyboardJS.bind("/", (e) => {
			const formattedTime = formatNow();
			setTime(formattedTime);
			const duration = getDurationMinutes(lastLoggedTime, formattedTime);
			setPartialDuration(duration);
			setLastTimeTouched(0);
			e.preventDefault();
		});

		keyboardJS.bind("enter", (e) => {
			if (e.target.id === "time") {
				inputActivityRef.current.focus();
			}
			if (e.target.id === "activity") {
				inputActivityRef.current.blur();
				inputActivityRef.current.focus();
			}
		});

		return () => {
			keyboardJS.reset();
			document.removeEventListener(
				"visibilitychange",
				visibilityChangeFunction
			);
		};
	}, [lastTimeTouched, lastLoggedTime]);

	const durationMinutes = getDurationMinutes(lastLoggedTime, now);
	const uberblick = map(
		sortBy(
			uniqBy(loggedTimes, ({ activity }) => activity.trim()),
			"activity"
		),
		function (loggedTime, i) {
			const { activity } = loggedTime;
			const timeMinutes = loggedTimes.reduce(function (sum, entry, j) {
				const startTimeX = j === 0 ? beginningTime : loggedTimes[j - 1].time;
				return (
					sum +
					(entry.activity.trim() === activity.trim()
						? getDurationMinutes(startTimeX, entry.time)
						: 0)
				);
			}, 0);
			return { timeMinutes, activity };
		}
	);
	const uberblickSum = reduce(
		uberblick,
		function (sum, part) {
			return sum + part.timeMinutes;
		},
		0
	);

	return (
		<>
			<div className="activities" ref={activitiesRef}>
				{loggedTimes.length ? (
					<>
						<h3>
							Zeitlog
							<button
								className="btn btn-danger"
								onClick={() => {
									if (
										// eslint-disable-next-line no-restricted-globals
										confirm("Sind sie sicher, den ganzen Zeitlog löschen ?")
									) {
										setLoggedTimes([]);
									}
								}}
							>
								Alles löschen
							</button>
							<textarea
								value={importData}
								onChange={(e) => setImportData(e.target.value)}
								id=""
								name=""
								cols="30"
								rows="10"
							></textarea>
							{importData.length > 0 && (
								<button
									className="btn btn-danger"
									onClick={() => {
										const loggedTimes = [];
										importData.split("\n").forEach(function (line) {
											const data = line.split(/[ \t]+/);
											if (!line.length || !data.length) {
												return;
											}

											const newLog = {
												time: data[0],
												activity: data[1],
											};

											if (data[2]) {
												newLog.comment = data[2];
											}

											loggedTimes.push(newLog);
										});
										setLoggedTimes(loggedTimes);
									}}
								>
									Importieren
								</button>
							)}
						</h3>
						<table>
							<tbody>
								<tr>
									<td className="header">v</td>
									<td className="header">b</td>
									<td className="header">M</td>
									<td className="header">S</td>
									<td className="header">K</td>
									<td className="header">Z</td>
								</tr>
								{map(loggedTimes, function (loggedTime, i) {
									const startTime =
										i === 0 ? beginningTime : loggedTimes[i - 1].time;
									const { time: endTime, activity, comment } = loggedTime;
									return (
										<tr key={i}>
											<td className="activity">{reformatTime(startTime)}</td>
											<td className="activity">{reformatTime(endTime)}</td>
											<td className="activity numeric">
												{getDurationMinutes(startTime, endTime)}
											</td>
											<td className="activity numeric">
												<strong>
													{formatDuration(
														getDurationMinutes(startTime, endTime)
													)}
												</strong>
											</td>
											<td className="activity">{activity}</td>
											<td className="activity comment">{comment}</td>
										</tr>
									);
								})}
								<tr>
									<td className="header">v</td>
									<td className="header">b</td>
									<td className="header">M</td>
									<td className="header">S</td>
									<td className="header">K</td>
									<td className="header">Z</td>
								</tr>
							</tbody>
						</table>
					</>
				) : null}
			</div>
			<div className="inputs">
				<form
					autoComplete="off"
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

						setLoggedTimes(
							loggedTimes.concat({
								time,
								activity: activity.trim(),
								comment,
								date: moment().format("YYYYMMDD"),
							})
						);
						setTime(now);
						setPartialDuration(getDurationMinutes(time, now));
						setLastTimeTouched(0);
						setActivity("");
						setComment("");

						setTimeout(function () {
							activitiesRef.current.scroll({ top: 10000000 });
						}, 10);
						inputActivityRef.current.focus();
					}}
				>
					<table>
						<tbody>
							<tr>
								<td>
									<label htmlFor="time">Uhrzeit</label>
								</td>
								<td>
									<input
										tabIndex="4"
										onKeyDown={(e) => {
											if (e.key === "Tab") {
												inputActivityRef.current.focus();
												e.preventDefault();
											}
										}}
										ref={inputTimeRef}
										type="number"
										id="time"
										autoComplete="off"
										className={`input-${isValidTime ? "valid" : "invalid"}`}
										onChange={(e) => {
											const val = e.target.value;
											setTime(val);
											touchTime();
											let isNewTimeValid = true;
											try {
												parseTime(val);
											} catch (e) {
												isNewTimeValid = false;
											}
											if (isNewTimeValid) {
												const duration = getDurationMinutes(
													lastLoggedTime,
													val
												);
												setPartialDuration(duration);
											}
										}}
										value={time}
									/>
								</td>
								<td>
									<label htmlFor="comment">Zusatz</label>
								</td>
							</tr>
							<tr>
								<td>
									<label htmlFor="activity">Kürzel</label>
								</td>
								<td>
									<input
										ref={inputActivityRef}
										tabIndex="1"
										autoFocus={true}
										type="text"
										id="activity"
										onChange={(e) => setActivity(e.target.value)}
										value={activity}
									/>
								</td>
								<td>
									<input
										type="text"
										tabIndex="2"
										id="comment"
										name=""
										onChange={(e) => setComment(e.target.value)}
										value={comment}
									/>
								</td>
							</tr>
							<tr>
								<td>Bish. Dauer</td>
								<td>
									<strong>
										{durationMinutes > 59
											? `${Math.floor(durationMinutes / 60)}:${(
													durationMinutes % 60
											  )
													.toString()
													.padStart(2, "0")}`
											: `${durationMinutes} min`}
									</strong>
								</td>
								<td></td>
							</tr>
							<tr>
								<td>Dauer (Teil)</td>
								<td>
									<input
										type="number"
										tabIndex="3"
										value={partialDuration}
										onChange={(e) => {
											const val = e.target.value;
											setPartialDuration(val);
											const parsed = parseTime(lastLoggedTime);
											if (val > 0) {
												setTime(formatTime(parsed.add(val, "minutes")));
												touchTime();
											}
										}}
									/>
								</td>
								<td></td>
							</tr>
						</tbody>
					</table>
					<input className="btn btn-primary" type="submit" value="+" />
				</form>
			</div>
			<div className="summary">
				{loggedTimes.length ? (
					<>
						<h3>Überblick</h3>
						<table>
							<thead>
								<tr>
									<td className="header">M</td>
									<td className="header">S</td>
									<td className="header">K</td>
								</tr>
							</thead>
							<tbody>
								{map(uberblick, function ({ timeMinutes, activity }, i) {
									return (
										<tr key={i}>
											<td className="activity numeric">{timeMinutes}</td>
											<td className="activity numeric">
												<strong>{formatDuration(timeMinutes)}</strong>
											</td>
											<td className="activity">{activity}</td>
										</tr>
									);
								})}
								<tr>
									<td colSpan="3">
										<strong>S</strong>
									</td>
								</tr>
								<tr>
									<td>
										<strong>{uberblickSum}</strong>
									</td>
									<td>
										<strong>{formatDuration(uberblickSum)}</strong>
									</td>
									<td>-</td>
								</tr>
							</tbody>
						</table>
					</>
				) : null}
			</div>
		</>
	);
}

export default App;
