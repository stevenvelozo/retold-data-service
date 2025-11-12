const _Settings = (
	{
		"Product": "MeadowEndpointsTestHarness",

		"ProductVersion": "1.0.0",
		"UUID":
			{
				"DataCenter": 0,
				"Worker": 0
			},
		"LogStreams":
			[
				{
					"streamtype": "console"
				}
			],

		"APIServerPort": 8087,

		"RetoldDataServiceOptions":
		{
			"StorageProvider": "MySQL",
			"StorageProviderModule": "meadow-connection-mysql",

			"FullMeadowSchemaPath": `${__dirname}/../test/model/`,
			"FullMeadowSchemaFilename": `MeadowModel-Extended.json`,
		},

		"MySQL":
			{
				"Server": "127.0.0.1",
				"Port": 31306,
				"User": "root",
				"Password": "123456789",
				"Database": "bookstore",
				"ConnectionPoolLimit": 20
			},
		"MeadowConnectionMySQLAutoConnect": true
	});

const libFable = require('fable');

_Fable = new libFable(_Settings);

_Fable.serviceManager.addServiceType('RetoldDataService', require('../source/Retold-Data-Service.js'));
_Fable.serviceManager.instantiateServiceProvider('RetoldDataService', _Settings.RetoldDataServiceOptions);

_Fable.RetoldDataService.initializeService(
	(pError) =>
	{
		if (pError)
		{
			_Fable.log.error(`Error initializing the Retold Data Service: ${pError}`);
			throw pError;
		}

		// Inject a behavior to load all authors for a book on single record read
		_Fable.MeadowEndpoints.Book.controller.BehaviorInjection.setBehavior('Read-PostOperation',
			(pRequest, pRequestState, fComplete) =>
			{
				// Get the join records
				_Fable.DAL.BookAuthorJoin.doReads(_Fable.DAL.BookAuthorJoin.query.addFilter('IDBook', pRequestState.Record.IDBook),
					(pJoinReadError, pJoinReadQuery, pJoinRecords)=>
					{
						let tmpAuthorList = [];
						for (let j = 0; j < pJoinRecords.length; j++)
						{
							tmpAuthorList.push(pJoinRecords[j].IDAuthor);
						}
						if (tmpAuthorList.length < 1)
						{
							pRequestState.Record.Authors = [];
							return fComplete();
						}
						else
						{
							_Fable.DAL.Author.doReads(_Fable.DAL.Author.query.addFilter('IDAuthor', tmpAuthorList, 'IN'),
								(pReadsError, pReadsQuery, pAuthors)=>
								{
									pRequestState.Record.Authors = pAuthors;
									return fComplete();
								});
						}
					});
			});

		const fGracefullyStopService = function ()
		{
				if (_Fable.RetoldDataService.serviceInitialized)
				{
					_Fable.RetoldDataService.stopService(
						function (pStopError)
						{
							if (pStopError)
							{
								_Fable.log.error(`Error stopping Retold Data Service: ${pStopError}`);
							}
							else
							{
								_Fable.log.info('Retold Data Service stopped. Exiting.');
							}
						});
				}
		};

		process.on('SIGINT', 
			function ()
			{
				_Fable.log.info('Received SIGINT. Shutting down gracefully...');
				fGracefullyStopService();
			});

		process.on('SIGTERM',
			function ()
			{
				_Fable.log.info('Received SIGTERM. Shutting down gracefully...');
				fGracefullyStopService();
			});
	});