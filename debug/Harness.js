const _Settings = require('./bookstore-configuration.json');

const libFable = require('fable');

_Fable = new libFable(_Settings);
_Fable.serviceManager.addAndInstantiateServiceType('RetoldDataService', require('../source/Retold-Data-Service.js'));

_Fable.MeadowEndpoints.Book.controller.BehaviorInjection.setBehavior('Read-PostOperation',
    (pRequest, pRequestState, fComplete) =>
    {
        // Get the join records
        _Fable.DAL.BookAuthorJoin.doReads(_Fable.DAL.BookAuthorJoin.query.addFilter('IDBook', pRequestState.Record.IDBook),
            (pJoinReadError, pJoinReadQuery, pJoinRecords)=>
            {
                let tmpAuthorList = [];
                for (let j = 0; j < pJoinRecords.length; j++)
                {
                    tmpAuthorList.push(pJoinRecords[j].IDAuthor);
                }
                if (tmpAuthorList.length < 1)
                {
                    pRequestState.Record.Authors = [];
                    return fComplete();
                }
                else
                {
                    _Fable.DAL.Author.doReads(_Fable.DAL.Author.query.addFilter('IDAuthor', tmpAuthorList, 'IN'),
                        (pReadsError, pReadsQuery, pAuthors)=>
                        {
                            pRequestState.Record.Authors = pAuthors;
                            return fComplete();
                        });
                }
            });
    });