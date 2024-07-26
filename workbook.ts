import { SheetConfig } from '@flatfile/api/api';

// Defining the structure of our Contacts sheet 
const contactsSheet: SheetConfig = {
    name: 'Contacts',
    slug: 'contacts',
    // this needs to be enabled to allow additional fields to be dynamically created
    allowAdditionalFields: true,
    fields: [
        {
            key: "first_name",
            type: "string",
            label: "First name",
        },
        {
            key: "last_name",
            type: "string",
            label: "Last name",
        },
        {
            key: "email",
            type: "string",
            label: "Email",
        },
    ],
    actions: [
        {
            // Specifying the "operation" of the Submit button. Think of this as a key value of the button
            operation: "finalValidation",
            // Specifying the name of the button in the UI
            label: "⚠️ Final validation ⚠️",
            // This ensures that after a user clicks on the "Final validation" button, a modal will appear to show that validation is in progress
            mode: "foreground",
            // Specifying what text will appear when a user hovers over the "Final validation" button
            tooltip: "This validates data one final time. If validation passes, click on the Sumit button on the top-right. Otherwise, correct remaining errors and then rerun this action",
            // This ensures that the action is more visibly present on the sheet (in the toolbar above the table)
            primary: true,
            // This ensures that once a user clicks on the "Final validation" button, a modal will appear for them to confirm this action
            confirm: true,
            // Specifying what text will appear on the modal when a user clicks on the Submti button
            description: "Data will be validated one final time, some records may become invalid. If they do, please correct all remaining errors and rerun this aciton. If all records remain valid, click on the Submit button on the top-right",
            // Specifying constraints of this button to disable it as long as conditions ("type") below are unsatisfied
            constraints: [
                // This ensures that the button stays disabled until there is at least 1 cell of data in the Flatfile table
                { type: "hasData" },
                // This ensures that the button stays disabled until all records in the Flatfile table are valid
                { type: "hasAllValid" }
            ]
        },
    ]
}

// Exporting Contacts sheet as part of a Workbook defined as workbookOne. We import this Workbook in index.ts to then create a space with this Workbook's configuration
export const workbookOne = [{ ...contactsSheet }];