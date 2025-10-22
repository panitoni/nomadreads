# NomadReads
A tiny site that recommends books by destination.

## Local files
- index.html (results above carousel)
- styles.css
- images/ (your seasonal JPGs)
- netlify/functions/recommend.js (serverless function)
- package.json
- _headers
- .gitignore

## Netlify setup
1) Add Environment Variable: OPENAI_API_KEY = your key
2) Link the site to this GitHub repo (Site configuration → Build & deploy → Link to Git)
3) Push changes to GitHub; Netlify builds and deploys functions automatically.
