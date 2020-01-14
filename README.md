# Omegle Spam

Some small project I made over 10 months ago so don't mind the ugly code. Connects to a stranger, sends random message(s), disconnects from the stranger and repeats. Includes Anti-Captcha for automatically solving Google Captcha.

---

# Requirements

- [NodeJS](https://nodejs.org/)
- [A bit of JSON knowledge](https://www.json.org/)

# Installation

1. Download this repository
2. Extract the downloaded zip into a folder
3. Open a command prompt *inside* the folder
4. Enter `npm install`
5. Change the `config.json` to your preferences
6. Run the bot using `node index.js`

# Config

- eventRefreshInterval `Number`: Interval in milliseconds how often we fetch events
- matchTimeout `Number`: Max amount of time in milliseconds we will search for a match
- captchaSiteKey `String`: Google Captcha site key (Should never change so leave it default)
- antiCaptchaKey `String`: Optional [Anti-Captcha](https://anti-captcha.com/) API key (Use `""` to disable)
- antiCaptchaDelay `Number`: Time in milliseconds how often we check for the captcha to be completed
- antiCaptchaTimeout `Number`: Maximum amount of time in milliseconds we wait before cancelling
- patterns `Array`: Array of objects defining different templates - [Read More](#patterns)
- threads `Array`: Array of template names, this also defines the amount of workers which we will start, it is recommended to use only one worker so you don't get a captcha every minute.

# Patterns

A pattern is like a template, you set the settings, give it a name and then you can use that name in the `threads` array to create a worker which uses that specific template.

- identifier `String`: Unique name for the pattern
- pattern `Object`:
  - interests `Array`: Array of strings defining your interests for matching with others
  - messages `Array`: Array of arrays, an array will randomly be selected
    - *Content* `Array`: Array of strings, each string will be sent to the other user one after another.

### Example

The following example pattern is named `helloexample`, workers using this pattern will search for strangers with matching interests including `discord`, `communication`, and `teamspeak`. After connecting to a stranger the bot will randomly select one of the arrays, if it selects the first one the bot will send `Hello World!` and then `How is the weather today?` after.

The setup looks like this:

```
{
	"identifier": "helloexample",
	"pattern": {
		"interests": [
			"discord",
			"communication",
			"teamspeak"
		],
		"messages": [
			[
				"Hello World!",
				"How is the weather today?"
			],
			[
				"H",
				"e",
				"l",
				"l",
				"o"
			]
		]
	}
}
```
