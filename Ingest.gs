//
// Do a query against a URL, and pretty up the results.
//
function processEvents() {
  let url = "https://rusa.org/cgi-bin/eventsearch_PF.pl?output_format=json&through=CA&apikey=QOlc"
  
  var response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});

  var json = response.getContentText();
  var data = JSON.parse(json);
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

    // Check for database errors.
    if ( days == 0 ) {
        days = 1
    }

    params += 'days=' + days + " "
   
    params += "Meta:event_id=" + data[i]["event_id"] + ','
    params += "RUSA=True"

    Logger.log(title + params);
    }
}
