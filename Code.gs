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
    } else {
      // Logger.log('Region ' + data[i][0] + ' Missing a calendar');
    }
  }
}
