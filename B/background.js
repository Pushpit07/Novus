chrome.contextMenus.create({
	id: "analyzeIntentContextMenuItem",
	title: "Analyze Text",
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

					if (!key) {
						overlayDiv.remove();
						wrapperDiv.remove();
						alert("Please enter your OpenAI API key in the extension");
						return;
					}

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
						const basePrompt = `
						You are an expert at phishing and social engineering detection. Use insight to describe this message "${selectedText}" and describe if it looks like a legitimate OR phishing/social engineering message. Don't forget to explain your thesis why, like you would to a ten year old.
						List down the result in points and start each of the bullet points with an appropriate emoji that displays well in a browser extension.
                        `;

						// Add this to call GPT-3
						const baseCompletion = await generate(`${basePrompt}\n`);

						// Let's see what we get!
						if (baseCompletion) {
							const summary_result = baseCompletion.text;
							displayResult(summary_result);
						}
					} catch (error) {
						console.log(error);
					}
				};

				const displayResult = (summary_result) => {
					document.getElementById(contentDivId).innerHTML =
						`<b style="text-align: center;">Based on our analysis:</b>\n\n` + "<div>" + summary_result + "</div>";
					document.getElementById(wrapperDivId).style.display = "block";
				};

				try {
					const analysisDiv = document.getElementById(wrapperDivId);
					analysisDiv.remove();
				} catch (e) {}

				const selection = window.getSelection();
				const range = selection.getRangeAt(0);

				// Get the parent element of the selected text
				const parentElement = range.commonAncestorContainer.parentElement;

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
				wrapperDiv.style.top = String(top + 60) + "px";
				wrapperDiv.style.left = rect.left + "40px";
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

				const imgElem = document.createElement("img");
				imgElem.setAttribute(
					"src",
					"https://image.typedream.com/cdn-cgi/image/width=384/https://api.typedream.com/v0/document/public/11ef37f3-33f8-411e-9a31-45f48d78e5a2_Novus_logo_1000_1000_px_1000_300_px_500_500_px_500_250_px_500_175_px_png.png?bucket=document"
				);
				imgElem.setAttribute("alt", "Logo");
				imgElem.style.width = "90px";
				imgElem.style.height = "30px";
				imgElem.style.display = "block";
				imgElem.style.margin = "auto";
				imgElem.style.marginTop = "30px";

				wrapperDiv.appendChild(imgElem);

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

				await analyzeText(selectedText);
			},
		});
	}
});
