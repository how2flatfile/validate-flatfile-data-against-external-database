// Importing the packages and variables we need to run the code below
import { Client, FlatfileEvent, FlatfileListener } from "@flatfile/listener";
import api from "@flatfile/api";
import { FlatfileRecord, bulkRecordHook } from "@flatfile/plugin-record-hook";
import axios from "axios";
import { workbookOne } from "./workbook";
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// We use webhook.site to simulate a backend database where data will be submitted (switch the link below to your link, found on webhook.site)
const webhookReceiver = "https://webhook.site/3d6f2ece-c9ef-4ab8-b2c2-efe2312759d2"

// Defining the main function where all the code will execute
export default function flatfileEventListener(listener: Client) {

  // Restricting the code below to apply only to a specific app that has "appOne" namespace
  listener.namespace(["*:appOne"], (appOne: FlatfileListener) => {

    // Defining what needs to be done when a new space gets created
    appOne.filter({ job: "space:configure" }).on("job:ready", async (event: FlatfileEvent) => {

      // Accessing all the elements we need from event.context to create a space, a workbook, and its sheet
      const { jobId, spaceId } = event.context;

      try {

        // First, we acknowledge the job
        await api.jobs.ack(jobId, {
          info: "Space is being created, please hold",
          progress: 10
        });

        // Second, we create a Workbook (Wokbook One), its Sheet (Contacts), and a workbook-level Submit action
        await api.workbooks.create({
          spaceId,
          name: "Workbook One",
          // We defined the structure of workbookOne in the "workbook.ts" file and imported it here to the "index.ts" file
          sheets: workbookOne,
          // Creating a workbook-level Submit button
          actions: [
            {
              // Specifying the "operation" of the Submit button. Think of this as a key value of the button
              operation: "submitAction",
              // Specifying the name of the button in the UI
              label: "Submit",
              // This ensures that the action is more visibly present at the top-right corner of the Importer
              primary: true,
              // This ensures that once a user clicks on the Submit button, a modal will appear for them to confirm this action
              confirm: true,
              // This ensures that while the Submit job is executing, a user will see a modal with progress indicator that will block them from further action until Submit action is complete
              mode: "foreground",
              // Specifying what text will appear when a user hovers over the Submit button
              tooltip: "Submit data once you are done auditing the records",
              // Specifying what text will appear on the modal when a user clicks on the Submit button
              description: "Have you clicked on ⚠️ Final validation ⚠️ button to validate data one final time? If you have and all records passed final validation, please click Continue",
              // Specifying constraints of this button to disable it as long as conditions ("type") below are unsatisfied
              constraints: [
                // This ensures that Submit button stays disabled until there is at least 1 cell of data in the Flatfile table
                { type: "hasData" },
                // This ensures that Submit button stays disabled until all records in the Flatfile table are valid
                { type: "hasAllValid" }
              ]
            },
          ]
        });

        // Third, we complete a job once a Space, a Workbook with its Sheet, and a Submit button are created
        await api.jobs.complete(jobId, {
          outcome: {
            message: "Space is created with 1 workbook, 1 sheet, and a workbook-level Submit action"
          },
        });

      } catch (error) {

        // In case something goes wrong and the space:configure job cannot be completed, we fail the job with a message on what next steps to take
        await api.jobs.fail(jobId, {
          outcome: {
            message: "Creating a Space encountered an error. See Event Logs",
          },
        });

      }

    });

    // Defining what needs to be done when bulkRecordHook() triggers. This function executes on all rows when data is first loaded, and it triggers on record chage on that specific row only
    appOne.use(bulkRecordHook("contacts", async (records: FlatfileRecord[], event: FlatfileEvent) => {

      try {

        // Extracting evnvironment ID out of event context so that we can fetch secrets from the Flatfile dashboard
        const { environmentId } = event.context

        // Fetching secrets that are stored in the Flatfile dashboard. We need to access those secrets to later authorize API calls to Google Sheets API to validate records in the Email field
        const allSecrets = await api.secrets.list({
          environmentId: environmentId
        })

        // Storing "client_email" secret in its own variable
        const client_email_secret = allSecrets.data[0].value

        // At the time of this writing, Flatfile's limit to secret's length is 1024 characters
        // As a workaround, I split Google's "private_key" in the Flatfile dashboard into 2. Then, combining those 2 secrets here and saving them inside of the "private_key_full" variable
        const private_key_full = allSecrets.data[1].value + allSecrets.data[2].value

        // Because of how Google formats its private_key value, ensuring that "private_key_full" is correctly parsed
        const formatted_private_key_full = private_key_full.replace(/\\n/g, '\n')

        // Storing the ID of the sheet in Google Sheets in its own "google_sheet_spreadsheet_id" variable
        const google_sheet_spreadsheet_id = allSecrets.data[3].value

        // Creating a JWT (JSON Web Token) client using the credentials from variables defined above
        const auth = new JWT({
          email: client_email_secret,
          key: formatted_private_key_full,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        // Authorizing the JWT client once
        await auth.authorize();

        // Creating an instance of the Google Sheets API (sheets_v4)
        const sheets = google.sheets({ version: 'v4', auth });

        // Fetching values for a specific data range from Google Sheets file (Sheet1!C:C in my example, which is just the Email field)
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: google_sheet_spreadsheet_id,
          range: 'Sheet1!C:C',
        });

        // Retrieving just the values of column C (Email column in Google Sheets)
        const emailColumnValues = response.data.values;

        // Converting the output of "emailColumnValues" to a single array of emails. "slice(1)" removes header row ("Email")
        const emailColumnValuesArray = emailColumnValues.slice(1).flat()

        // Validating records in the Email field of the Flatfile table against records in the Email field of the Google Sheets file
        await Promise.all(records.map(async (record) => {

          // Storing values from the Email field of the Flatfile table in the "emailValue" variable
          const emailValue = record.get("email");

          // If an email that was imported to the Flatfile table already exists in the Google Sheets file, that email will be marked as invalid with the error message below
          if (emailColumnValuesArray.includes(emailValue)) {
            record.addError("email", "This email already exists in the system, please audit");
          }

          return record;

        }))

      } catch (error) {

        // If something doesn't work as expected while bulkRecordHook() function executes, an error will be thrown
        console.log("This is error: ", error);

      }

    },

      // "chunkSize" specifies how many records to process in each batch. This allows you to balance efficiency and resource utilization based on your specific use case
      // "parellel" specifies if you want to process records concurrently. This enables you to optimize the execution time when dealing with large datasets
      { chunkSize: 100, parallel: 2 }

    ));

    // Defining what needs to be done when a sheet-level "Final validation" action is triggered
    appOne.filter({ job: "sheet:finalValidation" }).on("job:ready", async (event: FlatfileEvent) => {

      // Extracting the necessary information from event.context that we will use below
      const { jobId, workbookId } = event.context;

      try {

        // First, we acknowledge the job
        await api.jobs.ack(jobId, {
          info: "Validating data is in progress",
          progress: 10,
        });

        // Fetching workbook information so that we can exract information about its sheet
        const workbookInfo = await api.workbooks.get(workbookId)

        // Extracting id of the Contacts sheet and saving it in its own "contactsSheetId" variable
        const contactsSheetId = workbookInfo.data.sheets[0].id

        // Validating the sheet to ensure that emails in the Flatfile table do not match emails that are already present in the Google Sheets file
        await api.sheets.validate(contactsSheetId)

        // Once the final validation is done, completing the job with appropriate message to the user
        await api.jobs.complete(jobId, {
          outcome: {
            message: "Final validation complete. If there are any invalid records, please correct them, and then rerun this acition",
            // This ensures that once a job is complete, a user sees a modal with the message above, and they need to acknowledge that modal before proceeding
            acknowledge: true
          },
        });

      } catch (error) {

        // In case something goes wrong while validating the sheet, we fail the job with a message on what next steps to take
        await api.jobs.fail(jobId, {
          outcome: {
            message: "Validating data encountered an error. See event logs"
          },
        });

      }

    })

    // Defining what needs to be done when a user clicks the Submit button to send the data to the database
    appOne.filter({ job: "workbook:submitAction" }).on("job:ready", async (event: FlatfileEvent) => {

      // Extracting the necessary information from event.context that we will use below
      const { jobId, workbookId } = event.context;

      try {

        // First, we acknowledge the job
        await api.jobs.ack(jobId, {
          info: "Acknowledging the Submit job that is now ready to execute",
          progress: 10,
        });

        // Retrieving a list of sheets associated with a workbook
        const { data: sheets } = await api.sheets.list({ workbookId });

        // Initializing "records" object that will store data fetched from individual sheets. Right now it is empty
        const records: { [name: string]: any } = {};

        // Iterating through list of sheets and fetching records for each sheet. Now, fetched data is stored in "records" object with keys in the format of "Sheet[index]"
        // By default, Flatfile fetches 10,000 records. If you have more to fetch and submit, ensure you are paginating through "api.records.get()" call to fetch all data
        for (const [index, element] of sheets.entries()) {
          records[`Sheet[${index}]`] = await api.records.get(element.id);
        }

        // Sending data of records to webhook.site URL once a user clicks the Submit button
        await axios.post(
          webhookReceiver,
          {
            records
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        // If the axios POST call is successful, we complete the job with an appropriate message to the user
        await api.jobs.complete(jobId, {
          outcome: {
            message: "Data successfully submitted",
          },
        });

      } catch (error) {

        // In case something goes wrong while executing the Submit job, we fail the job with a message on what next steps to take
        await api.jobs.fail(jobId, {
          outcome: {
            message: "Submitting the data encountered an error. See event logs"
          },
        });

      }

    });

  })

}