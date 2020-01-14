const makeRequest = require("./makeRequest.js");
const Events = require("events");

module.exports = class Omegle extends Events {
	constructor(eventRefreshInterval, baseURL = "https://omegle.com") {
		super();

		this.eventRefreshInterval = eventRefreshInterval;
		this.baseURL = baseURL;

		this.waiting = false;
		this.connected = false;
		this.searchTimedout = false;

		this.clientID = null;
		this.eventsInterval = null;
		this.searchTimeout = null;
	};

	start(interests = [], additionalQuery = {}, searchTimeoutMS = 30000) {
		return new Promise(async (resolve, reject) => {
			this.waiting = true;
			this.connected = false;
			this.searchTimedout = false;

			this.searchTimeout = setTimeout(() => {
				this.searchTimedout = true;

				this.disconnect(true);
				this.emit("failStart");
			}, searchTimeoutMS);

			let qs = {
				rcs: 1,
				firstevents: 1,
				lang: "en",
				caps: "recaptcha2",
				...additionalQuery
			};

			if (interests.length > 0) {
				qs.topics = JSON.stringify(interests);
			}

			makeRequest(this.baseURL + "/start", qs, {}).then((res) => {
				if (this.searchTimedout) {
					return;
				}

				if (typeof res.clientID !== "string") {
					reject(res);
					return;
				}

				this.clientID = res.clientID;
				eventHandler.call(this, res.events);

				this.eventsInterval = setInterval(async () => {
					let res = await makeRequest(this.baseURL + "/events", {}, { id: this.clientID }).catch(() => { });

					if (this.searchTimedout) {
						return;
					}

					if (!res) {
						return;
					}

					eventHandler.call(this, res);
				}, this.eventRefreshInterval);

				resolve(res);
			}).catch((err) => {
				reject(err);
			});
		});
	};

	startTyping() {
		return makeRequest(this.baseURL + "/typing", {}, { id: this.clientID });
	};

	stopTyping() {
		return makeRequest(this.baseURL + "/stoppedtyping", {}, { id: this.clientID });
	};

	send(msg) {
		return makeRequest(this.baseURL + "/send", {}, { id: this.clientID, msg: msg });
	};

	disconnect(withoutRequest = false, dontResetClientID = false) {
		if (!withoutRequest) {
			makeRequest(this.baseURL + "/disconnect", {}, { id: this.clientID }).catch(() => { });
		}

		clearInterval(this.eventsInterval);
		this.eventsInterval = null;

		if (!dontResetClientID) {
			this.clientID = null;
		}

		this.waiting = false;
		this.connected = false;
	};

	getStatus() {
		return makeRequest(this.baseURL + "/status", {}, {});
	};
}

function eventHandler(events) {
	for (let event of events) {
		this.emit("debug", ...event);

		if (!["recaptchaRequired", "connected", "strangerDisconnected", "gotMessage", "commonLikes", "identDigests", "statusInfo", "typing", "stoppedTyping", "error", "waiting"].includes(event[0])) {
			this.emit("unhandled", ...event);
		}

		if (event[0] === "strangerDisconnected") {
			this.disconnect(true);
		}

		if (event[0] === "connected") {
			this.waiting = false;
			this.connected = true;
		}

		if (event[0] === "recaptchaRequired") {
			this.disconnect(true, true);
		}

		if (["connected", "recaptchaRequired", "error"].includes(event[0])) {
			clearTimeout(this.searchTimeout);
			this.searchTimeout = null;
		}

		this.emit(event[0], ...event.slice(1));
	}
}
