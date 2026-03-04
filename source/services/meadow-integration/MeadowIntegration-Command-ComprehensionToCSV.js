/**
 * MeadowIntegration Command - Comprehension To CSV
 *
 * POST /1.0/Retold/MeadowIntegration/Comprehension/ToCSV
 *   Convert an in-memory comprehension or array to CSV.
 *
 * POST /1.0/Retold/MeadowIntegration/Comprehension/ToCSVFromFile
 *   Convert a comprehension/array file to CSV.
 *
 * Body (in-memory): { "Records": [...] } or { "Comprehension": {...}, "Entity": "..." }
 * Body (file):      { "File": "/path", "Entity": "..." }
 * Returns: CSV text (Content-Type: text/csv)
 */
module.exports = function(pIntegrationService, pOratorServiceServer)
{
	let tmpPict = pIntegrationService.pict;

	// In-memory conversion
	pOratorServiceServer.postWithBodyParser(`${pIntegrationService.routePrefix}/Comprehension/ToCSV`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpBody = pRequest.body || {};

			let tmpRecordArray = extractRecordArray(tmpPict, tmpBody);
			if (tmpRecordArray.Error)
			{
				pResponse.send(400, tmpRecordArray);
				return fNext();
			}

			let tmpCSV = generateCSV(tmpRecordArray.Records);
			pResponse.setHeader('Content-Type', 'text/csv');
			pResponse.setHeader('Content-Disposition', 'attachment; filename="export.csv"');
			pResponse.sendRaw(200, tmpCSV);
			return fNext();
		});

	// File-based conversion
	pOratorServiceServer.postWithBodyParser(`${pIntegrationService.routePrefix}/Comprehension/ToCSVFromFile`,
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

			let tmpRawRecordSet;
			try
			{
				tmpRawRecordSet = JSON.parse(tmpPict.FilePersistence.readFileSync(tmpFilePath));
			}
			catch (pError)
			{
				pResponse.send(400, { Error: `Error parsing JSON file: ${pError.message}` });
				return fNext();
			}

			let tmpExtractBody = { Entity: tmpBody.Entity };
			if (Array.isArray(tmpRawRecordSet))
			{
				tmpExtractBody.Records = tmpRawRecordSet;
			}
			else if (typeof(tmpRawRecordSet) === 'object')
			{
				tmpExtractBody.Comprehension = tmpRawRecordSet;
			}

			let tmpRecordArray = extractRecordArray(tmpPict, tmpExtractBody);
			if (tmpRecordArray.Error)
			{
				pResponse.send(400, tmpRecordArray);
				return fNext();
			}

			let tmpCSV = generateCSV(tmpRecordArray.Records);
			pResponse.setHeader('Content-Type', 'text/csv');
			pResponse.setHeader('Content-Disposition', 'attachment; filename="export.csv"');
			pResponse.sendRaw(200, tmpCSV);
			return fNext();
		});
};

function extractRecordArray(pPict, pBody)
{
	if (pBody.Records && Array.isArray(pBody.Records))
	{
		if (pBody.Records.length < 1)
		{
			return { Error: 'Records array is empty.' };
		}
		return { Records: pBody.Records };
	}

	if (pBody.Comprehension && (typeof(pBody.Comprehension) === 'object'))
	{
		let tmpEntity = pBody.Entity;

		if (tmpEntity)
		{
			if (pBody.Comprehension[tmpEntity])
			{
				let tmpRecords;
				if (Array.isArray(pBody.Comprehension[tmpEntity]))
				{
					tmpRecords = pBody.Comprehension[tmpEntity];
				}
				else
				{
					tmpRecords = Object.values(pBody.Comprehension[tmpEntity]);
				}
				if (tmpRecords.length < 1)
				{
					return { Error: 'No records found for the specified entity.' };
				}
				return { Records: tmpRecords };
			}
			else
			{
				return { Error: `Entity [${tmpEntity}] not found in comprehension.` };
			}
		}
		else
		{
			let tmpKeys = Object.keys(pBody.Comprehension);
			if (tmpKeys.length === 1 && typeof(pBody.Comprehension[tmpKeys[0]]) === 'object' && !Array.isArray(pBody.Comprehension[tmpKeys[0]]))
			{
				pPict.log.info(`Auto-detected entity [${tmpKeys[0]}] from comprehension.`);
				let tmpRecords = Object.values(pBody.Comprehension[tmpKeys[0]]);
				if (tmpRecords.length < 1)
				{
					return { Error: 'No records found in the auto-detected entity.' };
				}
				return { Records: tmpRecords };
			}
			else if (tmpKeys.length > 1)
			{
				return { Error: `Multiple entities found [${tmpKeys.join(', ')}]. Please specify an Entity.` };
			}
			else
			{
				return { Error: 'No entities found in the comprehension.' };
			}
		}
	}

	return { Error: 'No valid Records array or Comprehension object provided.' };
}

function flattenObject(pObject, pAddressPrefix)
{
	let tmpPrefix = pAddressPrefix || '';
	let tmpFlattenedObject = {};
	for (const [pKey, pValue] of Object.entries(pObject))
	{
		const pPropertyPath = tmpPrefix ? `${tmpPrefix}.${pKey}` : pKey;
		if (pValue && typeof pValue === 'object' && !Array.isArray(pValue))
		{
			Object.assign(tmpFlattenedObject, flattenObject(pValue, pPropertyPath));
		}
		else
		{
			tmpFlattenedObject[pPropertyPath] = pValue;
		}
	}
	return tmpFlattenedObject;
}

function escapeCSVValue(pValue)
{
	if (pValue === null || pValue === undefined) return '';
	const str = String(pValue);
	return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function generateCSV(pRecords)
{
	const tmpAllKeysSet = new Set();
	const tmpFlattenedRecords = [];

	for (const tmpRecord of pRecords)
	{
		const tmpFlattenedObject = flattenObject(tmpRecord);
		tmpFlattenedRecords.push(tmpFlattenedObject);
		for (const tmpKey of Object.keys(tmpFlattenedObject))
		{
			tmpAllKeysSet.add(tmpKey);
		}
	}

	const tmpAllObjectKeys = Array.from(tmpAllKeysSet).sort();

	let tmpCSV = tmpAllObjectKeys.join(',') + '\n';
	for (const tmpFlatRecord of tmpFlattenedRecords)
	{
		const tmpRow = tmpAllObjectKeys.map((pKey) => escapeCSVValue(tmpFlatRecord[pKey])).join(',');
		tmpCSV += tmpRow + '\n';
	}

	return tmpCSV;
}
