/**
* @license MIT
* @author <steven@velozo.com>
*/

/**
* Cumulation Graph Read Library
*
* @class GraphGet
*/

var libAsync = require('async');
var libUnderscore = require('underscore');

class GraphGet
{
	constructor(pFable, pCumulation, pModel)
	{
        this._Cumulation = pCumulation;

        // Wire up logging
		this.log = pFable.log;

		// Wire up settings
		this._Settings = pFable._Settings;

		// Get the data model graph
		this._DataModel = pModel;

        // Map of joins (Entity->Other Possible Entities)
		this._JoinMap = {};

        // The masquerade ball where all the columns who really mean other entities
		this._EntityMasquerade = {};

        // Map of incoming connections for Entities
		this._EntityIncomingConnectionMap = {};

        // Presolve the graph by flattening all the connections out
        this.unfoldJoins();
	};

	addCachedJoin(pJoinEntity, pTableName)
	{
		let tmpJoinedEntity = pJoinEntity.startsWith('ID') ? pJoinEntity.substring(2) : pJoinEntity;
		if (!this._JoinMap.hasOwnProperty(tmpJoinedEntity))
		{
			this._JoinMap[tmpJoinedEntity] = {};
		}

		this.addCachedEntityConnection(pTableName, tmpJoinedEntity);

		this._JoinMap[tmpJoinedEntity][pTableName] = true;
	};

	addCachedEntityConnection(pConnectedEntity, pIncomingEntity)
	{
		if (!this._EntityIncomingConnectionMap.hasOwnProperty(pConnectedEntity))
			this._EntityIncomingConnectionMap[pConnectedEntity] = {};
		
		this._EntityIncomingConnectionMap[pConnectedEntity][pIncomingEntity] = true;
	}

	unfoldJoins()
	{
		if (!this._DataModel.hasOwnProperty('Tables'))
		{
			this.log.warning(`The DataModel object does not have a Tables property so graph lookups won't work.`);
			return false;
		}
		// Enumerate each data set in the data model and create a join lookup
		for (let pEntity in this._DataModel.Tables)
		{
			let tmpTable = this._DataModel.Tables[pEntity];

			for (let i = 0; i < tmpTable.Columns.length; i++)
			{
				if (tmpTable.Columns[i].Join && 
					tmpTable.Columns[i].Column != 'IDCustomer' && 
					tmpTable.Columns[i].Column != 'CreatingIDUser' && 
					tmpTable.Columns[i].Column != 'UpdatingIDUser' && 
					tmpTable.Columns[i].Column != 'DeletingIDUser')
				{
					this.addCachedJoin(tmpTable.Columns[i].Join, tmpTable.TableName);
				}
			}
		}

		return true;
	};

