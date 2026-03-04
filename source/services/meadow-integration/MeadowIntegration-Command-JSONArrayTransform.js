/**
 * MeadowIntegration Command - JSON Array Transform
 *
 * POST /1.0/Retold/MeadowIntegration/JSONArray/Transform
 *   Transform a JSON Array file into a comprehension.
 *
 * POST /1.0/Retold/MeadowIntegration/JSONArray/TransformRecords
 *   Transform an in-memory JSON array into a comprehension (no file needed).
 *
 * Body (file-based): { "File": "/path/to/array.json", ...mapping options... }
 * Body (in-memory):  { "Records": [{...}, ...], ...mapping options... }
 * Returns: Comprehension JSON (or extended state if Extended=true)
 */
const libPath = require('path');

module.exports = function(pIntegrationService, pOratorServiceServer)
{
	let tmpPict = pIntegrationService.pict;

	// File-based transform
	pOratorServiceServer.postWithBodyParser(`${pIntegrationService.routePrefix}/JSONArray/Transform`,
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

			let tmpJSONArrayRecords;
			try
			{
				let tmpRawContents = tmpPict.FilePersistence.readFileSync(tmpInputFilePath, { encoding: 'utf8' });
				tmpJSONArrayRecords = JSON.parse(tmpRawContents);
			}
			catch (pError)
			{
				pResponse.send(400, { Error: `Error parsing JSON file [${tmpInputFilePath}]: ${pError.message}` });
				return fNext();
			}

			if (!Array.isArray(tmpJSONArrayRecords))
			{
				pResponse.send(400, { Error: `File [${tmpInputFilePath}] does not contain a valid JSON array.` });
				return fNext();
			}

			let tmpResult = processJSONArrayTransform(tmpPict, tmpBody, tmpJSONArrayRecords, libPath.basename(tmpInputFilePath));
			if (tmpResult.Error)
			{
				pResponse.send(400, tmpResult);
				return fNext();
			}

			if (tmpBody.Extended)
			{
				pResponse.send(200, tmpResult.MappingOutcome);
			}
			else
			{
				pResponse.send(200, tmpResult.MappingOutcome.Comprehension);
			}
			return fNext();
		});

	// In-memory records transform
	pOratorServiceServer.postWithBodyParser(`${pIntegrationService.routePrefix}/JSONArray/TransformRecords`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpBody = pRequest.body || {};

			if (!tmpBody.Records || !Array.isArray(tmpBody.Records))
			{
				pResponse.send(400, { Error: 'No valid Records array provided in request body.' });
				return fNext();
			}

			if (tmpBody.Records.length < 1)
			{
				pResponse.send(400, { Error: 'Records array is empty.' });
				return fNext();
			}

			let tmpDatasetName = tmpBody.Entity || 'Records';
			let tmpResult = processJSONArrayTransform(tmpPict, tmpBody, tmpBody.Records, tmpDatasetName);
			if (tmpResult.Error)
			{
				pResponse.send(400, tmpResult);
				return fNext();
			}

			if (tmpBody.Extended)
			{
				pResponse.send(200, tmpResult.MappingOutcome);
			}
			else
			{
				pResponse.send(200, tmpResult.MappingOutcome.Comprehension);
			}
			return fNext();
		});
};

function processJSONArrayTransform(pPict, pOptions, pRecords, pDatasetName)
{
	let tmpMappingOutcome = pPict.MeadowIntegrationTabularTransform.newMappingOutcomeObject();

	if (pOptions.Entity)
	{
		tmpMappingOutcome.UserConfiguration.Entity = pOptions.Entity;
	}
	if (pOptions.GUIDName)
	{
		tmpMappingOutcome.UserConfiguration.GUIDName = pOptions.GUIDName;
	}
	if (pOptions.GUIDTemplate)
	{
		tmpMappingOutcome.UserConfiguration.GUIDTemplate = pOptions.GUIDTemplate;
	}
	if (pOptions.Mappings && (typeof(pOptions.Mappings) === 'object'))
	{
		tmpMappingOutcome.UserConfiguration.Mappings = pOptions.Mappings;
	}
	if (pOptions.MappingConfiguration && (typeof(pOptions.MappingConfiguration) === 'object'))
	{
		tmpMappingOutcome.ExplicitConfiguration = pOptions.MappingConfiguration;
	}
	if (pOptions.IncomingComprehension && (typeof(pOptions.IncomingComprehension) === 'object'))
	{
		tmpMappingOutcome.ExistingComprehension = pOptions.IncomingComprehension;
		tmpMappingOutcome.Comprehension = JSON.parse(JSON.stringify(pOptions.IncomingComprehension));
	}

	for (let i = 0; i < pRecords.length; i++)
	{
		const tmpIncomingRecord = pRecords[i];
		tmpMappingOutcome.ParsedRowCount++;

		if (tmpIncomingRecord)
		{
			if (!tmpMappingOutcome.ImplicitConfiguration)
			{
				tmpMappingOutcome.ImplicitConfiguration = pPict.MeadowIntegrationTabularTransform.generateMappingConfigurationPrototype(pDatasetName, tmpIncomingRecord);

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
					Fable: pPict,
					Pict: pPict,
					AppData: pPict.AppData
				});

			let tmpSolverResultsObject = {};
			if (tmpMappingOutcome.Configuration.Solvers && Array.isArray(tmpMappingOutcome.Configuration.Solvers))
			{
				for (let j = 0; j < tmpMappingOutcome.Configuration.Solvers.length; j++)
				{
					pPict.ExpressionParser.solve(tmpMappingOutcome.Configuration.Solvers[j], tmpMappingRecordSolution, tmpSolverResultsObject, pPict.manifest, tmpMappingRecordSolution);
				}
			}

			if (tmpMappingOutcome.Configuration.MultipleGUIDUniqueness && tmpMappingRecordSolution.NewRecordsGUIDUniqueness.length > 0)
			{
				for (let j = 0; j < tmpMappingRecordSolution.NewRecordsGUIDUniqueness.length; j++)
				{
					pPict.MeadowIntegrationTabularTransform.addRecordToComprehension(tmpIncomingRecord, tmpMappingOutcome, tmpMappingRecordSolution.NewRecordPrototype, tmpMappingRecordSolution.NewRecordsGUIDUniqueness[j]);
				}
			}
			else if (!tmpMappingOutcome.Configuration.MultipleGUIDUniqueness)
			{
				pPict.MeadowIntegrationTabularTransform.addRecordToComprehension(tmpIncomingRecord, tmpMappingOutcome, tmpMappingRecordSolution.NewRecordPrototype);
			}
		}
	}

	pPict.log.info(`JSON Array Transform: Parsed ${tmpMappingOutcome.ParsedRowCount} records from [${pDatasetName}].`);
	return { MappingOutcome: tmpMappingOutcome };
}
