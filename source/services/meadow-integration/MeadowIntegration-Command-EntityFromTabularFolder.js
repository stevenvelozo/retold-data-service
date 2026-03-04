/**
 * MeadowIntegration Command - Entity From Tabular Folder
 *
 * POST /1.0/Retold/MeadowIntegration/Entity/FromTabularFolder
 *
 * Generate entity comprehensions from tabular data files in a folder.
 * Supports CSV, TSV, and JSON array files.
 *
 * Body: { "Folder": "/path/to/folder/", "Entity": "ForcedEntity", "MappingConfiguration": {...} }
 * Returns: Comprehension JSON from all tabular files in the folder
 */
const libFS = require('fs');
const libPath = require('path');

module.exports = function(pIntegrationService, pOratorServiceServer)
{
	let tmpPict = pIntegrationService.pict;

	pOratorServiceServer.postWithBodyParser(`${pIntegrationService.routePrefix}/Entity/FromTabularFolder`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpBody = pRequest.body || {};

			if (!tmpBody.Folder || (typeof(tmpBody.Folder) !== 'string'))
			{
				pResponse.send(400, { Error: 'No valid Folder path provided in request body.' });
				return fNext();
			}

			let tmpFolderPath = tmpPict.FilePersistence.resolvePath(tmpBody.Folder);

			if (!libFS.existsSync(tmpFolderPath))
			{
				pResponse.send(404, { Error: `Folder [${tmpFolderPath}] does not exist.` });
				return fNext();
			}

			let tmpStat = libFS.statSync(tmpFolderPath);
			if (!tmpStat.isDirectory())
			{
				pResponse.send(400, { Error: `Path [${tmpFolderPath}] is not a directory.` });
				return fNext();
			}

			let tmpFiles;
			try
			{
				tmpFiles = libFS.readdirSync(tmpFolderPath);
			}
			catch (pError)
			{
				pResponse.send(500, { Error: `Error reading folder [${tmpFolderPath}]: ${pError.message}` });
				return fNext();
			}

			let tmpTabularFiles = tmpFiles.filter(
				(pFile) =>
				{
					let tmpExt = libPath.extname(pFile).toLowerCase();
					return (tmpExt === '.csv' || tmpExt === '.tsv' || tmpExt === '.json');
				});

			if (tmpTabularFiles.length < 1)
			{
				pResponse.send(400, { Error: `No tabular files (CSV, TSV, JSON) found in folder [${tmpFolderPath}].` });
				return fNext();
			}

			let tmpComprehension = {};
			let tmpAnticipate = tmpPict.newAnticipate();

			for (let f = 0; f < tmpTabularFiles.length; f++)
			{
				let tmpFileName = tmpTabularFiles[f];
				let tmpFilePath = libPath.join(tmpFolderPath, tmpFileName);
				let tmpExt = libPath.extname(tmpFileName).toLowerCase();

				tmpAnticipate.anticipate(
					(function(pFilePath, pFileName, pExt)
					{
						return function(fDone)
						{
							processTabularFile(tmpPict, pFilePath, pFileName, pExt, tmpBody, tmpComprehension, fDone);
						};
					})(tmpFilePath, tmpFileName, tmpExt));
			}

			tmpAnticipate.wait(
				(pError) =>
				{
					if (pError)
					{
						tmpPict.log.error(`Error processing tabular folder: ${pError}`, pError);
						pResponse.send(500, { Error: `Error processing tabular folder: ${pError.message || pError}` });
						return fNext();
					}

					let tmpEntityCount = Object.keys(tmpComprehension).length;
					tmpPict.log.info(`Entity From Tabular Folder: Generated comprehension with ${tmpEntityCount} entity(ies) from ${tmpTabularFiles.length} file(s).`);
					pResponse.send(200, tmpComprehension);
					return fNext();
				});
		});
};