	parseFilterObject(pEntityName, pFilterObject, fCallback)
	{
		/*
			Take in an object with filters, for instance:
			{
				Name: 'Biggest Sample Ever',
				Code: '7a9f-000139',
				IDMaterial: 38,
				CreatingIDUser: 100
			}

			And turn it into an object of filters; there are two types
				-> InRecord (the value is a column in the record)
				-> Join (the value is a join table between the two entities)

			{
				Material: {Type: 'InRecord', Value:38}
			}
		*/
		// Parse the filter object for any column that is an ID Type column.
		// Eventually should this look for GUIDs?
		let tmpProperties = Object.keys(pFilterObject);
		// Get the schema for this entity
		let tmpEntityTable = this._DataModel.Tables[pEntityName];
		// A container for any valid filters that were passed in.
		let tmpValidFilters = {};

		// Get the join map for this entity so we can do a set intersection with other join maps
		if (this._JoinMap.hasOwnProperty(pEntityName))
		{
			tmpValidFilters[pEntityName] = (
				{
					Entity: pEntityName,
					Filter: false,
					Type: 'IdentityJoin',
					Value: false,
					PotentialJoins: this._JoinMap[pEntityName]
				});
		}		

		if (this._Settings.DebugLog)
			this.log.debug(`[${pEntityName}] Scanning filter object for filterable properties...`);

		tmpProperties.forEach(
			(pFilterProperty)=>
			{
				if (typeof(pFilterObject[pFilterProperty]) === 'string')
				{
					// If the value is a string, do a potential LIKE expression
					let tmpColumnContained = false;
					// This isn't a join; check if this is a column contained in the Entity
					// --> Abstract this .. maybe?  The string check is unique to this iteration.
					for (let i = 0; i < tmpEntityTable.Columns.length; i++)
						if ((tmpEntityTable.Columns[i].Column === pFilterProperty) && ((tmpEntityTable.Columns[i].DataType === 'String') || (tmpEntityTable.Columns[i].DataType === 'Text')))
							tmpColumnContained = true;
					// <-- End of Abstraction (repeated in stanza below)
					if (tmpColumnContained)
					{
						if (tmpValidFilters.hasOwnProperty(pFilterProperty))
						{
							this.log.warning(`[${pEntityName}]  > Filter Property is Already Set for ${pFilterProperty} but there also exists a String column in the record.. defaulting to the column.`);
							tmpValidFilters[pFilterProperty].Type = 'InRecordString';
						}
						else
						{
							tmpValidFilters[pFilterProperty] = (
								{
									Entity: pEntityName,
									Filter: pFilterProperty,
									Type: 'InRecordString',
									Value: pFilterObject[pFilterProperty],
									PotentialJoins: false
								});
							if (this._Settings.DebugLog)
								this.log.debug(`[${pEntityName}]  > Filter Property Set to InRecordString for  ${pFilterProperty}.`);
						}
					}
				}
				else if (pFilterProperty.startsWith('ID') && 
					(Number.isInteger(pFilterObject[pFilterProperty]) || Array.isArray(pFilterObject[pFilterProperty])))
				{
					let tmpEntity = pFilterProperty.substring(2);

					/* TODO: Joins that aren't named what their entity is
					for (let i = 0; i < tmpEntityTable.Columns.length; i++)
					{
						if ((tmpEntityTable.Columns[i].Column === pFilterProperty) && (tmpEntityTable.Columns[i].hasOwnProperty('Join') && tmpEntityTable.Columns[i].Join.length > 0))
						{
							this.log.debug(`[${pEntityName}] >>> Found hard-mapped join in the graph for: ${tmpEntityTable.Columns[i].Column} ---> ${tmpEntityTable.Columns[i].Join})...`);
							tmpEntity = tmpEntityTable.Columns[i].Join.substring(2);
						}
					}
					*/

					// This is an ID, so parse it as a possible filter property
					if (this._Settings.DebugLog)
						this.log.debug(`[${pEntityName}] -> found potential filter criteria on ${pFilterProperty} (to expected Entity ${tmpEntity})...`);

					if (this._JoinMap.hasOwnProperty(tmpEntity))
					{
						// This does not check for valid values ... that will happen later
						tmpValidFilters[pFilterProperty] = (
							{
								Entity: tmpEntity,
								Filter: pFilterProperty,
								Type: 'Join',
								Value: pFilterObject[pFilterProperty],
								PotentialJoins: this._JoinMap[tmpEntity]
							});
						if (this._Settings.DebugLog)
							this.log.debug(`[${pEntityName}]  > Filter Property Set to Join for ${pFilterProperty}.`);
					}
					let tmpColumnContained = false;
					// This isn't a join; check if this is a column contained in the Entity
					for (let i = 0; i < tmpEntityTable.Columns.length; i++)
					{
						if (tmpEntityTable.Columns[i].Column === pFilterProperty)
						{
							tmpColumnContained = true;
						}
					}
					if (tmpColumnContained)
					{
						if (tmpValidFilters.hasOwnProperty(pFilterProperty))
						{
							this.log.warning(`[${pEntityName}]  > Filter Property is Already Set to Join for ${pFilterProperty} but there also exists a column in the record.. defaulting to the column.`);
							tmpValidFilters[pFilterProperty].Type = 'InRecord';
						}
						else
						{
							tmpValidFilters[pFilterProperty] = (
								{
									Entity: tmpEntity,
									Filter: pFilterProperty,
									Type: 'InRecord',
									Value: pFilterObject[pFilterProperty],
									PotentialJoins: false
								});
							if (this._Settings.DebugLog)
								this.log.debug(`[${pEntityName}]  > Filter Property Set to InRecord for  ${pFilterProperty}.`);
						}
					}
				}
			});

		return fCallback(null, tmpValidFilters);
	};

