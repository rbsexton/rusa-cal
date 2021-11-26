//
// onOpen() hook that gets run when the user 'opens' the 
// sheet.   This takes a little while to get going.
//
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('Custom Menu')
      .addItem('Create Calendars', 'processConfigSheetWrapper')
      .addSeparator()
      .addItem('Pre-check Automated Updates', 'preFlightWrapper')
      .addToUi();
}

// --------------------------------------------------------
// Run preflight and verify that everything is ready to go.
// --------------------------------------------------------
function preFlightWrapper() {

  let ret = preflight()
  if ( ret === null ) {
    ret = 'Checks pass.  Ready for automated updates'
  }

  // Fall out to success
  SpreadsheetApp.getUi() // Or DocumentApp or FormApp.
  .alert(ret);

}

// --------------------------------------------------------
// Process the config sheet after changes.
// --------------------------------------------------------
function processConfigSheetWrapper() {

  let ret = ConfigSheetIntegrityCheck()
 // This should return a null on pass.
  if ( ret !== null ) {
    SpreadsheetApp.getUi() // Or DocumentApp or FormApp.
    .alert(ret);
    return
    }

  // Keep going. 
  ret = processConfigSheet()
  
  // This should return a null on pass.
  if ( ret === null ) {
    ret = 'Done! Please run pre-flight tests'
  }

  // Fall out to success
  SpreadsheetApp.getUi() // Or DocumentApp or FormApp.
  .alert(ret);
  return 
}

//
// Do a basic verification that all the needed columns are filled in
//
function ConfigSheetIntegrityCheck() {

 "use strict"
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  let rows = data.length
  for (var i = 2; i < rows; i++) {
    let c0 = data[i][0] != ""
    let c1 = data[i][1] != ""
    let c2 = data[i][2] != ""
    let c3 = data[i][3] != ""

    let completed = c0 && c1 && c2 &&  c3
    let ready     = c0 && c1 && c2 && !c3

    if ( completed ) {
      ; // Do nothing
    } else if ( ready ) {
      ; // Do Nothing 
    } else {
    SpreadsheetApp.getUi() // Or DocumentApp or FormApp.
      let rownumber = i + 1
      const message = 'Row ' + rownumber + ' is incomplete'
      return message 
    }
  }

  return null 
 
  // Fall out to success
  //SpreadsheetApp.getUi() // Or DocumentApp or FormApp.
  //.alert('Everything looks good!');
}

function menuItem2() {
  SpreadsheetApp.getUi() // Or DocumentApp or FormApp.
     .alert('You clicked the second menu item!');
}


