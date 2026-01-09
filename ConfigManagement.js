// About the Config sheet
//
// The Config sheet consists of two lines of comments, followed by 
// N lines of calendar data.
//
// User-Supplied Settings
// Column 1: RUSA Region Name
// Column 2: Abbreviated Region name for use in Event titles
// Column 3: Name of the Calendar that will be seen by the riders.
// 
// Script-Managed Data / Outputs
// Column 4: Calendar URL of the newly-created calendar
// Column 5: Calendar Timezone.


//
// Process the Config sheet and add any missing calendars
// return null on success.

function processConfigSheet() {
  "use strict"
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  let rows = data.length
  let return_code = null;

  for (var i = 2; i < rows; i++) {
    if ( data[i][3] == "") {
      return_code = addCalendar(sheet, data, i);
    } else {
      // TODO: Add code here to pull the timezone 
      // cleanCalendar(data[i][3])
      // Logger.log('Region ' + data[i][0] + ' Missing a calendar');
    }
  }

  // Fall out and return null if its all good.
  return return_code 

}

// -----------------------------------------------------------
// Calendar Modification Code 
// -----------------------------------------------------------
 
// Add a missing calendar.  
// Return null or an error message.
function addCalendar(sheet, data, table_line_number) {
  Logger.log('Evaluating Line ' + table_line_number);

  // data[table_line_number][3] = "Place-Holder" 

  if ( calendarRowPreAddReady(data[table_line_number]) ) {
    Logger.log('Creating calendar for region ' + data[table_line_number][1]);

    let cellno = 'D' + (table_line_number + 1)
    var cell = sheet.getRange(cellno);

    let short   = data[table_line_number][2]
    let details = 'Region' + data[table_line_number][0]
    var calendar = CalendarApp.createCalendar(short, {
         summary: details });

    // TODO ADD ERROR CHECKING HERE 
    Logger.log('Created the calendar "%s", with the ID "%s".',
      calendar.getName(), calendar.getId());

    cell.setValue(`=HYPERLINK("https://calendar.google.com/calendar/embed?src=${calendar.getId()}","${calendar.getId()}")`);

  } else {
    const message = 'Configuration entry not complete for ' + data[table_line_number][0]
    Logger.log(message);
    return message
  }

  // Fall out to success
  return null 

}

// An unwrapped macro.  Return true if the spreadsheet is
// filled out and ready for new items.
function calendarRowPreAddReady(row) {
    let c0 = row[0] != ""
    let c1 = row[1] != ""
    let c2 = row[2] != ""

    return ( c0 && c1 && c2 )
}