function processTabularFile(pPict, pFilePath, pFileName, pExt, pOptions, pComprehension, fCallback)
{
	let tmpMappingOutcome = pPict.MeadowIntegrationTabularTransform.newMappingOutcomeObject();

	if (pOptions.Entity)
	{
		tmpMappingOutcome.UserConfiguration.Entity = pOptions.Entity;
	}
	if (pOptions.MappingConfiguration && (typeof(pOptions.MappingConfiguration) === 'object'))
	{
		tmpMappingOutcome.ExplicitConfiguration = pOptions.MappingConfiguration;
	}

	if (pExt === '.json')
	{
		let tmpRawContents;
		try
		{
			tmpRawContents = pPict.FilePersistence.readFileSync(pFilePath, { encoding: 'utf8' });
			let tmpRecords = JSON.parse(tmpRawContents);
			if (!Array.isArray(tmpRecords))
			{
				pPict.log.warn(`File [${pFileName}] is not a JSON array. Skipping.`);
				return fCallback();
			}

			for (let i = 0; i < tmpRecords.length; i++)
			{
				let tmpIncomingRecord = tmpRecords[i];
				tmpMappingOutcome.ParsedRowCount++;

				if (tmpIncomingRecord)
				{
					if (!tmpMappingOutcome.ImplicitConfiguration)
					{
						tmpMappingOutcome.ImplicitConfiguration = pPict.MeadowIntegrationTabularTransform.generateMappingConfigurationPrototype(libPath.basename(pFileName, pExt), tmpIncomingRecord);
						mergeConfiguration(tmpMappingOutcome);
					}
					pPict.MeadowIntegrationTabularTransform.addRecordToComprehension(tmpIncomingRecord, tmpMappingOutcome);
				}
			}

			mergeIntoMainComprehension(pComprehension, tmpMappingOutcome.Comprehension);
			return fCallback();
		}
		catch (pError)
		{
			pPict.log.error(`Error parsing JSON file [${pFileName}]: ${pError.message}`);
			return fCallback();
		}
	}
	else
	{
		let tmpCSVParser = pPict.instantiateServiceProviderWithoutRegistration('CSVParser');

		if (pExt === '.tsv')
		{
			tmpCSVParser.Delimiter = '\t';
		}
		else
		{
			tmpCSVParser.Delimiter = ',';
		}

		const libReadline = require('readline');
		const tmpReadline = libReadline.createInterface(
			{
				input: libFS.createReadStream(pFilePath),
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
						tmpMappingOutcome.ImplicitConfiguration = pPict.MeadowIntegrationTabularTransform.generateMappingConfigurationPrototype(libPath.basename(pFileName, pExt), tmpIncomingRecord);
						mergeConfiguration(tmpMappingOutcome);
					}
					pPict.MeadowIntegrationTabularTransform.addRecordToComprehension(tmpIncomingRecord, tmpMappingOutcome);
				}
			});

		tmpReadline.on('close',
			() =>
			{
				mergeIntoMainComprehension(pComprehension, tmpMappingOutcome.Comprehension);
				return fCallback();
			});

		tmpReadline.on('error',
			(pError) =>
			{
				pPict.log.error(`Error reading file [${pFileName}]: ${pError.message}`);
				return fCallback();
			});
	}
}

function mergeConfiguration(pMappingOutcome)
{
	if ((!pMappingOutcome.ExplicitConfiguration) || (typeof(pMappingOutcome.ExplicitConfiguration) != 'object'))
	{
		pMappingOutcome.Configuration = Object.assign({}, pMappingOutcome.ImplicitConfiguration, pMappingOutcome.UserConfiguration);
	}
	else
	{
		pMappingOutcome.Configuration = Object.assign({}, pMappingOutcome.ImplicitConfiguration, pMappingOutcome.ExplicitConfiguration, pMappingOutcome.UserConfiguration);
	}

	if (!('GUIDName' in pMappingOutcome.Configuration))
	{
		pMappingOutcome.Configuration.GUIDName = `GUID${pMappingOutcome.Configuration.Entity}`;
	}

	if (!(pMappingOutcome.Configuration.Entity in pMappingOutcome.Comprehension))
	{
		pMappingOutcome.Comprehension[pMappingOutcome.Configuration.Entity] = {};
	}
}

function mergeIntoMainComprehension(pMainComprehension, pFileComprehension)
{
	let tmpEntities = Object.keys(pFileComprehension);
	for (let i = 0; i < tmpEntities.length; i++)
	{
		let tmpEntity = tmpEntities[i];
		if (!pMainComprehension[tmpEntity])
		{
			pMainComprehension[tmpEntity] = {};
		}
		Object.assign(pMainComprehension[tmpEntity], pFileComprehension[tmpEntity]);
	}
}
