chrome.contextMenus.create({
	id: "analyzeIntentContextMenuItem",
	title: "Analyze Intent",
	contexts: ["selection"],
});

chrome.contextMenus.onClicked.addListener(async function (info, tab) {
	if (info.menuItemId === "analyzeIntentContextMenuItem") {
		// Code to execute when the button is clicked
		const selectedText = info.selectionText;
		chrome.scripting.executeScript({
			target: { tabId: tab.id },
			args: [selectedText],
			func: async (selectedText) => {
				// chrome.runtime.sendMessage({ type: "selectedText", data: selectedText });
				const wrapperDivId = "wrapper-div";
				const contentDivId = "novus-analyze-intent-popup";

				// Function to get + decode API key
				const getKey = () => {
					return new Promise((resolve, reject) => {
						chrome.storage.local.get(["openai-key"], (result) => {
							if (result["openai-key"]) {
								const decodedKey = atob(result["openai-key"]);
								resolve(decodedKey);
							}
						});
					});
				};

				const generate = async (prompt) => {
					// Get your API key from storage
					const key = await getKey();
					const url = "https://api.openai.com/v1/completions";
					console.log("key:", key);

					// Call completions endpoint
					try {
						const completionResponse = await fetch(url, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								Authorization: `Bearer ${key}`,
							},
							body: JSON.stringify({
								model: "text-davinci-003",
								prompt: prompt,
								max_tokens: 3000,
								temperature: 0.7,
							}),
						});

						// Select the top choice and send back
						const completion = await completionResponse.json();
						if (completion.error) {
							alert("OpenAI Quota Exceeded\n\n" + completion.error.message);
							return;
						}
						return completion.choices.pop();
					} catch (error) {
						console.log(error);
						alert(error.message);
						return;
					}
				};

				const analyzeText = async (selectedText) => {
					try {
						const basePromptPrefix = `
                        You are an expert at phishing and social engineering detection. Use insight to describe the message given below and describe if it looks like a legitimate or phishing/social engineering message.

                        Message:
                        `;

						// Add this to call GPT-3
						const baseCompletion = await generate(`${basePromptPrefix} ${selectedText}\n`);

						// Let's see what we get!
						if (baseCompletion) {
							const summary_result = baseCompletion.text;
							displayResult(summary_result);
							console.log(summary_result);
						}
					} catch (error) {
						console.log(error);
					}
				};

				const displayResult = (summary_result) => {
					document.getElementById(contentDivId).innerHTML = `<b style="text-align: center;">Based on our analysis:</b>\n` + summary_result;
					document.getElementById(wrapperDivId).style.display = "block";
				};

				try {
					const analysisDiv = document.getElementById(wrapperDivId);
					analysisDiv.remove();
				} catch (e) {}

				const selection = window.getSelection();
				const range = selection.getRangeAt(0);
				// Save the range for later use
				const savedRange = range.cloneRange();

				// Get the parent element of the selected text
				const parentElement = range.commonAncestorContainer.parentElement;
				// Do something with the parent element
				// console.log("Selected text:", selectedText);
				// console.log("Parent element:", parentElement);

				// Create the overlay div
				const overlayDiv = document.createElement("div");
				overlayDiv.style.position = "fixed";
				overlayDiv.style.top = "0";
				overlayDiv.style.left = "0";
				overlayDiv.style.width = "100%";
				overlayDiv.style.height = "100%";
				overlayDiv.style.background = "rgba(0, 0, 0, 0.5)";
				overlayDiv.style.zIndex = "99999";
				overlayDiv.style.backdropFilter = "blur(5px)";
				document.body.appendChild(overlayDiv);

				const rect = parentElement.getBoundingClientRect();
				const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
				const top = rect.top + scrollTop;

				// create a new div element
				const wrapperDiv = document.createElement("div");
				wrapperDiv.id = wrapperDivId;
				wrapperDiv.style.position = "absolute";
				wrapperDiv.style.top = String(top + 20) + "px";
				// wrapperDiv.style.left = String(parseInt(parentElement.offsetLeft) + parentElement.offsetWidth) + "px";
				wrapperDiv.style.left = rect.right + "40px";
				wrapperDiv.style.width = "300px";
				wrapperDiv.style.background = "#eee";
				wrapperDiv.style.padding = "20px";
				wrapperDiv.style.borderRadius = "8px";
				wrapperDiv.style.border = "1px solid #ff6e41";
				wrapperDiv.style.zIndex = "999999";

				const contentDiv = document.createElement("div");
				contentDiv.id = contentDivId;
				contentDiv.innerHTML = "Summarizing...";
				contentDiv.style.padding = "0px 4px 0px 0px";
				contentDiv.style.whiteSpace = "pre-wrap";
				wrapperDiv.appendChild(contentDiv);

				const elem = document.createElement("img");
				elem.setAttribute("src", "./assets/logo.png");
				elem.setAttribute("height", "768");
				elem.setAttribute("width", "1024");
				elem.setAttribute("alt", "Logo");
				wrapperDiv.appendChild(elem);

				// create close button
				const closeButton = document.createElement("button");
				closeButton.id = "close-button";
				closeButton.innerText = "x";
				closeButton.style.position = "absolute";
				closeButton.style.padding = "0.5px 6px 2px 6px";
				closeButton.style.backgroundColor = "#fff";
				closeButton.style.borderRadius = "100%";
				closeButton.style.top = "8px";
				closeButton.style.right = "8px";
				closeButton.addEventListener("click", () => {
					overlayDiv.remove();
					wrapperDiv.remove();
				});
				wrapperDiv.appendChild(closeButton);

				// add the new div element to the DOM
				document.body.appendChild(wrapperDiv);

				// Restore the selection
				// selection.removeAllRanges();
				// selection.addRange(savedRange);

				// // create a new shadow root for the parent element
				// const shadow = parentElement.attachShadow({ mode: "open" });
				// // add the new div element to the shadow DOM
				// shadow.appendChild(div);

				// await analyzeText(selectedText);
			},
		});
	}
});

// chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
// 	if (req.type === "selectedText") {
// 		var selectedText = req.data;
// 		console.log("selectedText:", selectedText);
// 		// var popupDiv = document.getElementById("popup-div");
// 		// popupDiv.innerHTML = selectedText;
// 	}
// });
