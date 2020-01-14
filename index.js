const WorkerThreads = require("worker_threads");
const path = require("path");
const Omegle = require("./helpers/Omegle.js");
const Captcha = require("./helpers/Captcha.js");
const makeRequest = require("./helpers/makeRequest.js");
const config = require("./config.json");
const colors = [
	// "\x1b[30m",
	"\x1b[31m",
	"\x1b[32m",
	"\x1b[33m",
	"\x1b[34m",
	"\x1b[35m",
	"\x1b[36m",
	"\x1b[37m"
];
const colReset = "\x1b[0m";
const capBot = new Omegle(config.eventRefreshInterval);
const workers = new Map();
let terminatedWorkers = [];
let doingCaptcha = false;
let workerIdCounter = 0n;

// Setup our bot for captcha solving
capBot.on("connected", () => {
	capBot.disconnect();

	doingCaptcha = false;

	console.log("[MASTER] Captcha solved, signalling bots to continue...");

	// Successfully solved captcha! Lets reboot everything
	workers.forEach((worker) => {
		// It doesn't matter what we send, it will continue on any message
		worker.postMessage("continue");
	});
});

capBot.on("failStart", () => {
	console.log("[MASTER] Failed to start, retrying... Possibly banned");

	capBot.start(config.interests).catch(() => {});
});

capBot.on("error", console.error);
capBot.on("recaptchaRequired", (captcha) => {
	console.log("[MASTER] Captcha required, solving...");

	Captcha(config.antiCaptchaKey, captcha, config.captchaSiteKey, config.antiCaptchaDelay, config.antiCaptchaTimeout).then(async (solved) => {
		if (solved.status !== "ready") {
			console.error(solved);
			await capBot.start(config.interests).catch(() => {});
			return;
		}

		console.log("[MASTER] Captcha solved, trying to verify with omegle...");

		let res = undefined;
		do {
			res = await makeRequest("https://omegle.com/recaptcha", {}, {
				response: solved.solution.gRecaptchaResponse,
				id: capBot.clientID
			}).catch(console.error);
		} while (typeof res === "undefined");
	}).catch((err) => {
		console.error(err);
	});
});

// Create patterns & workers
(async () => {
	// Patterns
	let threads = [];
	for (let i = 0; i < config.threads.length; i++) {
		let identifier = config.threads[i];
		let pattern = config.patterns.find(p => p.identifier === identifier);
		if (typeof pattern !== "object") {
			console.log("Failed to find pattern for \"" + identifier + "\"");
			continue;
		}

		threads.push(pattern.pattern);

		console.log("Added thread " + threads.length + " to list with " + pattern.pattern.interests.length + " interest" + (pattern.pattern.interests.length === 1 ? "" : "s") + " and " + pattern.pattern.messages.length + " message" + (pattern.pattern.messages.length === 1 ? "" : "s"));
	}

	// Workers
	for (let i = 0; i < threads.length; i++) {
		let colI = i;
		while (colI >= colors.length) {
			colI -= colors.length;
		}

		createWorker({
			...threads[i],
			eventRefreshInterval: config.eventRefreshInterval,
			matchTimeout: config.matchTimeout
		}, colors[colI]);
	}
})();

function createWorker(threadConfig, color) {
	const worker = new WorkerThreads.Worker(path.join(__dirname, "helpers", "worker.js"), {
		workerData: threadConfig
	});

	worker.uniqueID = ++workerIdCounter;
	workers.set(worker.uniqueID, worker);

	worker.on("online", () => console.log("Worker online"));
	worker.on("error", console.error);
	worker.on("exit", () => {
		if (terminatedWorkers.includes(worker.uniqueID)) {
			return;
		}

		workers.delete(worker.uniqueID);
		createWorker(threadConfig, color);
	});

	// Console log
	worker.on("message", (msg) => {
		switch (msg.type) {
			case "failStart": {
				console.log(color, msg.from, "Failed to find a match within 30 seconds");
				break;
			}
			case "connected": {
				console.log(color, msg.from, "Connected to a stranger!");
				break;
			}
			case "message": {
				console.log(color, msg.from, msg.msg.from + ": " + msg.msg.msg);
				break;
			}
			case "waiting": {
				console.log(color, msg.from, "Waiting...");
				break;
			}
			case "error": {
				console.error(msg.msg);
				break;
			}
			case "captchaRequired": {
				console.log(color, msg.from, "Requiring captcha");

				if (doingCaptcha) {
					break;
				}
				doingCaptcha = true;

				if (!config.captchaSiteKey || config.captchaSiteKey.length <= 0 || !config.antiCaptchaKey || config.antiCaptchaKey.length <= 0) {
					if (!config.captchaSiteKey || config.captchaSiteKey.length <= 0) {
						console.log(color, msg.from, "No Omegle Gogle Captcha Site Key provided - Cannot solve Captcha - Stopping...");
					} else {
						console.log(color, msg.from, "No Anti-Captcha API Key provided - Cannot solve Captcha - Stopping...");
					}

					terminatedWorkers.push(worker.uniqueID);
					worker.terminate();
					break;
				}

				console.log("[MASTER] Starting bot to get captcha...");
				capBot.start().catch(() => {});
				break;
			}
			case "captchaContinuing": {
				console.log(color, msg.from, "Continuing...");
				break;
			}
			default: {
				console.warn("Unhandled msg:", msg);
				break;
			}
		}
	});
}

// Log in beautiful colors (not beautiful)
const ogCL = console.log;
console.log = (...args) => {
	if (typeof args[1] === "undefined") {
		ogCL(...args);
		return;
	}

	let color = args[0];
	let from = args[1];
	let text = args.slice(2).join(" ");

	ogCL(color + " [Worker " + from + "] " + text + colReset);
}
