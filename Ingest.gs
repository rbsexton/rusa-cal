// 
// Core processing script.
// High Level Flow
// 1. Traverse the config spreadsheet
//   - Save the Region -> Short Name Mappings
//   - Open the Calendars and put them in the region Map
// 2.  Retrieve the new Entries 
//   - Verify that there is a calendar for every entry
// 
// Entry Processing 
//  Pull in the RUSA entries and put them in a map by event_id
//  For each Region in the spreadsheet 
//   Pull in the events and save the key stuff in a map by event_id or discard.
//  For each RUSA event in the 


//
// The Pre-flight check is steps 1 & 2 
"use strict"

const url = "https://rusa.org/cgi-bin/eventsearch_PF.pl?output_format=json&through=TN&apikey=QObG204g3DXqcoDEdClc"

// ---------------------------------------------------------------------------
// Maps & Work Data - Globals, sadly.
// ---------------------------------------------------------------------------
const region2shortname  = new Map()
const region2calendar   = new Map()

const RUSA_events_by_id = new Map()
const gCal_events_by_id = new Map()

var count_gcal_scanned   = 0
var count_gcal_processed = 0

var count_additions    = 0

// ---------------------------------------------------------------------------
// Entry point for automated processing
// ---------------------------------------------------------------------------
function scheduledProcess() {

  let return_code = preflight()

  // Need better error processing here
  if ( return_code != null ) {
    Logger.log('Error: preflight() failed with error ' + return_code);
    return return_code  
  }

  return_code = processEvents(RUSA_events_by_id,gCal_events_by_id)
  if ( return_code != null ) { 
    Logger.log('Error: processEvents() failed with error ' + return_code)
    return return_code  
  }
  
  const message = `Done.  Examined ${count_gcal_scanned} GCal Items, Processed ${count_gcal_processed}`
  Logger.log(message);

}

// ---------------------------------------------------------------------------
// Pre-Flight Checks/Prep
// ---------------------------------------------------------------------------

// This is designed so that it can be called from a user 
// menu to find most configuration/data problems.
// Return 0 on success
function preflight() {
  var return_code
  
  return_code = populateMaps()
  if ( return_code !== null ) {
    Logger.log('Error: populateMaps() failed: ' + return_code);
    return(return_code)
  } 
  
  httpGetEvents()

  return_code = checkForRegionCalendars(RUSA_events_by_id)
  if ( return_code !== null ) {
    const message = 'Error: checkForRegionCalendars() failed: ' + return_code
    Logger.log(message)
    return(message)
  } 

  gcalGetAllEvents() 

  return null // Success
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
  for (var i = 4; i < rows; i++) { // REMOVE BEFORE FLIGHT.  i = 2
    if ( entrySanityCheck(data[i]) != 0 ) {
      const message = 'Bad Config entry at spreadsheet line ' + ( i + 1 )
      Logger.log(message);
      return(message)
    } 

    // Recall that these should be unique by region
    if ( region2shortname.has(data[i][0]) ) {
    const message = 'Error: Region ' + data[i][0] + ' already defined at spreadsheet line ' + ( i + 1 )
    return(message)
    }

    // ----------- Primary Key  -------------
    let key = data[i][0]

    // ----------- Short Name ---------------
    region2shortname.set(key,data[i][1]) 
    Logger.log('Region ' + key + ' shortname is ' + data[i][1] );

    // ----------- Calendar -----------------
    let cal_id = data[i][3]
    var calendar = CalendarApp.getCalendarById(cal_id);
    if ( calendar == undefined ) {
      const message = 'Could not find ' +  cal_id + ' at spreadsheet line ' + ( i + 1 )
      Logger.log(message);
      return(message)
    } 

    region2calendar.set(key, calendar)
    Logger.log('Region ' + key + ' is calendar ' + region2calendar.get(key).getName() );

  }
  return(null)
}


// ---------------------------------------------------------------------------
// Retrieve the Events and file them by ID 
// ---------------------------------------------------------------------------
function httpGetEvents() {  
  var response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});
  // Need error handling here... 

  var json = response.getContentText();
  var data = JSON.parse(json);

  // This needs to filter out the past.
  data.filter(event => RUSAEventStartDate(event) > (new Date()))
  .forEach(event => {
     const event_id = event["event_id"]
      if ( event_id != undefined ) {
        RUSA_events_by_id.set(event_id,event)
      }
  })
  
  return(RUSA_events_by_id)
}

// ---------------------------------------------------------------------------
// Iterate through the calendars and pre-process them all
// ---------------------------------------------------------------------------
function gcalGetAllEvents() {
  // This is in ms
  let now      = new Date();
  let thisyear = new Date(now.getTime() + (500 * 86400 * 1000));

  // Iterate through the maps and clean everything in there.  
  const iterator = region2calendar[Symbol.iterator]();

  for (const calendar of iterator) {
      const CalendarID = calendar[1]; // [1] doesn't seem correct but it works.
      gcalPreProcessCalendar(CalendarID)
    }
  }

