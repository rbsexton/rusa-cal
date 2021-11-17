function processConfigSheet() {
  "use strict"
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  let rows = data.length
  for (var i = 2; i < rows; i++) {
    if ( data[i][3] == "") {
      addCalendar(sheet, data, i);
    } else {
      cleanCalendar(data[i][3])
      // Logger.log('Region ' + data[i][0] + ' Missing a calendar');
    }
  }
}

//
// Pass in a calendar ID and clean out the unmodified entries.
//
function cleanCalendar(cal_id) {
  var calendar = CalendarApp.getCalendarById(cal_id);
  if ( calendar == undefined ) {
    Logger.log('Could not find ' +  cal_id);
    return
  } else { // Do Calendar work
    // This is in ms
    let now      = new Date();
    let thisyear = new Date(now.getTime() + (500 * 86400 * 1000));
    let events = calendar.getEvents(now, thisyear);
    Logger.log('Calendar ' + calendar.getName() + " events: " + events.length);
  }
}

// 
// Add a missing calendar.  
// 
function addCalendar(sheet, data, table_line_number) {
    Logger.log('Evaluating Line ' + table_line_number);

    data[table_line_number][3] = "Place-Holder"

    let complete = ( data[table_line_number][0] != "" )
    complete = complete && ( data[table_line_number][1] != "" )
    complete = complete && ( data[table_line_number][2] != "" )

  if ( complete ) {
    Logger.log('Creating calendar for region ' + data[table_line_number][1]);

    let cellno = 'D' + (table_line_number + 1)
    var cell = sheet.getRange(cellno);

    let short = data[table_line_number][2]
    let details = `RUSA Sanctioned brevets for ` + data[table_line_number][0]
    var calendar = CalendarApp.createCalendar(short, { summary: details });

    Logger.log('Created the calendar "%s", with the ID "%s".',
      calendar.getName(), calendar.getId());

    cell.setValue(calendar.getId())

  } else {
   Logger.log('Configuration entry not complete' + data[table_line_number][1]);
  }
}




