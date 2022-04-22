let translateButton = document.getElementById("translate");

console.log("translateButton", translateButton)
// When the button is clicked, inject translatePageContent into current page
translateButton.onclick = async () => {
	let [tab] = await chrome.tabs.query({active: true, currentWindow: true});

	console.log("tab", tab);
	chrome.runtime.sendMessage({"execute": true}, (data) => {
		console.log("done with transform");
	});
};
