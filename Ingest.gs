// 
// Core processing script.
// High Level Flow
// 1. Traverse the config spreadsheet
//   - Save the Region -> Short Name Mappings
//   - Open the Calendars and put them in the region Map
// 2.  Retrieve the new Entries 
//   - Verify that there is a calendar for every entry
// 3. Traverse the calendars 
//   - Clean out old RUSA entries
// 4. Process the entries
//
// The Pre-flight check is steps 1 & 2 
"use strict"

const url = "https://rusa.org/cgi-bin/eventsearch_PF.pl?output_format=json&through=TN&apikey=QObG204g3DXqcoDEdClc"

// ---------------------------------------------------------------------------
// Maps & Work Data - Globals, sadly.
// ---------------------------------------------------------------------------
const region2shortname = new Map();
const region2calendar  = new Map();

// Fill this in later
var rusa_events = undefined 

// ---------------------------------------------------------------------------
// Entry point for automated processing
// ---------------------------------------------------------------------------
function scheduledProcess() {
  var return_code
  
  return_code  = preflight()

  // Need better error processing here
  if ( return_code != 0 ) {
    Logger.log('Error: preflight() failed with error ' + return_code);
    return(return_code) 
  }

}

// ---------------------------------------------------------------------------
// Pre-Flight Checks/Prep
// ---------------------------------------------------------------------------

// This is designed so that it can be called from a user 
// menu to find most configuration/data problems.
// Return 0 on success
function preflight() {
  var return_code
  
  return_code  = populateMaps()
  if ( return_code != 0 ) {
    Logger.log('Error: populateMaps() failed with error ' + return_code);
    return(return_code)
  } 
  rusa_events = httpGetEvents()

  return_code = checkForRegionCalendars(rusa_events)
  if ( return_code != 0 ) {
    Logger.log('Error: checkForRegionCalendars() failed with error ' + return_code);
    return(return_code)
  } 
}

// ---------------------------------------------------------------------------
// Populate the Maps
// This can be used for pre-flight testing, so return an error code
//
// Return 0 for success, negative otherwise.
// ---------------------------------------------------------------------------

function populateMaps() {
  "use strict"
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  let rows = data.length
  for (var i = 5; i < rows; i++) {
    if ( entrySanityCheck(data[i]) != 0 ) {
      const message = 'Bad Config entry at spreadsheet line ' + ( i + 1 )
      Logger.log(message);
      return(-1)
    } 

    // Recall that these should be unique by region
    if ( region2shortname.has(data[i][0]) ) {
    const message = 'Error: Region ' + data[i][0] + ' already defined at spreadsheet line ' + ( i + 1 )
    return(-2)
    }

    // ----------- Primary Key  -------------
    let key = data[i][0]

    // ----------- Short Name ---------------
    region2shortname.set(key,data[i][1]) 
    Logger.log('added ' + key + ' -> ' + region2shortname.get(key) );

    // ----------- Calendar -----------------
    let cal_id = data[i][3]
    var calendar = CalendarApp.getCalendarById(cal_id);
    if ( calendar == undefined ) {
      const message = 'Could not find ' +  cal_id + ' at spreadsheet line ' + ( i + 1 )
      Logger.log(message);
      return(-3)
    } 

    region2calendar.set(key, calendar)
    Logger.log('added calendar ' + key + ' -> ' + region2calendar.get(key).getName() );

  }
  return(0)
}

// 
// Make sure a line of the file is fully defined before using the data
// Return 0 for pass
function entrySanityCheck(line) {
    let c0 = line[0] != ""
    let c1 = line[1] != ""
    let c2 = line[2] != ""
    let c3 = line[3] != ""

    let defined = c0 && c1 && c2 && c3

    if ( defined ) return 0
    else return(-1)
}

// ---------------------------------------------------------------------------
// Check the populated maps against the events and make sure 
// that there is a calendar for every region in the data set 
// Return 0 for success 
// ---------------------------------------------------------------------------
function checkForRegionCalendars(RUSAEvents) {

  const event_count = RUSAEvents.length

  for (var i = 0; i < event_count; i++) {
    if ( !region2shortname.has(RUSAEvents[i]["region"])) {
      const message = "Region " + RUSAEvents[i]["region"] + " is in the RUSA data, but has no google calendar"
      Logger.log(message);
      return -1
    } 
  }

  Logger.log('Found calendars for all regions in the data ');

  return(0)
}

// ---------------------------------------------------------------------------
// Calendar Preparation 
// Look at all the existing calendar entries and zap old RUSA Entries.
// ---------------------------------------------------------------------------
function cleanCalendar(calendar) {
  // This is in ms
  let now      = new Date();
  let thisyear = new Date(now.getTime() + (500 * 86400 * 1000));
  let events = calendar.getEvents(now, thisyear);

  Logger.log('Calendar ' + calendar.getName() + " events: " + events.length);

  const rows = events.length
  for (var i = 0; i < rows; i++) {
    // Test Number one:  Does it have RUSA=Yes metadata?
    if ( events[i].getTag('RUSA') == 'Yes' ) {
      // Code here
    }  else {
      const message = 'Event ' + events[i]
    }  

    ; // CODE HERE 
  }

}

// ---------------------------------------------------------------------------
// Event Processing
// ---------------------------------------------------------------------------

// ------------------ Retrieve the Events in json form ----------------------
function httpGetEvents() {  
  var response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});

  var json = response.getContentText();
  var data = JSON.parse(json);
  return(data)
}

//
// Do a query against a URL, and pretty up the results.
//
function processEvents() {  
  data = httpGetEvents()
  let rows = data.length

  // Route names often end in NNNNk or some variation.
  // Apply regular expressions to trim this stuff away
  // because the title is supposed to be short.
  const regex1 = / \d+[Kk]*[Mm]* [Bb]revet/
  const regex2 = / \d+[Kk]*[Mm]*$/

  for (var i = 0; i < rows; i++) {
    // Formulate the title
    let title = "Title: "
    title += data[i].region + ' ' // TODO Use short version.
    title += data[i].dist + ' '

    // Detection of missing key from
    // https://stackoverflow.com/questions/1098040/checking-if-a-key-exists-in-a-javascript-object 

    // Check for cancelled events.
    if ( (data[i]["cancelled"] !== undefined) ) {
      title = title + "CANCELLED "
    }

    if ( data[i]["route_name"] !== undefined ) {
      let clean_name = data[i].route_name;
      clean_name = clean_name.replace(regex1, "");
      clean_name = clean_name.replace(regex2, "");
     
      title += clean_name
    }

    let params = " Params:"
    params += data[i]["date"] + ','

    // TODO - Need to detect Fleches and adjust the dates so they 
    // show up as the right kind of 2-day events.
    let days = data[i].dist / 300;
    days = Math.floor(days)

    // Rather than haggle over the right way to handle short events,
    // just assume that anything less than 1 is a 1 day events.
    if ( days == 0 ) {
        days = 1
    }

    params += 'days=' + days + " "
   
    params += "Meta:event_id=" + data[i]["event_id"] + ','
    params += "RUSA=True"

    Logger.log(title + params);
    }
}
