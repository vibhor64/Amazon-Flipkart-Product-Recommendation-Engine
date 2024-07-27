function storeFileForCurrentTab(fileName, responseData, pageUrl) {
  return new Promise((resolve) => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      let currentTab = tabs[0];
      let key = `file_${currentTab.id}_${fileName}`;
      
      let data = {
        response: responseData,
        url: pageUrl
      };
      
      let storageObject = {};
      storageObject[key] = data;
      
      chrome.storage.local.set(storageObject, function() {
        console.log('File and URL stored for current tab');
        resolve();
      });
    });
  });
}

function checkFileExistsForCurrentTab(fileName) {
  return new Promise((resolve) => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      let currentTab = tabs[0];
      let key = `file_${currentTab.id}_${fileName}`;
      
      chrome.storage.local.get(key, function(result) {
        if (result[key]) {
          resolve({exists: true, content: result[key].response, url: result[key].url});
        } else {
          resolve({exists: false, content: null, url: null});
        }
      });
    });
  });
}

async function getPageHTML() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  let result;
  try {
    [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        function getParentHTML(selector) {
          const element = document.querySelector(selector);
          return element?.parentElement?.outerHTML || '';
        }

        const productTitle = document.getElementById('productTitle')?.innerHTML || '';

        const featureBullets = document.querySelector('div.feature-bullets');

        const productRating = document.querySelector('#acrPopover .a-size-base.a-color-base')?.innerText || '';

        let itemDescription = ''

        if (featureBullets) {
          itemDescription = [...featureBullets.querySelectorAll('ul.a-unordered-list li span.a-list-item')]
            .map(item => item.innerHTML)
            .join(' ');
          console.log(itemDescription);
        } else {
          // console.error('Feature bullets element not found.');
          itemDescription = [...document.querySelectorAll('ul.a-unordered-list li span.a-list-item.a-size-base.a-color-base')].map(item => item.innerHTML).join(' | ');
        }
        if (itemDescription === '') {
          itemDescription = [...document.querySelectorAll('#feature-bullets ul.a-unordered-list li span.a-list-item')].map(item => item.innerText).join(' | ');
        }



        let reviews = '';
        let ratingList = '';

        try {
          reviews = [...document.querySelectorAll('div[data-hook="review-collapsed"]')]
            .filter(review => !review.classList.contains('cr-video-desktop')) // Filter out unwanted elements
            .map(review => {
              // Extract all span tags inside each review
              const spans = [...review.querySelectorAll('span')];
              return spans.map(span => span.innerHTML).join('');
            })
            .join(' | ');

          const topCustomerReviewsWidget = document.querySelector('div[data-hook="top-customer-reviews-widget"].a-section.review-views.celwidget');
          ratingList = [...topCustomerReviewsWidget.querySelectorAll('span.a-icon-alt')]
            .map(span => span.innerHTML)
            .join(' | ');
        } catch (e) {
          reviews = '';
          ratingList = '';
        }



        console.log('Title of the product: ', productTitle);
        console.log(productRating);
        console.log(itemDescription);
        console.log(reviews);
        console.log(ratingList);

        return {
          productTitle,
          productRating,
          itemDescription,
          reviews,
          ratingList
        };
      },
    });
  } catch (e) {
    document.body.textContent = 'Cannot access page';
    console.error(e);
    return;
  }

  const { productTitle, productRating, itemDescription, reviews, ratingList } = result;
  let LLMprompt;

  if (!reviews) {
    LLMprompt = "I found this item on Amazon named " + productTitle +
      " with a rating of " + productRating + ". Summarize this product based off its rating and product description within 30 lines and generate a table containing pros and cons of this product, and give a score out of 10 whether one should buy this product or not. This is the item description (note it may be biased): " + itemDescription;

    // LLMresponse = "No reviews found, our product rating might not be accurate... \n"
  }
  else {
    LLMprompt = "I found this item on Amazon named " + productTitle +
      " with a rating of " + productRating + ". Summarize these Amazon reviews based on its product ratings and description on its webpage within 30 lines and generate a table containing pros and cons of this product. The reviews are: " + reviews +
      " and their respective ratings are: " + ratingList +
      ". This is the item description (note it may be biased): " + itemDescription +
      ". Also, provide a score out of 10 on whether one should buy this product or not.";
  }

  console.log('going to llm')

  // Send HTML to backend
  try {
    const response = await fetch('https://render-fastapi.vercel.app/fetchAmazon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: LLMprompt })
    });
  
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Response:', data.response);

    document.getElementById('backend-response').innerHTML = data.response;

    // Cache the result
    // storeFileForCurrentTab('example.txt', data.response);
    const currentPageUrl = tab.url
    storeFileForCurrentTab('example.txt', data.response, currentPageUrl);


  } catch (error) {
    console.error('Error:', error);
    document.getElementById('backend-response').innerHTML = 'Error communicating with backend';
  }
};


(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentPageUrl = tab.url

  const {exists, content, url} = await checkFileExistsForCurrentTab('example.txt');
  
  if (exists && url === currentPageUrl) {
    console.log('File exists:', content);
    document.getElementById('backend-response').innerHTML = content;
    document.getElementById('loading').style.display = 'none';
    document.getElementById('footer').style.display = 'block';
    return; // Exit the function early if the file exists
  } else {
    console.log('File does not exist');
  }

  if (tab.url.includes('amazon.in') && (tab.url.includes('/dp/') || tab.url.includes('/gp/product/') || tab.url.includes('/ASIN/') || tab.url.includes('/gp/offer-listing/') || tab.url.includes('/gp/aw/d/'))) {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('open-amazon').style.display = 'none';
    await getPageHTML();
    document.getElementById('loading').style.display = 'none';
    document.getElementById('footer').style.display = 'block';
  } else {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('open-amazon').style.display = 'block';
  }
})();