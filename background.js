const PREFERENCES_STORAGE_KEY = "FACILE4ALL-preferences";

const defaultPreferences = {
	guideline4Orac: true,
	guideline10Orac: false,
};

chrome.runtime.onInstalled.addListener(() => {
	console.log("setting preferences", PREFERENCES_STORAGE_KEY, defaultPreferences)
	chrome.storage.sync.set({PREFERENCES_STORAGE_KEY: defaultPreferences});
});

chrome.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {
		if (request.execute) {
			var query = { active: true, currentWindow: true };
			chrome.tabs.query(query, (tabs) => {
				console.log("do base transformation", tabs[0]);
				executeTransformation(tabs[0]);
			});
			return;
		}

		console.log("On message", request);

		const URL = "http://127.0.0.1:5002/accessjobs";

		let data = {
			"content": {
				"meetingID": "e09e58a0-da3c-11eb-868e-59696b4b28f3",
				"secNumber": 0,
				"URL": "http://responseurl.com",
				"subtitle": request.text
			}
		};

		fetch(URL, {
			method: "POST",
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(data)
		})
			.then(res => {
				res.json().then((output) => {
					sendResponse(output);
				});
			});

		return true;
	}
);

const CONTEXT_MENU_ALL = "Facile4All - all";

chrome.contextMenus.create({
	title: "Facile4All - make it easy",
	contexts: ["all"],
	id: CONTEXT_MENU_ALL
});


chrome.contextMenus.onClicked.addListener(function (info, tab) {
	executeTransformation(tab);
});

function executeTransformation(tab) {
	console.log("Executing translatePageContent");

	chrome.scripting.executeScript({
		target: {tabId: tab.id},
		function: translatePageContent,
	});

	chrome.scripting.insertCSS({
		target: { tabId: tab.id },
		files: ["tooltip.css"]
	});
}

function translatePageContent() {
	function enhanceParagraphs() {
		ps = window.document.querySelectorAll("p");
		ps.forEach((p) => {
			p.classList.add("changed-paragraph");
			let button = document.createElement("button");
			button.classList.add("changed-paragraph-button");
			button.innerHTML = "Más fácil<div class=\"hidden lds-ring\"><div></div><div></div><div></div><div></div></div>";
			button.onclick = () => {
				button.querySelector(".lds-ring").classList.remove("hidden");
				console.log("removing hidden", button.classList);
				translateParagraph(p);
			};
			p.parentNode.insertBefore(button, p);
		});
	}

	function translateParagraph(p) {
		console.log("translateParagraph")
		let text = p.innerText;

		chrome.runtime.sendMessage({text}, (data) => replaceParagraph(p, data));
	}

	function replaceParagraph(p, simplifiedOutput) {
		console.log("got data back!", simplifiedOutput);
		console.log("translated: ", simplifiedOutput.data.simplifiedText);

		let simplified = simplifiedOutput.data.simplifiedText;
		if (Array.isArray(simplified)) {
			simplified = simplified[0]
		}

		let outputHTML = ""

		const splitText = ".";
		let originalHTMLSent = p.innerHTML.split(splitText);
		let originalSent = p.innerText.split(splitText);
		let simplifiedSent = simplified.split(splitText);

		console.log("originalSent", originalSent);

		for (const idx in originalSent.filter((x) => x.length > 0)) {
			if (originalSent[idx] === simplifiedSent[idx]) {
				outputHTML += originalHTMLSent[idx] + splitText;
			} else {
				let originalText = originalSent[idx] + splitText;
				let outputText = simplifiedSent[idx] + splitText;
				outputHTML += "<span class='transformed tooltip'>" +
					outputText +
					getTooltipText(originalText, outputText) +
				"</span>";
			}
		}

		p.innerHTML = outputHTML;
		p.parentNode.querySelector(".changed-paragraph-button > .lds-ring").classList.add("hidden");
		p.onclick = null;
	}

	function getTooltipText(originalText, outputText) {
		let originalHTML = "";
		let outputHTML = "";

		const intersection = (array1, array2) => {
			const set2 = new Set(array2);
			return array1.filter(x => set2.has(x));
		};

		const splitStr = " ";
		let orgSplit = originalText.split(splitStr);
		let outSplit = outputText.split(splitStr);
		const intersection_idx_org = intersection(orgSplit, outSplit);
		const intersection_idx_out = intersection(outSplit, orgSplit);

		for (const idx in orgSplit) {
			if (intersection_idx_org.includes(orgSplit[idx])) {
				originalHTML += orgSplit[idx] + splitStr;
			} else {
				originalHTML += "<strong>" + orgSplit[idx] + splitStr + "</strong>";
			}
		}
		for (const idx in outSplit) {
			if (intersection_idx_out.includes(outSplit[idx])) {
				outputHTML += outSplit[idx] + splitStr;
			} else {
				outputHTML += "<strong>" + outSplit[idx] + splitStr + "</strong>";
			}
		}

		let output = "<span class='tooltiptext'>" +
			"<span class='original'><span class='title'>Original: </span><span>";
		output += originalHTML;
		output += "</span> <span class='arrow-right'></span> </span>" +
			"<span class='simplified'><span class='title'>Simplified: </span><span>";
		output += outputHTML;
		output += "</span></span></span>";
		return output
	}



	chrome.storage.sync.get("FACILE4ALL-preferences", ({preferences}) => {
		console.log("got preferences", preferences);
	});

	enhanceParagraphs();
}
