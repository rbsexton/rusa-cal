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

// Keep maps so that its possible to look up prior creations.
const MapCalname2Calendar = new Map()

// This will come up a few times. 
const regex_trim_trailing_spaces = /\s+$/i;

// Retry happens a few different places.  
let backoff_timer = 1

//
// Process the Config sheet and add any missing calendars
// return null on success.

function processConfigSheet() {
  "use strict"
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  let rows = data.length
  let return_code = null;

  backoff_timer = 1

  // Scan the whole spreadsheet and add existing calendars to the map.
  for (var i = 2; i < rows; i++) {
    Logger.log('Pre-check Region ' + data[i][0]);
    if ( calendarRowHasExistingCalendar(data[i])) {
      let key = data[i][2].replace(regex_trim_trailing_spaces, '');
      Logger.log("Found existing calendar for " + key)
      MapCalname2Calendar.set(key,data[i][3]) // Stuff it into the map. 
    }
  }

  for (var i = 2; i < rows; i++) {
    if ( data[i][3] === "" || data[i][3] === undefined) {
      do { 
        return_code = addCalendar(sheet, data, i);
        }  while ( return_code != null ) 
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

  if ( !calendarRowPreAddReady(data[table_line_number]) ) {
    const message = 'Configuration entry not complete for ' + data[table_line_number][0]
    Logger.log(message);
    return message
  }

  // RUSA Region/Database Key 
  let region = data[table_line_number][0];

  // RUSA Region Name chopped down for event names. 
  let eventname_prefix = data[table_line_number][1];

  // Title of the Calendar that users see.  Also a key.
  let calname = data[table_line_number][2].replace(regex_trim_trailing_spaces,'')

  // Info that will show up on the caledar details that users see.
  let details = 'Base Region ' + region

  // These two are needed either way.
  let cellno = 'D' + (table_line_number + 1)
  let cell = sheet.getRange(cellno);

  // Check to see if there is an existing Map defined and 
  // if so exit before creating a calendar. 
  let calendar_id = MapCalname2Calendar.get(calname)
  if ( calendar_id != undefined ) {
    Logger.log('Using existing calendar ' + calname + ' for region ' + region);
    cell.setValue(`=HYPERLINK("https://calendar.google.com/calendar/embed?src=${calendar_id}",
   "${calendar_id}")`);
  
    sheet.getRange('E' + (table_line_number + 1)).setValue(calendar_id);
    SpreadsheetApp.flush();

    // TBD 
    return ( null ); 
  }

  Logger.log('Creating calendar for region ' + region);

  // TODO - Make the try/catch just try the create.
  let calendar = null 

  do { 

    try {
     calendar = CalendarApp.createCalendar(calname, { summary: details });
     // If this succeeded, back-on.
     if ( backoff_timer > 1 ) {
        backoff_timer = backoff_timer / 2
      }
    // Sleep after every creation - avoid rate limits.
    Utilities.sleep(backoff_timer * 3000)
    }
  
    catch (err) {
      Logger.log(err + " !Back off for " + backoff_timer + " second(s)")
      backoff_timer = backoff_timer * 2 // Exponential back-off
      Utilities.sleep(backoff_timer * 1000)
      return err  
    }
 
  } while ( calendar === null )
 
  // If the code makes it here, finish up.
  Logger.log('Setting ACL for calendar');
  Calendar.Acl.insert({
      "kind": "calendar#aclRule",
      "scope": {
        "type": 'default'
      },
      "role": "reader"
    }, calendar.getId());
    // TODO ADD ERROR CHECKING HERE 

  // Save the data into the maps so that future invocations can look it up.
  // ----------- Primary Key for combined regions.  -------------

  MapCalname2Calendar.set(calname,calendar.getId())

  Logger.log('Region ' + region + ' shortname is ' + eventname_prefix );

  cell.setValue(`=HYPERLINK("https://calendar.google.com/calendar/embed?src=${calendar.getId()}",
   "${calendar.getId()}")`);
  
  sheet.getRange('E' + (table_line_number + 1)).setValue(calendar.getId());

  SpreadsheetApp.flush(); // Write these now so the user doesn't wonder.

  Logger.log('Created the calendar "%s", with ID "%s".',
      calendar.getName(), calendar.getId());

  // Fall out to success
  return null 
}


// -------------------------------------------------------------------------
// for ease of testing/debugging
// -------------------------------------------------------------------------
function deleteAllCalendars() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  let rows = data.length;
  let return_code = null;

  backoff_timer = 1 // Reset to a normal state.
  for (var i = 2; i < rows; i++) {
    if (data[i][4] !== "" && data[i][4] !== undefined) {
      do {
        let cal = CalendarApp.getCalendarById(data[i][4])
        if ( cal != null ) {
          // Empty entries turn into nulls.
          return_code = zapCalendar(cal)
        }
        else {
          return_code = null 
        }
      } while ( return_code != null )

      Logger.log(`Deleting calendar ${data[i][4]}`);
      sheet.getRange(i + 1, 4).clear();
      sheet.getRange(i + 1, 5).clear();
    }
  }
}

// Delete a calendare for re-creation.  
// Return null or an error message.
function zapCalendar(victim) {
    try {
      victim.deleteCalendar();
      if ( backoff_timer > 1 ) {
        backoff_timer = backoff_timer / 2
      }
      return null 
    } catch (err) {
      Logger.log(err + "Delete Back off for " + backoff_timer + " second(s)")
      backoff_timer = backoff_timer * 2 // Exponential back-off
      Utilities.sleep(backoff_timer * 1000)
      return err  
    } finally {
      //console.info(`Processed calendar for line ${table_line_number}`);
    }
  } 
  
// An unwrapped macro.  Return true if the spreadsheet is
// filled out and ready for new items.
function calendarRowPreAddReady(row) {
    let c0 = row[0] != ""
    let c1 = row[1] != ""
    let c2 = row[2] != ""

    return ( c0 && c1 && c2 )
}

// An unwrapped macro.  Return true if the spreadsheet is
// filled out and ready for new items.
function calendarRowHasExistingCalendar(row) {
    let c0 = row[0] != ""
    let c1 = row[1] != ""
    let c2 = row[2] != ""
  
    let c4 = (( row.length > 3 ) && row[4] != "")

    if ( c0 && c1 && c2 && c4 ) {
      return true 
    }
    else return false 

}




