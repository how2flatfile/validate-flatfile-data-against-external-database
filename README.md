# Getting Started

## First things FIRST

If you find any issues with this README, or the repo in general, please email me at how2flatfile@gmail.com, or make a PR. I do what I can to keep everything in order, but I am human, after all 🙂

## For visual learners

If you want to just follow the video on how to get everything done, [here is a Loom video](https://www.loom.com/share/febf39c256cf4870876159502dae5a00?sid=6df322a5-42f7-4f5a-8e1d-2bc701ff0aca)

**IMPORTANT -** If you follow the video above to get everything set up, the information below is still valuable to you

I recommend you read through it

## Step-by-step instructions

*The instructions below are intentionally very detailed and descriptive to help any developer, regardless of their skill level*


### Basics
- [Click this link](https://github.com/how2flatfile/validate-flatfile-data-against-external-database.git) to access the repository

- Make sure that you are looking at the branch called `main`  

- Click on the green button that says `<> Code`, and copy the URL  

- Open your IDE, and clone the repository using the URL you just copied  

- Save the project on your computer (I prefer to save on the Desktop while I test)  

_________________________________________________
### Code Setup (valuable information for anyone)
- Open the project that you just saved on your computer. Open `index.ts` file

- On line 11, replace existing link inside `webhookReceiver` with your unique URL
  - Go to https://webhook.site/ , and copy `Your unique URL` from there

- Open the terminal, and run `npm install`

- Login to your dashboard at `platform.flatfile.com`

- On the left panel, select `App One` app. If you don't have it, click `+ Add an App`
  - Ensure that your `App One` has `Namespace` set to `appOne`

- In Flatfile dashboard, on the left panel click on `API Keys & Secrets`
  - Set up keys that you need to connect to your database to test
  - Or, create a Google Sheets file with sample data, and pass necessary keys to Flatfile
  - I used Chat GPT to figure out how to connect to Google Sheets file via API 
  - To set up Google Sheets for that, in Chat GPT start with `How can I connect to Google Sheets file from my product via API? I use JavaScript and TypeScript. I don't want to download a JSON file with secrets. Instead, I will store those secrets in my product and fetch secrets from there. I am not going to use .env file.`

- Access your secrets from the dashboard in the code, so that your Listener has access to data in your database to validate data imported to Flatfile

- Run `npm outdated`. If any Flatfile packages are not on the latest, update them to the latest
  - If you do update to the latest, run `npm outdated` again to ensure that update completed

- Run `npx flatfile@latest deploy`. For authentication, I prefer to select `API Key`
  - If you also select `API Key`, copy your `Secret Key` from your Flatfile dashboard

- Click enter, and confirm that terminal says `Event listener deployed and running ...`

_________________________________________________
### Test the workflow

- Select `App One` app in your left panel, then click `+ Create New Session` on the top right

- Give your Session a name, and click `Enter` on your keyboard
  - If a Space you just created doesn't automatically open in a new tab, click on its name

- Click `Upload file`, and upload `example_file.csv` that is inside your project

- All fields should be auto-mapped. If they are not, map them, and then click `Continue`

- When data loads in the Flatfile table, if you set up connection to your database properly, emails in Flatfile that are also in your database should be marked as red and invalid
  - Inspect `example_file.csv` and ensure that your database includes some of those emails to some emails appear invalid

- While some emails are invalid, `Submit` button will remain unclickable. Audit all emails to make all be valid, and `Submit` button will become clickable

- On the top-right, click `Submit`. When you see the `Success` message, proceed to https://webhook.site/ 
  - Notice how data was sent successfully