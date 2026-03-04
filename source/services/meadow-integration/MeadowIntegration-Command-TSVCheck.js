/**
 * MeadowIntegration Command - TSV Check
 *
 * POST /1.0/Retold/MeadowIntegration/TSV/Check
 *
 * Analyze a TSV file for statistics.
 *
 * Body: { "File": "/path/to/file.tsv", "Records": false }
 * Returns: Statistics JSON
 */
const libFS = require('fs');
const libReadline = require('readline');

module.exports = function(pIntegrationService, pOratorServiceServer)
{
	let tmpPict = pIntegrationService.pict;

	pOratorServiceServer.postWithBodyParser(`${pIntegrationService.routePrefix}/TSV/Check`,
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
			tmpCSVParser.Delimiter = '\t';

			let tmpStatistics = tmpPict.MeadowIntegrationTabularCheck.newStatisticsObject(tmpInputFilePath);
			let tmpStoreFullRecord = (tmpBody.Records === true);

			if (tmpStoreFullRecord)
			{
				tmpStatistics.Records = [];
			}

			const tmpReadline = libReadline.createInterface(
				{
					input: libFS.createReadStream(tmpInputFilePath),
					crlfDelay: Infinity,
				});

			tmpReadline.on('line',
				(pLine) =>
				{
					const tmpRecord = tmpCSVParser.parseCSVLine(pLine);
					if (tmpRecord)
					{
						tmpPict.MeadowIntegrationTabularCheck.collectStatistics(tmpRecord, tmpStatistics, tmpStoreFullRecord);
					}
				});

			tmpReadline.on('close',
				() =>
				{
					tmpPict.log.info(`TSV Check: ${tmpStatistics.RowCount} rows, ${tmpStatistics.ColumnCount} columns in [${tmpInputFilePath}].`);
					pResponse.send(200, tmpStatistics);
					return fNext();
				});

			tmpReadline.on('error',
				(pError) =>
				{
					tmpPict.log.error(`TSV Check error reading file [${tmpInputFilePath}]: ${pError}`, pError);
					pResponse.send(500, { Error: `Error reading TSV file: ${pError.message}` });
					return fNext();
				});
		});
};