// ---------------------------------------------------------------------------
// gcalPreProcessCalendar()
// Pull all of the calendar entries out of gCal and keep the ones that 
// were added by this script or are otherwise unchanged.
// ---------------------------------------------------------------------------
function gcalPreProcessCalendar(CalendarID) {
  // This is in ms
  let now        = new Date();
  let thisyear   = new Date(now.getTime() + (500 * 86400 * 1000));
  let event_list = CalendarID.getEvents(now, thisyear);

  // Logger.log('Calendar ' + calendar.getName() + " events: " + events.length);
  const event_count = event_list.length
  count_gcal_scanned += event_count

  for (var i = 0; i < event_count; i++) {
    const ev = event_list[i]
    // Test Number one:  Does it have RUSA=Yes metadata?
    // If it does, check for a event_id tag.
    if ( ev.getTag('RUSAGenerated') == 'True' ) {
      const event_id_rusa = ev.getTag('event_id')
      if ( event_id_rusa != undefined ) {
        gCal_events_by_id.set(event_id_rusa, ev)
        count_gcal_processed++
        const message = 'Checking for updates ' + ev.getTitle()
        Logger.log(message);
      }
    }  else {
      const message = 'Ignoring: ' + ev.getTitle()
      Logger.log(message);
    }  
  }
}

// ---------------------------------------------------------------------------
// Check the populated maps against the events and make sure 
// that there is a calendar for every region in the data set 
// Return 0 for success 
// ---------------------------------------------------------------------------
function checkForRegionCalendars(RUSA_events_by_id) {
  const event_count = RUSA_events_by_id.length
  for (var i = 0; i < event_count; i++) {
    const region = RUSA_events_by_id[i].region
    if ( !region2shortname.has(region )) {
      const message = "Region " + region + " is in the RUSA data, but has no google calendar"
      Logger.log(message);
      return message
    } 
  }
  Logger.log('Found calendars for all regions in the data ');
  return(null)
}

// ---------------------------------------------------------------------------
// Event Processing
// ---------------------------------------------------------------------------
// ------------------------------------------------------
// Take an event and generate the terse title.
// ------------------------------------------------------
function EventTitle(RUSAevent) {  
  // Route names often end in NNNNk or some variation.
  // Apply regular expressions to trim this stuff away
  // because the title is supposed to be short.
  const regex1 = / \d+[Kk]*[Mm]* [Bb]revet/
  const regex2 = / \d+[Kk]*[Mm]*$/

  var title = region2shortname.get(RUSAevent["region"]) + ' '
  title    += RUSAevent["dist"] + ' '

  // Check for cancelled events.
  if ( (RUSAevent["cancelled"] !== undefined) ) {
    title = title + "CANCELLED "
  }

  // Apply regular expressions to the name to shorten it.
  if ( RUSAevent["route_name"] !== undefined ) {
    let clean_name = RUSAevent["route_name"];
    clean_name = clean_name.replace(regex1, "");
    clean_name = clean_name.replace(regex2, "");
    
    title += clean_name
  }

  return(title)
}

// --------------------------------------------------------------
// Do all of the date math to generate a Date object
// --------------------------------------------------------------
function RUSAEventStartDate(rusa_event) {
  const rusa_date = rusa_event.date
  // Tear apart the date parts so they can be used in a constructor.
  let [y, m, d] = rusa_date.split('/')

  // Javascript numbers months 0-11
  m--

  // Do everyting in PST, where midnight is 8am UT.
  const start_date = new Date(
      Date.UTC(y, m, d, 8, 0, 0, 0 ))

  // Sanity check
  if ( start_date.getUTCHours() != 8 ) {
    throw 'Bad time conversion'
  }

  return start_date
}

