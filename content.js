chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "getHTML") {
      console.log(document.documentElement.outerHTML);
    }
  });