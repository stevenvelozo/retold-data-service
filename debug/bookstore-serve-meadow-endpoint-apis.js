/*
	An example of Meadow Endpoints, Fable and Orator
*/

/**
* @license MIT
* @author <steven@velozo.com>
*/

// Server Settings
let fStartServiceServer = (fInitializeCallback) =>
{
	_Orator.initializeServiceServer(() =>
		{


			// 100. Add a post processing hook to the Book DAL on single reads
			/*
				This post processing step will look for all book author joins then 
				load all appropriate authors and stuff them in the book record before 
				returning it.
			*/


			// Static site mapping
			_Orator.log.info("...Mapping static route for web site...");

			//_Orator.addStaticRoute(__dirname+'/../web/');

			// Start the web server (ctrl+c to end it)
			_Orator.startWebServer(
				(pError) =>
				{
					fInitializeCallback(pError);
				}
			);
		});
	return _Orator;
}

module.exports = fStartServiceServer;