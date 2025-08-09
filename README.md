# Healthy With Happiness – Pregnancy Tool (Nigerian/African focused)

Features
- Due date calculator (Naegele + cycle adjustment)
- Urgent red flags, routine checks (malaria/HIV/HBV/syphilis, genotype), PHQ‑2
- Personalized plan + long-form email content
- ConvertKit signup via Netlify Function (uses env vars)

Deploy (GitHub → Netlify)
1) Create a new GitHub repo and upload all files from this folder.
2) In Netlify: New site from Git → connect the repo.
3) Site settings → Environment variables:
   - CONVERTKIT_FORM_ID = your number (e.g., 8414643)
   - CONVERTKIT_API_KEY = your key
4) Deploy. The form posts to `/.netlify/functions/subscribe`.

Local preview
- Open `index.html` directly in a browser. Email sending is disabled; the email content appears in the right panel after you complete steps.

Notes
- No build step required. Tailwind via CDN + plain CSS.
- You can customize wording in `assets/js/app.js`.