// --------------------------------------------------------------
// Calculate the event duration, as expected by the calendar API.
// For all-day events, the duration as returned by the API 
// is a minimum of one day.   So no special trickery.
// --------------------------------------------------------------
function RUSAEventDuration(RUSAEvent) {

  const d = RUSAEvent.dist

  if ( d == 360 ) return 2  // Fleches ( Special case) 
  if ( d <= 400 ) return 1 
  if ( d <= 600 ) return 2

  // else long events.   300k/day  
  const days = Math.floor(d / 300 )

  return days 
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --------------------------------------------------------------
// Event Creation
// This is the place to use try/catch and exponential back-off.
//
// return the event ID.
// --------------------------------------------------------------
async function CreateGCalEntry(calendar, title,startDate,days,event_id) {

  const end_ms   = startDate.getTime() + (86400 * 1000  * days)
  const end_date = new Date(end_ms)
  
  const options = {description: 'Automatically created by RUSA'}
  let   event   = null // Used to handle try/catch/retry, also  

  let backoff_timer = 1
  
  do { 
    try {
      if ( days > 1 ) {
       event = calendar.createAllDayEvent(title, startDate, end_date,options)
        Logger.log('Multi-day event ');
       } 
     else { 
       event = calendar.createAllDayEvent(title, startDate,options)      
     }
    }
    catch (err) {
      Logger.log("Back off!")
      await sleep(backoff_timer * 1000)
      backoff_timer = backoff_timer * 2 // Exponential back-off 
    }
  } while ( event === null )
 
  const cal_name = calendar.getName()

  // Set this so that its easier to ID this entry and match it up 
  // with the RUSA database.
  event.setTag('RUSAGenerated','True')
  event.setTag('event_id',event_id)
  event.setTag('saved_etag', event.etag) // Most 

  // Put some code here to read back the start time from the event that 
  // was just created and then throw an exception on mismatch.
  const _ev_date = event.getAllDayEndDate()
  const ev_date  = _ev_date.toDateString()
  
  if (end_date.toDateString() != ev_date ) {
    throw 'Date mismatch! ' + startDate.toDateString() + ' != ' + ev_date
  }

  count_additions++

  return(event_id)
}

// --------------------------------------------------------------
// Event Comparison.
// Figure out if the RUSA entry has changes 
//
// return Null on succees, a string otherwise.
// --------------------------------------------------------------
function RUSAisDifferent(title,startDate,days, GCalEvent) {

  // Start with the title.
  if ( title != GCalEvent.getTitle() ) {
    return true 
  }

  // So it turns out that date comparision is a little tricky.
  // https://stackoverflow.com/questions/11174385/compare-two-dates-google-apps-script
  // So it turns out that GCal does interesting things with all day event start dates
  // Basically, it localizes to local midnight.   When you include daylight savings,
  // it gets even more crazy.   So work around this by comparing the dates only, in text form
  const GCalStartDate = GCalEvent.getAllDayStartDate();
  const GCalStart     = GCalStartDate.toDateString()
  const RUSAStart     = startDate.toDateString()

  if ( RUSAStart != GCalStart ) {
    return true 
  }

  const endMS   = startDate.getTime() + (86400 * 1000  * days)
  const endDate = new Date(endMS)
  const endGCal = GCalEvent.getAllDayEndDate()
  
  if ( endDate.toDateString() != endGCal.toDateString() ) {
    return true 
  }

  return false 
}

// ----------------------------------------------------------------
// Event Processing. 
// Take in two maps, and create/update any events that are out of sync.
// ----------------------------------------------------------------
function processEvents(rusa_events, gcal_events) {  

  // Iterate through the maps and clean everything in there.  
  const iterator = rusa_events[Symbol.iterator]();

  for (const tuple of iterator) {
    // Pre-calculate all of the info required to make the gcal calendar 
    // entry, so that it can be checked against whats already in gcal.

    const ev_rusa = tuple[1] // Not the key...

    const title     = EventTitle(ev_rusa)
    const startDate = RUSAEventStartDate(ev_rusa)
    const days      = RUSAEventDuration(ev_rusa)

    // let params = " Params:" + title + ' ' + startDate + ' '  + days 
    // Logger.log(params);

    // Figure out what to do.    Start by determining whether or not 
    // there is a corresponding gCal event
    const ev_rusa_id = "" +  ev_rusa["event_id"] // stringify this.
    const ev_gcal    = gCal_events_by_id.get(ev_rusa_id)  
    const cal_id     = region2calendar.get(ev_rusa["region"])

    // If there is no gcal event, go ahead an create the event.
    // if there is a google event, figure out if they are different,
    // and if so create a new entry.
    if ( ev_gcal === undefined ) {
      Logger.log('Creating Calendar entry ' + title );
      CreateGCalEntry(cal_id,title,startDate,days,ev_rusa_id)
    } else {
      if ( RUSAisDifferent(title,startDate,days,ev_gcal) ) {
       Logger.log('Updating Calendar entry ' + title );
        ev_gcal.deleteEvent()
        gCal_events_by_id.delete(ev_rusa_id)
        const ev_id = CreateGCalEntry(cal_id,title,startDate,days,ev_rusa_id)
        gCal_events_by_id.set(ev_rusa_id,ev_id)
      }
      else { 
        const message = 'No Changes: ' + title
        Logger.log(message)
      }
    }  
  }
}

// -------------------------------------------------------------------
// -------------------------------------------------------------------
// Helper Functions.
// -------------------------------------------------------------------
// -------------------------------------------------------------------

// Make sure a row of the file is fully defined before using the data
// Return 0 for pass
function entrySanityCheck(row) {
    let c0 = row[0] != ""
    let c1 = row[1] != ""
    let c2 = row[2] != ""
    let c3 = row[3] != ""

    let defined = c0 && c1 && c2 && c3

    if ( defined ) return 0
    else return -1
}
}
