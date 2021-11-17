# rusa-cal
Scripts for converting JSON-formatted calendars to Google Calendar entries.

# Notes

https://developers.google.com/apps-script/articles/tutorials 

QA Env Spreadsheet here:

https://docs.google.com/spreadsheets/d/1eJ8SycpD4vhPlK04vFBPmf8-nf50qavimlG0lgHgIUQ/ 

## Google Sheets 

You can create a custom menu that runs onOpen().   Its all a bit slow.   After you 
refresh the page, wait a bit for the menu to appear.

## API

The Calendar API has methods that can be used to put metadata into entries -
setTag(key, value) and getTag(key).  RUSA=True
