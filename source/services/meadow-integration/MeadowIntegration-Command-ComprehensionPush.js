/**
 * MeadowIntegration Command - Comprehension Push
 *
 * POST /1.0/Retold/MeadowIntegration/Comprehension/Push
 *   Push an in-memory comprehension to Meadow REST APIs.
 *
 * POST /1.0/Retold/MeadowIntegration/Comprehension/PushFile
 *   Push a comprehension file to Meadow REST APIs.
 *
 * Body (in-memory): { "Comprehension": {...}, "GUIDPrefix": "INTG-", "EntityGUIDPrefix": "E-", "ServerURL": "..." }
 * Body (file):      { "File": "/path", "GUIDPrefix": "INTG-", "ServerURL": "..." }
 * Returns: { "Success": true, "EntitiesPushed": [...], "Message": "..." }
 */
module.exports = function(pIntegrationService, pOratorServiceServer)
{
	let tmpPict = pIntegrationService.pict;
	let tmpIntegrationAdapter = pIntegrationService.IntegrationAdapter;

	// In-memory push
	pOratorServiceServer.postWithBodyParser(`${pIntegrationService.routePrefix}/Comprehension/Push`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpBody = pRequest.body || {};

			if (!tmpBody.Comprehension || (typeof(tmpBody.Comprehension) !== 'object'))
			{
				pResponse.send(400, { Error: 'No valid Comprehension object provided in request body.' });
				return fNext();
			}

			pushComprehension(tmpPict, tmpIntegrationAdapter, tmpBody.Comprehension, tmpBody,
				(pError, pResult) =>
				{
					if (pError)
					{
						pResponse.send(500, { Error: `Error pushing comprehension: ${pError.message || pError}` });
						return fNext();
					}
					pResponse.send(200, pResult);
					return fNext();
				});
		});

	// File-based push
	pOratorServiceServer.postWithBodyParser(`${pIntegrationService.routePrefix}/Comprehension/PushFile`,
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

			pushComprehension(tmpPict, tmpIntegrationAdapter, tmpComprehension, tmpBody,
				(pError, pResult) =>
				{
					if (pError)
					{
						pResponse.send(500, { Error: `Error pushing comprehension: ${pError.message || pError}` });
						return fNext();
					}
					pResponse.send(200, pResult);
					return fNext();
				});
		});
};

function getCapitalLettersAsString(pInputString)
{
	let tmpRegex = /[A-Z]/g;
	let tmpMatch = pInputString.match(tmpRegex);
	return tmpMatch ? tmpMatch.join('') : 'UNK';
}

function pushComprehension(pPict, pIntegrationAdapterClass, pComprehension, pOptions, fCallback)
{
	pPict.serviceManager.addServiceType('IntegrationAdapter', pIntegrationAdapterClass);

	let tmpAnticipate = pPict.newAnticipate();
	let tmpEntitiesPushed = [];

	let tmpIntegrationAdapterSet = Object.keys(pComprehension);

	pPict.log.info(`Pushing comprehension with ${tmpIntegrationAdapterSet.length} entity(ies) to Meadow APIs...`);

	tmpAnticipate.anticipate(
		(fDone) =>
		{
			try
			{
				for (let i = 0; i < tmpIntegrationAdapterSet.length; i++)
				{
					let tmpAdapterKey = tmpIntegrationAdapterSet[i];

					pIntegrationAdapterClass.getAdapter(pPict, tmpAdapterKey, getCapitalLettersAsString(tmpAdapterKey), { SimpleMarshal: true, ForceMarshal: true });

					let tmpAdapter = pPict.servicesMap.IntegrationAdapter[tmpAdapterKey];

					if (pOptions.ServerURL)
					{
						tmpAdapter.options.ServerURL = pOptions.ServerURL;
					}
					if (pOptions.GUIDPrefix)
					{
						tmpAdapter.AdapterSetGUIDMarshalPrefix = pOptions.GUIDPrefix;
					}
					if (pOptions.EntityGUIDPrefix)
					{
						tmpAdapter.EntityGUIDMarshalPrefix = pOptions.EntityGUIDPrefix;
					}

					let tmpDataMap = pComprehension[tmpAdapterKey];
					if (!tmpDataMap)
					{
						pPict.log.info(`No records to push for [${tmpAdapterKey}].`);
						continue;
					}

					tmpEntitiesPushed.push(tmpAdapterKey);

					tmpAnticipate.anticipate(
						(function(pAdapter, pDataMap)
						{
							return function(fRecordDone)
							{
								for (const tmpRecord in pDataMap)
								{
									pAdapter.addSourceRecord(pDataMap[tmpRecord]);
								}
								return fRecordDone();
							};
						})(tmpAdapter, tmpDataMap));

					tmpAnticipate.anticipate(
						(function(pAdapter)
						{
							return function(fIntegrateDone)
							{
								pAdapter.integrateRecords(fIntegrateDone);
							};
						})(tmpAdapter));
				}
			}
			catch (pError)
			{
				pPict.log.error(`Error wiring up integration adapters: ${pError}`, pError);
				return fDone(pError);
			}

			return fDone();
		});

	tmpAnticipate.wait(
		(pError) =>
		{
			if (pError)
			{
				pPict.log.error(`Error pushing comprehension.`, pError);
				return fCallback(pError);
			}
			pPict.log.info(`Finished pushing comprehension for entities: [${tmpEntitiesPushed.join(', ')}].`);
			return fCallback(null,
				{
					Success: true,
					EntitiesPushed: tmpEntitiesPushed,
					Message: `Pushed comprehension for ${tmpEntitiesPushed.length} entity(ies).`
				});
		});
}
