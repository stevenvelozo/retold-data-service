/**
 * MeadowIntegration Command - Comprehension Intersect
 *
 * POST /1.0/Retold/MeadowIntegration/Comprehension/Intersect
 *   Merge two in-memory comprehension objects.
 *
 * POST /1.0/Retold/MeadowIntegration/Comprehension/IntersectFiles
 *   Merge two comprehension files.
 *
 * Body (in-memory): { "PrimaryComprehension": {...}, "SecondaryComprehension": {...}, "Entity": "..." }
 * Body (file):      { "File": "/path", "IntersectFile": "/path", "Entity": "..." }
 * Returns: Merged comprehension JSON
 */
module.exports = function(pIntegrationService, pOratorServiceServer)
{
	let tmpPict = pIntegrationService.pict;

	// In-memory intersection
	pOratorServiceServer.postWithBodyParser(`${pIntegrationService.routePrefix}/Comprehension/Intersect`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpBody = pRequest.body || {};

			if (!tmpBody.PrimaryComprehension || (typeof(tmpBody.PrimaryComprehension) !== 'object'))
			{
				pResponse.send(400, { Error: 'No valid PrimaryComprehension object provided in request body.' });
				return fNext();
			}
			if (!tmpBody.SecondaryComprehension || (typeof(tmpBody.SecondaryComprehension) !== 'object'))
			{
				pResponse.send(400, { Error: 'No valid SecondaryComprehension object provided in request body.' });
				return fNext();
			}

			let tmpResult = processComprehensionIntersect(tmpPict, tmpBody.PrimaryComprehension, tmpBody.SecondaryComprehension, tmpBody.Entity);
			if (tmpResult.Error)
			{
				pResponse.send(400, tmpResult);
				return fNext();
			}

			pResponse.send(200, tmpResult.Comprehension);
			return fNext();
		});

	// File-based intersection
	pOratorServiceServer.postWithBodyParser(`${pIntegrationService.routePrefix}/Comprehension/IntersectFiles`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpBody = pRequest.body || {};

			if (!tmpBody.File || (typeof(tmpBody.File) !== 'string'))
			{
				pResponse.send(400, { Error: 'No valid File path provided in request body.' });
				return fNext();
			}
			if (!tmpBody.IntersectFile || (typeof(tmpBody.IntersectFile) !== 'string'))
			{
				pResponse.send(400, { Error: 'No valid IntersectFile path provided in request body.' });
				return fNext();
			}

			let tmpPrimaryFilePath = tmpPict.FilePersistence.resolvePath(tmpBody.File);
			let tmpSecondaryFilePath = tmpPict.FilePersistence.resolvePath(tmpBody.IntersectFile);

			if (!tmpPict.FilePersistence.existsSync(tmpPrimaryFilePath))
			{
				pResponse.send(404, { Error: `Primary file [${tmpPrimaryFilePath}] does not exist.` });
				return fNext();
			}
			if (!tmpPict.FilePersistence.existsSync(tmpSecondaryFilePath))
			{
				pResponse.send(404, { Error: `Secondary file [${tmpSecondaryFilePath}] does not exist.` });
				return fNext();
			}

			let tmpPrimaryComprehension;
			let tmpSecondaryComprehension;

			try
			{
				tmpPrimaryComprehension = JSON.parse(tmpPict.FilePersistence.readFileSync(tmpPrimaryFilePath));
			}
			catch (pError)
			{
				pResponse.send(400, { Error: `Error parsing primary comprehension file: ${pError.message}` });
				return fNext();
			}

			try
			{
				tmpSecondaryComprehension = JSON.parse(tmpPict.FilePersistence.readFileSync(tmpSecondaryFilePath));
			}
			catch (pError)
			{
				pResponse.send(400, { Error: `Error parsing secondary comprehension file: ${pError.message}` });
				return fNext();
			}

			let tmpResult = processComprehensionIntersect(tmpPict, tmpPrimaryComprehension, tmpSecondaryComprehension, tmpBody.Entity);
			if (tmpResult.Error)
			{
				pResponse.send(400, tmpResult);
				return fNext();
			}

			pResponse.send(200, tmpResult.Comprehension);
			return fNext();
		});
};

function processComprehensionIntersect(pPict, pPrimaryComprehension, pSecondaryComprehension, pEntity)
{
	let tmpEntity = pEntity;

	if (!tmpEntity)
	{
		let tmpEntityInference = Object.keys(pPrimaryComprehension);
		if (tmpEntityInference.length > 0)
		{
			tmpEntity = tmpEntityInference[0];
			pPict.log.info(`No entity specified. Using [${tmpEntity}] as the inferred entity.`);
		}
		else
		{
			return { Error: 'No entity specified and no entities found in the primary comprehension.' };
		}
	}

	let tmpResultComprehension = JSON.parse(JSON.stringify(pPrimaryComprehension));

	if (!tmpResultComprehension[tmpEntity])
	{
		tmpResultComprehension[tmpEntity] = {};
	}

	let tmpIntersectingKeys = Object.keys(pSecondaryComprehension[tmpEntity] || {});
	for (let i = 0; i < tmpIntersectingKeys.length; i++)
	{
		const tmpRecordGUID = tmpIntersectingKeys[i];
		if (tmpResultComprehension[tmpEntity][tmpRecordGUID])
		{
			tmpResultComprehension[tmpEntity][tmpRecordGUID] = Object.assign(tmpResultComprehension[tmpEntity][tmpRecordGUID], pSecondaryComprehension[tmpEntity][tmpRecordGUID]);
		}
		else
		{
			tmpResultComprehension[tmpEntity][tmpRecordGUID] = pSecondaryComprehension[tmpEntity][tmpRecordGUID];
		}
	}

	pPict.log.info(`Comprehension Intersect: Merged ${tmpIntersectingKeys.length} records for entity [${tmpEntity}].`);
	return { Comprehension: tmpResultComprehension };
}
