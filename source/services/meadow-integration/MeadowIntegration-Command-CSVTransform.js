/**
 * MeadowIntegration Command - CSV Transform
 *
 * POST /1.0/Retold/MeadowIntegration/CSV/Transform
 *
 * Transform a CSV file into a comprehension using mapping configuration.
 *
 * Body: {
 *   "File": "/path/to/file.csv",
 *   "Entity": "MyEntity",
 *   "GUIDTemplate": "{~D:Record.id~}",
 *   "Mappings": { "Col1": "{~D:Record.col1~}" },
 *   "MappingConfiguration": { ... },
 *   "IncomingComprehension": { ... },
 *   "Extended": false,
 *   "QuoteDelimiter": "\""
 * }
 * Returns: Comprehension JSON (or extended state if Extended=true)
 */
const libFS = require('fs');
const libPath = require('path');
const libReadline = require('readline');

module.exports = function(pIntegrationService, pOratorServiceServer)
{
	let tmpPict = pIntegrationService.pict;

	pOratorServiceServer.postWithBodyParser(`${pIntegrationService.routePrefix}/CSV/Transform`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpBody = pRequest.body || {};

			if (!tmpBody.File || (typeof(tmpBody.File) !== 'string'))
			{
				pResponse.send(400, { Error: 'No valid File path provided in request body.' });
				return fNext();
			}

			let tmpInputFilePath = tmpPict.FilePersistence.resolvePath(tmpBody.File);

			if (!tmpPict.FilePersistence.existsSync(tmpInputFilePath))
			{
				pResponse.send(404, { Error: `File [${tmpInputFilePath}] does not exist.` });
				return fNext();
			}

			let tmpCSVParser = tmpPict.instantiateServiceProviderWithoutRegistration('CSVParser');

			if (tmpBody.QuoteDelimiter)
			{
				tmpCSVParser.QuoteCharacter = tmpBody.QuoteDelimiter;
			}

			let tmpMappingOutcome = tmpPict.MeadowIntegrationTabularTransform.newMappingOutcomeObject();

			// Apply user configuration from request body
			if (tmpBody.Entity)
			{
				tmpMappingOutcome.UserConfiguration.Entity = tmpBody.Entity;
			}
			if (tmpBody.GUIDName)
			{
				tmpMappingOutcome.UserConfiguration.GUIDName = tmpBody.GUIDName;
			}
			if (tmpBody.GUIDTemplate)
			{
				tmpMappingOutcome.UserConfiguration.GUIDTemplate = tmpBody.GUIDTemplate;
			}
			if (tmpBody.Mappings && (typeof(tmpBody.Mappings) === 'object'))
			{
				tmpMappingOutcome.UserConfiguration.Mappings = tmpBody.Mappings;
			}
			if (tmpBody.MappingConfiguration && (typeof(tmpBody.MappingConfiguration) === 'object'))
			{
				tmpMappingOutcome.ExplicitConfiguration = tmpBody.MappingConfiguration;
			}
			if (tmpBody.IncomingComprehension && (typeof(tmpBody.IncomingComprehension) === 'object'))
			{
				tmpMappingOutcome.ExistingComprehension = tmpBody.IncomingComprehension;
				tmpMappingOutcome.Comprehension = JSON.parse(JSON.stringify(tmpBody.IncomingComprehension));
			}

			const tmpReadline = libReadline.createInterface(
				{
					input: libFS.createReadStream(tmpInputFilePath),
					crlfDelay: Infinity,
				});

			tmpReadline.on('line',
				(pLine) =>
				{
					const tmpIncomingRecord = tmpCSVParser.parseCSVLine(pLine);
					tmpMappingOutcome.ParsedRowCount++;

					if (tmpIncomingRecord)
					{
						if (!tmpMappingOutcome.ImplicitConfiguration)
						{
							tmpMappingOutcome.ImplicitConfiguration = tmpPict.MeadowIntegrationTabularTransform.generateMappingConfigurationPrototype(libPath.basename(tmpInputFilePath), tmpIncomingRecord);

							if ((!tmpMappingOutcome.ExplicitConfiguration) || (typeof(tmpMappingOutcome.ExplicitConfiguration) != 'object'))
							{
								tmpMappingOutcome.Configuration = Object.assign({}, tmpMappingOutcome.ImplicitConfiguration, tmpMappingOutcome.UserConfiguration);
							}
							else
							{
								tmpMappingOutcome.Configuration = Object.assign({}, tmpMappingOutcome.ImplicitConfiguration, tmpMappingOutcome.ExplicitConfiguration, tmpMappingOutcome.UserConfiguration);
							}

							if (!('GUIDName' in tmpMappingOutcome.Configuration))
							{
								tmpMappingOutcome.Configuration.GUIDName = `GUID${tmpMappingOutcome.Configuration.Entity}`;
							}

							if (!(tmpMappingOutcome.Configuration.Entity in tmpMappingOutcome.Comprehension))
							{
								tmpMappingOutcome.Comprehension[tmpMappingOutcome.Configuration.Entity] = {};
							}
						}

						let tmpMappingRecordSolution = (
							{
								IncomingRecord: tmpIncomingRecord,
								MappingConfiguration: tmpMappingOutcome.Configuration,
								MappingOutcome: tmpMappingOutcome,
								RowIndex: tmpMappingOutcome.ParsedRowCount,
								NewRecordsGUIDUniqueness: [],
								NewRecordPrototype: {},
								Fable: tmpPict,
								Pict: tmpPict,
								AppData: tmpPict.AppData
							});

						let tmpSolverResultsObject = {};
						if (tmpMappingOutcome.Configuration.Solvers && Array.isArray(tmpMappingOutcome.Configuration.Solvers))
						{
							for (let i = 0; i < tmpMappingOutcome.Configuration.Solvers.length; i++)
							{
								tmpPict.ExpressionParser.solve(tmpMappingOutcome.Configuration.Solvers[i], tmpMappingRecordSolution, tmpSolverResultsObject, tmpPict.manifest, tmpMappingRecordSolution);
							}
						}

						if (tmpMappingOutcome.Configuration.MultipleGUIDUniqueness && tmpMappingRecordSolution.NewRecordsGUIDUniqueness.length > 0)
						{
							for (let i = 0; i < tmpMappingRecordSolution.NewRecordsGUIDUniqueness.length; i++)
							{
								tmpPict.MeadowIntegrationTabularTransform.addRecordToComprehension(tmpIncomingRecord, tmpMappingOutcome, tmpMappingRecordSolution.NewRecordPrototype, tmpMappingRecordSolution.NewRecordsGUIDUniqueness[i]);
							}
						}
						else if (!tmpMappingOutcome.Configuration.MultipleGUIDUniqueness)
						{
							tmpPict.MeadowIntegrationTabularTransform.addRecordToComprehension(tmpIncomingRecord, tmpMappingOutcome, tmpMappingRecordSolution.NewRecordPrototype);
						}
					}
				});

			tmpReadline.on('close',
				() =>
				{
					tmpPict.log.info(`CSV Transform: Parsed ${tmpMappingOutcome.ParsedRowCount} rows from [${tmpInputFilePath}].`);
					if (tmpBody.Extended)
					{
						pResponse.send(200, tmpMappingOutcome);
					}
					else
					{
						pResponse.send(200, tmpMappingOutcome.Comprehension);
					}
					return fNext();
				});

			tmpReadline.on('error',
				(pError) =>
				{
					tmpPict.log.error(`CSV Transform error reading file [${tmpInputFilePath}]: ${pError}`, pError);
					pResponse.send(500, { Error: `Error reading CSV file: ${pError.message}` });
					return fNext();
				});
		});
};
