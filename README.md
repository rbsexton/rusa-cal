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

## Google Documentation Links

https://developers.google.com/apps-script/articles/vacation-calendar

https://developers.google.com/apps-script/reference/calendar/calendar-app#createCalendar(String,Object)

Basics of manipulating sheets.

https://developers.google.com/apps-script/articles/tutorials

https://developers.google.com/apps-script/guides/sheets

## Test Cases

- Config Spreadsheet 
     - Spot partially-filled out lines DONE 
     - Create missing calendar Entries DONE 
- Pre-flight from the Spreadsheet
      - Spot uncreated calendars  DONE 
      - Detect invalid calendars DONE
      
- Processing 
       - See pre-flight, above.


