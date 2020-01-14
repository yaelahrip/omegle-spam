const WorkerThreads = require("worker_threads");
const config = WorkerThreads.workerData;
const Omegle = require("./Omegle.js");

(async () => {
	const bot = new Omegle(config.eventRefreshInterval);
	let waitingForCaptcha = false;

	// Custom event
	WorkerThreads.parentPort.on("message", () => {
		if (!waitingForCaptcha) {
			return;
		}
		waitingForCaptcha = false;

		WorkerThreads.parentPort.postMessage({
			type: "captchaContinuing",
			from: WorkerThreads.threadId
		});

		if (bot.waiting || bot.connected) {
			return;
		}

		bot.start(config.interests, {}, config.matchTimeout).catch(() => {});
	});

	bot.on("failStart", () => {
		if (bot.waiting || bot.connected || waitingForCaptcha) {
			return;
		}

		WorkerThreads.parentPort.postMessage({
			type: "failStart",
			from: WorkerThreads.threadId
		});

		bot.start(config.interests, {}, config.matchTimeout).catch(() => {});
	});

	// Omegle events
	bot.on("connected", async () => {
		try {
			waitingForCaptcha = false;

			WorkerThreads.parentPort.postMessage({
				type: "connected",
				from: WorkerThreads.threadId
			});

			let toSend = config.messages[Math.floor(Math.random() * config.messages.length)];
			for (let msg of toSend) {
				WorkerThreads.parentPort.postMessage({
					type: "message",
					from: WorkerThreads.threadId,
					msg: {
						from: "US",
						msg: msg
					}
				});

				await bot.send(msg).catch(() => {});
			}

			bot.disconnect();
			bot.start(config.interests, {}, config.matchTimeout).catch(() => {});
		} catch (err) {
			console.error(err);

			// Restart incase something fails
			await new Promise(p => setTimeout(p, 5000));

			if (bot.waiting || bot.connected || waitingForCaptcha) {
				return;
			}

			bot.start(config.interests, {}, config.matchTimeout).catch(() => {});
		}
	});

	bot.on("strangerDisconnected", async () => {
		if (bot.waiting || bot.connected || waitingForCaptcha) {
			return;
		}

		bot.start(config.interests, {}, config.matchTimeout).catch(() => {});
	});

	bot.on("gotMessage", (msg) => {
		WorkerThreads.parentPort.postMessage({
			type: "message",
			from: WorkerThreads.threadId,
			msg: {
				from: "STRANGER",
				msg: msg
			}
		});
	});

	bot.on("waiting", () => {
		WorkerThreads.parentPort.postMessage({
			type: "waiting",
			from: WorkerThreads.threadId
		});
	});

	bot.on("error", async (err) => {
		WorkerThreads.parentPort.postMessage({
			type: "error",
			from: WorkerThreads.threadId,
			msg: err
		});
	});

	bot.on("recaptchaRequired", (captcha) => {
		waitingForCaptcha = true;

		WorkerThreads.parentPort.postMessage({
			type: "captchaRequired",
			from: WorkerThreads.threadId
		});
	});

	await bot.start(config.interests, {}, config.matchTimeout).catch(() => {});
})();

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);
