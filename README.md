# Healthy With Happiness – Pregnancy Tool (Nigerian/African Focused)

Hi! I built this tool to help Nigerian and African mothers estimate their pregnancy due date, check for urgent health red flags, and get a personalized action plan. It’s designed to be simple, educational, and culturally relevant.

## Features

- **Due date calculator** (Naegele’s rule + cycle adjustment)
- **Urgent red flags** and routine checks (malaria, HIV, HBV, syphilis, genotype, etc.)
- **PHQ‑2 mood screening**
- **Personalized plan** and long-form email content
- **ConvertKit signup** via Netlify Function (uses environment variables for security)

## How to Deploy (GitHub → Netlify)

1. Create a new GitHub repo and upload all files from this folder.
2. In Netlify, create a new site from Git and connect your repo.
3. Go to Site settings → Environment variables and add:
    - `CONVERTKIT_FORM_ID` = your ConvertKit form number (e.g., 8414643)
    - `CONVERTKIT_API_KEY` = your ConvertKit API key
4. Deploy! The form will post to `/.netlify/functions/subscribe`.

## Local Preview

- Just open `index.html` directly in your browser.
- Email sending is disabled locally; after completing the steps, you’ll see the email content in the UI (if enabled).

## Notes

- No build step required. Tailwind is loaded via CDN, with some plain CSS.
- You can customize the questions, plan logic, and wording in `assets/js/app.js`.
- This tool is for educational purposes only and does **not** provide medical advice.

---

Feel free to fork, adapt, or reach out if you have suggestions
