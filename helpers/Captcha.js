const request = require("request");

module.exports = (apiKey, captcha, siteKey = "6LekMVAUAAAAAPDp1Cn7YMzjZynSb9csmX5V4a9P", delay = 5000, timeout = 60000) => {
	return new Promise((resolve, reject) => {
		makeRequest("https://api.anti-captcha.com/createTask", {}, {
			clientKey: apiKey,
			task: {
				type: "NoCaptchaTaskProxyless",
				websiteURL: "https://www.omegle.com/",
				websiteKey: siteKey
			}
		}).then(async (res) => {
			if (typeof res.taskId !== "number") {
				reject(res);
				return;
			}

			let isProcessing = true;
			let isRejected = false;

			let _timeout = setTimeout(() => {
				isProcessing = false;
				isRejected = true;

				reject(new Error("Anti-Captcha timeout"));
			}, timeout);

			while (isProcessing) {
				await new Promise(r => setTimeout(r, delay));
				let solved = await makeRequest("https://api.anti-captcha.com/getTaskResult", {}, {
					clientKey: apiKey,
					taskId: res.taskId
				}).catch(() => {});

				if (!solved || solved.status === "processing") {
					continue;
				}

				if (isRejected) {
					break;
				}

				clearTimeout(_timeout);
				resolve(solved);
				break;
			}
		}).catch((err) => {
			reject(err);
		});
	});
}

function makeRequest(uri, queryParameters = {}, postParams = {}) {
	return new Promise((resolve, reject) => {
		request({
			method: "POST",
			uri: uri,
			qs: queryParameters,
			json: postParams
		}, (err, res, body) => {
			if (err) {
				reject(err);
				return;
			}

			resolve(body);
		});
	});
}
