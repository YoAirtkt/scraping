const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false }); // set to true later for production
  const page = await browser.newPage();

  const url = 'https://cruise.airtkt.com/app/0/cruise/0/search.html';

  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  console.log('Page loaded.');

  // Wait for the main content to load, including the cruise results and filter section
  console.log('Waiting for cruise results to load...');
  await page.waitForSelector('.cruise_result_item', { state: 'visible', timeout: 30000 }); // Increased timeout for robustness
  console.log('Cruise results loaded.');

  /**
   * Helper function to extract options from a custom selection list (dropdown)
   * @param {string} triggerSelector - CSS selector for the input/element that opens the dropdown.
   * @param {string} listContainerSelector - CSS selector for the main container of the options list (e.g., .selection-list-results-body).
   * @param {string} optionsSelector - CSS selector for the individual option elements within the list (e.g., ul li:not(.select-all)).
   * @param {string} closeButtonSelector - CSS selector for the button that closes the dropdown.
   * @returns {Promise<Array<{elementId: string, dataOption: string, name: string}>>} - Array of extracted options.
   */
  async function extractCustomDropdownData(triggerSelector, listContainerSelector, optionsSelector, closeButtonSelector) {
    const data = [];
    try {
      console.log(`Attempting to click trigger: ${triggerSelector}`);
      await page.click(triggerSelector);
      console.log(`Clicked ${triggerSelector}. Waiting for list container: ${listContainerSelector}`);

      await page.waitForSelector(listContainerSelector, { state: 'visible', timeout: 15000 });
      console.log(`List container ${listContainerSelector} is visible. Waiting for options: ${optionsSelector}`);

      await page.waitForSelector(optionsSelector, { state: 'visible', timeout: 10000 });
      console.log('Options found. Extracting data...');

      const extractedOptions = await page.$$eval(optionsSelector, nodes => {
        return nodes.map(li => {
          const input = li.querySelector('input[type="checkbox"]');
          const labelDiv = li.querySelector('label div'); // The text is inside a div within the label

          if (input && labelDiv) {
            return {
              elementId: input.id,
              dataOption: input.dataset.option, // This holds the actual ID like '1', '2', etc.
              name: labelDiv.innerText.trim()
            };
          }
          return null;
        }).filter(item => item !== null);
      });

      data.push(...extractedOptions);
      console.log(`Extracted ${data.length} items.`);

      // Close the dropdown
      console.log(`Attempting to close dropdown using: ${closeButtonSelector}`);
      await page.click(closeButtonSelector);
      console.log('Dropdown closed.');
      // Wait for the dropdown to be hidden before proceeding
      await page.waitForSelector(listContainerSelector, { state: 'hidden', timeout: 5000 });
      console.log('Dropdown is hidden.');

    } catch (error) {
      console.error(`Error extracting data from ${triggerSelector}:`, error.message);
    }
    return data;
  }

  // --- Extract Destinations Data ---
  console.log('\n--- Extracting Destinations Data ---');
  const destinations = await extractCustomDropdownData(
    'input#destination_ids[data-selection-list-trigger="search[destination_ids]"]',
    '.form-field[data-component="selection-list"] .selection-list-results-body', // Specific container for Destinations
    'ul.selection-list-results-list li:not(.select-all)',
    '.form-field[data-component="selection-list"] .selection-list-cta-close a.button' // Specific close button for Destinations
  );
  console.log('Extracted Destinations:', destinations);

  // --- Extract Cruise Lines Data ---
  console.log('\n--- Extracting Cruise Lines Data ---');
  const cruiseLines = await extractCustomDropdownData(
    'input#vendor_ids[data-selection-list-trigger="search[vendor_ids]"]',
    '.form-field[data-param-vendors] .selection-list-results-body', // Specific container for Cruise Lines
    'ul.selection-list-results-list li:not(.select-all)',
    '.form-field[data-param-vendors] .selection-list-cta-close a.button' // Specific close button for Cruise Lines
  );
  console.log('Extracted Cruise Lines:', cruiseLines);

  // --- Extract Cruise Ships Data ---
  console.log('\n--- Extracting Cruise Ships Data ---');
  const cruiseShips = await extractCustomDropdownData(
    'input#ship_ids[data-selection-list-trigger="search[ship_ids]"]',
    '.form-field[data-param-ships] .selection-list-results-body', // Specific container for Cruise Ships
    'ul.selection-list-results-list li:not(.select-all)',
    '.form-field[data-param-ships] .selection-list-cta-close a.button' // Specific close button for Cruise Ships
  );
  console.log('Extracted Cruise Ships:', cruiseShips);

  // --- Extract Embarkation Ports Data ---
  console.log('\n--- Extracting Embarkation Ports Data ---');
  const embarkationPorts = await extractCustomDropdownData(
    'input#departure_port_ids[data-selection-list-trigger="search[departure_port_ids]"]',
    '.form-field.form-row-embarkation .selection-list-results-body', // Specific container for Embarkation Ports
    'ul.selection-list-results-list li:not(.select-all)',
    '.form-field.form-row-embarkation .selection-list-cta-close a.button' // Specific close button for Embarkation Ports
  );
  console.log('Extracted Embarkation Ports:', embarkationPorts);

  // --- Extract Ports of Call Data ---
  console.log('\n--- Extracting Ports of Call Data ---');
  const portsOfCall = await extractCustomDropdownData(
    'input#port_of_call_ids[data-selection-list-trigger="search[port_of_call_ids]"]',
    '.form-field:has(input#port_of_call_ids) .selection-list-results-body', // Specific container for Ports of Call
    'ul.selection-list-results-list li:not(.select-all)',
    '.form-field:has(input#port_of_call_ids) .selection-list-cta-close a.button' // Specific close button for Ports of Call
  );
  console.log('Extracted Ports of Call:', portsOfCall);

  // --- Extract Cruise Space Specials Data ---
  console.log('\n--- Extracting Cruise Space Specials Data ---');
  const cruiseSpaceSpecials = await extractCustomDropdownData(
    'input#promotion_tag_ids[data-selection-list-trigger="search[promotion_tag_ids]"]',
    '.form-field.search-form-marketing-code + .form-field:has(input#promotion_tag_ids) .selection-list-results-body', // Specific container for Cruise Space Specials
    'ul.selection-list-results-list li:not(.select-all)',
    '.form-field.search-form-marketing-code + .form-field:has(input#promotion_tag_ids) .selection-list-cta-close a.button' // Specific close button for Cruise Space Specials
  );
  console.log('Extracted Cruise Space Specials:', cruiseSpaceSpecials);

  // Extract cruise results (your original logic)
  console.log('\n--- Extracting Main Cruise Results ---');
  const cruises = await page.$$eval('.cruise_result_item', nodes => {
    return nodes.map(card => { // Corrected to map over nodes to return an array of objects
      return {
        title: card.querySelector('h3')?.innerText.trim(),
        dates: card.querySelector('.cruise_dates')?.innerText.trim(),
        price: card.querySelector('.cruise_price')?.innerText.trim()
      };
    });
  });

  console.log('Extracted Cruise Data:', cruises);

  await browser.close();
  console.log('Browser closed.');
})();
