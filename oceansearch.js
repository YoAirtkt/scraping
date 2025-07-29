const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: false,
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", // Adjust path if necessary
  });
  const page = await browser.newPage();

  const url = "https://cruise.airtkt.com/app/0/cruise/0/search_cruises.html?clear=all&search[duration_min]=1&search[duration_max]=9999&search[start_date]=07/28/2025&search[end_date]=09/29/2025";

  try {
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log("Page loaded.");

    // Wait additional 3 seconds to let JS render dynamic elements
    await page.waitForTimeout(3000);

    // Wait until start_date field is visible
    await page.waitForSelector("#start_date", {
      state: "visible",
      timeout: 30000,
    });
    console.log("Start date field is visible.");

    // Step 1: Get the start_date value
    const startDateStr = await page.evaluate(() => {
      return document.getElementById("start_date")?.value || null;
    });

    if (!startDateStr) throw new Error("Could not get start_date.");

    // Step 2: Parse and calculate end_date (+3 months)
    const [month, day, year] = startDateStr.split("/").map(Number);
    const startDate = new Date(year, month - 1, day);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 3);

    // Fix overflow (e.g., Jan 31 → Apr 30)
    if (endDate.getDate() !== day) {
      endDate.setDate(0);
    }

    const formatDate = (date) => {
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const yyyy = date.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    };

    const endDateStr = formatDate(endDate);

    // Step 3: Set the new end_date
    await page.evaluate((endDateStr) => {
      const endDateInput = document.getElementById("end_date");
      if (endDateInput) endDateInput.value = endDateStr;
    }, endDateStr);

    console.log(`Start Date: ${startDateStr}`);
    console.log(`End Date (+3 months): ${endDateStr}`);

    // Small buffer wait before filling durations
    await page.waitForTimeout(1000);

    // Step 4: Set duration fields (after ensuring they are visible)
    await page.waitForSelector("#search\\[duration_max\\]", {
      state: "visible",
    });
    await page.fill("#search\\[duration_min\\]", "0");
    await page.fill("#search\\[duration_max\\]", "365");

    // Optional: Re-apply values after full JS load (to prevent override)
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await page.evaluate((endDateStr) => {
      const endDateInput = document.getElementById("end_date");
      if (endDateInput) endDateInput.value = endDateStr;
    }, endDateStr);

    await page.fill("#search\\[duration_min\\]", "0");
    await page.fill("#search\\[duration_max\\]", "365");

    console.log("End date and duration range applied successfully.");

    // Step 5: Click search button
    // ✅ Click the Search button
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"].icon-search');
      if (btn) btn.click();
    });

    console.log("🔍 Search button clicked.");

    // Step 6: Wait for results to load
    // await page.waitForSelector('.cruise_result_item', { state: 'visible', timeout: 30000 });
  } catch (error) {
    console.error("❌ Error during execution:", error);
  } finally {
    // await browser.close();
    console.log("✅ Script finished.");
  }
})();
