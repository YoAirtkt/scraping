const { chromium } = require('playwright');
const fs = require('fs'); // Moved fs import to the top

(async () => {
    const browser = await chromium.launch({ headless: false }); // set to true later for production
    const page = await browser.newPage();

    const url = 'https://cruise.airtkt.com/app/0/cruise/0/search.html?clear=all';

    try {
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log('Page loaded.');
        // Wait for the first dropdown to be available for interaction
        await page.waitForSelector('#destination_ids', { state: 'visible', timeout: 30000 });
        console.log('Destination dropdown is visible.');
    } catch (error) {
        console.error('Error during page navigation or initial setup:', error);
        await browser.close();
        return;
    }

    // Helper function to scrape a scrollable list and extract label and ID
    const scrapeList = async (clickSelector, listSelector) => {
        await page.waitForSelector(clickSelector, { state: 'visible' });
        await page.click(clickSelector);

        // Wait for list to appear
        await page.waitForSelector(listSelector, { state: 'visible', timeout: 20000 });

        let items = [];
        let prevCount = 0;
        let sameCountTimes = 0;

        while (true) {
            // Scroll to bottom
            await page.evaluate((selector) => {
                const el = document.querySelector(selector);
                if (el) el.scrollTop = el.scrollHeight;
            }, listSelector);

            // Wait for new items to load
            await page.waitForTimeout(1200);

            // Get all items, filtering out 'Select All' and 'heading-group'
            let newItems = await page.evaluate((selector) => {
                const list = document.querySelector(selector);
                if (!list) return [];
                return Array.from(list.querySelectorAll('li'))
                    .filter(li => !li.classList.contains('select-all') && !li.classList.contains('heading-group'))
                    .map(li => {
                        const labelElement = li.querySelector('label');
                        if (labelElement) {
                            const labelText = labelElement.innerText.trim().replace(/\s+/g, ' ');
                            const forAttribute = labelElement.getAttribute('for');
                            // Extract the numeric ID from the 'for' attribute
                            const idMatch = forAttribute ? forAttribute.match(/\d+$/) : null;
                            const id = idMatch ? idMatch[0] : null;
                            return { label: labelText, id: id };
                        }
                        return null; // Should not happen if filter works correctly
                    })
                    .filter(item => item !== null); // Remove any null entries if they somehow appear
            }, listSelector);

            // Remove duplicates based on a combination of label and id
            const uniqueItems = new Map();
            newItems.forEach(item => {
                if (item.label && item.id) { // Ensure both label and ID exist
                    uniqueItems.set(`${item.label}-${item.id}`, item);
                }
            });
            newItems = Array.from(uniqueItems.values());


            if (newItems.length === prevCount) {
                sameCountTimes++;
            } else {
                sameCountTimes = 0;
            }

            if (sameCountTimes >= 2) { // 2 times same count, then done
                items = newItems;
                break;
            }

            prevCount = newItems.length;
            items = newItems;
        }

        // Close the dropdown by clicking its close button
        await page.evaluate((sel) => {
            const btn = document.querySelector(sel);
            if (btn) btn.click();
        }, `${listSelector.split(' .selection-list-results-list')[0]} .selection-list-close`);

        await page.waitForTimeout(500);
        return items;
    };

    // Initialize data object
    let data = {
        "destination": [],
        "departure_port": [],
        "cruise_line": [],
        "cruise_ship": []
    };

    console.log('Scraping Destinations...');
    try {
        data.destination = await scrapeList('#destination_ids', 'div[data-serving="search[destination_ids]"] .selection-list-results-list');
        fs.writeFileSync('output.json', JSON.stringify(data, null, 2), 'utf-8');
        console.log('Destinations saved to JSON');
    } catch (error) {
        console.log('Error scraping destinations:', error.message);
    }

    console.log('Scraping Cruise Lines...');
    try {
        data.cruise_line = await scrapeList('#vendor_ids', 'div[data-serving="search[vendor_ids]"] .selection-list-results-list');
        fs.writeFileSync('output.json', JSON.stringify(data, null, 2), 'utf-8');
        console.log('Cruise Lines saved to JSON');
    } catch (error) {
        console.log('Error scraping cruise lines:', error.message);
    }

    console.log('Scraping Cruise Ships...');
    try {
        data.cruise_ship = await scrapeList('#ship_ids', 'div[data-serving="search[ship_ids]"] .selection-list-results-list');
        fs.writeFileSync('output.json', JSON.stringify(data, null, 2), 'utf-8');
        console.log('Cruise Ships saved to JSON');
    } catch (error) {
        console.log('Error scraping cruise ships:', error.message);
    }

    console.log('Scraping Departure Ports...');
    try {
        data.departure_port = await scrapeList('#departure_port_ids', 'div[data-serving="search[departure_port_ids]"] .selection-list-results-list');
        fs.writeFileSync('output.json', JSON.stringify(data, null, 2), 'utf-8');
        console.log('Departure Ports saved to JSON');
    } catch (error) {
        console.log('Error scraping departure ports:', error.message);
    }

    console.log('All data successfully saved to output.json');

    await browser.close();
    console.log('Browser closed.');
})();