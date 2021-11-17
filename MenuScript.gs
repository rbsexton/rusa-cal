function onOpen() {
  var ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('Custom Menu')
      .addItem('Rescan Table', 'menuItem2')
      .addSeparator()
      .addItem('Pre-flight Check', 'IntegrityCheck')
      .addToUi();
}

//
// Do a basic verification that all the needed columns are filled in
//
function IntegrityCheck() {

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
      .alert('Row ' + rownumber + ' is incomplete');
      return
    }
  }

  // Fall out to success
  SpreadsheetApp.getUi() // Or DocumentApp or FormApp.
  .alert('Everything looks good!');
}

function menuItem2() {
  SpreadsheetApp.getUi() // Or DocumentApp or FormApp.
     .alert('You clicked the second menu item!');
}