	get(pEntityName, pFilterObject, fGetRecords, fCallback)
	{
		// Get a set of EntityNames based on the FilterObject
		if (this._Settings.DebugLog)
			this.log.debug(`[${pEntityName}] Beginning to graph GET a set of records based on some filter criteria`,pFilterObject);
		let tmpGraphGetTime = this.log.getTimeStamp();

		let tmpGraphHints = {};
		let tmpGraphIgnores = {};
		let tmpFilterExtensions = {};
		// Used for extended behavior modification
		let tmpExtendedProperties = {};
		
		if (pFilterObject.hasOwnProperty('IGNORES'))
		{
			tmpGraphIgnores = pFilterObject.IGNORES;
			delete pFilterObject.IGNORES;
		}

		if (pFilterObject.hasOwnProperty('HINTS'))
		{
			tmpGraphHints = pFilterObject.HINTS;
			delete pFilterObject.HINTS;
		}

		if (pFilterObject.hasOwnProperty('FILTERS'))
		{
			tmpFilterExtensions = pFilterObject.FILTERS;
			delete pFilterObject.FILTERS;
		}
		
		if (pFilterObject.hasOwnProperty('PROPERTIES'))
		{
			tmpExtendedProperties = pFilterObject.PROPERTIES;
			delete pFilterObject.PROPERTIES;
		}

		let tmpPagingString = '0/2000'

		if (pFilterObject.hasOwnProperty('PAGING'))
		{
			tmpPagingString = '';
			tmpPagingString += (typeof(pFilterObject.PAGING.Page) !== 'undefined') ? pFilterObject.PAGING.Page : 0;
			tmpPagingString += '/';
			tmpPagingString += (typeof(pFilterObject.PAGING.PageSize) !== 'undefined') ? pFilterObject.PAGING.PageSize : 2000;
			delete pFilterObject.PAGING;
		}

		libAsync.waterfall(
			[
				(fStageComplete)=>
				{
					// Parse the filter object and get any valid filters
					this.parseFilterObject(pEntityName, pFilterObject, fStageComplete);
				},
				(pValidFilters, fStageComplete)=>
				{
					// Get the joined tables for this entity
					let tmpEntityJoinedTables = false;
					// Map of entities and the number of times they are joined to
					let tmpJoinedEntityCounts = {};
					if (pValidFilters.hasOwnProperty(pEntityName))
					{
						// If there is a set of joins that join TO this entity, we are going to use them to find the intersection
						tmpEntityJoinedTables = Object.keys(pValidFilters[pEntityName].PotentialJoins);
					}
					// Now check the join filters for intersections with the entity
					for (let pFilterProperty in pValidFilters)
					{
						let tmpFilter = pValidFilters[pFilterProperty];
						if (tmpFilter.Type == 'Join')
						{
							let tmpJoins = Object.keys(tmpFilter.PotentialJoins);
							// Now intersect it with the joins
							if (tmpEntityJoinedTables)
							{
								tmpFilter.ValidJoins = libUnderscore.intersection(tmpJoins, tmpEntityJoinedTables);

								tmpFilter.ValidJoins.forEach(
									(pJoinedEntity) =>
									{
										if (!tmpJoinedEntityCounts.hasOwnProperty(pJoinedEntity))
											tmpJoinedEntityCounts[pJoinedEntity] = 0;
										
										tmpJoinedEntityCounts[pJoinedEntity]++;
									}
								)
							}
							else
							{
								tmpFilter.ValidJoins = false;
							}
						}
					}
					// Now get the joins that matter for the set stuff later

					// Now look for the joins with the largest intersection point with the set of filters.
					// If there are more than one, check to see about confluence with the rest of the filters
					let tmpFinalFilters = [];
					for (let pFilterProperty in pValidFilters)
					{
						let tmpFilter = pValidFilters[pFilterProperty];
						
						if (tmpGraphIgnores[pFilterProperty])
						{
							this.log.debug(`[${pEntityName}] Ignoring potential filter ${pFilterProperty} because it is in the ignores.`);
						}
						else
						{
							if (tmpFilter.Type == 'InRecord')
							{
								this.log.debug(`[${pEntityName}] Adding ${tmpFilter.Filter} as InRecord.`);
								tmpFinalFilters.push(tmpFilter);
							}
							else if (tmpFilter.Type == 'InRecordString')
							{
								this.log.debug(`[${pEntityName}] Adding ${tmpFilter.Filter} as InRecordString.`);
								tmpFinalFilters.push(tmpFilter);
							}
							else if ((tmpFilter.Type == 'Join') && (!tmpFilter.ValidJoins || tmpFilter.ValidJoins.length < 1))
							{
								this.log.debug(`[${pEntityName}] There was an attempt to join to ${tmpFilter.Filter} but no valid joins exist.  Ignoring filter.`);
							}
							else if ((tmpFilter.Type == 'Join') && (tmpFilter.ValidJoins.length == 1))
							{
								this.log.debug(`[${pEntityName}] Adding ${tmpFilter.Filter} as a Join to ${tmpFilter.ValidJoins[0]}.`);
								tmpFilter.SatisfyingJoin = tmpFilter.ValidJoins[0];
								tmpFinalFilters.push(tmpFilter);
							}
							else if ((tmpFilter.Type == 'Join') && (tmpFilter.ValidJoins.length > 1))
							{
								this.log.debug(`[${pEntityName}] Determining best Join for filter: ${tmpFilter.Filter}`);
								// We want to find the join with the most synergy, without going over.
								let tmpSatisfyingHintValue = 1000;
								let tmpSatisfyingJoinValue = -1;
								let tmpSatisfyingJoinColumnCount = -1;
								let tmpSatisfyingJoin = false;
								for (let i = 0; i < tmpFilter.ValidJoins.length; i++)
								{								// Check the graph hints to see if they are lower.
									let tmpFilterGraphHintValue = 1000;
									this.log.debug(`[${pEntityName}] ... testing ${tmpFilter.ValidJoins[i]}`);
									if (tmpGraphHints.hasOwnProperty(tmpFilter.Filter))
									{
										for (let k = 0; k < tmpGraphHints[tmpFilter.Filter].length; k++)
										{
											if (tmpGraphHints[tmpFilter.Filter][k] == tmpFilter.ValidJoins[i])
												tmpFilterGraphHintValue = k;
										}
									}
	
									// Bail out early if there is a hinted selection already in the chain
									if (tmpFilterGraphHintValue > tmpSatisfyingHintValue)
									{
										this.log.debug(`[${pEntityName}] ${tmpFilter.ValidJoins[i]} (hint ${tmpSatisfyingHintValue}, entitycount ${tmpSatisfyingJoinValue}, joincount ${tmpSatisfyingJoinColumnCount})    > ${tmpSatisfyingJoin} is being skipped due to hinting.`);
									}
									else if ((tmpFilterGraphHintValue <= tmpSatisfyingHintValue) ||
										//If there are more common connections for this than the others, use it.
										(tmpJoinedEntityCounts[tmpFilter.ValidJoins[i]] > tmpSatisfyingJoinValue) ||
										// OR Check for the most joined to table.  If there is a tie use one with the least columns joined in.
										((tmpJoinedEntityCounts[tmpFilter.ValidJoins[i]] == tmpSatisfyingJoinValue) && (Object.keys(this._EntityIncomingConnectionMap[tmpFilter.ValidJoins[i]]).length > tmpSatisfyingJoinColumnCount)))
									{
										tmpSatisfyingHintValue = tmpFilterGraphHintValue;
										tmpSatisfyingJoinValue = tmpJoinedEntityCounts[tmpFilter.ValidJoins[i]];
										// Get the column count for this join
										tmpSatisfyingJoinColumnCount = Object.keys(this._EntityIncomingConnectionMap[tmpFilter.ValidJoins[i]]).length;
										tmpSatisfyingJoin = tmpFilter.ValidJoins[i];
										this.log.debug(`[${pEntityName}] (hint ${tmpSatisfyingHintValue}, entitycount ${tmpSatisfyingJoinValue}, joincount ${tmpSatisfyingJoinColumnCount})    > ${tmpSatisfyingJoin} satisfies the criteria best to be used (so far)`);
									}
								}
								this.log.debug(`[${pEntityName}] Adding ${tmpFilter.Filter} as a Join to ${tmpSatisfyingJoin}.`);
								tmpFilter.SatisfyingJoin = tmpSatisfyingJoin;
								tmpFinalFilters.push(tmpFilter);
							}
						}
					}

					fStageComplete(null, pValidFilters, tmpFinalFilters);
				},
				(pValidFilters, pFinalFilters, fStageComplete)=>
				{
					// Get the joined records
					let tmpJoinedDataSets = {};
					libAsync.eachSeries(pFinalFilters, 
						(pFilter, fCallback)=>
						{
							if (pFilter.Type != 'Join')
								return fCallback(null);

							// If we've already gotten this set don't worry about it.
							if (tmpJoinedDataSets.hasOwnProperty(pFilter.SatisfyingJoin))
								return fCallback(null);
							let tmpURIFilter = 'FilteredTo/';

							// See everything that joins to this entity and cover it
							for (let i = 0; i < pFinalFilters.length; i++)
							{
								let tmpCheckFilter = pFinalFilters[i];
								if (tmpCheckFilter.SatisfyingJoin == pFilter.SatisfyingJoin)
								{
									if (tmpURIFilter != 'FilteredTo/')
										tmpURIFilter += '~';

									if (Array.isArray(tmpCheckFilter.Value))
										tmpURIFilter += `FBL~${tmpCheckFilter.Filter}~INN~${tmpCheckFilter.Value}`;
									else
										tmpURIFilter += `FBV~${tmpCheckFilter.Filter}~EQ~${tmpCheckFilter.Value}`;
								}
							}

							// Filter joins with forced filters
							if (tmpFilterExtensions.hasOwnProperty(pFilter.SatisfyingJoin))
							{
								if (tmpURIFilter != 'FilteredTo/')
									tmpURIFilter += '~';

								tmpURIFilter += tmpFilterExtensions[pFilter.SatisfyingJoin];
							}

							// TODO: This is sick.  Fix it.
							tmpURIFilter += `/0/10000`;
							fGetRecords(pFilter.SatisfyingJoin, tmpURIFilter,
								(pError, pData)=>
								{
									tmpJoinedDataSets[pFilter.Entity] = pData;
									return fCallback(pError);
								});
						},
						(pError)=>
						{
							return fStageComplete(pError, pValidFilters, pFinalFilters, tmpJoinedDataSets);
						});
				},
				(pValidFilters, pFinalFilters, pJoinedDataSets, fStageComplete)=>
				{
					// Check if there are joins in the filter; otherwise skip this step.
					let tmpJoinsInFilter = false;
					for (let i = 0; i < pFinalFilters.length; i++)
					{
						if (pFinalFilters[i].Type == 'Join')
							tmpJoinsInFilter = true;
					}
					if (!tmpJoinsInFilter)
					{
						this.log.debug(`[${pEntityName}] Skipping looking for Join identities because there were no valid Joins in the filter.`);
						return fStageComplete(null, pValidFilters, pFinalFilters, pJoinedDataSets, []);
					}

					let tmpRecordIdentityColumn = 'UNKNOWN';
					let tmpEntityTable = this._DataModel.Tables[pEntityName];
					for (let i = 0; i < tmpEntityTable.Columns.length; i++)
					{
						if (tmpEntityTable.Columns[i].DataType == 'ID')
							tmpRecordIdentityColumn = tmpEntityTable.Columns[i].Column;
					}
					let tmpValidIdentities = false;
					// Now create a map of all the valid IDs for this record
					for (let pJoinedData in pJoinedDataSets)
					{
						let tmpJoinedIdentities = libUnderscore.uniq(libUnderscore.map(pJoinedDataSets[pJoinedData], (pRecord)=>{ return pRecord[tmpRecordIdentityColumn]; }));
						if (tmpValidIdentities === false)
						{
							tmpValidIdentities = tmpJoinedIdentities;
						}
						else
						{
							tmpValidIdentities = libUnderscore.intersection(tmpValidIdentities, tmpJoinedIdentities);
						}
					}

					if (!tmpValidIdentities || tmpValidIdentities.length < 1)
					{
						this.log.debug(`[${pEntityName}] There were no valid Joinable records found for the identity column ${tmpRecordIdentityColumn}.`);
					}
					else
					{
						this.log.debug(`[${pEntityName}] Found ${tmpValidIdentities.length} valid records for the identity column ${tmpRecordIdentityColumn}.`);
					}
					return fStageComplete(null, pValidFilters, pFinalFilters, pJoinedDataSets, tmpValidIdentities);
				},
				(pValidFilters, pFinalFilters, pJoinedDataSets, pValidIdentities, fStageComplete)=>
				{
					let tmpURIFilter = ``;
					let tmpRecordIdentityColumn = 'UNKNOWN';
					let tmpEntityTable = this._DataModel.Tables[pEntityName];
					for (let i = 0; i < tmpEntityTable.Columns.length; i++)
					{
						if (tmpEntityTable.Columns[i].DataType == 'ID')
							tmpRecordIdentityColumn = tmpEntityTable.Columns[i].Column;
					}

					// Check if there are joins in the filter; if so add that as an IN list filter
					let tmpJoinsInFilter = false;
					for (let i = 0; i < pFinalFilters.length; i++)
					{
						if (pFinalFilters[i].Type == 'Join')
							tmpJoinsInFilter = true;
					}
					if (tmpJoinsInFilter)
					{
						let tmpJoinFilterString = pValidIdentities.join();
						if (tmpJoinFilterString != '')
							tmpURIFilter += `FilteredTo/FBL~${tmpRecordIdentityColumn}~INN~${tmpJoinFilterString}`;
						else if (tmpExtendedProperties.ForceJoins)
						{
							this.log.debug(`[${pEntityName}] Force Joins is set to TRUE and there are no valid Join Records mapped in; set is empty.`);
							// There are no filterable list of join filters
							return fStageComplete(null, [], pValidFilters, pFinalFilters, pJoinedDataSets, pValidIdentities);
						}
					}

					pFinalFilters.forEach(
						(pFilterProperty)=>
							{
								if (pFilterProperty.Type == 'InRecord')
								{
									if (tmpURIFilter != '')
										tmpURIFilter += '~';
									else
										tmpURIFilter += `FilteredTo/`;
									
									if (Array.isArray(pFilterProperty.Value))
										tmpURIFilter += `FBL~${pFilterProperty.Filter}~INN~${pFilterProperty.Value}`;
									else
										tmpURIFilter += `FBV~${pFilterProperty.Filter}~EQ~${pFilterProperty.Value}`;
								}
								else if (pFilterProperty.Type == 'InRecordString')
								{
									if (tmpURIFilter != '')
										tmpURIFilter += '~';
									else
										tmpURIFilter += `FilteredTo/`;
									tmpURIFilter += `FBV~${pFilterProperty.Filter}~LK~${pFilterProperty.Value}`;
								}
							});

					if (tmpFilterExtensions.hasOwnProperty(pEntityName))
					{
						if (tmpURIFilter != '')
							tmpURIFilter += '~';
						else
							tmpURIFilter += `FilteredTo/`;

						tmpURIFilter += tmpFilterExtensions[pEntityName];
					}


					if (tmpURIFilter !== '')
						tmpURIFilter += '/';
					tmpURIFilter += tmpPagingString;
					fGetRecords(pEntityName, tmpURIFilter,
						(pError, pData)=>
						{
							return fStageComplete(pError, pData, pValidFilters, pFinalFilters, pJoinedDataSets, pValidIdentities);
						});
				}
			],
			(pError, pRecords, pValidFilters, pFinalFilters, pJoinedDataSets, pValidIdentities)=>
			{
				if (pError)
					this.log.error(`[${pEntityName}] Graph Filter operation failed due to error: ${pError}`);

				this.log.debug(`[${pEntityName}] Graph Filter operation completed in ${this.log.getTimeDelta(tmpGraphGetTime)}ms`);

				fCallback(pError, pRecords, pValidFilters, pFinalFilters, pJoinedDataSets, pValidIdentities);
			});
	};
};

module.exports = GraphGet;