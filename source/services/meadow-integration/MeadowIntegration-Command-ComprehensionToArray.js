/**
 * MeadowIntegration Command - Comprehension To Array
 *
 * POST /1.0/Retold/MeadowIntegration/Comprehension/ToArray
 *   Convert an in-memory comprehension to an array.
 *
 * POST /1.0/Retold/MeadowIntegration/Comprehension/ToArrayFromFile
 *   Convert a comprehension file to an array.
 *
 * Body (in-memory): { "Comprehension": {...}, "Entity": "..." }
 * Body (file):      { "File": "/path", "Entity": "..." }
 * Returns: JSON array of records
 */
module.exports = function(pIntegrationService, pOratorServiceServer)
{
	let tmpPict = pIntegrationService.pict;

	// In-memory conversion
	pOratorServiceServer.postWithBodyParser(`${pIntegrationService.routePrefix}/Comprehension/ToArray`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpBody = pRequest.body || {};

			if (!tmpBody.Comprehension || (typeof(tmpBody.Comprehension) !== 'object'))
			{
				pResponse.send(400, { Error: 'No valid Comprehension object provided in request body.' });
				return fNext();
			}

			let tmpResult = processComprehensionToArray(tmpPict, tmpBody.Comprehension, tmpBody.Entity);
			if (tmpResult.Error)
			{
				pResponse.send(400, tmpResult);
				return fNext();
			}

			pResponse.send(200, tmpResult.RecordArray);
			return fNext();
		});

	// File-based conversion
	pOratorServiceServer.postWithBodyParser(`${pIntegrationService.routePrefix}/Comprehension/ToArrayFromFile`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpBody = pRequest.body || {};

			if (!tmpBody.File || (typeof(tmpBody.File) !== 'string'))
			{
				pResponse.send(400, { Error: 'No valid File path provided in request body.' });
				return fNext();
			}

			let tmpFilePath = tmpPict.FilePersistence.resolvePath(tmpBody.File);

			if (!tmpPict.FilePersistence.existsSync(tmpFilePath))
			{
				pResponse.send(404, { Error: `File [${tmpFilePath}] does not exist.` });
				return fNext();
			}

			let tmpComprehension;
			try
			{
				tmpComprehension = JSON.parse(tmpPict.FilePersistence.readFileSync(tmpFilePath));
			}
			catch (pError)
			{
				pResponse.send(400, { Error: `Error parsing comprehension file: ${pError.message}` });
				return fNext();
			}

			let tmpResult = processComprehensionToArray(tmpPict, tmpComprehension, tmpBody.Entity);
			if (tmpResult.Error)
			{
				pResponse.send(400, tmpResult);
				return fNext();
			}

			pResponse.send(200, tmpResult.RecordArray);
			return fNext();
		});
};

function processComprehensionToArray(pPict, pComprehension, pEntity)
{
	let tmpEntity = pEntity;

	if (!tmpEntity)
	{
		let tmpEntityInference = Object.keys(pComprehension);
		if (tmpEntityInference.length > 0)
		{
			tmpEntity = tmpEntityInference[0];
			pPict.log.info(`No entity specified. Using [${tmpEntity}] as the inferred entity.`);
		}
		else
		{
			return { Error: 'No entity specified and no entities found in the comprehension.' };
		}
	}

	let tmpEntityRecords = pComprehension[tmpEntity] || {};
	let tmpRecordArray = [];

	let tmpRecordKeys = Object.keys(tmpEntityRecords);
	for (let i = 0; i < tmpRecordKeys.length; i++)
	{
		tmpRecordArray.push(tmpEntityRecords[tmpRecordKeys[i]]);
	}

	pPict.log.info(`Comprehension ToArray: Converted ${tmpRecordArray.length} records for entity [${tmpEntity}].`);
	return { RecordArray: tmpRecordArray };
}
