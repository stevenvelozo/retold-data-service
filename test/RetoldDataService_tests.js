/**
* Unit tests for Retold Data Service
*
* @license     MIT
*
* @author      Steven Velozo <steven@velozo.com>
*/

var Chai = require("chai");
var Expect = Chai.expect;

const libFable = require('fable');
const libSuperTest = require('supertest');
const libMeadowConnectionSQLite = require('meadow-connection-sqlite');

const _APIServerPort = 9329;
const _BaseURL = `http://localhost:${_APIServerPort}/`;

let _Fable;
let _RetoldDataService;
let _SuperTest;

suite
(
	'Retold Data Service',
	function()
	{
		suiteSetup
		(
			function(fDone)
			{
				this.timeout(10000);

				let tmpSettings = {
					Product: 'RetoldDataServiceTest',
					ProductVersion: '1.0.0',
					APIServerPort: _APIServerPort,
					SQLite:
						{
							SQLiteFilePath: ':memory:'
						},
					LogStreams:
						[
							{
								streamtype: 'console',
								level: 'fatal'
							}
						]
				};

				_Fable = new libFable(tmpSettings);

				// Register the SQLite provider
				_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
				_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

				_Fable.MeadowSQLiteProvider.connectAsync(
					(pError) =>
					{
						if (pError)
						{
							return fDone(pError);
						}

						let tmpDB = _Fable.MeadowSQLiteProvider.db;

						// Create all tables for the BookStore model
						tmpDB.exec(`
							CREATE TABLE IF NOT EXISTS Book (
								IDBook INTEGER PRIMARY KEY AUTOINCREMENT,
								GUIDBook TEXT,
								CreateDate TEXT,
								CreatingIDUser INTEGER DEFAULT 0,
								UpdateDate TEXT,
								UpdatingIDUser INTEGER DEFAULT 0,
								Deleted INTEGER DEFAULT 0,
								DeleteDate TEXT,
								DeletingIDUser INTEGER DEFAULT 0,
								Title TEXT,
								Type TEXT,
								Genre TEXT,
								ISBN TEXT,
								Language TEXT,
								ImageURL TEXT,
								PublicationYear INTEGER DEFAULT 0
							);
							CREATE TABLE IF NOT EXISTS Author (
								IDAuthor INTEGER PRIMARY KEY AUTOINCREMENT,
								GUIDAuthor TEXT,
								CreateDate TEXT,
								CreatingIDUser INTEGER DEFAULT 0,
								UpdateDate TEXT,
								UpdatingIDUser INTEGER DEFAULT 0,
								Deleted INTEGER DEFAULT 0,
								DeleteDate TEXT,
								DeletingIDUser INTEGER DEFAULT 0,
								Name TEXT
							);
							CREATE TABLE IF NOT EXISTS BookAuthorJoin (
								IDBookAuthorJoin INTEGER PRIMARY KEY AUTOINCREMENT,
								GUIDBookAuthorJoin TEXT,
								IDBook INTEGER DEFAULT 0,
								IDAuthor INTEGER DEFAULT 0
							);
							CREATE TABLE IF NOT EXISTS BookPrice (
								IDBookPrice INTEGER PRIMARY KEY AUTOINCREMENT,
								GUIDBookPrice TEXT,
								CreateDate TEXT,
								CreatingIDUser INTEGER DEFAULT 0,
								UpdateDate TEXT,
								UpdatingIDUser INTEGER DEFAULT 0,
								Deleted INTEGER DEFAULT 0,
								DeleteDate TEXT,
								DeletingIDUser INTEGER DEFAULT 0,
								Price REAL DEFAULT 0,
								StartDate TEXT,
								EndDate TEXT,
								Discountable INTEGER DEFAULT 0,
								CouponCode TEXT,
								IDBook INTEGER DEFAULT 0
							);
							CREATE TABLE IF NOT EXISTS Review (
								IDReviews INTEGER PRIMARY KEY AUTOINCREMENT,
								GUIDReviews TEXT,
								CreateDate TEXT,
								CreatingIDUser INTEGER DEFAULT 0,
								UpdateDate TEXT,
								UpdatingIDUser INTEGER DEFAULT 0,
								Deleted INTEGER DEFAULT 0,
								DeleteDate TEXT,
								DeletingIDUser INTEGER DEFAULT 0,
								Text TEXT,
								Rating INTEGER DEFAULT 0,
								IDBook INTEGER DEFAULT 0
							);
						`);

						// Seed some test data
						let tmpInsertBook = tmpDB.prepare(
							`INSERT INTO Book (IDBook, GUIDBook, Title, Type, Genre, ISBN, Language, PublicationYear, Deleted)
							 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`);

						tmpInsertBook.run(1, 'guid-book-001', 'Dune', 'Fiction', 'Science Fiction', '978-0441172719', 'English', 1965);
						tmpInsertBook.run(2, 'guid-book-002', 'Neuromancer', 'Fiction', 'Science Fiction', '978-0441569595', 'English', 1984);
						tmpInsertBook.run(3, 'guid-book-003', 'Foundation', 'Fiction', 'Science Fiction', '978-0553293357', 'English', 1951);
						tmpInsertBook.run(4, 'guid-book-004', 'Snow Crash', 'Fiction', 'Science Fiction', '978-0553380958', 'English', 1992);
						tmpInsertBook.run(5, 'guid-book-005', 'The Hobbit', 'Fiction', 'Fantasy', '978-0547928227', 'English', 1937);

						let tmpInsertAuthor = tmpDB.prepare(
							`INSERT INTO Author (IDAuthor, GUIDAuthor, Name, Deleted)
							 VALUES (?, ?, ?, 0)`);

						tmpInsertAuthor.run(1, 'guid-author-001', 'Frank Herbert');
						tmpInsertAuthor.run(2, 'guid-author-002', 'William Gibson');
						tmpInsertAuthor.run(3, 'guid-author-003', 'Isaac Asimov');

						let tmpInsertJoin = tmpDB.prepare(
							`INSERT INTO BookAuthorJoin (IDBookAuthorJoin, GUIDBookAuthorJoin, IDBook, IDAuthor)
							 VALUES (?, ?, ?, ?)`);

						tmpInsertJoin.run(1, 'guid-join-001', 1, 1);
						tmpInsertJoin.run(2, 'guid-join-002', 2, 2);
						tmpInsertJoin.run(3, 'guid-join-003', 3, 3);

						let tmpInsertReview = tmpDB.prepare(
							`INSERT INTO Review (IDReviews, GUIDReviews, Text, Rating, IDBook, Deleted)
							 VALUES (?, ?, ?, ?, ?, 0)`);

						tmpInsertReview.run(1, 'guid-review-001', 'A masterpiece of science fiction', 5, 1);
						tmpInsertReview.run(2, 'guid-review-002', 'Visionary cyberpunk', 4, 2);

						// Register the RetoldDataService with SQLite config
						_Fable.serviceManager.addServiceType('RetoldDataService', require('../source/Retold-Data-Service.js'));
						_RetoldDataService = _Fable.serviceManager.instantiateServiceProvider('RetoldDataService',
							{
								FullMeadowSchemaPath: `${process.cwd()}/test/model/`,
								FullMeadowSchemaFilename: `MeadowModel-Extended.json`,
								DALMeadowSchemaPath: `${process.cwd()}/test/model/meadow/`,

								StorageProvider: 'SQLite',
								StorageProviderModule: 'meadow-connection-sqlite',

								AutoInitializeDataService: true,
								AutoStartOrator: true
							});

						_RetoldDataService.initializeService(
							(pInitError) =>
							{
								if (pInitError)
								{
									return fDone(pInitError);
								}
								_SuperTest = libSuperTest(_BaseURL);
								fDone();
							});
					});
			}
		);

		suiteTeardown
		(
			function(fDone)
			{
				this.timeout(5000);
				// Close the database
				if (_Fable && _Fable.MeadowSQLiteProvider && _Fable.MeadowSQLiteProvider.db)
				{
					try { _Fable.MeadowSQLiteProvider.db.close(); }
					catch (pIgnore) { /* already closed */ }
				}
				// Close the server directly to avoid keep-alive hangs
				if (_Fable && _Fable.OratorServiceServer && _Fable.OratorServiceServer.Active && _Fable.OratorServiceServer.server)
				{
					_Fable.OratorServiceServer.server.close(
						() =>
						{
							_Fable.OratorServiceServer.Active = false;
							fDone();
						});
				}
				else
				{
					fDone();
				}
			}
		);

		suite
		(
			'Object Sanity',
			function()
			{
				test
				(
					'RetoldDataService class should exist',
					function()
					{
						let tmpRetoldDataServiceClass = require('../source/Retold-Data-Service.js');
						Expect(tmpRetoldDataServiceClass).to.be.a('function');
					}
				);
				test
				(
					'RetoldDataService instance should have been created',
					function()
					{
						Expect(_RetoldDataService).to.be.an('object');
						Expect(_RetoldDataService.serviceType).to.equal('RetoldDataService');
					}
				);
				test
				(
					'RetoldDataService should be initialized',
					function()
					{
						Expect(_RetoldDataService.serviceInitialized).to.equal(true);
					}
				);
				test
				(
					'Should have loaded the full model',
					function()
					{
						Expect(_RetoldDataService.fullModel).to.be.an('object');
						Expect(_RetoldDataService.fullModel.Tables).to.be.an('object');
					}
				);
				test
				(
					'Should have the correct entity list',
					function()
					{
						Expect(_RetoldDataService.entityList).to.be.an('array');
						Expect(_RetoldDataService.entityList).to.include('Book');
						Expect(_RetoldDataService.entityList).to.include('Author');
						Expect(_RetoldDataService.entityList).to.include('BookAuthorJoin');
						Expect(_RetoldDataService.entityList).to.include('BookPrice');
						Expect(_RetoldDataService.entityList).to.include('Review');
					}
				);
				test
				(
					'Should have created DAL objects for each entity',
					function()
					{
						Expect(_Fable.DAL).to.be.an('object');
						Expect(_Fable.DAL.Book).to.be.an('object');
						Expect(_Fable.DAL.Author).to.be.an('object');
						Expect(_Fable.DAL.BookAuthorJoin).to.be.an('object');
						Expect(_Fable.DAL.BookPrice).to.be.an('object');
						Expect(_Fable.DAL.Review).to.be.an('object');
					}
				);
				test
				(
					'Should have created MeadowEndpoints for each entity',
					function()
					{
						Expect(_Fable.MeadowEndpoints).to.be.an('object');
						Expect(_Fable.MeadowEndpoints.Book).to.be.an('object');
						Expect(_Fable.MeadowEndpoints.Author).to.be.an('object');
						Expect(_Fable.MeadowEndpoints.BookAuthorJoin).to.be.an('object');
						Expect(_Fable.MeadowEndpoints.BookPrice).to.be.an('object');
						Expect(_Fable.MeadowEndpoints.Review).to.be.an('object');
					}
				);
				test
				(
					'DAL objects should be configured with SQLite provider',
					function()
					{
						Expect(_Fable.DAL.Book.providerName).to.equal('SQLite');
						Expect(_Fable.DAL.Author.providerName).to.equal('SQLite');
					}
				);
			}
		);

		suite
		(
			'Service Lifecycle',
			function()
			{
				test
				(
					'Should error when initializing an already-initialized service',
					function(fDone)
					{
						_RetoldDataService.initializeService(
							(pError) =>
							{
								Expect(pError).to.be.an.instanceof(Error);
								Expect(pError.message).to.contain('already been initialized');
								fDone();
							});
					}
				);
				test
				(
					'Should have onBeforeInitialize hook',
					function()
					{
						Expect(_RetoldDataService.onBeforeInitialize).to.be.a('function');
					}
				);
				test
				(
					'Should have onInitialize hook',
					function()
					{
						Expect(_RetoldDataService.onInitialize).to.be.a('function');
					}
				);
				test
				(
					'Should have onAfterInitialize hook',
					function()
					{
						Expect(_RetoldDataService.onAfterInitialize).to.be.a('function');
					}
				);
				test
				(
					'Should have stopService method',
					function()
					{
						Expect(_RetoldDataService.stopService).to.be.a('function');
					}
				);
			}
		);

		suite
		(
			'Options and Configuration',
			function()
			{
				test
				(
					'Should have default options merged',
					function()
					{
						Expect(_RetoldDataService.options).to.be.an('object');
						Expect(_RetoldDataService.options.StorageProvider).to.equal('SQLite');
						Expect(_RetoldDataService.options.AutoStartOrator).to.equal(true);
						Expect(_RetoldDataService.options.AutoInitializeDataService).to.equal(true);
					}
				);
				test
				(
					'Should have correct schema paths',
					function()
					{
						Expect(_RetoldDataService.options.FullMeadowSchemaPath).to.contain('test/model/');
						Expect(_RetoldDataService.options.FullMeadowSchemaFilename).to.equal('MeadowModel-Extended.json');
					}
				);
			}
		);

		suite
		(
			'Book CRUD Endpoints',
			function()
			{
				test
				(
					'Read a single Book by ID',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Book/1')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecord = JSON.parse(pResponse.text);
									Expect(tmpRecord.IDBook).to.equal(1);
									Expect(tmpRecord.Title).to.equal('Dune');
									Expect(tmpRecord.Genre).to.equal('Science Fiction');
									Expect(tmpRecord.PublicationYear).to.equal(1965);
									fDone();
								});
					}
				);
				test
				(
					'Read another Book by ID',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Book/2')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecord = JSON.parse(pResponse.text);
									Expect(tmpRecord.IDBook).to.equal(2);
									Expect(tmpRecord.Title).to.equal('Neuromancer');
									fDone();
								});
					}
				);
				test
				(
					'Read multiple Books',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Books')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecords = JSON.parse(pResponse.text);
									Expect(tmpRecords).to.be.an('array');
									Expect(tmpRecords.length).to.equal(5);
									fDone();
								});
					}
				);
				test
				(
					'Read Books with filter',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Books/FilteredTo/FBV~Genre~EQ~Fantasy')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecords = JSON.parse(pResponse.text);
									Expect(tmpRecords).to.be.an('array');
									Expect(tmpRecords.length).to.equal(1);
									Expect(tmpRecords[0].Title).to.equal('The Hobbit');
									fDone();
								});
					}
				);
				test
				(
					'Read Books with LIKE filter',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Books/FilteredTo/FBV~Title~LK~%25Dune%25')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecords = JSON.parse(pResponse.text);
									Expect(tmpRecords).to.be.an('array');
									Expect(tmpRecords.length).to.equal(1);
									Expect(tmpRecords[0].Title).to.equal('Dune');
									fDone();
								});
					}
				);
				test
				(
					'Read Books with pagination (cap)',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Books/0/2')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecords = JSON.parse(pResponse.text);
									Expect(tmpRecords).to.be.an('array');
									Expect(tmpRecords.length).to.equal(2);
									fDone();
								});
					}
				);
				test
				(
					'Read Books with pagination (begin + cap)',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Books/2/2')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecords = JSON.parse(pResponse.text);
									Expect(tmpRecords).to.be.an('array');
									Expect(tmpRecords.length).to.equal(2);
									fDone();
								});
					}
				);
				test
				(
					'Count all Books',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Books/Count')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpResult = JSON.parse(pResponse.text);
									Expect(tmpResult.Count).to.equal(5);
									fDone();
								});
					}
				);
				test
				(
					'Count Books with filter',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Books/Count/FilteredTo/FBV~Genre~EQ~Science Fiction')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpResult = JSON.parse(pResponse.text);
									Expect(tmpResult.Count).to.equal(4);
									fDone();
								});
					}
				);
				test
				(
					'Create a new Book',
					function(fDone)
					{
						_SuperTest
							.post('1.0/Book')
							.send(
								{
									Title: 'Enders Game',
									Type: 'Fiction',
									Genre: 'Science Fiction',
									ISBN: '978-0812550702',
									Language: 'English',
									PublicationYear: 1985
								})
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecord = JSON.parse(pResponse.text);
									Expect(tmpRecord.IDBook).to.be.greaterThan(0);
									Expect(tmpRecord.Title).to.equal('Enders Game');
									Expect(tmpRecord.Genre).to.equal('Science Fiction');
									Expect(tmpRecord.GUIDBook).to.be.a('string');
									Expect(tmpRecord.GUIDBook.length).to.be.greaterThan(5);
									fDone();
								});
					}
				);
				test
				(
					'Verify Book count after create',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Books/Count')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpResult = JSON.parse(pResponse.text);
									Expect(tmpResult.Count).to.equal(6);
									fDone();
								});
					}
				);
				test
				(
					'Update a Book',
					function(fDone)
					{
						_SuperTest
							.put('1.0/Book')
							.send(
								{
									IDBook: 1,
									Title: 'Dune (Updated Edition)',
									PublicationYear: 1965
								})
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecord = JSON.parse(pResponse.text);
									Expect(tmpRecord.IDBook).to.equal(1);
									Expect(tmpRecord.Title).to.equal('Dune (Updated Edition)');
									fDone();
								});
					}
				);
				test
				(
					'Verify the update persisted',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Book/1')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecord = JSON.parse(pResponse.text);
									Expect(tmpRecord.Title).to.equal('Dune (Updated Edition)');
									fDone();
								});
					}
				);
				test
				(
					'Delete a Book (soft delete)',
					function(fDone)
					{
						_SuperTest
							.del('1.0/Book/5')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpResult = JSON.parse(pResponse.text);
									Expect(tmpResult.Count).to.equal(1);
									fDone();
								});
					}
				);
				test
				(
					'Verify deleted Book is not returned in reads',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Books/Count')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpResult = JSON.parse(pResponse.text);
									Expect(tmpResult.Count).to.equal(5);
									fDone();
								});
					}
				);
				test
				(
					'Read a non-existent Book returns 404',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Book/999')
							.expect(404)
							.end(
								(pError, pResponse) =>
								{
									let tmpResult = JSON.parse(pResponse.text);
									Expect(tmpResult.Error).to.equal('Record not Found');
									fDone();
								});
					}
				);
				test
				(
					'Get Book schema endpoint',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Book/Schema')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpSchema = JSON.parse(pResponse.text);
									Expect(tmpSchema).to.be.an('object');
									Expect(tmpSchema.title).to.equal('Book');
									Expect(tmpSchema.properties).to.be.an('object');
									Expect(tmpSchema.properties.Title).to.be.an('object');
									fDone();
								});
					}
				);
				test
				(
					'Get a new default Book record',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Book/Schema/New')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecord = JSON.parse(pResponse.text);
									Expect(tmpRecord).to.be.an('object');
									Expect(tmpRecord.IDBook).to.equal(0);
									Expect(tmpRecord.Title).to.equal('');
									fDone();
								});
					}
				);
			}
		);

		suite
		(
			'Author CRUD Endpoints',
			function()
			{
				test
				(
					'Read a single Author',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Author/1')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecord = JSON.parse(pResponse.text);
									Expect(tmpRecord.IDAuthor).to.equal(1);
									Expect(tmpRecord.Name).to.equal('Frank Herbert');
									fDone();
								});
					}
				);
				test
				(
					'Read all Authors',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Authors')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecords = JSON.parse(pResponse.text);
									Expect(tmpRecords).to.be.an('array');
									Expect(tmpRecords.length).to.equal(3);
									fDone();
								});
					}
				);
				test
				(
					'Create a new Author',
					function(fDone)
					{
						_SuperTest
							.post('1.0/Author')
							.send({ Name: 'Neal Stephenson' })
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecord = JSON.parse(pResponse.text);
									Expect(tmpRecord.IDAuthor).to.be.greaterThan(0);
									Expect(tmpRecord.Name).to.equal('Neal Stephenson');
									fDone();
								});
					}
				);
				test
				(
					'Update an Author',
					function(fDone)
					{
						_SuperTest
							.put('1.0/Author')
							.send({ IDAuthor: 1, Name: 'Frank P. Herbert' })
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecord = JSON.parse(pResponse.text);
									Expect(tmpRecord.IDAuthor).to.equal(1);
									Expect(tmpRecord.Name).to.equal('Frank P. Herbert');
									fDone();
								});
					}
				);
				test
				(
					'Count Authors',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Authors/Count')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpResult = JSON.parse(pResponse.text);
									Expect(tmpResult.Count).to.equal(4);
									fDone();
								});
					}
				);
				test
				(
					'Delete an Author (soft delete)',
					function(fDone)
					{
						_SuperTest
							.del('1.0/Author/4')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpResult = JSON.parse(pResponse.text);
									Expect(tmpResult.Count).to.equal(1);
									fDone();
								});
					}
				);
				test
				(
					'Verify Author soft delete in count',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Authors/Count')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpResult = JSON.parse(pResponse.text);
									Expect(tmpResult.Count).to.equal(3);
									fDone();
								});
					}
				);
			}
		);

		suite
		(
			'BookAuthorJoin Endpoints',
			function()
			{
				test
				(
					'Read all BookAuthorJoins',
					function(fDone)
					{
						_SuperTest
							.get('1.0/BookAuthorJoins')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecords = JSON.parse(pResponse.text);
									Expect(tmpRecords).to.be.an('array');
									Expect(tmpRecords.length).to.equal(3);
									fDone();
								});
					}
				);
				test
				(
					'Read a single BookAuthorJoin',
					function(fDone)
					{
						_SuperTest
							.get('1.0/BookAuthorJoin/1')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecord = JSON.parse(pResponse.text);
									Expect(tmpRecord.IDBookAuthorJoin).to.equal(1);
									Expect(tmpRecord.IDBook).to.equal(1);
									Expect(tmpRecord.IDAuthor).to.equal(1);
									fDone();
								});
					}
				);
				test
				(
					'Create a BookAuthorJoin',
					function(fDone)
					{
						_SuperTest
							.post('1.0/BookAuthorJoin')
							.send({ IDBook: 4, IDAuthor: 4 })
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecord = JSON.parse(pResponse.text);
									Expect(tmpRecord.IDBookAuthorJoin).to.be.greaterThan(0);
									Expect(tmpRecord.IDBook).to.equal(4);
									Expect(tmpRecord.IDAuthor).to.equal(4);
									fDone();
								});
					}
				);
			}
		);

		suite
		(
			'Review Endpoints',
			function()
			{
				test
				(
					'Read all Reviews',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Reviews')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecords = JSON.parse(pResponse.text);
									Expect(tmpRecords).to.be.an('array');
									Expect(tmpRecords.length).to.equal(2);
									fDone();
								});
					}
				);
				test
				(
					'Read a single Review',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Review/1')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecord = JSON.parse(pResponse.text);
									Expect(tmpRecord.IDReviews).to.equal(1);
									Expect(tmpRecord.Rating).to.equal(5);
									Expect(tmpRecord.IDBook).to.equal(1);
									fDone();
								});
					}
				);
				test
				(
					'Create a Review',
					function(fDone)
					{
						_SuperTest
							.post('1.0/Review')
							.send(
								{
									Text: 'Great classic sci-fi',
									Rating: 4,
									IDBook: 3
								})
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecord = JSON.parse(pResponse.text);
									Expect(tmpRecord.IDReviews).to.be.greaterThan(0);
									Expect(tmpRecord.Text).to.equal('Great classic sci-fi');
									Expect(tmpRecord.Rating).to.equal(4);
									Expect(tmpRecord.IDBook).to.equal(3);
									fDone();
								});
					}
				);
				test
				(
					'Count Reviews',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Reviews/Count')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpResult = JSON.parse(pResponse.text);
									Expect(tmpResult.Count).to.equal(3);
									fDone();
								});
					}
				);
				test
				(
					'Filter Reviews by IDBook',
					function(fDone)
					{
						_SuperTest
							.get('1.0/Reviews/FilteredTo/FBV~IDBook~EQ~1')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecords = JSON.parse(pResponse.text);
									Expect(tmpRecords).to.be.an('array');
									Expect(tmpRecords.length).to.equal(1);
									Expect(tmpRecords[0].IDBook).to.equal(1);
									fDone();
								});
					}
				);
			}
		);

		suite
		(
			'BookPrice Endpoints',
			function()
			{
				test
				(
					'Create a BookPrice',
					function(fDone)
					{
						_SuperTest
							.post('1.0/BookPrice')
							.send(
								{
									Price: 14.99,
									CouponCode: 'SAVE10',
									IDBook: 1,
									Discountable: 1
								})
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecord = JSON.parse(pResponse.text);
									Expect(tmpRecord.IDBookPrice).to.be.greaterThan(0);
									Expect(tmpRecord.Price).to.equal(14.99);
									Expect(tmpRecord.CouponCode).to.equal('SAVE10');
									Expect(tmpRecord.IDBook).to.equal(1);
									fDone();
								});
					}
				);
				test
				(
					'Read BookPrices',
					function(fDone)
					{
						_SuperTest
							.get('1.0/BookPrices')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecords = JSON.parse(pResponse.text);
									Expect(tmpRecords).to.be.an('array');
									Expect(tmpRecords.length).to.equal(1);
									fDone();
								});
					}
				);
				test
				(
					'Update a BookPrice',
					function(fDone)
					{
						_SuperTest
							.put('1.0/BookPrice')
							.send(
								{
									IDBookPrice: 1,
									Price: 12.99,
									CouponCode: 'SUPERSAVE'
								})
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpRecord = JSON.parse(pResponse.text);
									Expect(tmpRecord.IDBookPrice).to.equal(1);
									Expect(tmpRecord.Price).to.equal(12.99);
									Expect(tmpRecord.CouponCode).to.equal('SUPERSAVE');
									fDone();
								});
					}
				);
			}
		);

		suite
		(
			'DAL Direct Access',
			function()
			{
				test
				(
					'Should be able to query through DAL directly',
					function(fDone)
					{
						let tmpQuery = _Fable.DAL.Book.query
							.addFilter('IDBook', 1);
						_Fable.DAL.Book.doRead(tmpQuery,
							(pError, pQuery, pRecord) =>
							{
								Expect(pError).to.equal(null);
								Expect(pRecord.IDBook).to.equal(1);
								Expect(pRecord.Title).to.equal('Dune (Updated Edition)');
								fDone();
							});
					}
				);
				test
				(
					'Should be able to doReads through DAL',
					function(fDone)
					{
						let tmpQuery = _Fable.DAL.Author.query
							.setCap(10);
						_Fable.DAL.Author.doReads(tmpQuery,
							(pError, pQuery, pRecords) =>
							{
								Expect(pError).to.equal(null);
								Expect(pRecords).to.be.an('array');
								Expect(pRecords.length).to.equal(3);
								fDone();
							});
					}
				);
				test
				(
					'Should be able to doCount through DAL',
					function(fDone)
					{
						let tmpQuery = _Fable.DAL.Review.query;
						_Fable.DAL.Review.doCount(tmpQuery,
							(pError, pQuery, pCount) =>
							{
								Expect(pError).to.equal(null);
								Expect(pCount).to.equal(3);
								fDone();
							});
					}
				);
			}
		);

		suite
		(
			'Behavior Injection',
			function()
			{
				test
				(
					'Should support behavior injection on endpoints',
					function(fDone)
					{
						let tmpPreReadCalled = false;

						_Fable.MeadowEndpoints.Book.controller.BehaviorInjection.setBehavior(
							'Read-PreOperation',
							(pRequest, pRequestState, fRequestComplete) =>
							{
								tmpPreReadCalled = true;
								return fRequestComplete(false);
							});

						_SuperTest
							.get('1.0/Book/1')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									Expect(tmpPreReadCalled).to.equal(true);
									let tmpRecord = JSON.parse(pResponse.text);
									Expect(tmpRecord.IDBook).to.equal(1);

									// Clean up the behavior
									delete _Fable.MeadowEndpoints.Book.controller.BehaviorInjection._BehaviorFunctions['Read-PreOperation'];
									fDone();
								});
					}
				);
				test
				(
					'Should support post-operation behavior injection',
					function(fDone)
					{
						let tmpPostReadCalled = false;

						_Fable.MeadowEndpoints.Author.controller.BehaviorInjection.setBehavior(
							'Reads-PostOperation',
							(pRequest, pRequestState, fRequestComplete) =>
							{
								tmpPostReadCalled = true;
								return fRequestComplete(false);
							});

						_SuperTest
							.get('1.0/Authors')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									Expect(tmpPostReadCalled).to.equal(true);
									let tmpRecords = JSON.parse(pResponse.text);
									Expect(tmpRecords).to.be.an('array');

									// Clean up the behavior
									delete _Fable.MeadowEndpoints.Author.controller.BehaviorInjection._BehaviorFunctions['Reads-PostOperation'];
									fDone();
								});
					}
				);
			}
		);

		suite
		(
			'Cross-Entity Operations',
			function()
			{
				test
				(
					'Should serve all entity endpoints simultaneously',
					function(fDone)
					{
						// Hit multiple endpoints to prove the service serves all entities
						let tmpCompleted = 0;
						let tmpTotal = 3;

						let checkDone = () =>
						{
							tmpCompleted++;
							if (tmpCompleted >= tmpTotal)
							{
								fDone();
							}
						};

						_SuperTest
							.get('1.0/Books/Count')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpResult = JSON.parse(pResponse.text);
									Expect(tmpResult.Count).to.be.greaterThan(0);
									checkDone();
								});

						_SuperTest
							.get('1.0/Authors/Count')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpResult = JSON.parse(pResponse.text);
									Expect(tmpResult.Count).to.be.greaterThan(0);
									checkDone();
								});

						_SuperTest
							.get('1.0/Reviews/Count')
							.expect(200)
							.end(
								(pError, pResponse) =>
								{
									let tmpResult = JSON.parse(pResponse.text);
									Expect(tmpResult.Count).to.be.greaterThan(0);
									checkDone();
								});
					}
				);
			}
		);

		suite
		(
			'Error Handling',
			function()
			{
				test
				(
					'Should error when stopping an uninitialized service',
					function(fDone)
					{
						let tmpFable = new libFable({LogStreams: [{streamtype: 'console', level: 'fatal'}]});
						tmpFable.serviceManager.addServiceType('RetoldDataService', require('../source/Retold-Data-Service.js'));
						let tmpService = tmpFable.serviceManager.instantiateServiceProvider('RetoldDataService',
							{
								AutoStartOrator: false,
								FullMeadowSchemaPath: `${process.cwd()}/test/model/`,
								FullMeadowSchemaFilename: `MeadowModel-Extended.json`
							});
						// Don't initialize, just try to stop
						tmpService.stopService(
							(pError) =>
							{
								Expect(pError).to.be.an.instanceof(Error);
								Expect(pError.message).to.contain('not initialized');
								fDone();
							});
					}
				);
			}
		);
	}
);
