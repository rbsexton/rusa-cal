function myFunction() {
  "use strict"
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 2; i < data.length; i++) {
    let complete = ( data[i][0] != "" )
    complete = complete && ( data[i][1] != "" )
    complete = complete && ( data[i][2] != "" )

    if ( complete && data[i][3] == "") {
      Logger.log('Ready for add: Short Name: ' + data[i][2] );
      data[i][3] = "Place-Holder"
    } else {
      cleanCalendar(data[i][3])
      // Logger.log('Region ' + data[i][0] + ' Missing a calendar');
    }
  }
}

// Pass in a calendar ID and clean out the unmodified 
// entries.
function cleanCalendar(cal_id) {

  var calendar = CalendarApp.getCalendarById(cal_id);
  if ( calendar != undefined ) {
    Logger.log('Cleaning ' + cal_id);
    Logger.log('The calendar is named "%s".', calendar.getName());
  } else {
    Logger.log('Could not find ' +  cal_id);
    return
  }

  let now      = new Date();
  
  // This is in ms
  let thisyear = new Date(now.getTime() + (500 * 86400 * 1000));
  let events = calendar.getEvents(now, thisyear);
  Logger.log('Number of events: ' + events.length);


}

